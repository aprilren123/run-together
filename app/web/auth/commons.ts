import { post, type Session, UNREACHABLE, messages } from "./session.ts";

/** Where Commons sends the browser back to, on the origin the backend's PUBLIC_ORIGIN names. */
export const CALLBACK_PATH = "/auth/commons/callback";

/**
 * Starts a Commons sign-in. The backend sets the sign-in cookie and answers the Commons address, which
 * carries this app's origin, a one-time state, and a PKCE challenge; the browser then leaves for Commons.
 */
export async function startCommons(
  session: Session,
  navigate: (address: string) => void,
): Promise<boolean> {
  const answer = await post<{ address: string }>("/auth/commons/start");
  if (!answer.ok) {
    session.error.value =
      answer.error === UNREACHABLE
        ? messages.unreachable
        : "Commons sign-in isn't available right now. Try again.";
    return false;
  }
  navigate(answer.body.address);
  return true;
}

/**
 * Finishes a Commons sign-in from the callback's query string. Returns `choose` when the person's Commons
 * username can't be used here and they must pick another, and `done` otherwise, signed in or with `error` set.
 */
export async function finishCommons(session: Session, search: string): Promise<"choose" | "done"> {
  const query = new URLSearchParams(search);
  if (query.get("error") === "access_denied") {
    session.error.value = "Sign-in cancelled.";
    return "done";
  }
  const refused = await session.enter(
    post("/auth/commons/finish", {
      state: query.get("state") ?? "",
      code: query.get("code") ?? "",
    }),
    {
      CONFLICT: "Your Commons username is taken here. Choose another.",
      INVALID_REQUEST: "Your Commons username can't be used here. Choose another.",
      FORBIDDEN: "Signing in with Commons didn't work. Start again.",
    },
  );
  return refused === "CONFLICT" || refused === "INVALID_REQUEST" ? "choose" : "done";
}

/** Picks a username for a confirmed Commons sign-in. Returns `choose` to let the person try another name. */
export async function chooseUsername(
  session: Session,
  username: string,
): Promise<"choose" | "done"> {
  const refused = await session.enter(post("/auth/commons/choose", { username: username.trim() }), {
    CONFLICT: "That username is taken.",
    INVALID_REQUEST: "That username doesn't follow the rule below it.",
    FORBIDDEN: "This sign-in has expired. Start again.",
  });
  return refused === null || refused === "FORBIDDEN" ? "done" : "choose";
}
