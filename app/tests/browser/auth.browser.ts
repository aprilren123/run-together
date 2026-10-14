/**
 * Checks signing in, out, and back in through a real Chrome, over the Chrome DevTools Protocol. It needs
 * the frontend and backend already running, and the backend's own database in BROWSER_MONGODB_URL so it
 * can age a session. It isn't a `bun test` file, since it needs Chrome and running servers.
 *
 *   BROWSER_MONGODB_URL=mongodb://…/runtogether-browser?authSource=admin \
 *     bun tests/browser/auth.browser.ts http://localhost:8080
 */
import { MongoClient } from "mongodb";
import { check, finish, launchChrome } from "./chrome.ts";

const APP = new URL(process.argv[2] ?? "http://localhost:8080").origin;
const OTHER = process.argv[3]; // Another address for the same frontend, which the backend should refuse.
const database = process.env.BROWSER_MONGODB_URL;
if (!database) throw new Error("Set BROWSER_MONGODB_URL to the backend's database.");

const chrome = await launchChrome(APP);
const {
  send,
  listeners,
  evaluate,
  open,
  text,
  hasText,
  signInShown,
  appShown,
  cookie,
  submitPasswordForm,
} = await chrome.newPage();

const SESSION = "__Host-runtogether-session";
const SIGN_IN = "__Host-runtogether-sign-in";
const username = `browser${Date.now().toString(36)}`;
const password = "sea-shells-42";
const mongo = new MongoClient(database);

