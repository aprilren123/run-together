import { describe, expect, test } from "bun:test";
import { browser, signedUp, unique } from "../support/http.ts";

type Person = Awaited<ReturnType<typeof signedUp>>;

const RUN = {
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "",
};

async function createRun(owner: Person): Promise<string> {
  const created = await owner.post("/runs/create", RUN);
  expect(created.status).toBe(200);
  return created.body.run;
}

async function befriend(a: Person, b: Person): Promise<string> {
  const sent = await a.post("/friends/request", { username: b.username });
  expect(sent.status).toBe(200);
  const accepted = await b.post("/friends/accept", { request: sent.body.request });
  expect(accepted.status).toBe(200);
  return accepted.body.friendship;
}

const runIds = async (viewer: Person) =>
  ((await viewer.post("/runs/list")).body.runs.runs as { run: string }[]).map((each) => each.run);
const participantEvents = async (viewer: Person) =>
  (
    (await viewer.post("/runs/participants")).body.participants.participations as {
      event: string;
    }[]
  ).map((each) => each.event);
const suggestionIds = async (viewer: Person) =>
  (
    (await viewer.post("/suggestions/list")).body.suggestions.suggestions as {
      suggestion: string;
    }[]
  ).map((each) => each.suggestion);
const search = async (person: Person, text: string) => person.post("/friends/search", { text });

describe("Find friends", () => {
  test("a search finds registered usernames containing the text, ignoring case, and leaves out the searcher", async () => {
    const tag = unique("findme").replace(/-/g, "");
    const me = await signedUp(`${tag}-me`);
    const ana = await signedUp(`${tag}-ana`);
    const bo = await signedUp(`${tag}-BO`);
    await signedUp("someone-else");

    const found = await search(me, tag.toUpperCase());
    expect(found.status).toBe(200);
    const names = (found.body.people as { username: string }[]).map((each) => each.username);
    expect(names).toContain(ana.username);
    expect(names).toContain(bo.username);
    expect(names).not.toContain(me.username);
    expect(names.every((name) => name.toLowerCase().includes(tag.toLowerCase()))).toBe(true);
  });

  test("each result holds only a username, never a user id or anything else", async () => {
    const tag = unique("private").replace(/-/g, "");
    const me = await signedUp(`${tag}-me`);
    await signedUp(`${tag}-other`);
    const { body } = await search(me, tag);
    expect(body.people.length).toBeGreaterThan(0);
    for (const person of body.people) expect(Object.keys(person)).toEqual(["username"]);
  });

  test("a search shorter than 2 characters finds nobody, and at most 10 people are returned", async () => {
    const tag = unique("crowd").replace(/-/g, "");
    const me = await signedUp("searcher");
    for (let i = 0; i < 12; i += 1) await signedUp(`${tag}${i}`);
    expect((await search(me, "c")).body.people).toEqual([]);
    expect((await search(me, tag)).body.people).toHaveLength(10);
  });

  test("searching needs a session", async () => {
    expect(await browser().post("/friends/search", { text: "maya" })).toMatchObject({
      status: 401,
    });
  });

  test("a found person can be sent a request with the existing Friending actions, and accepted", async () => {
    const tag = unique("pair").replace(/-/g, "");
    const morgan = await signedUp(`${tag}-morgan`);
    const jamie = await signedUp(`${tag}-jamie`);
    const [{ username }] = (await search(jamie, `${tag}-mor`)).body.people;
    expect(username).toBe(morgan.username);
    const sent = await jamie.post("/friends/request", { username });
    expect(sent.status).toBe(200);
    expect((await morgan.post("/friends/accept", { request: sent.body.request })).status).toBe(200);
  });

  test("friend and request lists hold only the signed-in user's own friendships and requests", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const taylor = await signedUp("taylor");
    const friendship = await befriend(jamie, morgan);
    const pending = (await taylor.post("/friends/request", { username: jamie.username })).body
      .request;

    const morgansFriends = (await morgan.post("/friends/list")).body.friends.friendships;
    expect(morgansFriends).toEqual([{ friendship, user1: jamie.username, user2: morgan.username }]);
    expect((await morgan.post("/friends/requests")).body.requests.requests).toEqual([]);
    expect((await jamie.post("/friends/requests")).body.requests.requests).toEqual([
      { request: pending, sender: taylor.username, recipient: jamie.username },
    ]);
    expect((await taylor.post("/friends/list")).body.friends.friendships).toEqual([]);
  });
});

