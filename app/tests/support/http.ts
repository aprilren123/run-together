import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../../src/assembly.ts";
import { MemoryProvider } from "../../src/concepts/Federating/provider.ts";
import { runTogetherPolicy } from "../../src/http.ts";

export const ORIGIN = "http://localhost:8080";
export const SESSION = "__Host-runtogether-session";
export const SIGN_IN = "__Host-runtogether-sign-in";

/** RunTogether behind its HTTP handler, on the test database `setup.ts` gives `src/db.ts`, and an in-memory Commons. */
export const commons = new MemoryProvider();
const application = assembleApplication({ provider: commons });
export const handle = createHttpHandler({
  application,
  gateway: createGateway({ application }),
  policy: runTogetherPolicy(ORIGIN),
});

/** The tests share one database, so each one registers usernames no other test uses. */
let users = 0;
export const unique = (name: string) => `${name}-${++users}`;

/** A browser that keeps its own cookies, so a test can see each cookie set and cleared. */
export function browser() {
  const jar = new Map<string, string>();

  async function post(path: string, body: object = {}, headers: Record<string, string> = {}) {
    const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
    const response = await handle(
      new Request(`${ORIGIN}/api${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie, ...headers },
        body: JSON.stringify(body),
      }),
    );
    const cookies = response.headers.getSetCookie();
    for (const [name = "", value = ""] of cookies.map(
      (line) => line.split(";")[0]?.split("=") ?? [],
    )) {
      if (value === "") jar.delete(name);
      else jar.set(name, value);
    }
    return { status: response.status, body: (await response.json()) as any, cookies };
  }

  return { jar, post };
}

/** A browser signed in to a new account, with the account's username. */
export async function signedUp(name: string) {
  const person = browser();
  const username = unique(name);
  const { status } = await person.post("/auth/register", { username, password: "sea-shells-42" });
  if (status !== 200) throw new Error(`Couldn't register ${username}: ${status}`);
  return { ...person, username };
}
