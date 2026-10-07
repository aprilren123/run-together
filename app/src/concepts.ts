import {
    conceptSet,
    registerConcept,
  } from "@mit-sdg/sync-engine/assembly";
  
  import runPlanningSpec from "@design/concepts/RunPlanning.md" with {
    type: "text",
  };
  import joiningSpec from "@design/concepts/Joining.md" with {
    type: "text",
  };
  import changeSuggestingSpec from "@design/concepts/ChangeSuggesting.md" with {
    type: "text",
  };
  import friendingSpec from "@design/concepts/Friending.md" with {
    type: "text",
  };
  
  import {
    InvalidRun,
    NotOwner,
    InvalidFlexibility,
    RunPlanningConcept,
  } from "./concepts/RunPlanning.ts";
  
  import {
    AlreadyJoined,
    NotJoined,
    JoiningConcept,
  } from "./concepts/Joining.ts";
  
  import {
    SameUser,
    CannotAccept as CannotAcceptSuggestion,
    CannotReject as CannotRejectSuggestion,
    CannotWithdraw,
    ChangeSuggestingConcept,
  } from "./concepts/ChangeSuggesting.ts";
  
  import {
    CannotRequest,
    CannotAccept as CannotAcceptFriendRequest,
    CannotReject as CannotRejectFriendRequest,
    CannotRemove,
    FriendingConcept,
  } from "./concepts/Friending.ts";
  
  const runPlanning = registerConcept({
    class: RunPlanningConcept,
    spec: runPlanningSpec,
    refusals: {
      INVALID_RUN: InvalidRun,
      NOT_OWNER: NotOwner,
      INVALID_FLEXIBILITY: InvalidFlexibility,
    },
  });
  
  const joining = registerConcept({
    class: JoiningConcept,
    spec: joiningSpec,
    refusals: {
      ALREADY_JOINED: AlreadyJoined,
      NOT_JOINED: NotJoined,
    },
  });
  
  const changeSuggesting = registerConcept({
    class: ChangeSuggestingConcept,
    spec: changeSuggestingSpec,
    refusals: {
      SAME_USER: SameUser,
      CANNOT_ACCEPT: CannotAcceptSuggestion,
      CANNOT_REJECT: CannotRejectSuggestion,
      CANNOT_WITHDRAW: CannotWithdraw,
    },
  });
  
  const friending = registerConcept({
    class: FriendingConcept,
    spec: friendingSpec,
    refusals: {
      CANNOT_REQUEST: CannotRequest,
      CANNOT_ACCEPT: CannotAcceptFriendRequest,
      CANNOT_REJECT: CannotRejectFriendRequest,
      CANNOT_REMOVE: CannotRemove,
    },
  });
  
  export const applicationConceptSet = conceptSet({
    RunPlanning: runPlanning,
    Joining: joining,
    ChangeSuggesting: changeSuggesting,
    Friending: friending,
  });
  
  export const { concepts } = applicationConceptSet;