describe("Runs are visible only to their owner and the owner's friends", () => {
  test("the run list holds my runs and my friends' runs, and nobody else's", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const stranger = await signedUp("stranger");
    await befriend(jamie, morgan);
    const morgans = await createRun(morgan);
    const jamies = await createRun(jamie);
    const strangers = await createRun(stranger);

    expect((await runIds(morgan)).sort()).toEqual([morgans, jamies].sort());
    expect((await runIds(jamie)).sort()).toEqual([morgans, jamies].sort());
    expect(await runIds(stranger)).toEqual([strangers]);
  });

  test("participants and suggestions of a hidden run aren't listed either", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const stranger = await signedUp("stranger");
    await befriend(jamie, morgan);
    const run = await createRun(morgan);
    await jamie.post("/runs/join", { event: run });
    const suggestion = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" })
    ).body.suggestion;

    expect(await participantEvents(morgan)).toContain(run);
    expect(await participantEvents(stranger)).not.toContain(run);
    expect(await suggestionIds(morgan)).toContain(suggestion);
    expect(await suggestionIds(jamie)).toContain(suggestion);
    expect(await suggestionIds(stranger)).not.toContain(suggestion);
  });

  test("a friend sees only suggestions they made or decide on, not other friends' suggestions", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const taylor = await signedUp("taylor");
    await befriend(jamie, morgan);
    await befriend(taylor, morgan);
    const run = await createRun(morgan);
    const jamies = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" })
    ).body.suggestion;
    expect(await suggestionIds(taylor)).not.toContain(jamies);
  });

  test("removing a friend hides their runs again, and stops joining and suggesting", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const friendship = await befriend(jamie, morgan);
    const run = await createRun(morgan);
    expect(await runIds(jamie)).toContain(run);

    expect((await jamie.post("/friends/remove", { friendship })).status).toBe(200);
    expect(await runIds(jamie)).not.toContain(run);
    expect(await jamie.post("/runs/join", { event: run })).toMatchObject({ status: 404 });
    expect(await jamie.post("/suggestions/create", { event: run, change: "x" })).toMatchObject({
      status: 404,
    });
  });
});

