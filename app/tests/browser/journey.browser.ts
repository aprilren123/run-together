/**
 * Plays the P2 user journey through the real UI in Chrome, as two people signed in at once in separate
 * browser contexts: Morgan plans a flexible run, Jamie befriends her and suggests 10:30, and Morgan accepts.
 * Then it ends Jamie's session in the database and checks that her next request shows the sign-in screen.
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

/** Reloads the page, so it reads the latest runs, and opens the run card that `owner` posted. */
async function openRunBy(page: Page, owner: string) {
  await page.open(`${APP}/`);
  await page.waitFor(
    `[...document.querySelectorAll('.run-card')].some((card) => card.innerText.includes(${JSON.stringify(owner)}))`,
  );
  await page.click(".run-card", owner);
  await page.waitFor("document.querySelector('.run-details-page')");
}

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

async function openProfile(page: Page) {
  await page.click(".nav-item", "Profile");
  await page.waitFor("document.querySelector('.profile-page')");
}

try {
  console.log(`Chrome ${chrome.version}, app at ${APP}\n`);
  const morgan = await signUp(MORGAN);
  const jamie = await signUp(JAMIE);

  // Neither page can act as anyone else.
  await openProfile(jamie);
  check(
    "the profile has no 'Switch demo user' control",
    !(await jamie.evaluate<boolean>("Boolean(document.querySelector('#demo-user'))")) &&
      !(await jamie.text()).includes("Switch demo user"),
  );
  check(
    "the profile shows the signed-in username",
    await jamie.waitFor(
      `document.querySelector('.profile-name')?.innerText === ${JSON.stringify(JAMIE)}`,
    ),
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
    "Morgan's new run appears on her home page as 'Your run'",
    await morgan.waitFor(
      `[...document.querySelectorAll('.run-card')].some((card) => card.innerText.includes('Your run') && card.innerText.includes('Flexible'))`,
    ),
  );

  // Before they are friends, Jamie doesn't see Morgan's run.
  await jamie.open(`${APP}/`);
  await jamie.appShown(JAMIE);
  check(
    "before they're friends, Jamie's home page doesn't list Morgan's run",
    !(await jamie.text()).includes(MORGAN),
  );

  // Jamie finds Morgan by searching usernames, and sends a request from the result.
  await openProfile(jamie);
  await jamie.click(".profile-menu-item", "Add Friends");
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
  await jamie.type(".add-friend-form input", "zz-nobody-has-this");
  check(
    "a search nobody matches says so",
    await jamie.hasText("No one's username contains “zz-nobody-has-this”."),
  );

  // Morgan finds Jamie, whose request is waiting, and accepts it from the result.
  await morgan.open(`${APP}/`);
  await morgan.appShown(MORGAN);
  await openProfile(morgan);
  await morgan.click(".profile-menu-item", "Add Friends");
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

  // Jamie now sees Morgan's run, and suggests 10:30.
  await openRunBy(jamie, MORGAN);
  check("Jamie now sees Morgan's run and opens it", await jamie.hasText("Join run"));
  await jamie.click(".outline-action-button", "Suggest a change");
  await jamie.waitFor("document.querySelector('.suggestion-form')");
  await jamie.type(".suggestion-form input[type=datetime-local]", `${DAY}T10:30`);
  await jamie.click(".suggestion-form button[type=submit]");
  check(
    "Jamie suggests 10:30, and it goes to Morgan",
    await jamie.hasText(`Suggestion sent to ${MORGAN}.`),
  );

  // Morgan accepts the suggestion: the run moves to 10:30 and Jamie joins.
  await openRunBy(morgan, "Your run");
  check(
    "Morgan sees Jamie's pending suggestion",
    await morgan.waitFor(
      `[...document.querySelectorAll('.suggestion-item')].some((item) => item.innerText.includes(${JSON.stringify(JAMIE)}) && item.innerText.includes('10:30'))`,
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

  await openRunBy(jamie, MORGAN);
  check(
    "Jamie sees the run at 10:30 AM",
    await jamie.waitFor(
      "document.querySelector('.run-details-page').innerText.includes('10:30 AM')",
    ),
  );
  check("Jamie sees herself as joined", await jamie.hasText("Joined"));

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
  await jamie.click(".back-button");
  await openProfile(jamie).catch(() => undefined);
  check(
    "Jamie's next request answers 401, which shows the sign-in screen",
    await jamie.signInShown(),
  );
  check(
    "...with 'Your session has ended'",
    await jamie.hasText("Your session has ended. Sign in again."),
  );

  await morgan.open(`${APP}/`);
  check("Morgan, whose session is live, stays signed in", await morgan.appShown(MORGAN));
} catch (error) {
  check("the browser run finished", false, String(error));
} finally {
  await mongo.close();
  await chrome.close();
}

finish();
