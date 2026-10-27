/**
 * Checks a run's Discussion in Chrome, with two people signed in at once and a stranger.
 *
 *   phase "post": Morgan's run gets comments from Jamie (a friend) and Morgan; a double click posts once;
 *   Jamie deletes her own comment; Morgan removes one of Jamie's; a stranger can't read or post; once
 *   Morgan cancels the run, its comments stay but new ones are closed.
 *
 *   phase "restarted" (run after restarting the backend): the comments are still there.
 *
 * Jamie joins the run first, as a participant would, so she can still open it once it's canceled.
 * It needs the frontend and backend running. The accounts' names end in a suffix, which the second phase
 * reads from the first through COMMENTS_SUFFIX.
 *
 *   bun tests/browser/comments.browser.ts http://localhost:8080 post
 *   (restart the backend)
 *   COMMENTS_SUFFIX=<printed by the first phase> bun tests/browser/comments.browser.ts http://localhost:8080 restarted
 */
import { check, finish, launchChrome, type Page } from "./chrome.ts";

const APP = new URL(process.argv[2] ?? "http://localhost:8080").origin;
const PHASE = process.argv[3] ?? "post";
const SUFFIX = process.env.COMMENTS_SUFFIX ?? Date.now().toString(36);
const MORGAN = `morgan-${SUFFIX}`;
const JAMIE = `jamie-${SUFFIX}`;
const STRANGER = `sam-${SUFFIX}`;
const PASSWORD = "sea-shells-42";

const chrome = await launchChrome(APP);

/** Calls the API from the page, with its session cookie, and answers the status and body. */
const api = (page: Page, path: string, body: object = {}) =>
  page.evaluate<{ status: number; body: any }>(
    `fetch(${JSON.stringify(`/api${path}`)}, { method: "POST", headers: { "Content-Type": "application/json" }, body: ${JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, body: await r.json() }))`,
  );

async function signIn(username: string, creating: boolean): Promise<Page> {
  const page = await chrome.newPage();
  await page.open(`${APP}/`);
  await page.signInShown();
  await page.submitPasswordForm(username, PASSWORD, creating);
  await page.appShown(username);
  return page;
}

/** Reloads the app and opens the run `owner` hosts, from Home or from My Runs (Upcoming or Canceled). */
async function openRun(page: Page, owner: string) {
  await page.open(`${APP}/`);
  await page.waitFor("document.querySelector('[data-testid=signed-in-username]')");
  const card = `[...document.querySelectorAll('.run-card')].find((c) => c.querySelector('.run-card-owner strong')?.innerText === ${JSON.stringify(owner)})`;
  // The lists load after the page does, so each place gets the usual 5 seconds to show the run.
  if (!(await page.waitFor(card))) {
    await page.click(".nav-item", "My Runs");
    await page.waitFor("document.querySelector('.my-runs-page')");
    for (const section of ["Upcoming", "Canceled"]) {
      await page.click(".segment", section);
      if (await page.waitFor(card)) break;
    }
  }
  await page.evaluate(`${card}.click()`);
  await page.waitFor("document.querySelector('.comments-section')");
  await page.waitFor(
    "!document.querySelector('.comments-section')?.innerText.includes('Loading comments')",
  );
  await Bun.sleep(200);
}

/** Waits until the Discussion shows exactly `expected`, as [author, text], oldest first. */
const shows = (page: Page, expected: [string, string][]) =>
  page.waitFor(
    `JSON.stringify([...document.querySelectorAll('.comment')].map((c) => [c.querySelector('.comment-meta strong').innerText, c.querySelector('.comment-text').innerText])) === ${JSON.stringify(JSON.stringify(expected))}`,
  );

async function write(page: Page, text: string) {
  await page.type(".comment-form textarea", text);
  await Bun.sleep(50);
}

