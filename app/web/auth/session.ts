import { ref } from "vue";

/**
 * The signed-in user, shared by every component and every way of signing in. Adapted from ConceptBox's
 * `frontend/src/reusable/session.ts`. The session itself lives in an HttpOnly cookie that only the server
 * reads; the page learns who is signed in by calling `/api/auth/me`.
 */

export interface Me {
  username: string;
}

/** What an `/api` call answered: its body, or the HTTP category it was refused with. */
export type Answer<T> = { ok: true; body: T } | { ok: false; error: string };

/** The category for a request that never reached the backend, or that the frontend server couldn't forward. */
export const UNREACHABLE = "UNREACHABLE";

export const messages = {
  unreachable: "Can't reach RunTogether. Check your connection and try again.",
  ended: "Your session has ended. Sign in again.",
  generic: "Something went wrong. Try again.",
  wrongAddress:
    "RunTogether refused a request from this address. Open it at the address it was set up with (PUBLIC_ORIGIN).",
};

/** Posts `body` to `/api{path}`. The browser sends the session cookie itself, since the API is on the same origin. */
export async function post<T>(path: string, body: object = {}): Promise<Answer<T>> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: UNREACHABLE };
  }
  const data: unknown = await response.json().catch(() => null);
  const error =
    typeof data === "object" && data !== null && "error" in data ? data.error : undefined;
  if (response.ok && data !== null && error === undefined) return { ok: true, body: data as T };
  // `web/server.ts` answers UNAVAILABLE, and Vite's proxy an error page, when the backend is down.
  if (typeof error === "string" && error !== "UNAVAILABLE") return { ok: false, error };
  return { ok: false, error: response.status >= 500 ? UNREACHABLE : "INTERNAL_ERROR" };
}

export function createSession() {
  const me = ref<Me | null>(null);
  /** Whether `/auth/me` has answered at least once, so the page knows whether to show sign-in or the app. */
  const checked = ref(false);
  /** Whether the first `/auth/me` couldn't reach the backend, so the page can offer to try again. */
  const unreachable = ref(false);
  const error = ref<string | null>(null);

  /**
   * Asks the backend who is signed in. A refusal while someone was signed in means their session ended.
   * An unreachable backend signs nobody out, since the session may still be live.
   */
  async function load(): Promise<void> {
    const answer = await post<Me>("/auth/me");
    if (answer.ok) {
      me.value = { username: answer.body.username };
      unreachable.value = false;
    } else if (answer.error === UNREACHABLE) {
      if (!me.value) unreachable.value = true;
    } else {
      unreachable.value = false;
      if (me.value) sessionEnded();
    }
    checked.value = true;
  }

  /**
   * Awaits a sign-in request. On success, loads the signed-in user and returns null. On a refusal, sets
   * `error` to the sentence `refusals` gives for the HTTP category, and returns the category.
   */
  async function enter(
    answer: Promise<Answer<unknown>>,
    refusals: Record<string, string>,
  ): Promise<string | null> {
    const result = await answer;
    if (!result.ok) {
      error.value =
        result.error === UNREACHABLE
          ? messages.unreachable
          : (refusals[result.error] ??
            (result.error === "FORBIDDEN" ? messages.wrongAddress : messages.generic));
      return result.error;
    }
    error.value = null;
    await load();
    return null;
  }

  /** Signs out. A session that had already ended counts as signed out; an unreachable backend doesn't, since the cookie may still be set. */
  async function signOut(): Promise<boolean> {
    const answer = await post("/auth/logout");
    if (!answer.ok && answer.error === UNREACHABLE) {
      error.value = messages.unreachable;
      return false;
    }
    error.value = null;
    me.value = null;
    return true;
  }

  /** Shows the sign-in screen with a note, for a session the backend no longer accepts. */
  function sessionEnded() {
    error.value = messages.ended;
    me.value = null;
  }

  return { me, checked, unreachable, error, load, enter, signOut, sessionEnded };
}

export type Session = ReturnType<typeof createSession>;

const shared = createSession();

/** The one session the page shares. */
export function useSession(): Session {
  return shared;
}
