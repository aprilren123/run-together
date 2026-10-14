import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";
import { each, form, former, no, reaction, view, when, where } from "@mit-sdg/sync-engine/language";

const { RunPlanning, Joining, ChangeSuggesting, Friending, Registering, Sessioning } = concepts;

// Every endpoint acts as the user of the session in the cookie, never as a user named in the request.
// Lists show each user's username, since people know each other by username.

// ---------- Who may see what ----------

/** (user) and (other) are accepted friends, whichever of them sent the request. */
const friends = view("(user) is friends with (other)", ({ user, other }) => [
  where(Friending._friendships({}).is({ user1: user, user2: other })),
  where(Friending._friendships({}).is({ user1: other, user2: user })),
]).holds();

/** (viewer) can see (run): it is their own, or its owner is their accepted friend. */
const canSee = view("(viewer) can see (run)", ({ viewer, run }, _output, { owner }) => [
  where(RunPlanning._all({}).is({ run, owner: viewer })),
  where(RunPlanning._all({}).is({ run, owner }), friends({ user: viewer, other: owner })),
]).holds();

/** (user) suggested (suggestion), or decides on it. */
const partyTo = view("(user) is party to (suggestion)", ({ user, suggestion }) => [
  where(ChangeSuggesting._all({}).is({ suggestion, suggester: user })),
  where(ChangeSuggesting._all({}).is({ suggestion, decider: user })),
]).holds();

// ---------- Runs ----------

const RunList = former(
  "the run list for (user)",
  (
    { user },
    {
      run,
      owner,
      ownerName,
      startTime,
      distance,
      pace,
      location,
      details,
      earliestTime,
      latestTime,
      minDistance,
      maxDistance,
      minPace,
      maxPace,
    },
  ) =>
    form({
      runs: each(
        RunPlanning._all({}).is({
          run,
          owner,
          startTime,
          distance,
          pace,
          location,
          details,
          earliestTime,
          latestTime,
          minDistance,
          maxDistance,
          minPace,
          maxPace,
        }),
      )
        .where(
          canSee({ viewer: user, run }),
          Registering._username({ user: owner }).is({ username: ownerName }),
        )
        .form({
          run,
          owner: ownerName,
          startTime,
          distance,
          pace,
          location,
          details,
          earliestTime,
          latestTime,
          minDistance,
          maxDistance,
          minPace,
          maxPace,
        }),
    }),
);

const CreateRun = endpoint(
  "/runs/create",
  ({ session, owner, startTime, distance, pace, location, details, run }) =>
    receive({
      session,
      startTime,
      distance,
      pace,
      location,
      details,
    })
      .then(Sessioning.use({ session }).responds({ subject: owner }))
      .then(
        RunPlanning.create({
          owner,
          startTime,
          distance,
          pace,
          location,
          details,
        }).responds({ run }),
      )
      .then(respond({ run })),
);

const UpdateRun = endpoint(
  "/runs/update",
  ({ session, owner, run, startTime, distance, pace, location }) =>
    receive({
      session,
      run,
      startTime,
      distance,
      pace,
      location,
    })
      .then(Sessioning.use({ session }).responds({ subject: owner }))
      .then(
        RunPlanning.update({
          owner,
          run,
          startTime,
          distance,
          pace,
          location,
        }).responds({ run }),
      )
      .then(respond({ run })),
  {
    input: {
      required: ["session", "run"],
      defaults: {
        startTime: null,
        distance: null,
        pace: null,
        location: null,
      },
    },
  },
);

const SetFlexibility = endpoint(
  "/runs/flexibility",
  ({ session, owner, run, earliestTime, latestTime, minDistance, maxDistance, minPace, maxPace }) =>
    receive({
      session,
      run,
      earliestTime,
      latestTime,
      minDistance,
      maxDistance,
      minPace,
      maxPace,
    })
      .then(Sessioning.use({ session }).responds({ subject: owner }))
      .then(
        RunPlanning.setFlexibility({
          owner,
          run,
          earliestTime,
          latestTime,
          minDistance,
          maxDistance,
          minPace,
          maxPace,
        }).responds({ run }),
      )
      .then(respond({ run })),
  {
    input: {
      required: ["session", "run"],
      defaults: {
        earliestTime: null,
        latestTime: null,
        minDistance: null,
        maxDistance: null,
        minPace: null,
        maxPace: null,
      },
    },
  },
);

