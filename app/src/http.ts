import { httpPolicy, type HttpPolicy } from "@mit-sdg/sync-engine-http/policy";
import { accountsHttp } from "./compositions/reusable/accounts.ts";
import { commonsHttp } from "./compositions/reusable/commons.ts";
import { passwordsHttp } from "./compositions/reusable/passwords.ts";

/**
 * The HTTP category for each refusal from RunTogether's own concepts and compositions. A refusal missing
 * here reaches the browser as INTERNAL_ERROR (500). Each way of signing in declares its categories beside
 * its endpoints.
 */
const publicErrors = {
  INVALID_RUN: "INVALID_REQUEST",
  INVALID_FLEXIBILITY: "INVALID_REQUEST",
  NOT_OWNER: "FORBIDDEN",
  RUN_NOT_FOUND: "NOT_FOUND",
  RUN_CANCELED: "CONFLICT",

  SAME_USER: "FORBIDDEN",
  OWN_RUN: "FORBIDDEN",
  INVALID_CHANGE: "INVALID_REQUEST",
  CHANGE_DOESNT_FIT: "CONFLICT",
  NOT_FRIENDS: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",

  INVALID_COMMENT: "INVALID_REQUEST",
  DUPLICATE_COMMENT: "CONFLICT",
  CANNOT_DELETE: "NOT_FOUND",
  COMMENT_NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "NOT_FOUND",

  ALREADY_JOINED: "CONFLICT",
  NOT_JOINED: "NOT_FOUND",

  CANNOT_ACCEPT: "CONFLICT",
  CANNOT_REJECT: "CONFLICT",
  CANNOT_WITHDRAW: "CONFLICT",

  CANNOT_REQUEST: "CONFLICT",
  CANNOT_REMOVE: "CONFLICT",
} as const;

/**
 * The HTTP settings: the API under /api, each refusal returned as an HTTP category, the session in
 * an HttpOnly cookie that each way of signing in sets and sign-out clears, and a Commons sign-in
 * attempt in a second cookie that only the browser that started it holds. `publicOrigin` is the
 * origin browsers use, which the server requires for cookies.
 */
export function runTogetherPolicy(publicOrigin: string): HttpPolicy {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    publicErrors: {
      ...accountsHttp.publicErrors,
      ...passwordsHttp.publicErrors,
      ...commonsHttp.publicErrors,
      ...publicErrors,
    },
    cookies: {
      session: accountsHttp.sessionCookie("runtogether-session", [
        ...passwordsHttp.startingSessions,
        ...commonsHttp.startingSessions,
      ]),
      signIn: commonsHttp.signInCookie("runtogether-sign-in"),
    },
  });
}
