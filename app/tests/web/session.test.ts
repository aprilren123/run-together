import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chooseUsername, finishCommons, startCommons } from "../../web/auth/commons.ts";
import { createSession, messages, post, UNREACHABLE } from "../../web/auth/session.ts";

/** A stand-in for the backend: answers each `/api` path with `routes[path]`, and records each request. */
type Route = () => Response | Promise<Response>;
let routes: Record<string, Route> = {};
let requests: { path: string; body: unknown }[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  routes = {};
  requests = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^\/api/, "");
    requests.push({ path, body: JSON.parse(String(init?.body ?? "{}")) });
    const route = routes[path];
    if (!route) throw new TypeError("Failed to fetch");
    return route();
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const json =
  (body: unknown, status = 200) =>
  () =>
    Response.json(body, { status });
const signedInAs = (username: string) => json({ username });
const refused = (error: string, status: number) => json({ error }, status);

describe("post", () => {
  test("answers the body of a success, and the category of a refusal", async () => {
    routes["/auth/me"] = signedInAs("maya");
    expect(await post("/auth/me")).toEqual({ ok: true, body: { username: "maya" } });
    routes["/auth/me"] = refused("UNAUTHORIZED", 401);
    expect(await post("/auth/me")).toEqual({ ok: false, error: "UNAUTHORIZED" });
  });

  test("a network failure, the frontend server's UNAVAILABLE, or a non-JSON 5xx is UNREACHABLE", async () => {
    expect(await post("/auth/me")).toEqual({ ok: false, error: UNREACHABLE });
    routes["/auth/me"] = refused("UNAVAILABLE", 503);
    expect(await post("/auth/me")).toEqual({ ok: false, error: UNREACHABLE });
    routes["/auth/me"] = () => new Response("proxy error", { status: 502 });
    expect(await post("/auth/me")).toEqual({ ok: false, error: UNREACHABLE });
  });

  test("sends the body as JSON", async () => {
    routes["/auth/login"] = json({ user: "u1" });
    await post("/auth/login", { username: "maya", password: "sea-shells-42" });
    expect(requests).toEqual([
      { path: "/auth/login", body: { username: "maya", password: "sea-shells-42" } },
    ]);
  });
});

describe("restoring the session on page load", () => {
  test("a live session cookie restores the signed-in username", async () => {
    const session = createSession();
    routes["/auth/me"] = signedInAs("maya");
    await session.load();
    expect(session.me.value).toEqual({ username: "maya" });
    expect(session.checked.value).toBe(true);
    expect(session.error.value).toBeNull();
  });

  test("no session shows the sign-in screen without an error", async () => {
    const session = createSession();
    routes["/auth/me"] = refused("UNAUTHORIZED", 401);
    await session.load();
    expect(session.me.value).toBeNull();
    expect(session.checked.value).toBe(true);
    expect(session.error.value).toBeNull();
  });

  test("a session that ended while signed in shows the sign-in screen with a note", async () => {
    const session = createSession();
    routes["/auth/me"] = signedInAs("maya");
    await session.load();
    routes["/auth/me"] = refused("UNAUTHORIZED", 401);
    await session.load();
    expect(session.me.value).toBeNull();
    expect(session.error.value).toBe(messages.ended);
  });

  test("an unreachable backend on load offers a retry, and on a later check keeps the person signed in", async () => {
    const first = createSession();
    await first.load();
    expect(first.unreachable.value).toBe(true);
    expect(first.me.value).toBeNull();

    const later = createSession();
    routes["/auth/me"] = signedInAs("maya");
    await later.load();
    delete routes["/auth/me"];
    await later.load();
    expect(later.me.value).toEqual({ username: "maya" });
    expect(later.unreachable.value).toBe(false);
  });
});

describe("signing in with a password", () => {
  const loginRefusals = { UNAUTHORIZED: "The username or password is incorrect." };

  test("a successful login loads the signed-in user and clears any error", async () => {
    const session = createSession();
    session.error.value = "old";
    routes["/auth/login"] = json({ user: "u1" });
    routes["/auth/me"] = signedInAs("maya");
    expect(await session.enter(post("/auth/login", {}), loginRefusals)).toBeNull();
    expect(session.me.value).toEqual({ username: "maya" });
    expect(session.error.value).toBeNull();
  });

  test("invalid credentials, a duplicate username, a network error, and the wrong origin each show their sentence", async () => {
    const session = createSession();
    routes["/auth/login"] = refused("UNAUTHORIZED", 401);
    expect(await session.enter(post("/auth/login", {}), loginRefusals)).toBe("UNAUTHORIZED");
    expect(session.error.value).toBe("The username or password is incorrect.");

    routes["/auth/register"] = refused("CONFLICT", 409);
    await session.enter(post("/auth/register", {}), { CONFLICT: "That username is taken." });
    expect(session.error.value).toBe("That username is taken.");

    delete routes["/auth/login"];
    expect(await session.enter(post("/auth/login", {}), loginRefusals)).toBe(UNREACHABLE);
    expect(session.error.value).toBe(messages.unreachable);

    routes["/auth/login"] = refused("FORBIDDEN", 403);
    await session.enter(post("/auth/login", {}), loginRefusals);
    expect(session.error.value).toBe(messages.wrongAddress);
    expect(session.me.value).toBeNull();
  });
});