const CancelRun = endpoint(
  "/runs/cancel",
  ({ session, owner, run }) =>
    receive({ session, run })
      .then(Sessioning.use({ session }).responds({ subject: owner }))
      .then(
        RunPlanning.cancel({
          owner,
          run,
        }).responds({ run }),
      )
      .then(respond({ run })),
  {
    input: {
      required: ["session", "run"],
    },
  },
);

const ListRuns = endpoint(
  "/runs/list",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ runs: RunList({ user }) })),
  { input: { required: ["session"] } },
);

const ParticipantList = former(
  "the participant list for (viewer)",
  ({ viewer }, { participation, user, username, event }) =>
    form({
      participations: each(
        Joining._all({}).is({
          participation,
          user,
          event,
        }),
      )
        .where(canSee({ viewer, run: event }), Registering._username({ user }).is({ username }))
        .form({
          participation,
          user: username,
          event,
        }),
    }),
);

const ListParticipants = endpoint(
  "/runs/participants",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ participants: ParticipantList({ viewer: user }) })),
  { input: { required: ["session"] } },
);

// ---------- Joining ----------

const JoinRun = endpoint(
  "/runs/join",
  ({ session, user, event, owner, participation }) =>
    receive({ session, event })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(RunPlanning._all({}).is({ run: event, owner }), friends({ user, other: owner }))
          .then(
            Joining.join({
              user,
              event,
            }).responds({ participation }),
          )
          .then(respond({ participation }))
          .named("friend"),
        where(RunPlanning._all({}).is({ run: event, owner: user }))
          .then(respond({ error: "OWN_RUN" }))
          .named("owner"),
        where(no(canSee({ viewer: user, run: event })))
          .then(respond({ error: "RUN_NOT_FOUND" }))
          .named("hidden"),
      ),
  {
    input: {
      required: ["session", "event"],
    },
  },
);

const LeaveRun = endpoint(
  "/runs/leave",
  ({ session, user, event, participation }) =>
    receive({ session, event })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        Joining.leave({
          user,
          event,
        }).responds({ participation }),
      )
      .then(respond({ participation })),
  {
    input: {
      required: ["session", "event"],
    },
  },
);

// ---------- Friends ----------

/** (user) is one of the two people in (friendship). */
const inFriendship = view("(user) is in (friendship)", ({ user, friendship }) => [
  where(Friending._friendships({}).is({ friendship, user1: user })),
  where(Friending._friendships({}).is({ friendship, user2: user })),
]).holds();

/** (user) sent or received (request). */
const inRequest = view("(user) sent or received (request)", ({ user, request }) => [
  where(Friending._requests({}).is({ request, sender: user })),
  where(Friending._requests({}).is({ request, recipient: user })),
]).holds();

/** Up to 10 other people whose username contains (text), by username only, so a search reveals nothing else. */
const PeopleFound = former(
  "the people matching (text) for (user)",
  ({ text, user }, { username }) =>
    each(Registering._search({ text }).is({ username }))
      .where(no(Registering._byUsername({ username }).is({ user })))
      .form({ username }),
);

const FindPeople = endpoint(
  "/friends/search",
  ({ session, text, user }) =>
    receive({ session, text })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ people: PeopleFound({ text, user }) })),
  { input: { required: ["session", "text"] } },
);

const FriendList = former(
  "the friend list for (user)",
  ({ user }, { friendship, user1, user2, username1, username2 }) =>
    form({
      friendships: each(
        Friending._friendships({}).is({
          friendship,
          user1,
          user2,
        }),
      )
        .where(
          inFriendship({ user, friendship }),
          Registering._username({ user: user1 }).is({ username: username1 }),
          Registering._username({ user: user2 }).is({ username: username2 }),
        )
        .form({
          friendship,
          user1: username1,
          user2: username2,
        }),
    }),
);

