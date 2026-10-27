import { describe, expect, test } from "bun:test";
import {
  InvalidFlexibility,
  InvalidRun,
  NotOwner,
  RunCanceled,
  RunPlanningConcept,
} from "../../src/concepts/RunPlanning.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

const WINDOW = { earliestTime: "2026-11-07T09:30", latestTime: "2026-11-07T11:00" };
const NO_FLEXIBILITY = {
  earliestTime: null,
  latestTime: null,
  minDistance: null,
  maxDistance: null,
  minPace: null,
  maxPace: null,
};

const RUN = {
  owner: "morgan",
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "Easy pace",
};

async function setup() {
  const runPlanning = new RunPlanningConcept(await testDatabase());
  const { run } = await runPlanning.create(RUN);
  const get = async () => (await runPlanning._all({})).find((row) => row.run === run);
  return { runPlanning, run, get };
}

describe("RunPlanning", () => {
  test("a new run is ACTIVE, and the owner can update its time, place, distance, pace, and description", async () => {
    const { runPlanning, run, get } = await setup();
    expect(await get()).toMatchObject({ ...RUN, status: "ACTIVE" });

    await runPlanning.update({
      owner: "morgan",
      run,
      startTime: "2026-11-07T10:30",
      location: "Harvard Bridge",
      distance: 6,
      pace: 8.5,
      details: "Bring water",
    });
    expect(await get()).toMatchObject({
      startTime: "2026-11-07T10:30",
      location: "Harvard Bridge",
      distance: 6,
      pace: 8.5,
      details: "Bring water",
      status: "ACTIVE",
    });
  });

  test("an update that leaves out a field keeps it, including the description", async () => {
    const { runPlanning, run, get } = await setup();
    await runPlanning.update({ owner: "morgan", run, distance: 7 });
    expect(await get()).toMatchObject({
      distance: 7,
      details: "Easy pace",
      location: RUN.location,
    });
  });

  test("only the owner can update or cancel, and an invalid update changes nothing", async () => {
    const { runPlanning, run, get } = await setup();
    await expect(runPlanning.update({ owner: "jamie", run, distance: 3 })).rejects.toThrow(
      NotOwner,
    );
    await expect(runPlanning.cancel({ owner: "jamie", run })).rejects.toThrow(NotOwner);
    await expect(runPlanning.update({ owner: "morgan", run, distance: 0 })).rejects.toThrow(
      InvalidRun,
    );
    expect(await get()).toMatchObject({ ...RUN, status: "ACTIVE" });
  });

  test("canceling keeps the run, marked CANCELED, and it can't be changed or canceled again", async () => {
    const { runPlanning, run, get } = await setup();
    expect(await runPlanning.cancel({ owner: "morgan", run })).toEqual({ run });
    expect(await get()).toMatchObject({ ...RUN, status: "CANCELED" });

    await expect(runPlanning.update({ owner: "morgan", run, distance: 3 })).rejects.toThrow(
      RunCanceled,
    );
    await expect(
      runPlanning.setFlexibility({
        owner: "morgan",
        run,
        earliestTime: "2026-11-07T09:30",
        latestTime: "2026-11-07T11:00",
      }),
    ).rejects.toThrow(RunCanceled);
    await expect(runPlanning.cancel({ owner: "morgan", run })).rejects.toThrow(RunCanceled);
    expect(await get()).toMatchObject({ ...RUN, status: "CANCELED" });
  });

  test("_fits says whether update would accept the given values, keeping the run's own for the rest", async () => {
    const { runPlanning, run } = await setup();
    await runPlanning.setFlexibility({
      owner: "morgan",
      run,
      earliestTime: "2026-11-07T09:30",
      latestTime: "2026-11-07T11:00",
    });
    expect(await runPlanning._fits({ run, startTime: "2026-11-07T10:30", pace: 8 })).toEqual({
      fits: true,
    });
    expect(await runPlanning._fits({ run, startTime: "2026-11-07T12:00" })).toEqual({
      fits: false,
    });
    expect(await runPlanning._fits({ run, distance: -1 })).toEqual({ fits: false });
    expect(await runPlanning._fits({ run: "missing", pace: 8 })).toEqual({ fits: false });
    await runPlanning.cancel({ owner: "morgan", run });
    expect(await runPlanning._fits({ run, pace: 8 })).toEqual({ fits: false });
  });

  test("someone else learns nothing about a canceled run: they're refused with NOT_OWNER", async () => {
    const { runPlanning, run } = await setup();
    await runPlanning.cancel({ owner: "morgan", run });
    await expect(runPlanning.update({ owner: "jamie", run, distance: 3 })).rejects.toThrow(
      NotOwner,
    );
  });

  test("its principle: Morgan plans a run, allows a time window, moves the run within it, and later cancels it", async () => {
    const { runPlanning, run, get } = await setup();
    expect(await get()).toEqual({
      run,
      ...RUN,
      ...NO_FLEXIBILITY,
      status: "ACTIVE",
    });
    expect(
      await runPlanning.setFlexibility({
        owner: "morgan",
        run,
        ...WINDOW,
        minDistance: 4,
        maxDistance: 6,
        minPace: 8,
        maxPace: 10,
      }),
    ).toEqual({ run });
    expect(await get()).toMatchObject({
      ...WINDOW,
      minDistance: 4,
      maxDistance: 6,
      minPace: 8,
      maxPace: 10,
    });
    expect(
      await runPlanning.update({ owner: "morgan", run, startTime: "2026-11-07T10:30" }),
    ).toEqual({
      run,
    });
    expect((await get())?.startTime).toBe("2026-11-07T10:30");
    expect(await runPlanning.cancel({ owner: "morgan", run })).toEqual({ run });
    expect(await get()).toMatchObject({ startTime: "2026-11-07T10:30", status: "CANCELED" });
  });

  test("creating a run with a non-positive distance or pace is refused with INVALID_RUN, and nothing is stored", async () => {
    const runPlanning = new RunPlanningConcept(await testDatabase());
    for (const bad of [{ distance: 0 }, { distance: -1 }, { pace: 0 }, { pace: -5 }]) {
      const refused = runPlanning.create({ ...RUN, ...bad });
      await expect(refused).rejects.toThrow(InvalidRun);
      await expect(refused).rejects.toThrow("The run details or flexibility ranges are invalid.");
    }
    expect(await runPlanning._all({})).toEqual([]);
  });

  test("setFlexibility with nothing set clears the ranges, so the run is fixed again", async () => {
    const { runPlanning, run, get } = await setup();
    await runPlanning.setFlexibility({ owner: "morgan", run, ...WINDOW });
    await runPlanning.setFlexibility({ owner: "morgan", run });
    expect(await get()).toMatchObject({ ...RUN, ...NO_FLEXIBILITY });
  });

  test("invalid ranges are refused with INVALID_FLEXIBILITY, and the run keeps its ranges", async () => {
    const { runPlanning, run, get } = await setup();
    await runPlanning.setFlexibility({ owner: "morgan", run, ...WINDOW });
    const before = await get();
    for (const ranges of [
      { earliestTime: "2026-11-07T09:30" }, // a window needs both ends
      { earliestTime: "2026-11-07T10:30", latestTime: "2026-11-07T11:00" }, // start time outside it
      { minDistance: 6, maxDistance: 8 }, // distance outside the range
      { minDistance: 4 }, // a range needs both ends
      { minPace: 9.5, maxPace: 11 }, // pace outside the range
      { minPace: 0, maxPace: 10 }, // a range must be positive
    ]) {
      const refused = runPlanning.setFlexibility({ owner: "morgan", run, ...ranges });
      await expect(refused).rejects.toThrow(InvalidFlexibility);
      await expect(refused).rejects.toThrow("The flexibility ranges are invalid.");
    }
    expect(await get()).toEqual(before);
  });

  test("only the owner can set flexibility; a stranger or an unknown run is refused with NOT_OWNER", async () => {
    const { runPlanning, run, get } = await setup();
    const before = await get();
    const stranger = runPlanning.setFlexibility({ owner: "jamie", run, ...WINDOW });
    await expect(stranger).rejects.toThrow(NotOwner);
    await expect(stranger).rejects.toThrow(
      "The run does not exist or does not belong to this user.",
    );
    await expect(
      runPlanning.setFlexibility({ owner: "morgan", run: "missing", ...WINDOW }),
    ).rejects.toThrow(NotOwner);
    await expect(runPlanning.cancel({ owner: "morgan", run: "missing" })).rejects.toThrow(NotOwner);
    await expect(runPlanning.update({ owner: "morgan", run: "missing", pace: 8 })).rejects.toThrow(
      NotOwner,
    );
    expect(await get()).toEqual(before);
  });

  test("an update that would leave the run outside its own ranges is refused with INVALID_RUN, and changes nothing", async () => {
    const { runPlanning, run, get } = await setup();
    await runPlanning.setFlexibility({
      owner: "morgan",
      run,
      ...WINDOW,
      minDistance: 4,
      maxDistance: 6,
    });
    const before = await get();
    for (const change of [
      { startTime: "2026-11-07T12:00" },
      { distance: 7 },
      // All or nothing: a valid location doesn't go through with an invalid time.
      { location: "Harvard Bridge", startTime: "2026-11-07T08:00" },
    ]) {
      const refused = runPlanning.update({ owner: "morgan", run, ...change });
      await expect(refused).rejects.toThrow(InvalidRun);
      await expect(refused).rejects.toThrow("The updated run details are invalid.");
    }
    expect(await get()).toEqual(before);
  });

  test("updating, setting flexibility on, or canceling one run leaves every other run alone", async () => {
    const runPlanning = new RunPlanningConcept(await testDatabase());
    const { run: first } = await runPlanning.create(RUN);
    const { run: second } = await runPlanning.create({ ...RUN, startTime: "2026-11-08T10:00" });
    const { run: jamies } = await runPlanning.create({ ...RUN, owner: "jamie" });
    const snapshot = async (run: string) => (await runPlanning._all({})).find((r) => r.run === run);
    const [secondBefore, jamiesBefore] = [await snapshot(second), await snapshot(jamies)];

    await runPlanning.update({ owner: "morgan", run: first, distance: 8, details: "Longer" });
    await runPlanning.setFlexibility({ owner: "morgan", run: first, ...WINDOW });
    await runPlanning.cancel({ owner: "morgan", run: first });

    expect(await snapshot(first)).toMatchObject({
      distance: 8,
      details: "Longer",
      status: "CANCELED",
    });
    expect(await snapshot(second)).toEqual(secondBefore);
    expect(await snapshot(jamies)).toEqual(jamiesBefore);
    expect((await runPlanning._all({})).map((r) => r.status).sort()).toEqual([
      "ACTIVE",
      "ACTIVE",
      "CANCELED",
    ]);
  });

  test("of an update and a cancellation of one run at once, a canceled run is never changed afterwards", async () => {
    const { runPlanning, run, get } = await setup();
    const outcomes = await Promise.allSettled([
      runPlanning.update({ owner: "morgan", run, location: "Harvard Bridge" }),
      runPlanning.cancel({ owner: "morgan", run }),
    ]);
    const [updated, canceled] = outcomes;
    expect(canceled.status).toBe("fulfilled");
    const after = await get();
    expect(after?.status).toBe("CANCELED");
    if (updated.status === "rejected") {
      expect(updated.reason).toBeInstanceOf(RunCanceled);
      expect(after?.location).toBe(RUN.location);
    }

    const { run: twice } = await runPlanning.create(RUN);
    await expectOneWinner(
      [
        runPlanning.cancel({ owner: "morgan", run: twice }),
        runPlanning.cancel({ owner: "morgan", run: twice }),
      ],
      RunCanceled,
    );
  });

  test("_upcoming says whether a run starts now or later, canceled or not, and nothing for an unknown run", async () => {
    let now = new Date("2026-11-07T09:00");
    const planning = new RunPlanningConcept(await testDatabase(), () => now);
    const { run } = await planning.create(RUN);
    expect(await planning._upcoming({ run })).toEqual([{ upcoming: true }]);
    now = new Date("2026-11-07T10:00");
    expect(await planning._upcoming({ run })).toEqual([{ upcoming: true }]);
    now = new Date("2026-11-07T10:01");
    expect(await planning._upcoming({ run })).toEqual([{ upcoming: false }]);

    now = new Date("2026-11-07T09:00");
    await planning.cancel({ owner: "morgan", run });
    expect(await planning._upcoming({ run })).toEqual([{ upcoming: true }]);
    expect(await planning._upcoming({ run: "missing" })).toEqual([]);
  });
});