describe("Only accepted friends can join a run or suggest a change", () => {
  test("a stranger calling the endpoints directly is refused with 404, the same as for a run that doesn't exist", async () => {
    const morgan = await signedUp("morgan");
    const stranger = await signedUp("stranger");
    const run = await createRun(morgan);

    for (const event of [run, "no-such-run"]) {
      expect(await stranger.post("/runs/join", { event })).toMatchObject({
        status: 404,
        body: { error: "NOT_FOUND" },
      });
      expect(
        await stranger.post("/suggestions/create", { event, change: "2026-11-07T10:30" }),
      ).toMatchObject({
        status: 404,
        body: { error: "NOT_FOUND" },
      });
    }
    expect((await morgan.post("/runs/participants")).body.participants.participations).toEqual([]);
    expect(await suggestionIds(morgan)).toEqual([]);
  });

  test("a pending friend request isn't enough: only an accepted friendship counts", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    await jamie.post("/friends/request", { username: morgan.username });
    const run = await createRun(morgan);
    expect(await runIds(jamie)).not.toContain(run);
    expect(await jamie.post("/runs/join", { event: run })).toMatchObject({ status: 404 });
  });

  test("an owner can't join or suggest a change to their own run", async () => {
    const morgan = await signedUp("morgan");
    const run = await createRun(morgan);
    expect(await morgan.post("/runs/join", { event: run })).toMatchObject({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
    expect(await morgan.post("/suggestions/create", { event: run, change: "x" })).toMatchObject({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
  });

  test("an accepted friend joins and suggests, whichever of them sent the friend request", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const taylor = await signedUp("taylor");
    await befriend(jamie, morgan); // Jamie asked.
    await befriend(morgan, taylor); // Morgan asked.
    const run = await createRun(morgan);

    for (const friend of [jamie, taylor]) {
      expect((await friend.post("/runs/join", { event: run })).status).toBe(200);
      expect(
        (await friend.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" }))
          .status,
      ).toBe(200);
    }
    const going = (
      (await morgan.post("/runs/participants")).body.participants.participations as {
        user: string;
        event: string;
      }[]
    )
      .filter((each) => each.event === run)
      .map((each) => each.user)
      .sort();
    expect(going).toEqual([jamie.username, taylor.username].sort());
  });

  test("friends still can't manage someone else's run; the owner still can", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    await befriend(jamie, morgan);
    const run = await createRun(morgan);
    for (const [path, body] of [
      ["/runs/update", { run, distance: 10 }],
      ["/runs/flexibility", { run, earliestTime: "2026-11-07T06:00" }],
      ["/runs/cancel", { run }],
    ] as const) {
      expect(await jamie.post(path, body)).toMatchObject({ status: 403 });
    }
    expect((await morgan.post("/runs/update", { run, distance: 6 })).status).toBe(200);
    expect((await morgan.post("/runs/cancel", { run })).status).toBe(200);
    expect(await runIds(jamie)).not.toContain(run);
  });
});

describe("Accepting a suggestion rechecks the friendship", () => {
  async function state(owner: Person, run: string, suggestion: string) {
    const runs = (await owner.post("/runs/list")).body.runs.runs as {
      run: string;
      startTime: string;
    }[];
    const suggestions = (await owner.post("/suggestions/list")).body.suggestions.suggestions as {
      suggestion: string;
      status: string;
    }[];
    const participants = (await owner.post("/runs/participants")).body.participants
      .participations as { user: string; event: string }[];
    return {
      startTime: runs.find((each) => each.run === run)?.startTime,
      status: suggestions.find((each) => each.suggestion === suggestion)?.status,
      going: participants.filter((each) => each.event === run).map((each) => each.user),
    };
  }

  test("once the friendship has ended, accepting is refused and the run, suggestion, and participants don't change", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const friendship = await befriend(jamie, morgan);
    const run = await createRun(morgan);
    const suggestion = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" })
    ).body.suggestion;
    expect((await jamie.post("/friends/remove", { friendship })).status).toBe(200);

    const before = await state(morgan, run, suggestion);
    expect(before).toEqual({ startTime: RUN.startTime, status: "PENDING", going: [] });
    expect(await morgan.post("/suggestions/accept", { suggestion })).toMatchObject({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
    expect(await state(morgan, run, suggestion)).toEqual(before);

    // The owner can still turn it down.
    expect((await morgan.post("/suggestions/reject", { suggestion })).status).toBe(200);
    expect((await state(morgan, run, suggestion)).status).toBe("REJECTED");
  });

  test("friends again, the owner can accept a pending suggestion, and a non-decider is still refused with 409", async () => {
    const morgan = await signedUp("morgan");
    const jamie = await signedUp("jamie");
    const friendship = await befriend(jamie, morgan);
    const run = await createRun(morgan);
    const suggestion = (
      await jamie.post("/suggestions/create", { event: run, change: "2026-11-07T10:30" })
    ).body.suggestion;
    await morgan.post("/friends/remove", { friendship });
    expect((await morgan.post("/suggestions/accept", { suggestion })).status).toBe(403);

    await befriend(morgan, jamie);
    expect(await jamie.post("/suggestions/accept", { suggestion })).toMatchObject({ status: 409 });
    expect(await morgan.post("/suggestions/accept", { suggestion })).toMatchObject({
      status: 200,
      body: { event: run, change: "2026-11-07T10:30" },
    });
    expect(await state(morgan, run, suggestion)).toEqual({
      startTime: "2026-11-07T10:30",
      status: "ACCEPTED",
      going: [jamie.username],
    });
  });
});
