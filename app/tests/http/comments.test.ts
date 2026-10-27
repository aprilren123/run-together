import { describe, expect, test } from "bun:test";
import { freshApp } from "../support/http.ts";

type App = Awaited<ReturnType<typeof freshApp>>;
type Person = Awaited<ReturnType<App["signedUp"]>>;
type Comment = { comment: string; author: string; text: string; at: string };

const RUN = {
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "",
};

async function befriend(a: Person, b: Person) {
  const sent = await a.post("/friends/request", { username: b.username });
  expect((await b.post("/friends/accept", { request: sent.body.request })).status).toBe(200);
}

/** Morgan's run; Jamie is a friend who joined it, Taylor a friend who didn't, and Sam a stranger. */
async function scene(app?: App) {
  app ??= await freshApp();
  const morgan = await app.signedUp("morgan", "morgan");
  const jamie = await app.signedUp("jamie", "jamie");
  const taylor = await app.signedUp("taylor", "taylor");
  const sam = await app.signedUp("sam", "sam");
  await befriend(jamie, morgan);
  await befriend(taylor, morgan);
  const run = (await morgan.post("/runs/create", RUN)).body.run as string;
  await jamie.post("/runs/join", { event: run });
  return { app, morgan, jamie, taylor, sam, run };
}

const list = async (person: Person, run: string) => {
  const answer = await person.post("/comments/list", { run });
  return { status: answer.status, comments: (answer.body.comments?.comments ?? []) as Comment[] };
};
const texts = async (person: Person, run: string) =>
  (await list(person, run)).comments.map((c) => [c.author, c.text]);
const post = (person: Person, run: string, text: unknown) =>
  person.post("/comments/post", { run, text });

describe("Reading and posting comments", () => {
  test("the owner, a participant, and another friend post comments everyone with access sees, oldest first", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    expect(await list(morgan, run)).toEqual({ status: 200, comments: [] });

    for (const [person, text] of [
      [jamie, "Can we meet at the boathouse instead?"],
      [morgan, "Sure, see you there."],
      [taylor, "I might join too!"],
    ] as const) {
      const posted = await post(person, run, text);
      expect(posted.status).toBe(200);
      expect(posted.body).toEqual({ comment: expect.any(String) });
    }

    for (const viewer of [morgan, jamie, taylor]) {
      const { status, comments } = await list(viewer, run);
      expect(status).toBe(200);
      expect(comments.map((c) => [c.author, c.text])).toEqual([
        ["jamie", "Can we meet at the boathouse instead?"],
        ["morgan", "Sure, see you there."],
        ["taylor", "I might join too!"],
      ]);
      // Each comment carries its author's username and a time, never an account id.
      for (const c of comments) {
        expect(Object.keys(c).sort()).toEqual(["at", "author", "comment", "text"]);
        expect(Number.isNaN(Date.parse(c.at))).toBe(false);
      }
    }
  });

  test("each run has its own comments", async () => {
    const { morgan, jamie, run } = await scene();
    const other = (await morgan.post("/runs/create", { ...RUN, startTime: "2026-11-08T10:00" }))
      .body.run as string;
    await post(jamie, run, "On this run");
    await post(jamie, other, "On the other run");
    expect(await texts(morgan, run)).toEqual([["jamie", "On this run"]]);
    expect(await texts(morgan, other)).toEqual([["jamie", "On the other run"]]);
  });

  test("an empty, blank, over-long, or non-text comment is refused with 400, and nothing is stored", async () => {
    const { jamie, run } = await scene();
    for (const text of ["", "    ", "x".repeat(501), 42, null]) {
      expect(await post(jamie, run, text)).toMatchObject({ status: 400 });
    }
    expect(await texts(jamie, run)).toEqual([]);
    expect((await post(jamie, run, "x".repeat(500))).status).toBe(200);
  });

  test("the same comment twice in a row, as from a double click, is stored once", async () => {
    const { jamie, run } = await scene();
    const [first, second] = await Promise.all([
      post(jamie, run, "Running 5 min late"),
      post(jamie, run, "Running 5 min late"),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(await post(jamie, run, "Running 5 min late")).toMatchObject({
      status: 409,
      body: { error: "CONFLICT" },
    });
    expect(await texts(jamie, run)).toEqual([["jamie", "Running 5 min late"]]);
  });
});

describe("Who can't read or post", () => {
  test("someone who can't see the run gets 404 for listing and posting, and nothing is stored", async () => {
    const { morgan, sam, run } = await scene();
    await post(morgan, run, "Owner's note");
    expect(await sam.post("/comments/list", { run })).toMatchObject({
      status: 404,
      body: { error: "NOT_FOUND" },
    });
    expect(await post(sam, run, "Let me in")).toMatchObject({ status: 404 });
    expect(await texts(morgan, run)).toEqual([["morgan", "Owner's note"]]);
  });

  test("a run that doesn't exist gets the same 404", async () => {
    const { jamie } = await scene();
    expect(await jamie.post("/comments/list", { run: "no-such-run" })).toMatchObject({
      status: 404,
    });
    expect(await post(jamie, "no-such-run", "Hello?")).toMatchObject({ status: 404 });
  });

  test("without a session, listing, posting, and deleting are refused with 401", async () => {
    const { app, morgan, run } = await scene();
    const { comment } = (await post(morgan, run, "Hi")).body;
    const anonymous = app.browser();
    for (const [path, body] of [
      ["/comments/list", { run }],
      ["/comments/post", { run, text: "Hi" }],
      ["/comments/delete", { comment }],
    ] as const) {
      expect(await anonymous.post(path, body)).toMatchObject({
        status: 401,
        body: { error: "UNAUTHORIZED" },
      });
    }
    expect(await texts(morgan, run)).toEqual([["morgan", "Hi"]]);
  });

  test("after the friendship ends, a friend who never joined loses access; a participant keeps it", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    await post(taylor, run, "From Taylor");
    for (const [person, other] of [
      [taylor, morgan],
      [jamie, morgan],
    ] as const) {
      const friendships = (await person.post("/friends/list")).body.friends.friendships as {
        friendship: string;
        user1: string;
        user2: string;
      }[];
      const mine = friendships.find((f) => [f.user1, f.user2].includes(other.username))!;
      await person.post("/friends/remove", { friendship: mine.friendship });
    }
    expect((await taylor.post("/comments/list", { run })).status).toBe(404);
    expect((await post(taylor, run, "Still here?")).status).toBe(404);
    // Jamie joined the run, so she can still see it, and talk about it.
    expect((await post(jamie, run, "Still coming")).status).toBe(200);
    expect(await texts(jamie, run)).toEqual([
      ["taylor", "From Taylor"],
      ["jamie", "Still coming"],
    ]);
  });
});

