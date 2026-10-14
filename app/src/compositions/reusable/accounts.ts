import type { HttpCookieBinding } from "@mit-sdg/sync-engine-http/policy";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";
import { textInput } from "./inputs.ts";

const { Registering, Sessioning } = concepts;

const Me = endpoint(
  "/auth/me",
  ({ session, user, username }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(Registering._username({ user }).is({ username })).then(respond({ username })),
      ),
  { validators: { input: textInput } },
);

const SignOut = endpoint(
  "/auth/logout",
  ({ session }) =>
    receive({ session })
      .then(Sessioning.end({ session }).responds({}))
      .then(respond({})),
  { validators: { input: textInput } },
);

/**
 * The HTTP settings for these endpoints and Registering: the category for each refusal, and
 * the session cookie, which each endpoint in `startingSessions` sets and sign-out clears.
 */
export const accountsHttp = {
  publicErrors: { NOT_SIGNED_IN: "UNAUTHORIZED", INVALID_USERNAME: "INVALID_REQUEST", USERNAME_TAKEN: "CONFLICT" },
  sessionCookie: (name: string, startingSessions: readonly string[]): HttpCookieBinding => ({
    name,
    input: "session",
    issue: startingSessions.map((path) => ({ path, value: "session", expires: "expiresAt" })),
    clear: ["/auth/logout"],
  }),
} as const;

export const composition = {
  identifying: { Me },
  leaving: { SignOut },
};