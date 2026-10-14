import type { HttpCookieBinding } from "@mit-sdg/sync-engine-http/policy";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";
import { textInput } from "./inputs.ts";

const { Registering, CommonsFederating, Sessioning } = concepts;

const StartCommons = endpoint(
  "/auth/commons/start",
  ({ attempt, expiresAt, address }) =>
    receive({})
      .then(CommonsFederating.start({}).responds({ attempt, expiresAt, address }))
      .then(respond({ attempt, expiresAt, address })),
  { validators: { input: textInput } },
);

const FinishCommons = endpoint(
  "/auth/commons/finish",
  ({ attempt, state, code, username, user, session, expiresAt }) =>
    receive({ attempt, state, code })
      .then(CommonsFederating.finish({ attempt, nonce: state, code }).responds({ username }))
      .then(
        where(CommonsFederating._user({ attempt }).is({ user }))
          .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
          .then(respond({ user, session, expiresAt }))
          .named("returning"),
        where(no(CommonsFederating._user({ attempt })))
          .then(Registering.register({ username }).responds({ user }))
          .then(CommonsFederating.link({ attempt, user }).responds({}))
          .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
          .then(respond({ user, session, expiresAt }))
          .named("new"),
      ),
  { validators: { input: textInput } },
);

const ChooseUsername = endpoint(
  "/auth/commons/choose",
  ({ attempt, username, user, session, expiresAt }) =>
    receive({ attempt, username }).then(
      where(CommonsFederating._linkable({ attempt }).is({ linkable: true }))
        .then(Registering.register({ username }).responds({ user }))
        .then(CommonsFederating.link({ attempt, user }).responds({}))
        .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
        .then(respond({ user, session, expiresAt }))
        .named("linkable"),
      where(CommonsFederating._linkable({ attempt }).is({ linkable: false }))
        .then(respond({ error: "SIGN_IN_EXPIRED" }))
        .named("expired"),
    ),
  { validators: { input: textInput } },
);

/**
 * The HTTP settings for these endpoints: the category for each refusal, the endpoints that
 * start a session, and the sign-in cookie, which holds the attempt. Every refusal from CommonsFederating
 * is FORBIDDEN, which, unlike UNAUTHORIZED, leaves the sign-in cookie in place.
 */
export const commonsHttp = {
  publicErrors: {
    SIGN_IN_EXPIRED: "FORBIDDEN",
    SIGN_IN_REFUSED: "FORBIDDEN",
    NOT_CONFIRMED: "FORBIDDEN",
    ALREADY_LINKED: "FORBIDDEN",
  },
  startingSessions: ["/auth/commons/finish", "/auth/commons/choose"],
  signInCookie: (name: string): HttpCookieBinding => ({
    name,
    input: "attempt",
    issue: [{ path: "/auth/commons/start", value: "attempt", expires: "expiresAt" }],
    clear: ["/auth/commons/finish", "/auth/commons/choose"],
  }),
} as const;

export const composition = {
  starting: { StartCommons },
  finishing: { FinishCommons, ChooseUsername },
};