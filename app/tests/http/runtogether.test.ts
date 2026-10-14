import { describe, expect, test } from "bun:test";
import { browser, SESSION, signedUp } from "../support/http.ts";

type Person = Awaited<ReturnType<typeof signedUp>>;

const RUN = {
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "Easy pace",
};

async function createRun(owner: Person, run: object = RUN): Promise<string> {
  const created = await owner.post("/runs/create", run);
  expect(created.status).toBe(200);
  return created.body.run;
}

async function runById(viewer: Person, run: string) {
  const { body } = await viewer.post("/runs/list");
  return (body.runs.runs as { run: string }[]).find((each) => each.run === run) as
    Record<string, unknown> | undefined;
}

async function participantsOf(viewer: Person, run: string) {
  const { body } = await viewer.post("/runs/participants");
  return (body.participants.participations as { user: string; event: string }[])
    .filter((each) => each.event === run)
    .map((each) => each.user);
}

async function suggestionById(viewer: Person, suggestion: string) {
  const { body } = await viewer.post("/suggestions/list");
  return (body.suggestions.suggestions as { suggestion: string }[]).find(
    (each) => each.suggestion === suggestion,
  ) as Record<string, unknown> | undefined;
}

async function befriend(a: Person, b: Person): Promise<string> {
  const sent = await a.post("/friends/request", { username: b.username });
  expect(sent.status).toBe(200);
  const accepted = await b.post("/friends/accept", { request: sent.body.request });
  expect(accepted.status).toBe(200);
  return accepted.body.friendship;
}

/** Every RunTogether endpoint, with a body that would otherwise be well formed. */
const ENDPOINTS: [string, object][] = [
  ["/runs/create", RUN],
  ["/runs/update", { run: "r", startTime: "2026-11-07T11:00" }],
  ["/runs/flexibility", { run: "r", earliestTime: "2026-11-07T09:30" }],
  ["/runs/cancel", { run: "r" }],
  ["/runs/list", {}],
  ["/runs/participants", {}],
  ["/runs/join", { event: "r" }],
  ["/runs/leave", { event: "r" }],
  ["/friends/request", { username: "someone" }],
  ["/friends/accept", { request: "q" }],
  ["/friends/reject", { request: "q" }],
  ["/friends/remove", { friendship: "f" }],
  ["/friends/list", {}],
  ["/friends/requests", {}],
  ["/suggestions/create", { event: "r", change: "2026-11-07T10:30" }],
  ["/suggestions/accept", { suggestion: "s" }],
  ["/suggestions/reject", { suggestion: "s" }],
  ["/suggestions/withdraw", { suggestion: "s" }],
  ["/suggestions/list", {}],
];

describe("Every RunTogether endpoint needs a signed-in session", () => {
  test("without a session cookie, each endpoint answers 401 and changes nothing", async () => {
    const morgan = await signedUp("morgan");
    const before = (await morgan.post("/runs/list")).body;
    const anonymous = browser();
    for (const [path, body] of ENDPOINTS) {
      const answer = await anonymous.post(path, body);
      expect({ path, status: answer.status, body: answer.body }).toEqual({
        path,
        status: 401,
        body: { error: "UNAUTHORIZED" },
      });
    }
    expect((await morgan.post("/runs/list")).body).toEqual(before);
  });

  test("a made-up or ended session is refused with 401", async () => {
    const forged = browser();
    forged.jar.set(SESSION, "a".repeat(43));
    expect((await forged.post("/runs/create", RUN)).status).toBe(401);

    const jamie = await signedUp("jamie");
    const stale = jamie.jar.get(SESSION)!;
    await jamie.post("/auth/logout");
    jamie.jar.set(SESSION, stale);
    expect((await jamie.post("/runs/list")).status).toBe(401);
  });

  test("a session sent in the body instead of the cookie is ignored", async () => {
    const morgan = await signedUp("morgan");
    const session = morgan.jar.get(SESSION)!;
    const answer = await browser().post("/runs/create", { ...RUN, session });
    expect(answer.status).toBe(401);
  });
});