try {
  const documents: { url: string; headers: Record<string, string> }[] = [];
  listeners.push(({ method, params }) => {
    if (method === "Network.responseReceived" && params.type === "Document") {
      documents.push({ url: params.response.url, headers: params.response.headers });
    }
  });

  console.log(`Chrome ${chrome.version}, app at ${APP}\n`);

  // Signed out
  await open(`${APP}/`);
  check("signed out, the page shows the sign-in screen", await signInShown());
  check("the session cookie is not set before signing in", (await cookie(SESSION)) === undefined);

  // Invalid credentials
  await submitPasswordForm("nobody-here", password, false);
  check(
    "an unknown username shows 'incorrect'",
    await hasText("The username or password is incorrect."),
  );

  // Sign up
  await submitPasswordForm(username, password, true);
  check("creating an account shows RunTogether with the username", await appShown(username));
  const session = await cookie(SESSION);
  check(
    "Chrome stored the __Host- session cookie",
    session !== undefined,
    session ? `domain=${session.domain} path=${session.path}` : "missing",
  );
  check("the session cookie is Secure", session?.secure === true);
  check("the session cookie is HttpOnly", session?.httpOnly === true);
  check("the session cookie is SameSite=Strict", session?.sameSite === "Strict");
  check(
    "the session cookie is host-only on path / (the __Host- rules)",
    session?.path === "/" && !session.domain.startsWith("."),
  );
  check(
    "the session cookie persists across browser restarts (has an expiry)",
    session?.session === false,
  );
  check(
    "page scripts can't read the session cookie",
    !(await evaluate<string>("document.cookie")).includes(SESSION),
  );

  // Reload
  await open(`${APP}/`);
  check("after a reload, /api/auth/me restores the session", await appShown(username));

  // Log out
  await evaluate("document.querySelector('.account-chip button').click()");
  check("logging out shows the sign-in screen", await signInShown());
  check("logging out deletes the session cookie", (await cookie(SESSION)) === undefined);
  await open(`${APP}/`);
  check("after logging out and reloading, the sign-in screen stays", await signInShown());

  // Duplicate username, wrong password, then log in
  await submitPasswordForm(username, "another-password", true);
  check("registering a taken username shows 'taken'", await hasText("That username is taken."));
  await submitPasswordForm(username, "guessed-password", false);
  check(
    "a wrong password shows 'incorrect'",
    await hasText("The username or password is incorrect."),
  );
  await submitPasswordForm(username, password, false);
  check("logging in with the right password shows RunTogether", await appShown(username));

  // Expired session: a session unused for 8 days, then the tab comes back into view
  const aged = await mongo
    .db()
    .collection("sessioning.sessions")
    .updateMany({}, { $set: { lastUsed: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } });
  check(
    "aged the session to 8 days unused",
    aged.modifiedCount > 0,
    `${aged.modifiedCount} sessions`,
  );
  await evaluate("document.dispatchEvent(new Event('visibilitychange'))");
  check("an expired session returns to sign-in when the tab is shown again", await signInShown());
  check(
    "...with 'Your session has ended'",
    await hasText("Your session has ended. Sign in again."),
  );
  await open(`${APP}/`);
  check("an expired session shows sign-in after a reload", await signInShown());

  // Network errors
  await submitPasswordForm(username, password, false);
  await appShown(username);
  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await evaluate("document.dispatchEvent(new Event('visibilitychange'))");
  await Bun.sleep(300);
  check("offline, re-checking the session keeps the person signed in", await appShown(username));
  await evaluate("document.querySelector('.account-chip button').click()");
  check(
    "offline, logging out says the backend can't be reached",
    await hasText("Can't reach RunTogether."),
  );
  check("...and keeps the session cookie", (await cookie(SESSION)) !== undefined);
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/auth/me" }] });
  let failing = true;
  listeners.push(({ method, params }) => {
    if (method !== "Fetch.requestPaused" || !params.request.url.endsWith("/api/auth/me")) return;
    if (failing)
      void send("Fetch.failRequest", {
        requestId: params.requestId,
        errorReason: "ConnectionRefused",
      });
    else void send("Fetch.continueRequest", { requestId: params.requestId });
  });
  await open(`${APP}/`);
  check("a backend that can't be reached on load offers 'Try again'", await hasText("Try again"));
  failing = false;
  await evaluate(
    "[...document.querySelectorAll('button')].find((b) => b.innerText === 'Try again').click()",
  );
  check("'Try again' restores the session once the backend answers", await appShown(username));
  await send("Fetch.disable");
  await evaluate("document.querySelector('.account-chip button').click()");
  await signInShown();

  // Commons: the button's redirect, intercepted before it reaches Commons
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "https://class.mit-sdg.dev/*", requestStage: "Request" }],
  });
  const leaving = new Promise<{ url: string; headers: Record<string, string> }>((resolve) =>
    listeners.push(({ method, params }) => {
      if (
        method !== "Fetch.requestPaused" ||
        !params.request.url.startsWith("https://class.mit-sdg.dev/")
      )
        return;
      resolve({ url: params.request.url, headers: params.request.headers });
      void send("Fetch.fulfillRequest", {
        requestId: params.requestId,
        responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "text/html" }],
        body: btoa("<p>Commons stand-in</p>"),
      });
    }),
  );
  await evaluate("document.querySelector('.commons-button').click()");
  const commons = await Promise.race([leaving, Bun.sleep(5_000).then(() => undefined)]);
  const address = commons ? new URL(commons.url) : undefined;
  check(
    "the Commons button goes to https://class.mit-sdg.dev/connect",
    address?.origin === "https://class.mit-sdg.dev" && address.pathname === "/connect",
    commons?.url.replace(/(state|code_challenge)=[^&]+/g, "$1=…"),
  );
  check(
    `the redirect names this app's origin (${APP}) as the app Commons returns to`,
    address?.searchParams.get("app") === APP,
    `app=${address?.searchParams.get("app")}`,
  );
  check(
    "the redirect carries a state and an S256 PKCE challenge",
    Boolean(address?.searchParams.get("state")) &&
      /^[A-Za-z0-9_-]{43}$/.test(address?.searchParams.get("code_challenge") ?? "") &&
      address?.searchParams.get("code_challenge_method") === "S256",
  );
  check(
    "the request to Commons carries no Referer",
    commons !== undefined &&
      !Object.keys(commons.headers).some((name) => name.toLowerCase() === "referer"),
  );
  const signIn = await cookie(SIGN_IN);
  check(
    "Chrome stored the __Host- sign-in cookie, Secure, HttpOnly, SameSite=Strict",
    signIn?.secure === true &&
      signIn.httpOnly &&
      signIn.sameSite === "Strict" &&
      signIn.path === "/",
  );
  await send("Fetch.disable");

  // Commons callback, with a code Commons never issued
  const state = address?.searchParams.get("state") ?? "";
  documents.length = 0;
  await open(
    `${APP}/auth/commons/callback?code=a-code-nobody-issued&state=${encodeURIComponent(state)}`,
  );
  const callback = documents.find((each) => each.url.includes("/auth/commons/callback"));
  const policy = Object.entries(callback?.headers ?? {}).find(
    ([name]) => name.toLowerCase() === "referrer-policy",
  )?.[1];
  check(
    "the callback page is served with Referrer-Policy: no-referrer",
    policy === "no-referrer",
    `header=${policy}`,
  );
  check(
    "the callback page also sets the policy in a meta tag",
    (await evaluate<string>("document.querySelector('meta[name=referrer]')?.content")) ===
      "no-referrer",
  );
  check(
    "a code Commons didn't issue shows 'didn't work'",
    await hasText("Signing in with Commons didn't work. Start again."),
  );
  check(
    "the callback removes the code from the address bar",
    (await evaluate<string>("location.pathname + location.search")) === "/",
  );
  check("a refused callback starts no session", (await cookie(SESSION)) === undefined);
  await open(`${APP}/auth/commons/callback?error=access_denied&state=x`);
  check("a sign-in cancelled on Commons says 'cancelled'", await hasText("Sign-in cancelled."));

  // Another address for the same frontend
  if (OTHER) {
    await open(`${new URL(OTHER).origin}/`);
    await signInShown();
    await submitPasswordForm(username, password, false);
    check(
      `signing in at ${new URL(OTHER).origin} is refused because the backend expects ${APP}`,
      await hasText("refused a request from this address"),
    );
  }
} catch (error) {
  check("the browser run finished", false, String(error));
  console.log(await text().catch(() => ""));
} finally {
  await mongo.close();
  await chrome.close();
}

finish();
