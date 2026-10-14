import { assemble } from "@mit-sdg/sync-engine/assembly";

import { RunPlanningConcept } from "./concepts/RunPlanning.ts";
import { JoiningConcept } from "./concepts/Joining.ts";
import { ChangeSuggestingConcept } from "./concepts/ChangeSuggesting.ts";
import { FriendingConcept } from "./concepts/Friending.ts";
import { NotifyingConcept } from "./concepts/Notifying.ts";
import type { Provider } from "./concepts/Federating/provider.ts";
import { composition } from "./compositions/RunTogether.ts";
import { composition as notifications } from "./compositions/Notifications.ts";
import { composition as accounts } from "./compositions/reusable/accounts.ts";
import { composition as passwords } from "./compositions/reusable/passwords.ts";
import { composition as commons } from "./compositions/reusable/commons.ts";

import { registering } from "./concepts/Registering/registry.ts";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { sessioning } from "./concepts/Sessioning/registry.ts";
import { commonsFederating } from "./concepts/Federating/registry.ts";

import { applicationConceptSet } from "./concepts.ts";
import type { Db } from "mongodb";
import { db } from "./db.ts";

/** Builds RunTogether on the database and a Commons provider: a `CommonsProvider` when running, a `MemoryProvider` for `sync-engine check`. */
export function assembleApplication({
  provider,
  database = db,
}: {
  provider: Provider;
  /** The database the concepts store their state in; the app's own unless a test gives another. */
  database?: Db;
}) {
  // The concepts copied from ConceptBox build themselves through their registries' `mongo` floors.
  const resources = { database, commons: provider };

  return assemble({
    conceptSet: applicationConceptSet,

    instances: {
      RunPlanning: new RunPlanningConcept(database),
      Joining: new JoiningConcept(database),
      ChangeSuggesting: new ChangeSuggestingConcept(database),
      Friending: new FriendingConcept(database),
      Notifying: new NotifyingConcept(database),
      Registering: registering.floors!.mongo(resources, "Registering"),
      Authenticating: authenticating.floors!.mongo(resources, "Authenticating"),
      Sessioning: sessioning.floors!.mongo(resources, "Sessioning"),
      CommonsFederating: commonsFederating.floors!.mongo(resources, "CommonsFederating"),
    },

    // A Commons sign-in attempt works like a password until it is spent, so it and the values sent with it are redacted from logs.
    redaction: { fields: ["attempt", "nonce", "state", "code"] },

    composition: {
      RunTogether: composition,
      notifications,
      reusable: { accounts, passwords, commons },
    },

    rawFaultReporter: ({ error }) => console.error(error),
  });
}