describe("Nobody can act as another user", () => {
  test("an owner, user, sender, suggester, or decider named in the body is ignored: the session's user acts", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    await befriend(jamie, morgan);
    const morgansRun = await createRun(morgan);

    // Jamie names Morgan as the owner, but the run is Jamie's.
    const jamiesRun = (await jamie.post("/runs/create", { ...RUN, owner: morgan.username })).body
      .run;
    expect(await runById(morgan, jamiesRun)).toMatchObject({ owner: jamie.username });

    // Jamie names Morgan as the one joining, but Jamie joins.
    expect(
      (await jamie.post("/runs/join", { event: morgansRun, user: morgan.username })).status,
    ).toBe(200);
    expect(await participantsOf(morgan, morgansRun)).toEqual([jamie.username]);

    // Jamie names Morgan as the sender of a request to Jamie: it's Jamie's request to herself, so it's refused.
    expect(
      await jamie.post("/friends/request", { username: jamie.username, sender: morgan.username }),
    ).toMatchObject({ status: 409, body: { error: "CONFLICT" } });

    // Jamie names Morgan as the suggester and herself as the decider: Jamie suggests, and Morgan decides.
    const forged = await jamie.post("/suggestions/create", {
      event: morgansRun,
      change: "2026-11-07T10:30",
      suggester: morgan.username,
      decider: jamie.username,
    });
    expect(await suggestionById(morgan, forged.body.suggestion)).toMatchObject({
      suggester: jamie.username,
      decider: morgan.username,
    });

    // Jamie names herself as the decider, but she can't accept a suggestion to Morgan's run.
    expect(
      await jamie.post("/suggestions/accept", {
        suggestion: forged.body.suggestion,
        decider: jamie.username,
      }),
    ).toMatchObject({ status: 409 });
  });

  test("a user can't update, set the flexibility of, or cancel someone else's run", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const run = await createRun(morgan);
    const before = await runById(morgan, run);

    for (const [path, body] of [
      ["/runs/update", { run, startTime: "2026-11-07T06:00" }],
      [
        "/runs/flexibility",
        { run, earliestTime: "2026-11-07T06:00", latestTime: "2026-11-07T12:00" },
      ],
      ["/runs/cancel", { run }],
    ] as const) {
      expect(await jamie.post(path, body)).toMatchObject({
        status: 403,
        body: { error: "FORBIDDEN" },
      });
    }
    expect(await runById(morgan, run)).toEqual(before);
  });

  test("a suggestion always goes to the run's owner, and only the owner can accept or reject it", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const taylor = await signedUp("taylor");
    await befriend(jamie, morgan);
    const run = await createRun(morgan);

    const created = await jamie.post("/suggestions/create", {
      event: run,
      change: "2026-11-07T10:30",
    });
    expect(created.status).toBe(200);
    const suggestion = created.body.suggestion;
    expect(await suggestionById(morgan, suggestion)).toMatchObject({
      suggester: jamie.username,
      decider: morgan.username,
      status: "PENDING",
    });

    for (const decider of [jamie, taylor]) {
      expect(await decider.post("/suggestions/accept", { suggestion })).toMatchObject({
        status: 409,
      });
      expect(await decider.post("/suggestions/reject", { suggestion })).toMatchObject({
        status: 409,
      });
    }
    expect(await morgan.post("/suggestions/withdraw", { suggestion })).toMatchObject({
      status: 409,
    });
    expect(await taylor.post("/suggestions/withdraw", { suggestion })).toMatchObject({
      status: 409,
    });
    expect(await suggestionById(morgan, suggestion)).toMatchObject({ status: "PENDING" });
    expect((await runById(morgan, run))?.startTime).toBe(RUN.startTime);
  });

  test("an owner can't suggest a change to their own run, and a run that doesn't exist is refused", async () => {
    const morgan = await signedUp("morgan");
    const run = await createRun(morgan);
    expect(
      await morgan.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" }),
    ).toMatchObject({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
    expect(
      await morgan.post("/suggestions/create", { event: "no-such-run", change: "x" }),
    ).toMatchObject({
      status: 404,
      body: { error: "NOT_FOUND" },
    });
  });

  test("only the recipient can accept or reject a friend request, and only a friend can remove a friendship", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const taylor = await signedUp("taylor");

    const sent = await jamie.post("/friends/request", { username: morgan.username });
    const request = sent.body.request;
    for (const person of [jamie, taylor]) {
      expect(await person.post("/friends/accept", { request })).toMatchObject({ status: 409 });
      expect(await person.post("/friends/reject", { request })).toMatchObject({ status: 409 });
    }
    const friendship = (await morgan.post("/friends/accept", { request })).body.friendship;
    expect(await taylor.post("/friends/remove", { friendship })).toMatchObject({ status: 409 });
    const { body } = await jamie.post("/friends/list");
    expect(body.friends.friendships).toContainEqual({
      friendship,
      user1: jamie.username,
      user2: morgan.username,
    });
    // Taylor isn't in it, so her list doesn't show it.
    expect((await taylor.post("/friends/list")).body.friends.friendships).toEqual([]);
  });

  test("a friend request names an existing username, and can't go to yourself", async () => {
    const jamie = await signedUp("jamie");
    expect(
      await jamie.post("/friends/request", { username: "nobody-has-this-name" }),
    ).toMatchObject({
      status: 404,
      body: { error: "NOT_FOUND" },
    });
    expect(await jamie.post("/friends/request", { username: jamie.username })).toMatchObject({
      status: 409,
    });
  });
});

