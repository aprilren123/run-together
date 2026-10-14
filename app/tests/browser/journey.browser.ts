/**
 * Plays the P2 user journey through the real UI in Chrome, as two people signed in at once in separate
 * browser contexts: Morgan plans a flexible run, Jamie befriends her and suggests 10:30, and Morgan accepts.
 * Then Morgan edits the run, Jamie suggests a new distance and pace, which Morgan reviews and rejects, Jamie
 * leaves and rejoins, and Morgan cancels it, each seen from both sides, including in each one's notifications.
 * Last, it ends Jamie's session in the database and checks that her next request shows the sign-in screen.
 * It needs the frontend and backend already running, and the backend's database in BROWSER_MONGODB_URL.
 *
 *   BROWSER_MONGODB_URL=mongodb://…/runtogether-browser?authSource=admin \
 *     bun tests/browser/journey.browser.ts http://localhost:8080
 */
import { MongoClient } from "mongodb";
import { check, finish, launchChrome, type Page } from "./chrome.ts";

const APP = new URL(process.argv[2] ?? "http://localhost:8080").origin;
const database = process.env.BROWSER_MONGODB_URL;
if (!database) throw new Error("Set BROWSER_MONGODB_URL to the backend's database.");

const DAY = "2026-11-07";
const PASSWORD = "sea-shells-42";
const suffix = Date.now().toString(36);
const MORGAN = `morgan-${suffix}`;
const JAMIE = `jamie-${suffix}`;

const chrome = await launchChrome(APP);
const mongo = new MongoClient(database);

/** Opens the app in a fresh browser context and creates an account there. */
async function signUp(username: string): Promise<Page> {
  const page = await chrome.newPage();
  await page.open(`${APP}/`);
  await page.signInShown();
  await page.submitPasswordForm(username, PASSWORD, true);
  check(
    `${username.split("-")[0]} signs up and sees RunTogether as ${username}`,
    await page.appShown(username),
  );
  return page;
}

const PAGES = {
  Home: "",
  "My Runs": ".my-runs-page",
  Friends: ".friends-page",
  Profile: ".profile-page",
};

/** Opens a tab from the bottom navigation, which reloads that tab's data. */
async function tab(page: Page, name: keyof typeof PAGES) {
  await page.click(".nav-item", name);
  if (PAGES[name]) await page.waitFor(`document.querySelector(${JSON.stringify(PAGES[name])})`);
  else await page.waitFor("document.querySelector('[data-testid=signed-in-username]')");
  await Bun.sleep(150);
}

/** An expression for the run card hosted by `owner` on the current page. */
const cardBy = (owner: string) =>
  `[...document.querySelectorAll('.run-card')].find((card) => card.querySelector('.run-card-owner strong')?.innerText === ${JSON.stringify(owner)})`;

/** Reloads the app, opens `name` (and a My Runs section), and opens the run card `owner` hosts. */
async function openRunIn(page: Page, name: "Home" | "My Runs", owner: string, section?: string) {
  await page.open(`${APP}/`);
  await page.waitFor("document.querySelector('[data-testid=signed-in-username]')");
  if (name !== "Home") await tab(page, name);
  if (section) await page.click(".segment", section);
  await page.waitFor(cardBy(owner));
  await page.evaluate(`${cardBy(owner)}.click()`);
  await page.waitFor("document.querySelector('.run-details-page')");
  await Bun.sleep(200);
}

/** The unread count on the bell, or "" when there is none. */
const bellCount = (page: Page) =>
  page.evaluate<string>("document.querySelector('[data-testid=unread-count]')?.innerText ?? ''");

/** Reloads the app on Home and opens the bell's list. */
async function openBell(page: Page) {
  await page.open(`${APP}/`);
  await page.waitFor("document.querySelector('.bell-button')");
  await Bun.sleep(300);
  await page.click(".bell-button");
  await page.waitFor("document.querySelector('.bell-panel')");
  await Bun.sleep(200);
}