describe("signing out", () => {
  async function signedIn() {
    const session = createSession();
    routes["/auth/me"] = signedInAs("maya");
    await session.load();
    return session;
  }

  test("logout clears the signed-in user", async () => {
    const session = await signedIn();
    routes["/auth/logout"] = json({});
    expect(await session.signOut()).toBe(true);
    expect(session.me.value).toBeNull();
    expect(requests.at(-1)?.path).toBe("/auth/logout");
  });

  test("logging out of a session that already ended still signs out", async () => {
    const session = await signedIn();
    routes["/auth/logout"] = refused("UNAUTHORIZED", 401);
    expect(await session.signOut()).toBe(true);
    expect(session.me.value).toBeNull();
  });

  test("an unreachable backend keeps the person signed in and says why", async () => {
    const session = await signedIn();
    expect(await session.signOut()).toBe(false);
    expect(session.me.value).toEqual({ username: "maya" });
    expect(session.error.value).toBe(messages.unreachable);
  });
});

describe("signing in with Commons", () => {
  test("start sends the browser to the address the backend answers", async () => {
    const session = createSession();
    const address = "https://class.mit-sdg.dev/connect?app=http%3A%2F%2Flocalhost%3A8080&state=s";
    routes["/auth/commons/start"] = json({ address });
    const visited: string[] = [];
    expect(await startCommons(session, (to) => visited.push(to))).toBe(true);
    expect(visited).toEqual([address]);
  });

  test("start shows a sentence and stays when the backend refuses or can't be reached", async () => {
    const session = createSession();
    const visited: string[] = [];
    expect(await startCommons(session, (to) => visited.push(to))).toBe(false);
    expect(session.error.value).toBe(messages.unreachable);
    routes["/auth/commons/start"] = refused("INTERNAL_ERROR", 500);
    await startCommons(session, (to) => visited.push(to));
    expect(session.error.value).toBe("Commons sign-in isn't available right now. Try again.");
    expect(visited).toEqual([]);
  });

  test("the callback posts the state and code from its address, and signs in", async () => {
    const session = createSession();
    routes["/auth/commons/finish"] = json({ user: "u1" });
    routes["/auth/me"] = signedInAs("sam");
    expect(await finishCommons(session, "?code=the-code&state=the-state")).toBe("done");
    expect(requests[0]).toEqual({
      path: "/auth/commons/finish",
      body: { state: "the-state", code: "the-code" },
    });
    expect(session.me.value).toEqual({ username: "sam" });
  });

  test("a cancelled sign-in posts nothing, and a refused code says to start again", async () => {
    const session = createSession();
    expect(await finishCommons(session, "?error=access_denied&state=s")).toBe("done");
    expect(session.error.value).toBe("Sign-in cancelled.");
    expect(requests).toEqual([]);

    routes["/auth/commons/finish"] = refused("FORBIDDEN", 403);
    expect(await finishCommons(session, "?code=c&state=s")).toBe("done");
    expect(session.error.value).toBe("Signing in with Commons didn't work. Start again.");
    expect(session.me.value).toBeNull();
  });

  test("a taken Commons username asks for another, which then signs in", async () => {
    const session = createSession();
    routes["/auth/commons/finish"] = refused("CONFLICT", 409);
    expect(await finishCommons(session, "?code=c&state=s")).toBe("choose");

    routes["/auth/commons/choose"] = refused("CONFLICT", 409);
    expect(await chooseUsername(session, "sam")).toBe("choose");
    expect(session.error.value).toBe("That username is taken.");

    routes["/auth/commons/choose"] = json({ user: "u1" });
    routes["/auth/me"] = signedInAs("sam-lee");
    expect(await chooseUsername(session, "  sam-lee ")).toBe("done");
    expect(requests.at(-2)).toEqual({
      path: "/auth/commons/choose",
      body: { username: "sam-lee" },
    });
    expect(session.me.value).toEqual({ username: "sam-lee" });
  });
});
