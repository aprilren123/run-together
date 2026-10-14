import { describe, expect, test } from "bun:test";
import { signedUp } from "../support/http.ts";

type Person = Awaited<ReturnType<typeof signedUp>>;
type Row = Record<string, unknown> & { run: string };

const RUN = {
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "Easy pace",
};

async function createRun(owner: Person): Promise<string> {
  const created = await owner.post("/runs/create", RUN);
  expect(created.status).toBe(200);
  return created.body.run;
}

async function befriend(a: Person, b: Person): Promise<string> {
  const sent = await a.post("/friends/request", { username: b.username });
  const accepted = await b.post("/friends/accept", { request: sent.body.request });
  expect(accepted.status).toBe(200);
  return accepted.body.friendship;
}

async function runAs(viewer: Person, run: string): Promise<Row | undefined> {
  return ((await viewer.post("/runs/list")).body.runs.runs as Row[]).find(
    (each) => each.run === run,
  );
}

async function going(viewer: Person, run: string): Promise<string[]> {
  return ((await viewer.post("/runs/participants")).body.participants.participations as Row[])
    .filter((each) => each.event === run)
    .map((each) => each.user as string);
}

/** Morgan's run, with Jamie a friend who joined and Taylor a friend who didn't, and a stranger. */
async function scene() {
  const morgan = await signedUp("morgan");
  const jamie = await signedUp("jamie");
  const taylor = await signedUp("taylor");
  const stranger = await signedUp("stranger");
  const friendship = await befriend(jamie, morgan);
  await befriend(taylor, morgan);
  const run = await createRun(morgan);
  expect((await jamie.post("/runs/join", { event: run })).status).toBe(200);
  return { morgan, jamie, taylor, stranger, friendship, run };
}

describe("Editing a run", () => {
  test("the owner edits the time, meeting point, distance, pace, and description, and participants see the latest plan", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    const edits = {
      startTime: "2026-11-07T10:30",
      location: "Harvard Bridge",
      distance: 6,
      pace: 8.5,
      details: "Bring water",
    };
    expect((await morgan.post("/runs/update", { run, ...edits })).status).toBe(200);
    for (const viewer of [morgan, jamie, taylor]) {
      expect(await runAs(viewer, run)).toMatchObject({ ...edits, status: "ACTIVE" });
    }
  });

  test("participants, other friends, and strangers can't edit the run", async () => {
    const { morgan, jamie, taylor, stranger, run } = await scene();
    for (const person of [jamie, taylor, stranger]) {
      expect(await person.post("/runs/update", { run, details: "hijacked" })).toMatchObject({
        status: 403,
        body: { error: "FORBIDDEN" },
      });
    }
    expect((await runAs(morgan, run))?.details).toBe(RUN.details);
  });

  test("an edit outside the run's flexibility ranges is refused and changes nothing", async () => {
    const { morgan, run } = await scene();
    await morgan.post("/runs/flexibility", {
      run,
      earliestTime: "2026-11-07T09:30",
      latestTime: "2026-11-07T11:00",
    });
    expect(await morgan.post("/runs/update", { run, startTime: "2026-11-07T13:00" })).toMatchObject(
      { status: 400 },
    );
    expect((await runAs(morgan, run))?.startTime).toBe(RUN.startTime);
  });
});

describe("Leaving a run", () => {
  test("a participant leaves, and the run goes back to being a friend's run they can join again", async () => {
    const { morgan, jamie, run } = await scene();
    expect((await jamie.post("/runs/leave", { event: run })).status).toBe(200);
    expect(await going(morgan, run)).toEqual([]);
    expect(await runAs(jamie, run)).toMatchObject({ status: "ACTIVE" });
    expect((await jamie.post("/runs/join", { event: run })).status).toBe(200);
  });

  test("someone who hasn't joined can't leave, and leaving removes only their own participation", async () => {
    const { morgan, jamie, taylor, stranger, run } = await scene();
    for (const person of [taylor, stranger, morgan]) {
      expect(await person.post("/runs/leave", { event: run })).toMatchObject({ status: 404 });
    }
    expect(await going(morgan, run)).toEqual([jamie.username]);
  });

  test("a participant whose friendship ended still sees the run they joined, and can leave it, but can't rejoin or suggest", async () => {
    const { morgan, jamie, friendship, run } = await scene();
    await morgan.post("/friends/remove", { friendship });
    await morgan.post("/runs/update", { run, location: "Harvard Bridge" });
    expect(await runAs(jamie, run)).toMatchObject({ location: "Harvard Bridge" });

    expect(await jamie.post("/suggestions/create", { event: run, change: "x" })).toMatchObject({
      status: 404,
    });
    expect((await jamie.post("/runs/leave", { event: run })).status).toBe(200);
    expect(await runAs(jamie, run)).toBeUndefined();
    expect(await jamie.post("/runs/join", { event: run })).toMatchObject({ status: 404 });
  });
});