describe("Canceled runs", () => {
  test("a canceled run keeps its comments, readable by everyone with access, but takes no new ones", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    await post(jamie, run, "See you Saturday");
    expect((await morgan.post("/runs/cancel", { run })).status).toBe(200);
    for (const person of [morgan, jamie, taylor]) {
      expect(await post(person, run, "Too bad")).toMatchObject({
        status: 409,
        body: { error: "CONFLICT" },
      });
      expect(await texts(person, run)).toEqual([["jamie", "See you Saturday"]]);
    }
  });

  test("comments on a canceled run can still be deleted by their author or moderated by the owner", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    const { comment: jamies } = (await post(jamie, run, "Mine")).body;
    const { comment: taylors } = (await post(taylor, run, "Taylor's")).body;
    await morgan.post("/runs/cancel", { run });
    expect((await jamie.post("/comments/delete", { comment: jamies })).status).toBe(200);
    expect((await morgan.post("/comments/delete", { comment: taylors })).status).toBe(200);
    expect(await texts(morgan, run)).toEqual([]);
  });
});

describe("Deleting and moderating", () => {
  test("an author deletes their own comment, and only that one", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    const { comment } = (await post(jamie, run, "Oops, wrong run")).body;
    await post(taylor, run, "Hello");
    expect(await jamie.post("/comments/delete", { comment })).toMatchObject({
      status: 200,
      body: { comment },
    });
    expect(await texts(morgan, run)).toEqual([["taylor", "Hello"]]);
    expect((await jamie.post("/comments/delete", { comment })).status).toBe(404);
  });

  test("another participant, friend, or stranger can't delete someone's comment, and it stays", async () => {
    const { morgan, jamie, taylor, sam, run } = await scene();
    const { comment } = (await post(morgan, run, "Owner's note")).body;
    const { comment: jamies } = (await post(jamie, run, "Jamie's note")).body;
    for (const [person, target] of [
      [jamie, comment],
      [taylor, comment],
      [sam, comment],
      [taylor, jamies],
      [sam, jamies],
    ] as const) {
      expect(await person.post("/comments/delete", { comment: target })).toMatchObject({
        status: 404,
        body: { error: "NOT_FOUND" },
      });
    }
    expect(await taylor.post("/comments/delete", { comment: "no-such-comment" })).toMatchObject({
      status: 404,
    });
    expect(await texts(morgan, run)).toEqual([
      ["morgan", "Owner's note"],
      ["jamie", "Jamie's note"],
    ]);
  });

  test("the run's owner can remove anyone's comment on their run, but not on someone else's run", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    const { comment } = (await post(jamie, run, "Off-topic")).body;
    expect(await morgan.post("/comments/delete", { comment })).toMatchObject({
      status: 200,
      body: { comment },
    });
    expect(await texts(morgan, run)).toEqual([]);

    // Taylor's own run, which Morgan can see as a friend but doesn't own: she can't moderate there.
    const taylorsRun = (await taylor.post("/runs/create", RUN)).body.run as string;
    const { comment: onTaylors } = (await post(taylor, taylorsRun, "My run, my note")).body;
    expect((await morgan.post("/comments/delete", { comment: onTaylors })).status).toBe(404);
    expect(await texts(taylor, taylorsRun)).toEqual([["taylor", "My run, my note"]]);
  });
});

describe("Comments last", () => {
  test("comments are still there after the server restarts", async () => {
    const before = await scene();
    await post(before.jamie, before.run, "Saved before the restart");
    await post(before.morgan, before.run, "Me too");

    // A second app on the same database, as after restarting the server.
    const after = await freshApp(before.app.database);
    const morgan = after.browser();
    expect(
      (await morgan.post("/auth/login", { username: "morgan", password: "sea-shells-42" })).status,
    ).toBe(200);
    const { comments } = (await morgan.post("/comments/list", { run: before.run })).body.comments;
    expect(comments.map((c: Comment) => [c.author, c.text])).toEqual([
      ["jamie", "Saved before the restart"],
      ["morgan", "Me too"],
    ]);
  });
});
