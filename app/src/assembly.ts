import { assemble } from "@mit-sdg/sync-engine/assembly";

import { RunPlanningConcept } from "./concepts/RunPlanning.ts";
import { JoiningConcept } from "./concepts/Joining.ts";
import { ChangeSuggestingConcept } from "./concepts/ChangeSuggesting.ts";
import { FriendingConcept } from "./concepts/Friending.ts";
import { composition } from "./compositions/RunTogether.ts";

import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,

    instances: {
      RunPlanning: new RunPlanningConcept(db),
      Joining: new JoiningConcept(db),
      ChangeSuggesting: new ChangeSuggestingConcept(db),
      Friending: new FriendingConcept(db),
    },

    composition: {
      RunTogether: composition,
    },

    rawFaultReporter: ({ error }) => console.error(error),
  });
}