const FriendRequestList = former(
  "the friend request list for (user)",
  ({ user }, { request, sender, recipient, senderName, recipientName }) =>
    form({
      requests: each(
        Friending._requests({}).is({
          request,
          sender,
          recipient,
        }),
      )
        .where(
          inRequest({ user, request }),
          Registering._username({ user: sender }).is({ username: senderName }),
          Registering._username({ user: recipient }).is({ username: recipientName }),
        )
        .form({
          request,
          sender: senderName,
          recipient: recipientName,
        }),
    }),
);

const SendFriendRequest = endpoint(
  "/friends/request",
  ({ session, username, sender, recipient, request }) =>
    receive({ session, username })
      .then(Sessioning.use({ session }).responds({ subject: sender }))
      .then(
        where(Registering._byUsername({ username }).is({ user: recipient }))
          .then(
            Friending.request({
              sender,
              recipient,
            }).responds({ request }),
          )
          .then(respond({ request }))
          .named("found"),
        where(no(Registering._byUsername({ username })))
          .then(respond({ error: "USER_NOT_FOUND" }))
          .named("unknown"),
      ),
  {
    input: {
      required: ["session", "username"],
    },
  },
);

const AcceptFriendRequest = endpoint(
  "/friends/accept",
  ({ session, recipient, request, friendship }) =>
    receive({ session, request })
      .then(Sessioning.use({ session }).responds({ subject: recipient }))
      .then(
        Friending.accept({
          recipient,
          request,
        }).responds({ friendship }),
      )
      .then(respond({ friendship })),
  {
    input: {
      required: ["session", "request"],
    },
  },
);

const RejectFriendRequest = endpoint(
  "/friends/reject",
  ({ session, recipient, request }) =>
    receive({ session, request })
      .then(Sessioning.use({ session }).responds({ subject: recipient }))
      .then(
        Friending.reject({
          recipient,
          request,
        }).responds({ request }),
      )
      .then(respond({ request })),
  {
    input: {
      required: ["session", "request"],
    },
  },
);

const RemoveFriend = endpoint(
  "/friends/remove",
  ({ session, user, friendship }) =>
    receive({ session, friendship })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        Friending.remove({
          user,
          friendship,
        }).responds({ friendship }),
      )
      .then(respond({ friendship })),
  {
    input: {
      required: ["session", "friendship"],
    },
  },
);

const ListFriends = endpoint(
  "/friends/list",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ friends: FriendList({ user }) })),
  { input: { required: ["session"] } },
);

const ListFriendRequests = endpoint(
  "/friends/requests",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ requests: FriendRequestList({ user }) })),
  { input: { required: ["session"] } },
);

// ---------- Suggestions ----------

const SuggestionList = former(
  "the suggestion list for (user)",
  (
    { user },
    { suggestion, suggester, decider, suggesterName, deciderName, event, change, status },
  ) =>
    form({
      suggestions: each(
        ChangeSuggesting._all({}).is({
          suggestion,
          suggester,
          decider,
          event,
          change,
          status,
        }),
      )
        .where(
          partyTo({ user, suggestion }),
          Registering._username({ user: suggester }).is({ username: suggesterName }),
          Registering._username({ user: decider }).is({ username: deciderName }),
        )
        .form({
          suggestion,
          suggester: suggesterName,
          decider: deciderName,
          event,
          change,
          status,
        }),
    }),
);

const SuggestChange = endpoint(
  "/suggestions/create",
  ({ session, suggester, decider, event, change, suggestion }) =>
    receive({ session, event, change })
      .then(Sessioning.use({ session }).responds({ subject: suggester }))
      .then(
        // The decider is always the run's owner, never a user the request names, and only their friends suggest.
        where(
          RunPlanning._all({}).is({ run: event, owner: decider }),
          friends({ user: suggester, other: decider }),
        )
          .then(
            ChangeSuggesting.suggest({
              suggester,
              decider,
              event,
              change,
            }).responds({ suggestion }),
          )
          .then(respond({ suggestion }))
          .named("friend"),
        where(RunPlanning._all({}).is({ run: event, owner: suggester }))
          .then(respond({ error: "OWN_RUN" }))
          .named("owner"),
        where(no(canSee({ viewer: suggester, run: event })))
          .then(respond({ error: "RUN_NOT_FOUND" }))
          .named("hidden"),
      ),
  {
    input: {
      required: ["session", "event", "change"],
    },
  },
);

