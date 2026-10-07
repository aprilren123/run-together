import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    ALREADY_JOINED: "CONFLICT",
    NOT_JOINED: "NOT_FOUND",

    CANNOT_ACCEPT: "CONFLICT",
    CANNOT_REJECT: "CONFLICT",
    CANNOT_WITHDRAW: "CONFLICT",

    CANNOT_REQUEST: "CONFLICT",
    CANNOT_REMOVE: "CONFLICT",
  },
});