describe("Signed-in users can do everything they're allowed to", () => {
  test("an owner updates, sets the flexibility of, and cancels their own run", async () => {
    const morgan = await signedUp("morgan");
    const run = await createRun(morgan);
    expect(await runById(morgan, run)).toMatchObject({ owner: morgan.username, ...RUN });

    expect((await morgan.post("/runs/update", { run, distance: 6 })).status).toBe(200);
    expect(
      (
        await morgan.post("/runs/flexibility", {
          run,
          earliestTime: "2026-11-07T09:30",
          latestTime: "2026-11-07T11:00",
        })
      ).status,
    ).toBe(200);
    expect(await runById(morgan, run)).toMatchObject({
      distance: 6,
      earliestTime: "2026-11-07T09:30",
      latestTime: "2026-11-07T11:00",
    });

    expect((await morgan.post("/runs/cancel", { run })).status).toBe(200);
    expect(await runById(morgan, run)).toMatchObject({ status: "CANCELED", distance: 6 });
  });

  test("a friend joins and leaves a run as themselves, and can't join twice", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    await befriend(jamie, morgan);
    const run = await createRun(morgan);

    expect((await jamie.post("/runs/join", { event: run })).status).toBe(200);
    expect(await participantsOf(morgan, run)).toEqual([jamie.username]);
    expect(await jamie.post("/runs/join", { event: run })).toMatchObject({ status: 409 });
    expect((await jamie.post("/runs/leave", { event: run })).status).toBe(200);
    expect(await participantsOf(morgan, run)).toEqual([]);
    expect(await jamie.post("/runs/leave", { event: run })).toMatchObject({ status: 404 });
  });

  test("a recipient rejects a request, a friend removes a friendship, and a suggester withdraws, while an owner rejects", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");

    const first = (await jamie.post("/friends/request", { username: morgan.username })).body
      .request;
    expect((await morgan.post("/friends/reject", { request: first })).status).toBe(200);
    const { body: requests } = await morgan.post("/friends/requests");
    expect(
      requests.requests.requests.find((each: { request: string }) => each.request === first),
    ).toBeUndefined();

    const friendship = await befriend(jamie, morgan);
    const run = await createRun(morgan);
    const withdrawn = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:15" })
    ).body.suggestion;
    expect((await jamie.post("/suggestions/withdraw", { suggestion: withdrawn })).status).toBe(200);
    const rejected = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:45" })
    ).body.suggestion;
    expect((await morgan.post("/suggestions/reject", { suggestion: rejected })).status).toBe(200);
    expect(await suggestionById(jamie, withdrawn)).toMatchObject({ status: "WITHDRAWN" });
    expect(await suggestionById(jamie, rejected)).toMatchObject({ status: "REJECTED" });
    expect((await runById(morgan, run))?.startTime).toBe(RUN.startTime);

    expect((await jamie.post("/friends/remove", { friendship })).status).toBe(200);
  });
});

describe("The Morgan–Jamie journey, with two signed-in accounts", () => {
  test("Morgan plans a flexible run, Jamie befriends her, suggests 10:30, and Morgan accepts", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");

    // Morgan creates a five-mile run along the Charles at 10:00, flexible between 9:30 and 11:00.
    const run = await createRun(morgan, { ...RUN, startTime: "2026-11-07T10:00", distance: 5 });
    expect(
      (
        await morgan.post("/runs/flexibility", {
          run,
          earliestTime: "2026-11-07T09:30",
          latestTime: "2026-11-07T11:00",
        })
      ).status,
    ).toBe(200);

    // Jamie sends Morgan a friend request by username, and Morgan accepts it.
    const sent = await jamie.post("/friends/request", { username: morgan.username });
    expect(sent.status).toBe(200);
    const { body: pending } = await morgan.post("/friends/requests");
    expect(pending.requests.requests).toContainEqual({
      request: sent.body.request,
      sender: jamie.username,
      recipient: morgan.username,
    });
    const accepted = await morgan.post("/friends/accept", { request: sent.body.request });
    expect(accepted.status).toBe(200);
    const { body: friends } = await jamie.post("/friends/list");
    expect(friends.friends.friendships).toContainEqual({
      friendship: accepted.body.friendship,
      user1: jamie.username,
      user2: morgan.username,
    });

    // Jamie sees Morgan's run among her friends' runs.
    expect(await runById(jamie, run)).toMatchObject({
      owner: morgan.username,
      startTime: "2026-11-07T10:00",
      earliestTime: "2026-11-07T09:30",
      latestTime: "2026-11-07T11:00",
    });

    // Jamie can't make 10:00, so she suggests 10:30; Morgan is the decider.
    const suggested = await jamie.post("/suggestions/create", {
      event: run,
      change: "2026-11-07T10:30",
    });
    expect(suggested.status).toBe(200);
    expect(await suggestionById(morgan, suggested.body.suggestion)).toMatchObject({
      suggester: jamie.username,
      decider: morgan.username,
      status: "PENDING",
    });

    // Morgan accepts: the run moves to 10:30 and Jamie becomes a participant, as both of them see.
    const decided = await morgan.post("/suggestions/accept", {
      suggestion: suggested.body.suggestion,
    });
    expect(decided).toMatchObject({
      status: 200,
      body: { event: run, change: "2026-11-07T10:30" },
    });
    for (const viewer of [morgan, jamie]) {
      expect(await runById(viewer, run)).toMatchObject({
        owner: morgan.username,
        startTime: "2026-11-07T10:30",
      });
      expect(await participantsOf(viewer, run)).toEqual([jamie.username]);
      expect(await suggestionById(viewer, suggested.body.suggestion)).toMatchObject({
        status: "ACCEPTED",
      });
    }
  });
});
