/**
 * A headless Chrome driven over the Chrome DevTools Protocol, for the browser checks in this folder. Each
 * page opens in its own browser context, so each has its own cookies, like two people on two computers.
 */

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CHROME_DEBUGGING_PORT ?? 9333);

let passed = 0;
let failed = 0;

/** Prints one check's outcome and counts it. */
export function check(name: string, ok: boolean, detail = "") {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? `  (${detail})` : ""}`);
}

/** Prints the totals and exits with 1 when any check failed. */
export function finish(): never {
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

type Message = { id?: number; method?: string; params?: any; result?: any; error?: unknown };

/** A DevTools connection: commands, and listeners for events. */
async function connection(url: string) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let ids = 0;
  const pending = new Map<number, (message: Message) => void>();
  const listeners: ((message: { method: string; params: any }) => void)[] = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as Message;
    if (message.id) pending.get(message.id)?.(message);
    else for (const listener of listeners) listener(message as { method: string; params: any });
  };
  async function send(method: string, params: object = {}): Promise<any> {
    const id = ++ids;
    socket.send(JSON.stringify({ id, method, params }));
    const message = await new Promise<Message>((resolve) => pending.set(id, resolve));
    if (message.error) throw new Error(`${method}: ${JSON.stringify(message.error)}`);
    return message.result;
  }
  return { send, listeners, close: () => socket.close() };
}

export type Cookie = {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  path: string;
  domain: string;
  session: boolean;
};

/** A page of RunTogether at `app`, with helpers for its screens. */
async function page(url: string, app: string) {
  const { send, listeners, close } = await connection(url);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  // Pages in background browser contexts report `document.visibilityState` as hidden; act as if each is the focused tab.
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });

  async function evaluate<T = unknown>(expression: string): Promise<T> {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) throw new Error(`${expression}: ${JSON.stringify(exceptionDetails)}`);
    return result.value as T;
  }
  async function waitFor(expression: string, timeout = 5_000): Promise<boolean> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return true;
      await Bun.sleep(50);
    }
    return false;
  }
  async function open(url: string) {
    await send("Page.navigate", { url });
    await waitFor(
      "document.readyState === 'complete' && document.querySelector('#app')?.children.length",
    );
  }
  const text = () => evaluate<string>("document.body.innerText");
  const hasText = (words: string) =>
    waitFor(`document.body.innerText.includes(${JSON.stringify(words)})`);
  const signInShown = () => waitFor("document.querySelector('.commons-button')");
  const appShown = (username: string) =>
    waitFor(
      `document.querySelector('[data-testid=signed-in-username]')?.innerText === ${JSON.stringify(username)}`,
    );
  async function cookie(name: string): Promise<Cookie | undefined> {
    const { cookies } = await send("Network.getCookies", { urls: [app] });
    return (cookies as Cookie[]).find((each) => each.name === name);
  }

  /** Sets an input's value the way typing does, so Vue's v-model sees it. */
  async function type(selector: string, value: string) {
    await evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      input.value = ${JSON.stringify(value)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
  }
  /** Clicks the first element matching `selector` whose text includes `words`, or the first match. */
  async function click(selector: string, words?: string) {
    const clicked = await evaluate<boolean>(`(() => {
      const all = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const target = ${words === undefined ? "all[0]" : `all.find((each) => each.innerText.includes(${JSON.stringify(words)}))`};
      if (!target) return false;
      target.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Nothing to click: ${selector} ${words ?? ""}`);
  }

  /** Fills the password form and submits it. Switches to "Create account" when `creating`. */
  async function submitPasswordForm(username: string, password: string, creating: boolean) {
    await evaluate(`(() => {
      const switcher = document.querySelector('.auth-switch .text-button');
      const creatingNow = document.querySelector('.auth-form button[type=submit]').innerText.includes('Create');
      if (${creating} !== creatingNow) switcher.click();
    })()`);
    await Bun.sleep(50);
    await type(".auth-form input[name=username]", username);
    await type(".auth-form input[name=password]", password);
    await click(".auth-form button[type=submit]");
  }

  return {
    send,
    listeners,
    close,
    evaluate,
    waitFor,
    open,
    text,
    hasText,
    signInShown,
    appShown,
    cookie,
    type,
    click,
    submitPasswordForm,
  };
}

export type Page = Awaited<ReturnType<typeof page>>;

/** Starts Chrome. `newPage()` opens a page in a fresh browser context; `close()` stops Chrome. */
export async function launchChrome(app: string) {
  const profile = `${process.env.CHROME_PROFILE_DIR ?? process.env.TMPDIR ?? "/tmp"}/runtogether-chrome-${process.pid}`;
  const chrome = Bun.spawn(
    [
      CHROME,
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "about:blank",
    ],
    { stdout: "ignore", stderr: "ignore" },
  );

  let browserUrl: string | undefined;
  for (let i = 0; i < 150 && !browserUrl; i += 1) {
    try {
      browserUrl = (
        (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()) as {
          webSocketDebuggerUrl: string;
        }
      ).webSocketDebuggerUrl;
    } catch {
      await Bun.sleep(100);
    }
  }
  if (!browserUrl) throw new Error("Chrome didn't start.");
  const browser = await connection(browserUrl);
  const version = (await browser.send("Browser.getVersion")).product as string;
  const pages: Page[] = [];

  async function newPage(): Promise<Page> {
    const { browserContextId } = await browser.send("Target.createBrowserContext");
    const { targetId } = await browser.send("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    const opened = await page(`ws://127.0.0.1:${PORT}/devtools/page/${targetId}`, app);
    pages.push(opened);
    return opened;
  }

  async function close() {
    for (const each of pages) each.close();
    browser.close();
    chrome.kill();
    await chrome.exited;
    await Bun.$`rm -rf ${profile}`.quiet().nothrow();
  }

  return { version, newPage, close };
}
