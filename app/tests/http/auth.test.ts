import { describe, expect, test } from "bun:test";
import { browser, commons, SESSION, SIGN_IN, unique } from "../support/http.ts";

describe("Signing in with a password over HTTP", () => {
  test("registering sets an HttpOnly session cookie, /auth/me answers the username, and logout clears it", async () => {
    const ben = browser();
    const username = unique("ben");

    const registered = await ben.post("/auth/register", { username, password: "sea-shells-42" });
    expect(registered.status).toBe(200);
    // The session and its expiry go only in the cookie, so scripts on the page never see the session.
    expect(registered.body).toEqual({ user: expect.any(String) });
    expect(registered.cookies[0]).toStartWith(`${SESSION}=`);
    expect(registered.cookies[0]).toContain("HttpOnly");
    expect(registered.cookies[0]).toContain("Secure");
    expect(registered.cookies[0]).toContain("SameSite=Strict");
    expect(ben.jar.has(SESSION)).toBe(true);

    expect(await ben.post("/auth/me")).toMatchObject({ status: 200, body: { username } });

    const out = await ben.post("/auth/logout");
    expect(out.status).toBe(200);
    expect(ben.jar.has(SESSION)).toBe(false);
    expect(await ben.post("/auth/me")).toMatchObject({
      status: 401,
      body: { error: "UNAUTHORIZED" },
    });
  });

  test("logging in with the right password starts a new session for the same user", async () => {
    const username = unique("maya");
    const { body: registered } = await browser().post("/auth/register", {
      username,
      password: "sea-shells-42",
    });

    const laptop = browser();
    const login = await laptop.post("/auth/login", { username, password: "sea-shells-42" });
    expect(login).toMatchObject({ status: 200, body: { user: registered.user } });
    expect(laptop.jar.has(SESSION)).toBe(true);
    expect(await laptop.post("/auth/me")).toMatchObject({ status: 200, body: { username } });
  });

  test("a password shorter than 8 characters is refused with 400, and no account or session is created", async () => {
    const leo = browser();
    const username = unique("leo");
    const refused = await leo.post("/auth/register", { username, password: "short" });
    expect(refused).toMatchObject({ status: 400, body: { error: "INVALID_REQUEST" }, cookies: [] });
    expect(await leo.post("/auth/login", { username, password: "short" })).toMatchObject({
      status: 401,
    });
  });

  test("an invalid username is refused with 400", async () => {
    for (const username of ["ab", "has space", "x".repeat(33)]) {
      expect(
        await browser().post("/auth/register", { username, password: "sea-shells-42" }),
      ).toMatchObject({
        status: 400,
        body: { error: "INVALID_REQUEST" },
      });
    }
  });

  test("registering a taken username is refused with 409 and sets no session", async () => {
    const username = unique("sam");
    expect(
      (await browser().post("/auth/register", { username, password: "sea-shells-42" })).status,
    ).toBe(200);
    const second = browser();
    const taken = await second.post("/auth/register", { username, password: "other-password" });
    expect(taken).toMatchObject({ status: 409, body: { error: "CONFLICT" }, cookies: [] });
    expect(second.jar.has(SESSION)).toBe(false);
  });

  test("a wrong password and an unknown username are both refused with 401, so neither reveals which accounts exist", async () => {
    const username = unique("kai");
    await browser().post("/auth/register", { username, password: "sea-shells-42" });

    const wrong = await browser().post("/auth/login", { username, password: "guessed-password" });
    const unknown = await browser().post("/auth/login", {
      username: unique("nobody"),
      password: "sea-shells-42",
    });
    for (const refused of [wrong, unknown]) {
      expect(refused).toMatchObject({ status: 401, body: { error: "UNAUTHORIZED" }, cookies: [] });
    }
  });

  test("/auth/me and /auth/logout refuse a missing, made-up, or ended session with 401", async () => {
    const none = browser();
    expect(await none.post("/auth/me")).toMatchObject({ status: 401 });
    expect(await none.post("/auth/logout")).toMatchObject({ status: 401 });

    const forged = browser();
    forged.jar.set(SESSION, "a".repeat(43));
    expect(await forged.post("/auth/me")).toMatchObject({ status: 401 });

    const ended = browser();
    await ended.post("/auth/register", { username: unique("ana"), password: "sea-shells-42" });
    const stale = ended.jar.get(SESSION)!;
    await ended.post("/auth/logout");
    ended.jar.set(SESSION, stale);
    expect(await ended.post("/auth/me")).toMatchObject({
      status: 401,
      body: { error: "UNAUTHORIZED" },
    });
  });

  test("a request from another origin is refused, so another site can't sign a browser in or out", async () => {
    const response = await browser().post(
      "/auth/register",
      { username: unique("eve"), password: "sea-shells-42" },
      { Origin: "https://evil.example" },
    );
    expect(response.status).toBe(403);
  });
});

describe("Signing in with Commons over HTTP", () => {
  test("starting sets the sign-in cookie, and finishing swaps it for a session", async () => {
    const sam = browser();
    const start = await sam.post("/auth/commons/start");
    expect(start.body).toEqual({ address: expect.any(String) });
    expect(sam.jar.has(SIGN_IN)).toBe(true);

    const username = unique("commons");
    const { code, state } = commons.approve(start.body.address, {
      subject: unique("subject"),
      username,
    });
    expect((await sam.post("/auth/commons/finish", { state, code })).status).toBe(200);
    expect(sam.jar.has(SIGN_IN)).toBe(false);
    expect(sam.jar.has(SESSION)).toBe(true);
    expect((await sam.post("/auth/me")).body).toEqual({ username });
  });

  test("a code Commons didn't issue is refused with 403 and starts no session", async () => {
    const sam = browser();
    const start = await sam.post("/auth/commons/start");
    const state = new URL(start.body.address).searchParams.get("state")!;
    const refused = await sam.post("/auth/commons/finish", { state, code: "a-code-nobody-issued" });
    expect(refused.status).toBe(403);
    expect(sam.jar.has(SESSION)).toBe(false);
  });
});