try {
  console.log(`Chrome ${chrome.version}, app at ${APP}, phase ${PHASE}, suffix ${SUFFIX}\n`);

  if (PHASE === "post") {
    const morgan = await signIn(MORGAN, true);
    const jamie = await signIn(JAMIE, true);
    const stranger = await signIn(STRANGER, true);
    const request = await api(jamie, "/friends/request", { username: MORGAN });
    await api(morgan, "/friends/accept", { request: request.body.request });
    const run = (
      await api(morgan, "/runs/create", {
        startTime: "2027-03-06T09:00",
        distance: 5,
        pace: 9,
        location: "Charles River Esplanade",
        details: "Easy loop",
      })
    ).body.run as string;
    // Jamie has joined the run, so after it's canceled she still finds it under My Runs › Canceled.
    const joined = await api(jamie, "/runs/join", { event: run });
    check(
      "Morgan's run is set up, and Jamie, her friend, has joined it",
      typeof run === "string" && joined.status === 200,
    );

    // Jamie sees an empty Discussion below the run's details, and posts.
    await openRun(jamie, MORGAN);
    check(
      "the Discussion sits below the run's Description",
      await jamie.evaluate<boolean>(
        "(() => { const h = [...document.querySelectorAll('.run-details-section h2')].map((x) => x.innerText); return h.indexOf('Description') >= 0 && h.findIndex((t) => t.startsWith('Discussion')) > h.indexOf('Description'); })()",
      ),
    );
    check("with no comments, it invites one", await jamie.hasText("No comments yet."));
    check(
      "Post is disabled until something is written",
      await jamie.evaluate<boolean>(
        "document.querySelector('.comment-form button[type=submit]').disabled",
      ),
    );
    await write(jamie, "Can we meet at the boathouse instead?");
    await jamie.click(".comment-form button[type=submit]");
    check("Jamie posts a comment and is told so", await jamie.hasText("Comment posted."));
    check(
      "it shows her name, the time, and the text",
      (await shows(jamie, [[JAMIE, "Can we meet at the boathouse instead?"]])) &&
        (await jamie.evaluate<boolean>(
          "Boolean(document.querySelector('.comment time')?.innerText.match(/\\d:\\d\\d (AM|PM)/))",
        )),
    );
    check(
      "the box is cleared for the next comment",
      (await jamie.evaluate<string>("document.querySelector('.comment-form textarea').value")) ===
        "",
    );

    // A double click posts once.
    await write(jamie, "Running 5 minutes late");
    await jamie.evaluate(
      "(() => { const b = document.querySelector('.comment-form button[type=submit]'); b.click(); b.click(); })()",
    );
    await jamie.hasText("Comment posted.");
    await Bun.sleep(500);
    const afterDouble = (await api(jamie, "/comments/list", { run })).body.comments
      .comments as any[];
    check(
      "a double click on Post stores the comment once",
      afterDouble.filter((c) => c.text === "Running 5 minutes late").length === 1,
    );

    // Long comments are capped at 500 characters.
    check(
      "the box takes at most 500 characters",
      (await jamie.evaluate<number>(
        "document.querySelector('.comment-form textarea').maxLength",
      )) === 500,
    );

    // Morgan sees Jamie's comments, replies, and is marked Host.
    await openRun(morgan, MORGAN);
    check(
      "Morgan sees Jamie's comments, oldest first",
      await shows(morgan, [
        [JAMIE, "Can we meet at the boathouse instead?"],
        [JAMIE, "Running 5 minutes late"],
      ]),
    );
    await write(morgan, "Sure, boathouse at 9!");
    await morgan.click(".comment-form button[type=submit]");
    await morgan.hasText("Comment posted.");
    check(
      "Morgan's reply is marked Host",
      await morgan.waitFor(
        "[...document.querySelectorAll('.comment')].some((c) => c.innerText.includes('Sure, boathouse at 9!') && c.querySelector('.comment-host'))",
      ),
    );
    check(
      "as the run's owner, Morgan can remove Jamie's comments",
      (
        await morgan.evaluate<string[]>(
          "[...document.querySelectorAll('.comment-delete')].map((b) => b.innerText.trim())",
        )
      ).filter((t) => t === "Remove").length === 2,
    );

    // Jamie can delete only her own comments.
    await openRun(jamie, MORGAN);
    const jamieButtons = await jamie.evaluate<string[]>(
      "[...document.querySelectorAll('.comment')].map((c) => c.querySelector('.comment-delete')?.innerText.trim() ?? '')",
    );
    check(
      "Jamie sees Delete on her two comments, and nothing on Morgan's",
      JSON.stringify(jamieButtons) === JSON.stringify(["Delete", "Delete", ""]),
    );
    const before = (await api(jamie, "/comments/list", { run })).body.comments.comments as any[];
    const morgans = before.find((c) => c.author === MORGAN).comment;
    check(
      "and the server refuses if she tries anyway",
      (await api(jamie, "/comments/delete", { comment: morgans })).status === 404,
    );
    await jamie.evaluate(
      "[...document.querySelectorAll('.comment')].find((c) => c.innerText.includes('Running 5 minutes late')).querySelector('.comment-delete').click()",
    );
    check("Jamie deletes her own comment", await jamie.hasText("Comment deleted."));
    check(
      "and it's gone",
      await jamie.waitFor(
        "![...document.querySelectorAll('.comment')].some((c) => c.innerText.includes('Running 5 minutes late'))",
      ),
    );

    // Morgan moderates the other one.
    await openRun(morgan, MORGAN);
    await morgan.evaluate(
      "[...document.querySelectorAll('.comment')].find((c) => c.innerText.includes('boathouse instead')).querySelector('.comment-delete').click()",
    );
    check("Morgan removes Jamie's other comment", await morgan.hasText("Comment deleted."));
    check(
      "only Morgan's reply is left",
      await morgan.waitFor(
        `JSON.stringify([...document.querySelectorAll('.comment')].map((c) => c.querySelector('.comment-text').innerText)) === ${JSON.stringify(JSON.stringify(["Sure, boathouse at 9!"]))}`,
      ),
    );
    await openRun(jamie, MORGAN);
    await write(jamie, "Thanks, see you there");
    await jamie.click(".comment-form button[type=submit]");
    await jamie.hasText("Comment posted.");

    // A stranger can neither read nor post.
    check(
      "a stranger can't read the comments",
      (await api(stranger, "/comments/list", { run })).status === 404,
    );
    check(
      "or post one",
      (await api(stranger, "/comments/post", { run, text: "Hi!" })).status === 404,
    );

    // Canceled: the history stays, new comments are closed.
    await api(morgan, "/runs/cancel", { run });
    await openRun(jamie, MORGAN);
    check(
      "once canceled, the comments are still there",
      await shows(jamie, [
        [MORGAN, "Sure, boathouse at 9!"],
        [JAMIE, "Thanks, see you there"],
      ]),
    );
    check(
      "and the Discussion says comments are closed, with no box to write in",
      (await jamie.hasText("Comments are closed because this run was canceled.")) &&
        !(await jamie.evaluate<boolean>("Boolean(document.querySelector('.comment-form'))")),
    );
    check(
      "the server refuses a new comment too",
      (await api(jamie, "/comments/post", { run, text: "Too late?" })).status === 409,
    );
    console.log(`\nCOMMENTS_SUFFIX=${SUFFIX}`);
  } else {
    // After the backend restarted: the comments are still there.
    const jamie = await signIn(JAMIE, false);
    await openRun(jamie, MORGAN);
    check(
      "after a restart, Jamie logs in and the run's comments are still there",
      await shows(jamie, [
        [MORGAN, "Sure, boathouse at 9!"],
        [JAMIE, "Thanks, see you there"],
      ]),
    );
    check("and comments are still closed", await jamie.hasText("Comments are closed"));
  }
} catch (error) {
  check("the browser run finished", false, String(error));
} finally {
  await chrome.close();
}

finish();
