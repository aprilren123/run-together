import { describe, expect, test } from "bun:test";
import { signedUp } from "../support/http.ts";

type Person = Awaited<ReturnType<typeof signedUp>>;
type Row = Record<string, unknown>;

const RUN = {
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "Easy pace",
};

async function befriend(a: Person, b: Person) {
  const sent = await a.post("/friends/request", { username: b.username });
  expect((await b.post("/friends/accept", { request: sent.body.request })).status).toBe(200);
}

async function scene() {
  const morgan = await signedUp("morgan");
  const jamie = await signedUp("jamie");
  const stranger = await signedUp("stranger");
  await befriend(jamie, morgan);
  const run = (await morgan.post("/runs/create", RUN)).body.run as string;
  return { morgan, jamie, stranger, run };
}

const runAs = async (viewer: Person, run: string) =>
  ((await viewer.post("/runs/list")).body.runs.runs as Row[]).find((each) => each.run === run);
const going = async (viewer: Person, run: string) =>
  ((await viewer.post("/runs/participants")).body.participants.participations as Row[])
    .filter((each) => each.event === run)
    .map((each) => each.user);
const suggestions = async (viewer: Person) =>
  (await viewer.post("/suggestions/list")).body.suggestions.suggestions as Row[];

describe("Suggesting changes to several details at once", () => {
  test("a friend proposes a new meeting point, distance, pace, and description; accepting applies them all and joins them", async () => {
    const { morgan, jamie, run } = await scene();
    const change = { location: "Harvard Bridge", distance: 6, pace: 8.5, details: "Bring water" };
    const created = await jamie.post("/suggestions/create", { event: run, change });
    expect(created.status).toBe(200);
    expect(
      (await suggestions(morgan)).find((s) => s.suggestion === created.body.suggestion),
    ).toMatchObject({
      change,
      status: "PENDING",
    });

    expect(
      (await morgan.post("/suggestions/accept", { suggestion: created.body.suggestion })).status,
    ).toBe(200);
    expect(await runAs(jamie, run)).toMatchObject({ ...RUN, ...change });
    expect(await going(morgan, run)).toEqual([jamie.username]);
  });

  test("a time and a meeting point together are applied together", async () => {
    const { morgan, jamie, run } = await scene();
    const change = { startTime: "2026-11-07T10:30", location: "Kresge Oval" };
    const { suggestion } = (await jamie.post("/suggestions/create", { event: run, change })).body;
    await morgan.post("/suggestions/accept", { suggestion });
    expect(await runAs(morgan, run)).toMatchObject({ ...RUN, ...change });
  });

  test("the original time-only suggestion, a plain start time, still works", async () => {
    const { morgan, jamie, run } = await scene();
    const { suggestion } = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" })
    ).body;
    expect((await morgan.post("/suggestions/accept", { suggestion })).status).toBe(200);
    expect((await runAs(morgan, run))?.startTime).toBe("2026-11-07T10:30");
  });

  test("rejecting leaves the run exactly as it was, and doesn't join the suggester", async () => {
    const { morgan, jamie, run } = await scene();
    const { suggestion } = (
      await jamie.post("/suggestions/create", { event: run, change: { distance: 10, pace: 7 } })
    ).body;
    const before = await runAs(morgan, run);
    expect((await morgan.post("/suggestions/reject", { suggestion })).status).toBe(200);
    expect(await runAs(morgan, run)).toEqual(before);
    expect(await going(morgan, run)).toEqual([]);
  });
});

describe("Invalid and incompatible suggestions are refused safely", () => {
  test("an empty change, an unknown field, or a malformed value is refused with 400 and nothing is stored", async () => {
    const { morgan, jamie, run } = await scene();
    for (const change of [
      {},
      { owner: jamie.username },
      { distance: -2 },
      { pace: "fast" },
      { startTime: "next tuesday" },
      { location: "" },
      { startTime: "2026-11-07T10:30", status: "CANCELED" },
    ]) {
      expect(await jamie.post("/suggestions/create", { event: run, change })).toMatchObject({
        status: 400,
        body: { error: "INVALID_REQUEST" },
      });
    }
    expect(await suggestions(morgan)).toEqual([]);
  });

  test("a change the run can't take, such as a time outside its window, is refused with 409", async () => {
    const { morgan, jamie, run } = await scene();
    await morgan.post("/runs/flexibility", {
      run,
      earliestTime: "2026-11-07T09:30",
      latestTime: "2026-11-07T11:00",
    });
    expect(
      await jamie.post("/suggestions/create", {
        event: run,
        change: { startTime: "2026-11-07T13:00", location: "Harvard Bridge" },
      }),
    ).toMatchObject({ status: 409, body: { error: "CONFLICT" } });
    expect(await suggestions(morgan)).toEqual([]);
  });

  test("if the owner's edits mean a pending change no longer fits, accepting is refused and nothing changes", async () => {
    const { morgan, jamie, run } = await scene();
    const { suggestion } = (
      await jamie.post("/suggestions/create", {
        event: run,
        change: { startTime: "2026-11-07T12:00", location: "Harvard Bridge" },
      })
    ).body;
    // Morgan then limits the run to 9:30–11:00, so noon no longer fits.
    await morgan.post("/runs/flexibility", {
      run,
      earliestTime: "2026-11-07T09:30",
      latestTime: "2026-11-07T11:00",
    });
    const before = await runAs(morgan, run);
    expect(await morgan.post("/suggestions/accept", { suggestion })).toMatchObject({
      status: 409,
      body: { error: "CONFLICT" },
    });
    expect(await runAs(morgan, run)).toEqual(before);
    expect((await suggestions(morgan)).find((s) => s.suggestion === suggestion)?.status).toBe(
      "PENDING",
    );
    expect(await going(morgan, run)).toEqual([]);
  });
});

describe("Only the right people can suggest and decide", () => {
  test("a stranger can't suggest, the owner can't suggest to their own run, and only the owner decides", async () => {
    const { morgan, jamie, stranger, run } = await scene();
    const change = { distance: 6 };
    expect(await stranger.post("/suggestions/create", { event: run, change })).toMatchObject({
      status: 404,
    });
    expect(await morgan.post("/suggestions/create", { event: run, change })).toMatchObject({
      status: 403,
    });
    const { suggestion } = (await jamie.post("/suggestions/create", { event: run, change })).body;
    for (const person of [jamie, stranger]) {
      expect(await person.post("/suggestions/accept", { suggestion })).toMatchObject({
        status: 409,
      });
      expect(await person.post("/suggestions/reject", { suggestion })).toMatchObject({
        status: 409,
      });
    }
    expect((await runAs(morgan, run))?.distance).toBe(5);
  });
});
