import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, reaction, when, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { RunPlanning, Joining, ChangeSuggesting, Notifying, Registering, Sessioning } = concepts;

// ---------- Who is told what ----------

/** A run's owner hears when a friend suggests a change to it. */
const SuggestionNotifiesOwner = reaction(({ suggester, decider, event, suggestion }) =>
  when(ChangeSuggesting.suggest({ suggester, decider, event }).responds({ suggestion })).then(
    Notifying.notify({
      recipient: decider,
      actor: suggester,
      subject: event,
      kind: "SUGGESTION_RECEIVED",
    }),
  ),
);

/** Everyone who joined a run hears when it changes, whether its owner edited it or accepted a suggestion. */
const EditNotifiesParticipants = reaction(({ owner, run, participant }) =>
  when(RunPlanning.update({ owner, run }).responds({ run }))
    .where(Joining._all({}).is({ user: participant, event: run }))
    .then(
      Notifying.notify({ recipient: participant, actor: owner, subject: run, kind: "RUN_EDITED" }),
    ),
);

/** Everyone who joined a run hears when it is canceled. */
const CancelNotifiesParticipants = reaction(({ owner, run, participant }) =>
  when(RunPlanning.cancel({ owner, run }).responds({ run }))
    .where(Joining._all({}).is({ user: participant, event: run }))
    .then(
      Notifying.notify({
        recipient: participant,
        actor: owner,
        subject: run,
        kind: "RUN_CANCELED",
      }),
    ),
);

/** A suggester hears when their suggestion is accepted. */
const AcceptanceNotifiesSuggester = reaction(({ decider, suggestion, event, suggester }) =>
  when(ChangeSuggesting.accept({ decider, suggestion }).responds({ event, suggester })).then(
    Notifying.notify({
      recipient: suggester,
      actor: decider,
      subject: event,
      kind: "SUGGESTION_ACCEPTED",
    }),
  ),
);

/** A suggester hears when their suggestion is rejected. */
const RejectionNotifiesSuggester = reaction(({ decider, suggestion, event, suggester }) =>
  when(ChangeSuggesting.reject({ decider, suggestion }).responds({ suggestion }))
    .where(ChangeSuggesting._all({}).is({ suggestion, suggester, event }))
    .then(
      Notifying.notify({
        recipient: suggester,
        actor: decider,
        subject: event,
        kind: "SUGGESTION_REJECTED",
      }),
    ),
);

// ---------- Reading and marking ----------

/**
 * The signed-in user's notifications, newest first, with the actor's username and the run's start time,
 * so the app can say who did what to which run. The start time is null for a run that no longer exists.
 */
const NotificationList = former(
  "the notifications of (user)",
  ({ user }, { notification, actor, actorName, subject, kind, at, read, startTime }) =>
    form({
      notifications: each(
        Notifying._for({ recipient: user }).is({ notification, actor, subject, kind, at, read }),
      )
        .where(
          Registering._username({ user: actor }).is({ username: actorName }),
          whether(RunPlanning._all({}).is({ run: subject, startTime })),
        )
        .form({ notification, actor: actorName, run: subject, kind, at, read, startTime }),
    }),
);

const ListNotifications = endpoint(
  "/notifications/list",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ notifications: NotificationList({ user }) })),
  { input: { required: ["session"] } },
);

const MarkRead = endpoint(
  "/notifications/read",
  ({ session, user, notification }) =>
    receive({ session, notification })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Notifying.markRead({ recipient: user, notification }).responds({ notification }))
      .then(respond({ notification })),
  { input: { required: ["session", "notification"] } },
);

const MarkAllRead = endpoint(
  "/notifications/read-all",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Notifying.markAllRead({ recipient: user }).responds({}))
      .then(respond({})),
  { input: { required: ["session"] } },
);

export const composition = {
  telling: {
    SuggestionNotifiesOwner,
    EditNotifiesParticipants,
    CancelNotifiesParticipants,
    AcceptanceNotifiesSuggester,
    RejectionNotifiesSuggester,
  },
  reading: { NotificationList, ListNotifications, MarkRead, MarkAllRead },
};
