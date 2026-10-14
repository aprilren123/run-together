import { describe, expect, test } from "bun:test";
import { freshApp } from "../support/http.ts";

/** Everyone the signed-in person sees under "People on RunTogether": the search with no text. */
async function people(person: { post: (path: string, body?: object) => Promise<any> }) {
  const answer = await person.post("/friends/search", { text: "" });
  expect(answer.status).toBe(200);
  return answer.body.people as { username: string }[];
}
const names = async (person: Parameters<typeof people>[0]) =>
  (await people(person)).map((each) => each.username);

describe("People on RunTogether", () => {
  test("with only one account, the list is empty: nobody is made up and the user isn't listed", async () => {
    const app = await freshApp();
    const morgan = await app.signedUp("morgan", "morgan");
    expect(await people(morgan)).toEqual([]);
  });

  test("a newly registered account appears for everyone else, and never for itself", async () => {
    const app = await freshApp();
    const morgan = await app.signedUp("morgan", "morgan");
    const jamie = await app.signedUp("jamie", "jamie");
    expect(await names(morgan)).toEqual(["jamie"]);
    expect(await names(jamie)).toEqual(["morgan"]);

    await app.signedUp("Taylor", "Taylor");
    expect(await names(morgan)).toEqual(["jamie", "Taylor"]);
    expect(await names(jamie)).toEqual(["morgan", "Taylor"]);
  });

  test("lists at most 10 people, alphabetically, ignoring case", async () => {
    const app = await freshApp();
    const viewer = await app.signedUp("zz-viewer", "zz-viewer");
    for (const name of [
      "kai",
      "Ana",
      "bob",
      "Cyd",
      "dee",
      "Eli",
      "fay",
      "Gus",
      "hal",
      "Ivy",
      "joe",
      "Lua",
    ]) {
      await app.signedUp(name, name);
    }
    expect(await names(viewer)).toEqual([
      "Ana",
      "bob",
      "Cyd",
      "dee",
      "Eli",
      "fay",
      "Gus",
      "hal",
      "Ivy",
      "joe",
    ]);
  });

  test("each person is only a username: no account id, password, or session", async () => {
    const app = await freshApp();
    const morgan = await app.signedUp("morgan", "morgan");
    await app.signedUp("jamie", "jamie");
    const answer = await morgan.post("/friends/search", { text: "" });
    expect(answer.body).toEqual({ people: [{ username: "jamie" }] });
    const raw = JSON.stringify(answer.body);
    expect(raw).not.toContain("sea-shells-42");
    expect(raw).not.toContain("argon2");
    expect(raw).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    expect(answer.cookies).toEqual([]);
  });

  test("discovery needs a signed-in session", async () => {
    const app = await freshApp();
    await app.signedUp("morgan", "morgan");
    expect(await app.browser().post("/friends/search", { text: "" })).toMatchObject({
      status: 401,
      body: { error: "UNAUTHORIZED" },
    });
  });

  test("typing searches instead: one letter shows nobody, two or more match, and no match is empty", async () => {
    const app = await freshApp();
    const morgan = await app.signedUp("morgan", "morgan");
    await app.signedUp("jamie", "jamie");
    await app.signedUp("james", "james");
    const search = async (text: string) =>
      ((await morgan.post("/friends/search", { text })).body.people as { username: string }[]).map(
        (each) => each.username,
      );
    expect(await search("j")).toEqual([]);
    expect(await search("JAM")).toEqual(["james", "jamie"]);
    expect(await search("mor")).toEqual([]);
    expect(await search("zz")).toEqual([]);
  });
});

describe("Making friends with discovered people", () => {
  test("a listed person can be sent a request, and the statuses follow it through to friends", async () => {
    const app = await freshApp();
    const morgan = await app.signedUp("morgan", "morgan");
    const jamie = await app.signedUp("jamie", "jamie");
    const [{ username }] = await people(jamie);

    const sent = await jamie.post("/friends/request", { username });
    expect(sent.status).toBe(200);
    // What the Friends page reads to show "Requested" for Jamie and "Accept / Decline" for Morgan.
    const pending = { request: sent.body.request, sender: "jamie", recipient: "morgan" };
    expect((await jamie.post("/friends/requests")).body.requests.requests).toEqual([pending]);
    expect((await morgan.post("/friends/requests")).body.requests.requests).toEqual([pending]);

    const accepted = await morgan.post("/friends/accept", { request: sent.body.request });
    expect(accepted.status).toBe(200);
    // And "Already friends" for both.
    const friendship = { friendship: accepted.body.friendship, user1: "jamie", user2: "morgan" };
    expect((await jamie.post("/friends/list")).body.friends.friendships).toEqual([friendship]);
    expect((await morgan.post("/friends/list")).body.friends.friendships).toEqual([friendship]);
    expect(await names(morgan)).toEqual(["jamie"]);
  });
});

describe("Accounts are real and last", () => {
  test("after a restart, people can log in again with their password and are still listed", async () => {
    const before = await freshApp();
    await before.signedUp("morgan", "morgan");
    await before.signedUp("jamie", "jamie");

    // A second app on the same database, as after restarting the server.
    const after = await freshApp(before.database);
    const morgan = after.browser();
    expect(
      (await morgan.post("/auth/login", { username: "morgan", password: "sea-shells-42" })).status,
    ).toBe(200);
    expect((await morgan.post("/auth/me")).body).toEqual({ username: "morgan" });
    expect(await names(morgan)).toEqual(["jamie"]);
    expect(
      await after.browser().post("/auth/login", { username: "jamie", password: "wrong-password" }),
    ).toMatchObject({ status: 401 });
  });

  test("every listed person has a password: each one can log in", async () => {
    const app = await freshApp();
    const viewer = await app.signedUp("viewer", "viewer");
    for (const name of ["morgan", "jamie"]) await app.signedUp(name, name);
    for (const username of await names(viewer)) {
      const login = await app
        .browser()
        .post("/auth/login", { username, password: "sea-shells-42" });
      expect({ username, status: login.status }).toEqual({ username, status: 200 });
    }
  });
});
