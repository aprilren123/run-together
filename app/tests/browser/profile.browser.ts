/**
 * Checks the Profile page's layout in Chrome at phone, tablet, and desktop widths, with a 32-character
 * username: a vertical stack of the header, account card, two equal statistic cards, and the Account
 * section, with nothing overflowing or overlapping. Then it checks the statistics, bell, and log out still
 * work. It needs the frontend and backend already running.
 *
 *   bun tests/browser/profile.browser.ts http://localhost:8080
 */
import { check, finish, launchChrome } from "./chrome.ts";
const APP = new URL(process.argv[2] ?? "http://localhost:8080").origin;
const out = process.argv[3]; // Optional folder for screenshots.
const t = Date.now().toString(36).slice(-6);
const LONG = `maximilian_alexander_${t}`.padEnd(32, "x").slice(0, 32);
const jars: Record<string, string> = {};
async function api(who: string, path: string, body: object) {
  const r = await fetch(`${APP}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: APP, Cookie: jars[who] ?? "" },
    body: JSON.stringify(body),
  });
  const c = r.headers.getSetCookie().find((l) => l.includes("runtogether-session="));
  if (c) jars[who] = c.split(";")[0];
  return r.json();
}
const friend = `pat-${t}`;
for (const u of [LONG, friend])
  await api(u, "/auth/register", { username: u, password: "sea-shells-42" });
const { request } = await api(friend, "/friends/request", { username: LONG });
await api(LONG, "/friends/accept", { request });
const run = (
  await api(LONG, "/runs/create", {
    startTime: "2026-11-20T07:00",
    distance: 4,
    pace: 9,
    location: "Esplanade",
    details: "",
  })
).run;
await api(friend, "/suggestions/create", { event: run, change: { pace: 8 } });

const chrome = await launchChrome(APP);
const page = await chrome.newPage();
console.log(`username (${LONG.length} chars): ${LONG}\n`);
await page.open(`${APP}/`);
await page.signInShown();
await page.submitPasswordForm(LONG, "sea-shells-42", false);
await page.appShown(LONG);

for (const [width, height] of [
  [320, 740],
  [390, 844],
  [768, 1000],
  [1280, 900],
]) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await page.click(".nav-item", "Profile");
  await page.waitFor("document.querySelector('.profile-page .profile-card')");
  await Bun.sleep(300);
  const m = await page.evaluate<any>(`(() => {
    const box = (el) => el.getBoundingClientRect();
    const main = document.querySelector('.profile-page');
    const card = document.querySelector('.profile-card');
    const stats = [...document.querySelectorAll('.stat-card')];
    const name = document.querySelector('.profile-name');
    const logout = document.querySelector('.profile-section .profile-menu-item');
    const header = document.querySelector('.profile-page header');
    const inside = (child, parent) => { const c = box(child), p = box(parent); return c.left >= p.left - 0.5 && c.right <= p.right + 0.5 && c.top >= p.top - 0.5 && c.bottom <= p.bottom + 0.5; };
    const overlaps = (a, b) => { const x = box(a), y = box(b); return x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom; };
    const statKids = stats.flatMap((s) => [...s.children]);
    return {
      mainDisplay: getComputedStyle(main).display,
      mainWidth: Math.round(box(main).width),
      scroll: document.documentElement.scrollWidth,
      order: [header, card, stats[0], logout].map((el) => Math.round(box(el).top)),
      cardWidth: Math.round(box(card).width),
      statWidths: stats.map((s) => Math.round(box(s).width)),
      statsSameRow: Math.round(box(stats[0]).top) === Math.round(box(stats[1]).top),
      nameFits: name.scrollWidth <= name.clientWidth + 1 && inside(name, card),
      statKidsInside: statKids.every((k) => inside(k, k.parentElement)),
      statKidsApart: stats.every((s) => { const k = [...s.children]; return k.every((a, i) => k.slice(i + 1).every((b) => !overlaps(a, b))); }),
      logoutFits: inside(logout.querySelector('span'), logout),
      bellRight: Math.round(box(document.querySelector('.bell')).right) === Math.round(box(header).right),
    };
  })()`);
  console.log(`${width}px`, JSON.stringify(m));
  const label = `${width}px:`;
  check(
    `${label} the page is a vertical stack (main is a block, not a flex row)`,
    m.mainDisplay === "block",
  );
  check(
    `${label} heading, card, statistics, and Account section go top to bottom`,
    m.order.every((v: number, i: number) => i === 0 || v > m.order[i - 1]),
  );
  check(`${label} no horizontal scrolling`, m.scroll <= width);
  check(
    `${label} content width ${m.mainWidth}px fits the screen and stops at 640px`,
    m.mainWidth <= Math.min(width, 640),
  );
  check(`${label} the profile card spans the content width`, m.cardWidth >= m.mainWidth - 50);
  check(
    `${label} the two statistic cards are equal and at least 120px wide (${m.statWidths.join(", ")})`,
    m.statWidths[0] === m.statWidths[1] && m.statWidths[0] >= 120 && m.statsSameRow,
  );
  check(`${label} the long username wraps inside the card instead of overflowing`, m.nameFits);
  check(
    `${label} each statistic's number, label, and arrow fit and don't overlap`,
    m.statKidsInside && m.statKidsApart,
  );
  check(`${label} "Log out of …" fits its row`, m.logoutFits);
  check(`${label} the bell sits at the right of the header, as on other tabs`, m.bellRight);
  const s = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  if (out) await Bun.write(`${out}/profile-${width}.png`, Buffer.from(s.data, "base64"));
}

// Interactions are unchanged.
await page.click(".stat-card", "Friend");
check(
  "the Friends statistic opens the Friends tab",
  await page.waitFor("document.querySelector('.friends-page')"),
);
await page.click(".nav-item", "Profile");
await page.waitFor("document.querySelector('.profile-card')");
await page.click(".stat-card", "Upcoming");
check(
  "the Upcoming runs statistic opens My Runs",
  await page.waitFor("document.querySelector('.my-runs-page')"),
);
await page.click(".nav-item", "Profile");
await page.waitFor("document.querySelector('.profile-card')");
check(
  "the bell on Profile shows the unread count",
  (await page.evaluate<string>(
    "document.querySelector('[data-testid=unread-count]')?.innerText ?? ''",
  )) === "1",
);
await page.click(".bell-button");
check(
  "the bell opens its list on Profile",
  await page.waitFor(
    "document.querySelector('.bell-item')?.innerText.includes('suggested a change')",
  ),
);
await page.evaluate("document.querySelector('.bell-item').click()");
check(
  "a notification opens its run from Profile",
  await page.waitFor("document.querySelector('.run-details-page')"),
);
await page.click(".back-button");
await page.click(".nav-item", "Profile");
await page.waitFor("document.querySelector('.profile-card')");
await page.click(".profile-section .profile-menu-item", "Log out");
check("Log out still signs out", await page.signInShown());
await chrome.close();
finish();
