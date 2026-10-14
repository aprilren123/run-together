/**
 * Checks Find Friends in Chrome on an empty database, with accounts made only through the sign-up form.
 *
 *   phase "fresh": the first account sees that nobody else is here; a second account appears under
 *   "People on RunTogether" for the first, never for itself; they become friends from the list; searches
 *   with no match say "No users found."; both log out.
 *
 *   phase "restarted" (run after restarting the backend): both log in again with their passwords, and
 *   still see each other as friends.
 *
 * It needs the frontend and backend running on a database with no accounts for the "fresh" phase.
 *
 *   bun tests/browser/discovery.browser.ts http://localhost:8080 fresh
 *   (restart the backend)
 *   bun tests/browser/discovery.browser.ts http://localhost:8080 restarted
 */
import { check, finish, launchChrome, type Page } from "./chrome.ts";

const APP = new URL(process.argv[2] ?? "http://localhost:8080").origin;
const PHASE = process.argv[3] ?? "fresh";
const PASSWORD = "sea-shells-42";
const MORGAN = "morgan";
const JAMIE = "jamie";

const chrome = await launchChrome(APP);

const row = (username: string) =>
  `document.querySelector('.search-result[data-username=${JSON.stringify(username)}]')`;
const rowShows = (page: Page, username: string, words: string) =>
  page.waitFor(`${row(username)}?.innerText.includes(${JSON.stringify(words)})`);
const listed = (page: Page) =>
  page.evaluate<string[]>(
    "[...document.querySelectorAll('.search-result')].map((r) => r.dataset.username)",
  );

async function friendsTab(page: Page) {
  await page.open(`${APP}/`);
  await page.waitFor("document.querySelector('[data-testid=signed-in-username]')");
  await page.click(".nav-item", "Friends");
  await page.waitFor("document.querySelector('.friends-page')");
  await page.waitFor(
    "document.querySelector('.results-heading') && !document.querySelector('[role=status]')?.innerText.includes('Searching')",
  );
  await Bun.sleep(300);
}

async function signIn(username: string, creating: boolean): Promise<Page> {
  const page = await chrome.newPage();
  await page.open(`${APP}/`);
  await page.signInShown();
  await page.submitPasswordForm(username, PASSWORD, creating);
  return page;
}

async function logOut(page: Page) {
  await page.click(".nav-item", "Profile");
  await page.waitFor("document.querySelector('.profile-page')");
  await page.click(".profile-section .profile-menu-item", "Log out");
  await page.signInShown();
}

try {
  console.log(`Chrome ${chrome.version}, app at ${APP}, phase ${PHASE}\n`);

  if (PHASE === "fresh") {
    // The first account: nobody else is here, and nobody is made up.
    const morgan = await signIn(MORGAN, true);
    check("Morgan signs up with a username and password", await morgan.appShown(MORGAN));
    await friendsTab(morgan);
    check(
      "with only Morgan's account, Friends says she's the first one here",
      (await morgan.hasText("People on RunTogether")) &&
        (await morgan.hasText("You're the first one here.")) &&
        (await morgan.hasText("Invite your friends to sign up")),
    );
    check("and lists nobody", (await listed(morgan)).length === 0);

    // A second account appears for Morgan, and never for itself.
    const jamie = await signIn(JAMIE, true);
    check("Jamie signs up with a username and password", await jamie.appShown(JAMIE));
    await friendsTab(jamie);
    check(
      "Jamie's People on RunTogether lists Morgan, and not Jamie herself",
      JSON.stringify(await listed(jamie)) === JSON.stringify([MORGAN]),
    );
    check("Morgan's entry offers Add Friend", await rowShows(jamie, MORGAN, "Add Friend"));

    await friendsTab(morgan);
    check(
      "after Jamie registers, Morgan's list shows Jamie, and not Morgan herself",
      JSON.stringify(await listed(morgan)) === JSON.stringify([JAMIE]),
    );

    // They become friends from the list, and each sees the right status.
    await jamie.evaluate(
      `[...${row(MORGAN)}.querySelectorAll('button')].find((b) => b.innerText.includes('Add Friend')).click()`,
    );
    check(
      "Jamie sends Morgan a request from the list",
      await jamie.hasText(`Friend request sent to ${MORGAN}.`),
    );
    check("Morgan's entry now says Requested", await rowShows(jamie, MORGAN, "Requested"));

    await friendsTab(morgan);
    check(
      "Morgan sees Accept and Decline on Jamie's entry",
      (await rowShows(morgan, JAMIE, "Accept")) && (await rowShows(morgan, JAMIE, "Decline")),
    );
    await morgan.evaluate(
      `[...${row(JAMIE)}.querySelectorAll('button')].find((b) => b.innerText.includes('Accept')).click()`,
    );
    check("Morgan accepts", await morgan.hasText("Friend request accepted!"));
    check(
      "Jamie's entry now says Already friends",
      await rowShows(morgan, JAMIE, "Already friends"),
    );
    await friendsTab(jamie);
    check(
      "and Jamie sees Morgan as Already friends",
      await rowShows(jamie, MORGAN, "Already friends"),
    );

    // Typing searches instead of browsing.
    await jamie.type(".add-friend-form input", "zz");
    check("a search with no match says No users found.", await jamie.hasText("No users found."));
    await jamie.type(".add-friend-form input", "m");
    await Bun.sleep(600);
    check(
      "one letter shows no results, only the hint to type more",
      (await listed(jamie)).length === 0 &&
        !(await jamie.evaluate<boolean>("Boolean(document.querySelector('.results-heading'))")),
    );
    await jamie.type(".add-friend-form input", "MOR");
    check("two or more letters search, ignoring case", await jamie.hasText(`Results for “MOR”`));
    check("and find Morgan", JSON.stringify(await listed(jamie)) === JSON.stringify([MORGAN]));
    await jamie.type(".add-friend-form input", "");
    check(
      "clearing the search shows People on RunTogether again",
      await jamie.waitFor(
        "document.querySelector('.results-heading')?.innerText === 'People on RunTogether'",
      ),
    );

    // The page only ever received usernames.
    const answer = await jamie.evaluate<string>(
      "fetch('/api/friends/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '' }) }).then((r) => r.text())",
    );
    check(
      "the discovery answer holds only usernames",
      answer === JSON.stringify({ people: [{ username: MORGAN }] }),
      answer,
    );

    await logOut(morgan);
    await logOut(jamie);
    check("both log out", true);
  } else {
    // After the backend restarted: the same accounts, the same passwords, the same friendship.
    for (const [username, other] of [
      [MORGAN, JAMIE],
      [JAMIE, MORGAN],
    ] as const) {
      const page = await signIn(username, false);
      check(
        `${username} logs in again with her password after the restart`,
        await page.appShown(username),
      );
      await friendsTab(page);
      check(
        `${username} still sees ${other} as Already friends`,
        await rowShows(page, other, "Already friends"),
      );
    }
    const wrong = await chrome.newPage();
    await wrong.open(`${APP}/`);
    await wrong.signInShown();
    await wrong.submitPasswordForm(MORGAN, "not-her-password", false);
    check(
      "a wrong password is still refused",
      await wrong.hasText("The username or password is incorrect."),
    );
  }
} catch (error) {
  check("the browser run finished", false, String(error));
} finally {
  await chrome.close();
}

finish();
