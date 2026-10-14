import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";
import { textInput } from "./inputs.ts";

const { Registering, Authenticating, Sessioning } = concepts;

const Register = endpoint(
  "/auth/register",
  ({ username, password, user, session, expiresAt }) =>
    receive({ username, password }).then(
      where(Authenticating._acceptable({ password }).is({ acceptable: true }))
        .then(Registering.register({ username }).responds({ user }))
        .then(Authenticating.set({ user, password }).responds({}))
        .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
        .then(respond({ user, session, expiresAt }))
        .named("accepted"),
      where(Authenticating._acceptable({ password }).is({ acceptable: false }))
        .then(respond({ error: "INVALID_PASSWORD" }))
        .named("refused"),
    ),
  { validators: { input: textInput } },
);

const SignIn = endpoint(
  "/auth/login",
  ({ username, password, user, session, expiresAt }) =>
    receive({ username, password }).then(
      where(Registering._byUsername({ username }).is({ user }))
        .then(Authenticating.authenticate({ user, password }).responds({}))
        .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
        .then(respond({ user, session, expiresAt }))
        .named("known"),
      where(no(Registering._byUsername({ username })))
        .then(respond({ error: "INVALID_CREDENTIALS" }))
        .named("unknown"),
    ),
  { validators: { input: textInput } },
);

/** The HTTP settings for these endpoints: the category for each refusal, and the endpoints that start a session. */
export const passwordsHttp = {
  publicErrors: { INVALID_PASSWORD: "INVALID_REQUEST", PASSWORD_SET: "CONFLICT", INVALID_CREDENTIALS: "UNAUTHORIZED" },
  startingSessions: ["/auth/register", "/auth/login"],
} as const;

export const composition = {
  entering: { Register, SignIn },
};