/** Whether the bell's list has a notification saying `words`, unread or not. */
const bellShows = (page: Page, words: string, unread?: boolean) =>
  page.waitFor(
    `[...document.querySelectorAll('.bell-item')].some((item) => item.innerText.includes(${JSON.stringify(words)})${
      unread === undefined ? "" : ` && item.classList.contains('unread') === ${unread}`
    })`,
  );

/** The labels of the buttons in the run page's action bar. */
const actions = (page: Page) =>
  page.evaluate<string[]>(
    "[...document.querySelectorAll('.run-actions button')].map((b) => b.innerText.trim())",
  );

/** An expression for the search result row of `username`. */
const resultRow = (username: string) =>
  `document.querySelector('.search-result[data-username=${JSON.stringify(username)}]')`;

/** Whether the result row of `username` shows `words`. */
const rowShows = (page: Page, username: string, words: string) =>
  page.waitFor(`${resultRow(username)}?.innerText.includes(${JSON.stringify(words)})`);

/** Clicks the button labelled `words` in the result row of `username`. */
async function clickInRow(page: Page, username: string, words: string) {
  await page.evaluate(
    `[...${resultRow(username)}.querySelectorAll('button')].find((b) => b.innerText.includes(${JSON.stringify(words)})).click()`,
  );
}

