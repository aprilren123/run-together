import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";

import runPlanningSpec from "@design/concepts/RunPlanning.md" with { type: "text" };
import joiningSpec from "@design/concepts/Joining.md" with { type: "text" };
import changeSuggestingSpec from "@design/concepts/ChangeSuggesting.md" with { type: "text" };
import friendingSpec from "@design/concepts/Friending.md" with { type: "text" };
import notifyingSpec from "@design/concepts/Notifying.md" with { type: "text" };
import commentingSpec from "@design/concepts/Commenting.md" with { type: "text" };
import invitingSpec from "@design/concepts/Inviting.md" with { type: "text" };

import {
  InvalidRun,
  NotOwner,
  InvalidFlexibility,
  RunCanceled,
  RunPlanningConcept,
} from "./concepts/RunPlanning.ts";

import { AlreadyJoined, NotJoined, JoiningConcept } from "./concepts/Joining.ts";

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

import { NotificationNotFound, NotifyingConcept } from "./concepts/Notifying.ts";
import {
  CannotDelete,
  CommentNotFound,
  CommentingConcept,
  DuplicateComment,
  InvalidComment,
} from "./concepts/Commenting.ts";
import {
  AlreadyInvited,
  CannotAccept as CannotAcceptInvitation,
  CannotDecline,
  CannotInviteSelf,
  InvitingConcept,
} from "./concepts/Inviting.ts";
import { readRunChange } from "./runChange.ts";

import { registering } from "./concepts/Registering/registry.ts";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { sessioning } from "./concepts/Sessioning/registry.ts";
import { commonsFederating } from "./concepts/Federating/registry.ts";

const runPlanning = registerConcept({
  class: RunPlanningConcept,
  spec: runPlanningSpec,
  refusals: {
    INVALID_RUN: InvalidRun,
    NOT_OWNER: NotOwner,
    INVALID_FLEXIBILITY: InvalidFlexibility,
    RUN_CANCELED: RunCanceled,
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

const notifying = registerConcept({
  class: NotifyingConcept,
  spec: notifyingSpec,
  refusals: {
    NOT_FOUND: NotificationNotFound,
  },
});

const commenting = registerConcept({
  class: CommentingConcept,
  spec: commentingSpec,
  refusals: {
    INVALID_COMMENT: InvalidComment,
    DUPLICATE_COMMENT: DuplicateComment,
    CANNOT_DELETE: CannotDelete,
    COMMENT_NOT_FOUND: CommentNotFound,
  },
});

const inviting = registerConcept({
  class: InvitingConcept,
  spec: invitingSpec,
  refusals: {
    CANNOT_INVITE_SELF: CannotInviteSelf,
    ALREADY_INVITED: AlreadyInvited,
    CANNOT_ACCEPT: CannotAcceptInvitation,
    CANNOT_DECLINE: CannotDecline,
  },
});

export const applicationConceptSet = conceptSet(
  {
    RunPlanning: runPlanning,
    Joining: joining,
    ChangeSuggesting: changeSuggesting,
    Friending: friending,
    Notifying: notifying,
    Commenting: commenting,
    Inviting: inviting,

    Registering: registering,
    Authenticating: authenticating,
    Sessioning: sessioning,
    CommonsFederating: commonsFederating,
  },
  // Pure computations the compositions use, here to read a suggested RunChange.
  { readRunChange },
);

export const { concepts, computations } = applicationConceptSet;
