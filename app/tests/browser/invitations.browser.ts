/**
 * Checks run invitations in Chrome, with three people signed in at once: April invites Jamie and Taylor to
 * her run from its page; Jamie reads the invitation in the bell, looks at the run, and accepts from the bell;
 * Taylor declines from the run's page; April sees who was invited and how they answered. Then April cancels
 * another run Jamie was invited to, and Jamie's invitation says so instead of offering to join.
 *
 * It needs the frontend and backend running. With a folder as the second argument, it saves screenshots.
 *
 *   bun tests/browser/invitations.browser.ts http://localhost:8080 [screenshots folder]
 */
import { check, finish, launchChrome, type Page } from "./chrome.ts";

const APP = new URL(process.argv[2] ?? "http://localhost:8080").origin;
const OUT = process.argv[3];
const SUFFIX = Date.now().toString(36);
const APRIL = `april-${SUFFIX}`;
const JAMIE = `jamie-${SUFFIX}`;
const TAYLOR = `taylor-${SUFFIX}`;
const PASSWORD = "sea-shells-42";

const chrome = await launchChrome(APP);

/** Calls the API from the page, with its session cookie, and answers the status and body. */
const api = (page: Page, path: string, body: object = {}) =>
  page.evaluate<{ status: number; body: any }>(
    `fetch(${JSON.stringify(`/api${path}`)}, { method: "POST", headers: { "Content-Type": "application/json" }, body: ${JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, body: await r.json() }))`,
  );

async function signUp(username: string): Promise<Page> {
  const page = await chrome.newPage();
  await page.open(`${APP}/`);
  await page.signInShown();
  await page.submitPasswordForm(username, PASSWORD, true);
  await page.appShown(username);
  return page;
}

async function befriend(a: Page, b: Page, bName: string) {
  const sent = await api(a, "/friends/request", { username: bName });
  await api(b, "/friends/accept", { request: sent.body.request });
}

async function shot(page: Page, name: string, width = 1280, height = 900) {
  if (!OUT) return;
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await Bun.sleep(300);
  const s = await page.send("Page.captureScreenshot", { format: "png" });
  await Bun.write(`${OUT}/${name}.png`, Buffer.from(s.data, "base64"));
}

/** Reloads the app and opens `owner`'s run at `location`, from Home or My Runs. */
async function openRun(page: Page, owner: string, location: string) {
  await page.open(`${APP}/`);
  await page.waitFor("document.querySelector('[data-testid=signed-in-username]')");
  const card = `[...document.querySelectorAll('.run-card')].find((c) => c.querySelector('.run-card-owner strong')?.innerText === ${JSON.stringify(owner)} && c.innerText.includes(${JSON.stringify(location)}))`;
  if (!(await page.waitFor(card))) {
    await page.click(".nav-item", "My Runs");
    for (const section of ["Upcoming", "Canceled"]) {
      await page.click(".segment", section);
      if (await page.waitFor(card)) break;
    }
  }
  await page.evaluate(`${card}.click()`);
  await page.waitFor("document.querySelector('.run-details-page')");
  await Bun.sleep(300);
}

/** Opens the bell and waits for the invitation card from `inviter`. */
async function openBell(page: Page) {
  await page.click(".bell-button");
  await page.waitFor("document.querySelector('.bell-panel')");
  return page.waitFor(
    `[...document.querySelectorAll('.bell-invite')].some((c) => c.innerText.includes(${JSON.stringify(APRIL)}) && c.querySelector('.bell-invite-run'))`,
  );
}

const card = "document.querySelector('.bell-invite')";
const myInvitations = async (page: Page) =>
  (await api(page, "/invitations/list")).body.invitations.invitations as {
    status: string;
    run: string;
  }[];