try {
  console.log(`Chrome ${chrome.version}, app at ${APP}\n`);
  const morgan = await signUp(MORGAN);
  const jamie = await signUp(JAMIE);

  // Navigation: four tabs, and no Calendar or Community.
  const tabs = await jamie.evaluate<string[]>(
    "[...document.querySelectorAll('.nav-item')].map((b) => b.innerText.trim())",
  );
  check(
    "the navigation has exactly Home, My Runs, Friends, and Profile",
    JSON.stringify(tabs) === JSON.stringify(["Home", "My Runs", "Friends", "Profile"]),
    tabs.join(", "),
  );
  check(
    "with no friends, Home says to add friends to see their runs",
    await jamie.hasText("Add friends to see their runs here."),
  );

  // Profile shows the account and logout, and no one can act as anyone else.
  await tab(jamie, "Profile");
  check(
    "the profile shows the signed-in username and a log out button",
    (await jamie.waitFor(
      `document.querySelector('.profile-name')?.innerText === ${JSON.stringify(JAMIE)}`,
    )) && (await jamie.hasText(`Log out of ${JAMIE}`)),
  );
  check(
    "the profile has no 'Switch demo user' control",
    !(await jamie.evaluate<boolean>("Boolean(document.querySelector('#demo-user'))")) &&
      !(await jamie.text()).includes("Switch demo user"),
  );

  // Morgan creates a five-mile run along the Charles at 10:00, flexible between 9:30 and 11:00.
  await morgan.click(".create-run-button", "Create a Run");
  await morgan.waitFor("document.querySelector('.create-form')");
  await morgan.type(".create-form input[type=datetime-local]", `${DAY}T10:00`);
  await morgan.type(".create-form .input-with-unit input", "5");
  await morgan.evaluate(`(() => {
    const [, pace] = document.querySelectorAll('.create-form .input-with-unit input');
    pace.value = '9';
    pace.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await morgan.type(".create-form input[type=text]", "Charles River Esplanade");
  await morgan.click(".flexibility-toggle");
  await morgan.waitFor("document.querySelector('.flexibility-fields')");
  await morgan.evaluate(`(() => {
    const [earliest, latest] = document.querySelectorAll('.flexibility-fields input[type=time]');
    for (const [input, value] of [[earliest, '09:30'], [latest, '11:00']]) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await morgan.click(".save-run-button", "Save run");
  check(
    "Morgan's new run appears in My Runs › Upcoming, marked Hosting and Flexible",
    await morgan.waitFor(
      `document.querySelector('.my-runs-page') && ${cardBy(MORGAN)}?.innerText.includes('Hosting') && ${cardBy(MORGAN)}?.innerText.includes('Flexible')`,
    ),
  );
  await tab(morgan, "Home");
  check(
    "Morgan's own run isn't on her Home",
    !(await morgan.evaluate<boolean>(`Boolean(${cardBy(MORGAN)})`)),
  );

  // Before they are friends, Jamie doesn't see Morgan's run.
  await jamie.open(`${APP}/`);
  await jamie.appShown(JAMIE);
  check(
    "before they're friends, Jamie's home page doesn't list Morgan's run",
    !(await jamie.text()).includes(MORGAN),
  );

  // Jamie finds Morgan on the Friends tab, and sends a request from the result.
  await tab(jamie, "Friends");
  await jamie.type(".add-friend-form input", suffix);
  check("Jamie's search finds Morgan's account", await jamie.waitFor(resultRow(MORGAN)));
  check(
    "the search leaves out Jamie herself",
    !(await jamie.evaluate<boolean>(`Boolean(${resultRow(JAMIE)})`)),
  );
  check("Morgan's result offers 'Add Friend'", await rowShows(jamie, MORGAN, "Add Friend"));
  await clickInRow(jamie, MORGAN, "Add Friend");
  check(
    "Jamie sends Morgan a friend request from the result",
    await jamie.hasText(`Friend request sent to ${MORGAN}.`),
  );
  check("Morgan's result now says 'Requested'", await rowShows(jamie, MORGAN, "Requested"));
  check(
    "the Friends tab lists the sent request",
    await jamie.waitFor(
      `[...document.querySelectorAll('.friends-section .request-row')].some((row) => !row.classList.contains('search-result') && row.innerText.includes(${JSON.stringify(MORGAN)}) && row.innerText.includes('Requested'))`,
    ),
  );
  await jamie.type(".add-friend-form input", "zz-nobody-has-this");
  check("a search nobody matches says so", await jamie.hasText("No users found."));

  // Morgan sees Jamie's request on the Friends tab, and accepts it from her search result.
  await morgan.open(`${APP}/`);
  await morgan.appShown(MORGAN);
  await tab(morgan, "Friends");
  check(
    "Morgan's Friends tab shows Jamie's incoming request",
    await morgan.waitFor(
      `[...document.querySelectorAll('.request-row')].some((row) => row.innerText.includes(${JSON.stringify(JAMIE)}) && row.innerText.includes('Accept'))`,
    ),
  );
  await morgan.type(".add-friend-form input", JAMIE);
  await morgan.waitFor(resultRow(JAMIE));
  check(
    "Jamie's result offers Accept and Decline",
    (await rowShows(morgan, JAMIE, "Accept")) && (await rowShows(morgan, JAMIE, "Decline")),
  );
  await clickInRow(morgan, JAMIE, "Accept");
  check("Morgan accepts it", await morgan.hasText("Friend request accepted!"));
  check(
    "Jamie's result now says 'Already friends'",
    await rowShows(morgan, JAMIE, "Already friends"),
  );
  check(
    "Morgan's friend list shows Jamie",
    await morgan.waitFor(
      `[...document.querySelectorAll('.friend-row')].some((row) => row.innerText.includes(${JSON.stringify(JAMIE)}))`,
    ),
  );

  // Jamie now sees Morgan's run on Home, and suggests 10:30.
  await openRunIn(jamie, "Home", MORGAN);
  check(
    "Jamie opens Morgan's run from Home and can join or suggest a change",
    JSON.stringify(await actions(jamie)) === JSON.stringify(["Join run", "Suggest a change"]),
  );
  await jamie.click(".outline-action-button", "Suggest a change");
  await jamie.waitFor("document.querySelector('.suggestion-form')");
  await jamie.type(".suggestion-form input[type=datetime-local]", `${DAY}T10:30`);
  await jamie.click(".suggestion-form button[type=submit]");
  check(
    "Jamie suggests 10:30, and it goes to Morgan",
    await jamie.hasText(`Suggestion sent to ${MORGAN}.`),
  );

  // Morgan's bell tells her, and opens the run with Jamie's suggestion.
  await openBell(morgan);
  check("Morgan's bell shows an unread notification", (await bellCount(morgan)) !== "");
  check(
    "it says Jamie suggested a change to her run",
    await bellShows(morgan, `${JAMIE} suggested a change to your Morning run`, true),
  );
  await morgan.evaluate(
    `[...document.querySelectorAll('.bell-item')].find((item) => item.innerText.includes('suggested a change')).click()`,
  );
  check(
    "clicking it opens the run, and marks it read",
    (await morgan.waitFor("document.querySelector('.run-details-page')")) &&
      (await morgan.waitFor("!document.querySelector('[data-testid=unread-count]')")),
  );

  // Morgan accepts the suggestion: the run moves to 10:30 and Jamie joins.
  check(
    "Morgan's run page offers Edit run and Cancel run",
    JSON.stringify(await actions(morgan)) === JSON.stringify(["Edit run", "Cancel run"]),
  );
  check(
    "Morgan sees Jamie's pending suggestion as the current time → 10:30",
    await morgan.waitFor(
      `[...document.querySelectorAll('.suggestion-item')].some((item) => item.innerText.includes(${JSON.stringify(JAMIE)}) && item.innerText.includes('Start time') && item.innerText.includes('10:00 AM') && item.innerText.includes('10:30 AM'))`,
    ),
  );
  await morgan.click(".suggestion-item .create-run-button", "Accept");
  check(
    "Morgan accepts it and the run is updated",
    await morgan.hasText("Suggestion accepted. Run updated."),
  );
  check(
    "Morgan's run now starts at 10:30 AM",
    await morgan.waitFor(
      "document.querySelector('.run-details-page').innerText.includes('10:30 AM')",
    ),
  );
  check(
    "Jamie is listed as going on Morgan's page",
    await morgan.waitFor(
      `[...document.querySelectorAll('.participant')].some((row) => row.innerText.includes(${JSON.stringify(JAMIE)}))`,
    ),
  );

  // Jamie's bell says her suggestion was accepted.
  await openBell(jamie);
  check(
    "Jamie's bell says Morgan accepted her suggestion",
    await bellShows(jamie, `${MORGAN} accepted your suggestion for Morning run`, true),
  );

  // Jamie's joined run moves from Home to My Runs, where she can leave or suggest, but not edit.
  await jamie.open(`${APP}/`);
  await jamie.appShown(JAMIE);
  check(
    "Morgan's run is no longer on Jamie's Home once she has joined",
    !(await jamie.evaluate<boolean>(`Boolean(${cardBy(MORGAN)})`)),
  );
  await openRunIn(jamie, "My Runs", MORGAN);
  check(
    "Jamie sees the run at 10:30 AM",
    await jamie.waitFor(
      "document.querySelector('.run-details-page').innerText.includes('10:30 AM')",
    ),
  );
  check(
    "as a participant, Jamie can suggest a change or leave, and can't edit or cancel",
    JSON.stringify(await actions(jamie)) === JSON.stringify(["Suggest a change", "Leave run"]),
  );

  // Morgan edits the meeting point and description.
  await openRunIn(morgan, "My Runs", MORGAN);
  await morgan.click(".run-actions button", "Edit run");
  await morgan.waitFor("document.querySelector('.create-form')");
  check(
    "the edit form is prefilled with the run's details",
    (await morgan.evaluate<string>(
      "document.querySelector('.create-form input[type=text]').value",
    )) === "Charles River Esplanade",
  );
  await morgan.type(".create-form input[type=text]", "Harvard Bridge");
  await morgan.type(".create-form textarea", "Bring water");
  await morgan.click(".save-run-button", "Save changes");
  check(
    "Morgan saves her changes and sees them on the run page",
    (await morgan.hasText("Run updated.")) &&
      (await morgan.hasText("Meet at Harvard Bridge")) &&
      (await morgan.hasText("Bring water")),
  );

  // Jamie sees the latest plan.
  await openRunIn(jamie, "My Runs", MORGAN);
  check(
    "Jamie sees Morgan's edits: the new meeting point and description",
    (await jamie.hasText("Meet at Harvard Bridge")) && (await jamie.hasText("Bring water")),
  );

  // Jamie suggests a new distance and pace together, seeing current → proposed before sending.
  await jamie.click(".outline-action-button", "Suggest a change");
  await jamie.waitFor("document.querySelector('.suggestion-form')");
  await jamie.evaluate(`(() => {
    const [distance, pace] = document.querySelectorAll('.suggestion-pair input');
    for (const [input, value] of [[distance, '6'], [pace, '8.5']]) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  check(
    "Jamie's preview shows both changes, current → proposed",
    await jamie.waitFor(
      "(() => { const t = document.querySelector('.suggestion-preview')?.innerText ?? ''; return t.includes('5 miles') && t.includes('6 miles') && t.includes('9 min/mi') && t.includes('8.5 min/mi'); })()",
    ),
  );
  await jamie.click(".suggestion-form button[type=submit]");
  check("Jamie sends it", await jamie.hasText(`Suggestion sent to ${MORGAN}.`));

  // Morgan reviews both proposed values, and rejects them; the run stays as it was.
  await openBell(morgan);
  await morgan.evaluate(
    `[...document.querySelectorAll('.bell-item.unread')].find((item) => item.innerText.includes('suggested a change')).click()`,
  );
  await morgan.waitFor("document.querySelector('.run-details-page')");
  check(
    "Morgan sees Distance 5 → 6 miles and Pace 9 → 8.5 min/mi",
    await morgan.waitFor(
      "(() => { const t = document.querySelector('.suggestion-item')?.innerText ?? ''; return t.includes('Distance') && t.includes('6 miles') && t.includes('Pace') && t.includes('8.5 min/mi'); })()",
    ),
  );
  await morgan.click(".suggestion-item .outline-action-button", "Reject");
  check(
    "Morgan rejects it, and the run keeps 5 miles at 9 min/mi",
    (await morgan.hasText("Suggestion rejected.")) && (await morgan.hasText("5 miles · 9 min/mi")),
  );

  // Jamie's bell says the run was updated and the suggestion declined; she marks them all read.
  await openBell(jamie);
  check(
    "Jamie's bell says Morgan updated the run",
    await bellShows(jamie, `${MORGAN} updated Morning run`, true),
  );
  check(
    "and that Morgan declined her suggestion",
    await bellShows(jamie, `${MORGAN} declined your suggestion`, true),
  );
  const newestFirst = await jamie.evaluate<string>(
    "document.querySelector('.bell-item')?.innerText ?? ''",
  );
  check("the newest notification is listed first", newestFirst.includes("declined"));
  await jamie.click(".bell-panel .text-button", "Mark all read");
  check(
    "marking all read clears the unread count",
    await jamie.waitFor("!document.querySelector('[data-testid=unread-count]')"),
  );
  await openBell(jamie);
  check(
    "after a reload, the notifications are still listed, and still read",
    (await bellShows(jamie, "declined your suggestion", false)) && (await bellCount(jamie)) === "",
  );

  // Jamie leaves, and the run goes back to her Home, where she joins again.
  await openRunIn(jamie, "My Runs", MORGAN);
  await jamie.click(".run-actions button", "Leave run");
  check("Jamie leaves the run", await jamie.hasText("You left this run."));
  check(
    "after leaving, Jamie can join again",
    JSON.stringify(await actions(jamie)) === JSON.stringify(["Join run", "Suggest a change"]),
  );
  await openRunIn(jamie, "Home", MORGAN);
  check("the run is back on Jamie's Home", await jamie.hasText("Join run"));
  await jamie.click(".run-actions button", "Join run");
  check("Jamie joins it again", await jamie.hasText("You joined this run!"));

  // Morgan cancels, after confirming.
  await openRunIn(morgan, "My Runs", MORGAN);
  await morgan.click(".run-actions button", "Cancel run");
  check(
    "canceling asks for confirmation first",
    await morgan.waitFor(
      "document.querySelector('[role=alertdialog]')?.innerText.includes(\"can't be undone\")",
    ),
  );
  await morgan.click("[role=alertdialog] button", "Keep run");
  check(
    "choosing 'Keep run' closes the dialog and leaves the run active",
    (await morgan.waitFor("!document.querySelector('[role=alertdialog]')")) &&
      !(await morgan.evaluate<boolean>("Boolean(document.querySelector('.canceled-banner'))")),
  );
  await morgan.click(".run-actions button", "Cancel run");
  await morgan.waitFor("document.querySelector('[role=alertdialog]')");
  await morgan.click("[role=alertdialog] .danger-button");
  check(
    "confirming cancels the run, and the page says so",
    (await morgan.waitFor("document.querySelector('.canceled-banner')")) &&
      (await morgan.hasText("Run canceled.")),
  );
  check(
    "a canceled run offers no actions",
    !(await morgan.evaluate<boolean>("Boolean(document.querySelector('.run-actions'))")),
  );

  // Jamie's bell says the run was canceled, and opens it.
  await openBell(jamie);
  check(
    "Jamie's bell says Morgan canceled the run",
    await bellShows(jamie, `${MORGAN} canceled Morning run`, true),
  );
  await jamie.evaluate(
    `[...document.querySelectorAll('.bell-item')].find((item) => item.innerText.includes('canceled')).click()`,
  );
  check(
    "clicking it opens the canceled run",
    await jamie.waitFor("document.querySelector('.canceled-banner')"),
  );

  // Jamie finds it under My Runs › Canceled, visibly canceled.
  await openRunIn(jamie, "My Runs", MORGAN, "Canceled");
  check(
    "Jamie sees the canceled run with a banner and no actions",
    (await jamie.hasText(`This run was canceled by ${MORGAN}.`)) &&
      !(await jamie.evaluate<boolean>("Boolean(document.querySelector('.run-actions'))")),
  );
  // The run page has no tab bar; its back button returns to the tab it was opened from.
  await jamie.click(".back-button");
  await jamie.waitFor("document.querySelector('.my-runs-page')");
  await jamie.click(".segment", "Canceled");
  check(
    "the canceled run's card is marked Canceled and looks different",
    await jamie.waitFor(
      `${cardBy(MORGAN)}?.classList.contains('canceled') && ${cardBy(MORGAN)}.innerText.includes('Canceled')`,
    ),
  );
  await jamie.click(".segment", "Upcoming");
  check("Upcoming is empty and says so", await jamie.hasText("No upcoming runs yet."));

  // Jamie's session ends (a week unused). Her next request is refused with 401, and she sees sign-in.
  const jamieUser = await mongo
    .db()
    .collection<{ _id: string; username: string }>("registering.users")
    .findOne({ username: JAMIE });
  const aged = await mongo
    .db()
    .collection("sessioning.sessions")
    .updateMany(
      { subject: jamieUser?._id },
      { $set: { lastUsed: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } },
    );
  check(
    "aged only Jamie's sessions to 8 days unused",
    aged.modifiedCount > 0,
    `${aged.modifiedCount} session(s)`,
  );
  await jamie.click(".nav-item", "Profile");
  check(
    "Jamie's next request answers 401, which shows the sign-in screen",
    await jamie.signInShown(),
  );
  check(
    "...with 'Your session has ended'",
    await jamie.hasText("Your session has ended. Sign in again."),
  );

  // Morgan logs out from Profile.
  await morgan.open(`${APP}/`);
  check("Morgan, whose session is live, stays signed in", await morgan.appShown(MORGAN));
  await tab(morgan, "Profile");
  await morgan.click(".profile-menu-item", "Log out");
  check("Morgan logs out from Profile", await morgan.signInShown());
} catch (error) {
  check("the browser run finished", false, String(error));
} finally {
  await mongo.close();
  await chrome.close();
}

finish();