const AcceptSuggestion = endpoint(
  "/suggestions/accept",
  ({ session, decider, suggestion, event, change, suggester }) =>
    receive({ session, suggestion })
      .then(Sessioning.use({ session }).responds({ subject: decider }))
      .then(
        // Accepting moves the run and adds the suggester to it, so they must still be the decider's friend.
        where(
          ChangeSuggesting._all({}).is({ suggestion, suggester, decider }),
          friends({ user: decider, other: suggester }),
        )
          .then(ChangeSuggesting.accept({ decider, suggestion }).responds({ event, change }))
          .then(respond({ event, change }))
          .named("friend"),
        where(
          ChangeSuggesting._all({}).is({ suggestion, suggester, decider }),
          no(friends({ user: decider, other: suggester })),
        )
          .then(respond({ error: "NOT_FRIENDS" }))
          .named("not-friends"),
        // Anyone else, or a suggestion that doesn't exist: ChangeSuggesting refuses with CANNOT_ACCEPT.
        where(no(ChangeSuggesting._all({}).is({ suggestion, decider })))
          .then(ChangeSuggesting.accept({ decider, suggestion }).responds({ event, change }))
          .then(respond({ event, change }))
          .named("not-decider"),
      ),
  {
    input: {
      required: ["session", "suggestion"],
    },
  },
);

const AcceptedSuggestionUpdatesRun = reaction(({ decider, event, change, suggester, suggestion }) =>
  when(
    ChangeSuggesting.accept({ decider, suggestion }).responds({
      event,
      change,
      suggester,
    }),
  ).then(
    RunPlanning.update({
      owner: decider,
      run: event,
      startTime: change,
    }),
  ),
);

const AcceptedSuggestionJoinsSuggester = reaction(
  ({ decider, event, change, suggester, suggestion }) =>
    when(
      ChangeSuggesting.accept({ decider, suggestion }).responds({
        event,
        change,
        suggester,
      }),
    ).then(
      Joining.join({
        user: suggester,
        event,
      }),
    ),
);

const RejectSuggestion = endpoint(
  "/suggestions/reject",
  ({ session, decider, suggestion }) =>
    receive({ session, suggestion })
      .then(Sessioning.use({ session }).responds({ subject: decider }))
      .then(
        ChangeSuggesting.reject({
          decider,
          suggestion,
        }).responds({ suggestion }),
      )
      .then(respond({ suggestion })),
  {
    input: {
      required: ["session", "suggestion"],
    },
  },
);

const WithdrawSuggestion = endpoint(
  "/suggestions/withdraw",
  ({ session, suggester, suggestion }) =>
    receive({ session, suggestion })
      .then(Sessioning.use({ session }).responds({ subject: suggester }))
      .then(
        ChangeSuggesting.withdraw({
          suggester,
          suggestion,
        }).responds({ suggestion }),
      )
      .then(respond({ suggestion })),
  {
    input: {
      required: ["session", "suggestion"],
    },
  },
);

const ListSuggestions = endpoint(
  "/suggestions/list",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        respond({
          suggestions: SuggestionList({ user }),
        }),
      ),
  { input: { required: ["session"] } },
);

export const composition = {
  friends,
  canSee,
  partyTo,
  inFriendship,
  inRequest,
  PeopleFound,
  FindPeople,

  RunList,
  FriendList,
  SuggestionList,

  CreateRun,
  UpdateRun,
  SetFlexibility,
  CancelRun,
  ListRuns,
  ParticipantList,
  ListParticipants,

  JoinRun,
  LeaveRun,

  SendFriendRequest,
  AcceptFriendRequest,
  RejectFriendRequest,
  RemoveFriend,
  ListFriends,
  ListFriendRequests,
  FriendRequestList,

  SuggestChange,
  AcceptSuggestion,
  RejectSuggestion,
  WithdrawSuggestion,
  ListSuggestions,

  AcceptedSuggestionUpdatesRun,
  AcceptedSuggestionJoinsSuggester,
};