try {
  console.log(`Chrome ${chrome.version}, app at ${APP}, suffix ${SUFFIX}\n`);
  const april = await signUp(APRIL);
  const jamie = await signUp(JAMIE);
  const taylor = await signUp(TAYLOR);
  await befriend(jamie, april, APRIL);
  await befriend(taylor, april, APRIL);
  const run = (
    await api(april, "/runs/create", {
      startTime: "2030-05-04T10:30",
      distance: 5,
      pace: 10,
      location: "Charles River Esplanade",
      details: "",
    })
  ).body.run as string;

  // April invites both friends from the run's page.
  await openRun(april, APRIL, "Charles River Esplanade");
  check(
    "the owner's run page offers Invite friends, beside Going and not among the run's actions",
    (await april.evaluate<boolean>(
      "Boolean([...document.querySelectorAll('.run-details-section .invite-button')].find((b) => b.innerText.includes('Invite friends')))",
    )) &&
      JSON.stringify(
        await april.evaluate<string[]>(
          "[...document.querySelectorAll('.run-actions button')].map((b) => b.innerText.trim())",
        ),
      ) === JSON.stringify(["Edit run", "Cancel run"]),
  );
  await april.click(".invite-button");
  await april.waitFor("document.querySelector('.invite-modal .invite-choice')");
  check(
    "the picker lists her friends, and takes focus",
    (
      await april.evaluate<string[]>(
        "[...document.querySelectorAll('.invite-choice')].map((c) => c.dataset.friend)",
      )
    ).join() === [JAMIE, TAYLOR].join() &&
      (await april.evaluate<boolean>("document.activeElement?.classList.contains('invite-modal')")),
  );
  await april.type(".invite-modal input[type=search]", "jam");
  check(
    "searching narrows the list",
    await april.waitFor(
      `JSON.stringify([...document.querySelectorAll('.invite-choice')].map((c) => c.dataset.friend)) === ${JSON.stringify(JSON.stringify([JAMIE]))}`,
    ),
  );
  await april.type(".invite-modal input[type=search]", "");
  await april.waitFor("document.querySelectorAll('.invite-choice').length === 2");
  check(
    "Send is disabled until someone is chosen",
    await april.evaluate<boolean>(
      "document.querySelector('.invite-form button[type=submit]').disabled",
    ),
  );
  for (const friend of [JAMIE, TAYLOR]) {
    await april.evaluate(
      `document.querySelector('.invite-choice[data-friend=${JSON.stringify(friend)}] input').click()`,
    );
  }
  await shot(april, "invite-picker");
  await april.click(".invite-form button[type=submit]", "Send 2 invitations");
  check(
    "sending confirms both, and closes the picker",
    (await april.hasText(`Invited ${JAMIE} and ${TAYLOR}.`)) &&
      (await april.waitFor("!document.querySelector('.invite-modal')")),
  );
  check(
    "the Invited list shows both as Pending, apart from Going",
    await april.waitFor(
      "(() => { const rows = [...document.querySelectorAll('.invited-row')].map((r) => r.innerText); return rows.length === 2 && rows.every((t) => t.includes('Pending')); })()",
    ),
  );
  await april.click(".invite-button");
  await april.waitFor("document.querySelector('.invite-choice')");
  check(
    "invited friends can't be picked again",
    await april.evaluate<boolean>(
      "[...document.querySelectorAll('.invite-choice')].every((c) => c.querySelector('input').disabled && c.innerText.includes('Invited'))",
    ),
  );
  await april.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  check(
    "Escape closes the picker",
    await april.waitFor("!document.querySelector('.invite-modal')"),
  );

  // Jamie: a quiet unread badge, and an actionable card in the bell.
  await jamie.open(`${APP}/`);
  await jamie.waitFor("document.querySelector('[data-testid=signed-in-username]')");
  check(
    "Jamie's bell shows one unread",
    await jamie.waitFor("document.querySelector('[data-testid=unread-count]')?.innerText === '1'"),
  );
  check("the invitation is a card in the bell", await openBell(jamie));
  const text = await jamie.evaluate<string>(`${card}.innerText`);
  check(
    "the card names the host and shows the run's time, place, distance, and pace",
    text.includes(`${APRIL} invited you to a run`) &&
      text.includes("Morning run") &&
      text.includes("10:30 AM") &&
      text.includes("Charles River Esplanade") &&
      text.includes("5 miles · 10 min/mi"),
  );
  check(
    "with Accept & Join and Decline",
    (
      await jamie.evaluate<string[]>(
        `[...${card}.querySelectorAll('.bell-invite-actions button')].map((b) => b.innerText.trim())`,
      )
    ).join() === "Accept & Join,Decline",
  );
  await shot(jamie, "bell-invitation-desktop");
  await shot(jamie, "bell-invitation-mobile", 390, 844);
  await jamie.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Reading never answers: mark all read, then look at the run first.
  await jamie.click(".bell-panel .text-button", "Mark all read");
  check(
    "marking it read clears the badge but leaves the invitation pending",
    (await jamie.waitFor("!document.querySelector('[data-testid=unread-count]')")) &&
      (await myInvitations(jamie))[0]?.status === "PENDING",
  );
  await jamie.click(".bell-invite .invite-view", "View run details");
  await jamie.waitFor("document.querySelector('.run-details-page')");
  check(
    "View run details opens the run, which offers the invitation, still pending",
    (await jamie.waitFor(
      "document.querySelector('.invite-banner')?.innerText.includes('invited you to this run')",
    )) && (await myInvitations(jamie))[0]?.status === "PENDING",
  );
  await shot(jamie, "run-page-invitation");

  // Jamie accepts from the bell; a double click joins once.
  await jamie.click(".back-button");
  await jamie.waitFor("document.querySelector('.bell-button')");
  await openBell(jamie);
  await jamie.evaluate(
    `(() => { const b = ${card}.querySelector('.bell-invite-actions .create-run-button'); b.click(); b.click(); })()`,
  );
  check(
    "accepting replaces the buttons with Accepted",
    await jamie.waitFor(
      `${card}?.innerText.includes("Accepted · You're going") && !${card}.querySelector('.bell-invite-actions')`,
    ),
  );
  const participants = (await api(jamie, "/runs/participants")).body.participants
    .participations as { user: string; event: string }[];
  check(
    "Jamie joined the run exactly once",
    participants.filter((p) => p.event === run && p.user === JAMIE).length === 1,
  );
  await jamie.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await jamie.click(".nav-item", "My Runs");
  check(
    "the run is in Jamie's My Runs, as Joined",
    await jamie.waitFor(
      `[...document.querySelectorAll('.run-card')].some((c) => c.querySelector('.run-card-owner strong')?.innerText === ${JSON.stringify(APRIL)} && c.innerText.includes('Joined'))`,
    ),
  );
  await jamie.open(`${APP}/`);
  await jamie.waitFor("document.querySelector('.bell-button')");
  await openBell(jamie);
  check(
    "after a refresh, the card still says Accepted",
    await jamie.waitFor(`${card}?.innerText.includes("Accepted · You're going")`),
  );

  // Taylor declines from the run's page.
  await openRun(taylor, APRIL, "Charles River Esplanade");
  await taylor.waitFor("document.querySelector('.invite-banner')");
  await taylor.click(".invite-banner .secondary-button", "Decline");
  check(
    "Taylor declines from the run's page, and isn't going",
    (await taylor.hasText("Invitation declined.")) &&
      (await taylor.waitFor("!document.querySelector('.invite-banner')")) &&
      !(await taylor.evaluate<boolean>(
        `[...document.querySelectorAll('.participant')].some((p) => p.innerText.includes(${JSON.stringify(TAYLOR)}))`,
      )),
  );

  // April sees the answers, apart from who is going.
  await openRun(april, APRIL, "Charles River Esplanade");
  check(
    "April sees Jamie accepted and going, and Taylor declined",
    await april.waitFor(
      `(() => { const rows = [...document.querySelectorAll('.invited-row')].map((r) => r.innerText); return rows.some((t) => t.includes(${JSON.stringify(JAMIE)}) && t.includes('Accepted')) && rows.some((t) => t.includes(${JSON.stringify(TAYLOR)}) && t.includes('Declined')) && [...document.querySelectorAll('.participant')].some((p) => p.innerText.includes(${JSON.stringify(JAMIE)})); })()`,
    ),
  );
  await shot(april, "owner-invited-list");

  // A run canceled after the invitation: the card says so instead of offering to join.
  const later = (
    await api(april, "/runs/create", {
      startTime: "2030-05-11T17:30",
      distance: 3,
      pace: 9,
      location: "Fresh Pond",
      details: "",
    })
  ).body.run as string;
  await api(april, "/invitations/send", { run: later, username: JAMIE });
  await api(april, "/runs/cancel", { run: later });
  await jamie.open(`${APP}/`);
  await jamie.waitFor("document.querySelector('.bell-button')");
  await jamie.click(".bell-button");
  check(
    "an invitation to a run canceled since says so, with no buttons",
    await jamie.waitFor(
      "[...document.querySelectorAll('.bell-invite')].some((c) => c.innerText.includes('Fresh Pond') && c.innerText.includes('This run was canceled') && !c.querySelector('.bell-invite-actions'))",
    ),
  );
} catch (error) {
  check("the browser run finished", false, String(error));
} finally {
  await chrome.close();
}

finish();