describe("Canceling a run", () => {
  test("the owner cancels, and the run stays visible as CANCELED to the owner, participants, and friends, not strangers", async () => {
    const { morgan, jamie, taylor, stranger, run } = await scene();
    expect((await morgan.post("/runs/cancel", { run })).status).toBe(200);
    for (const viewer of [morgan, jamie, taylor]) {
      expect(await runAs(viewer, run)).toMatchObject({ ...RUN, status: "CANCELED" });
    }
    expect(await runAs(stranger, run)).toBeUndefined();
    expect(await going(jamie, run)).toEqual([jamie.username]);
  });

  test("only the owner can cancel", async () => {
    const { morgan, jamie, taylor, stranger, run } = await scene();
    for (const person of [jamie, taylor, stranger]) {
      expect(await person.post("/runs/cancel", { run })).toMatchObject({ status: 403 });
    }
    expect((await runAs(morgan, run))?.status).toBe("ACTIVE");
  });

  test("a canceled run can't be edited, canceled again, joined, or suggested to", async () => {
    const { morgan, taylor, run } = await scene();
    await morgan.post("/runs/cancel", { run });
    const refused = { status: 409, body: { error: "CONFLICT" } };
    expect(await morgan.post("/runs/update", { run, distance: 3 })).toMatchObject(refused);
    expect(
      await morgan.post("/runs/flexibility", {
        run,
        earliestTime: "2026-11-07T09:30",
        latestTime: "2026-11-07T11:00",
      }),
    ).toMatchObject(refused);
    expect(await morgan.post("/runs/cancel", { run })).toMatchObject(refused);
    expect(await taylor.post("/runs/join", { event: run })).toMatchObject(refused);
    expect(
      await taylor.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" }),
    ).toMatchObject(refused);
    expect(await runAs(morgan, run)).toMatchObject({ ...RUN, status: "CANCELED" });
  });

  test("a suggestion pending when the run is canceled can't be accepted, and nothing changes", async () => {
    const { morgan, taylor, run } = await scene();
    const suggestion = (
      await taylor.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" })
    ).body.suggestion;
    await morgan.post("/runs/cancel", { run });
    expect(await morgan.post("/suggestions/accept", { suggestion })).toMatchObject({
      status: 409,
      body: { error: "CONFLICT" },
    });
    expect((await runAs(morgan, run))?.startTime).toBe(RUN.startTime);
    expect(await going(morgan, run)).not.toContain(taylor.username);
    expect((await morgan.post("/suggestions/reject", { suggestion })).status).toBe(200);
  });
});

describe("Suggesting as a participant", () => {
  test("a friend who already joined can suggest a time, and accepting it moves the run without joining them twice", async () => {
    const { morgan, jamie, run } = await scene();
    const suggestion = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" })
    ).body.suggestion;
    expect((await morgan.post("/suggestions/accept", { suggestion })).status).toBe(200);
    expect((await runAs(jamie, run))?.startTime).toBe("2026-11-07T10:30");
    expect(await going(morgan, run)).toEqual([jamie.username]);
  });
});

describe("Each request acts on the one run or suggestion it names", () => {
  /** Morgan hosts three runs; Jamie is her friend. */
  async function threeRuns() {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    await befriend(jamie, morgan);
    const runs: string[] = [];
    for (const startTime of ["2026-11-07T07:00", "2026-11-08T07:00", "2026-11-09T07:00"]) {
      runs.push((await morgan.post("/runs/create", { ...RUN, startTime })).body.run);
    }
    return { morgan, jamie, runs };
  }

  test("joining one of a friend's runs joins only that run, and the participant list says so", async () => {
    const { morgan, jamie, runs } = await threeRuns();
    expect((await jamie.post("/runs/join", { event: runs[1] })).status).toBe(200);
    for (const viewer of [morgan, jamie]) {
      expect(await going(viewer, runs[0]!)).toEqual([]);
      expect(await going(viewer, runs[1]!)).toEqual([jamie.username]);
      expect(await going(viewer, runs[2]!)).toEqual([]);
    }
    const all = (await jamie.post("/runs/participants")).body.participants.participations as Row[];
    expect(all.filter((each) => each.user === jamie.username).map((each) => each.event)).toEqual([
      runs[1],
    ]);
  });

  test("suggesting a change to one run creates one suggestion, for that run", async () => {
    const { morgan, jamie, runs } = await threeRuns();
    expect(
      (await jamie.post("/suggestions/create", { event: runs[2], change: "2026-11-09T07:30" }))
        .status,
    ).toBe(200);
    const suggestions = (await morgan.post("/suggestions/list")).body.suggestions
      .suggestions as Row[];
    expect(suggestions.map((each) => each.event)).toEqual([runs[2]]);
  });

  test("accepting one suggestion changes only its run and leaves the other suggestions pending", async () => {
    const { morgan, jamie, runs } = await threeRuns();
    const ids: string[] = [];
    for (const [i, run] of runs.entries()) {
      const change = `2026-11-0${7 + i}T07:30`;
      ids.push((await jamie.post("/suggestions/create", { event: run, change })).body.suggestion);
    }
    expect((await morgan.post("/suggestions/accept", { suggestion: ids[0] })).status).toBe(200);

    const suggestions = (await morgan.post("/suggestions/list")).body.suggestions
      .suggestions as Row[];
    const statusOf = (id: string) => suggestions.find((each) => each.suggestion === id)?.status;
    expect(ids.map(statusOf)).toEqual(["ACCEPTED", "PENDING", "PENDING"]);
    expect((await runAs(morgan, runs[0]!))?.startTime).toBe("2026-11-07T07:30");
    expect((await runAs(morgan, runs[1]!))?.startTime).toBe("2026-11-08T07:00");
    expect((await runAs(morgan, runs[2]!))?.startTime).toBe("2026-11-09T07:00");
    expect(await going(morgan, runs[0]!)).toEqual([jamie.username]);
    expect(await going(morgan, runs[1]!)).toEqual([]);
  });
});
