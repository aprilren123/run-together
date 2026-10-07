import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";
import {
    each,
    form,
    former,
    reaction,
    when,
  } from "@mit-sdg/sync-engine/language";

const {
  RunPlanning,
  Joining,
  ChangeSuggesting,
  Friending,
} = concepts;

// ---------- Runs ----------

const RunList = former(
    "the run list",
    (_input, { run, owner, startTime, distance, pace, location }) =>
      form({
        runs: each(
          RunPlanning._all({}).is({
            run,
            owner,
            startTime,
            distance,
            pace,
            location,
          }),
        ).form({
          run,
          owner,
          startTime,
          distance,
          pace,
          location,
        }),
      }),
  );

const CreateRun = endpoint(
    "/runs/create",
    ({
      owner,
      startTime,
      distance,
      pace,
      location,
      run,
    }) =>
      receive({
        owner,
        startTime,
        distance,
        pace,
        location,
      })
        .then(
          RunPlanning.create({
            owner,
            startTime,
            distance,
            pace,
            location,
          }).responds({ run }),
        )
        .then(respond({ run })),
    {
      input: {
        required: [
          "owner",
          "startTime",
          "distance",
          "pace",
          "location",
        ],
      },
    },
  );

  const UpdateRun = endpoint(
    "/runs/update",
    ({ owner, run, startTime, distance, pace, location }) =>
      receive({
        owner,
        run,
        startTime,
        distance,
        pace,
        location,
      })
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
        required: ["owner", "run"],
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
  ({
    owner,
    run,
    earliestTime,
    latestTime,
    minDistance,
    maxDistance,
    minPace,
    maxPace,
  }) =>
    receive({
      owner,
      run,
      earliestTime,
      latestTime,
      minDistance,
      maxDistance,
      minPace,
      maxPace,
    })
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
      required: ["owner", "run"],
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
  ({ owner, run }) =>
    receive({ owner, run })
      .then(
        RunPlanning.cancel({
          owner,
          run,
        }).responds({ run }),
      )
      .then(respond({ run })),
  {
    input: {
      required: ["owner", "run"],
    },
  },
);

const ListRuns = endpoint("/runs/list", () =>
  receive({}).then(respond({ runs: RunList({}) })),
);

// ---------- Joining ----------

const JoinRun = endpoint(
  "/runs/join",
  ({ user, event, participation }) =>
    receive({ user, event })
      .then(
        Joining.join({
          user,
          event,
        }).responds({ participation }),
      )
      .then(respond({ participation })),
  {
    input: {
      required: ["user", "event"],
    },
  },
);

const LeaveRun = endpoint(
  "/runs/leave",
  ({ user, event, participation }) =>
    receive({ user, event })
      .then(
        Joining.leave({
          user,
          event,
        }).responds({ participation }),
      )
      .then(respond({ participation })),
  {
    input: {
      required: ["user", "event"],
    },
  },
);

// ---------- Friends ----------

const FriendList = former(
  "the friend list",
  (_input, { friendship, user1, user2 }) =>
    form({
      friendships: each(
        Friending._friendships({}).is({
          friendship,
          user1,
          user2,
        }),
      ).form({
        friendship,
        user1,
        user2,
      }),
    }),
);

const SendFriendRequest = endpoint(
  "/friends/request",
  ({ sender, recipient, request }) =>
    receive({ sender, recipient })
      .then(
        Friending.request({
          sender,
          recipient,
        }).responds({ request }),
      )
      .then(respond({ request })),
  {
    input: {
      required: ["sender", "recipient"],
    },
  },
);

const AcceptFriendRequest = endpoint(
  "/friends/accept",
  ({ recipient, request, friendship }) =>
    receive({ recipient, request })
      .then(
        Friending.accept({
          recipient,
          request,
        }).responds({ friendship }),
      )
      .then(respond({ friendship })),
  {
    input: {
      required: ["recipient", "request"],
    },
  },
);

const RejectFriendRequest = endpoint(
  "/friends/reject",
  ({ recipient, request }) =>
    receive({ recipient, request })
      .then(
        Friending.reject({
          recipient,
          request,
        }).responds({ request }),
      )
      .then(respond({ request })),
  {
    input: {
      required: ["recipient", "request"],
    },
  },
);

const RemoveFriend = endpoint(
  "/friends/remove",
  ({ user, friendship }) =>
    receive({ user, friendship })
      .then(
        Friending.remove({
          user,
          friendship,
        }).responds({ friendship }),
      )
      .then(respond({ friendship })),
  {
    input: {
      required: ["user", "friendship"],
    },
  },
);

const ListFriends = endpoint("/friends/list", () =>
  receive({}).then(respond({ friends: FriendList({}) })),
);

// ---------- Suggestions ----------

const SuggestionList = former(
  "the suggestion list",
  (
    _input,
    {
      suggestion,
      suggester,
      decider,
      event,
      change,
      status,
    },
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
      ).form({
        suggestion,
        suggester,
        decider,
        event,
        change,
        status,
      }),
    }),
);

const SuggestChange = endpoint(
  "/suggestions/create",
  ({ suggester, decider, event, change, suggestion }) =>
    receive({ suggester, decider, event, change })
      .then(
        ChangeSuggesting.suggest({
          suggester,
          decider,
          event,
          change,
        }).responds({ suggestion }),
      )
      .then(respond({ suggestion })),
  {
    input: {
      required: ["suggester", "decider", "event", "change"],
    },
  },
);

const AcceptSuggestion = endpoint(
  "/suggestions/accept",
  ({ decider, suggestion, event, change, suggester }) =>
    receive({ decider, suggestion })
      .then(
        ChangeSuggesting.accept({
          decider,
          suggestion,
        }).responds({
          event,
          change,
          suggester,
        }),
      )
      .then(respond({ event, change, suggester })),
  {
    input: {
      required: ["decider", "suggestion"],
    },
  },
);

const AcceptedSuggestionUpdatesRun = reaction(
    ({ decider, event, change, suggester, suggestion }) =>
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
  ({ decider, suggestion }) =>
    receive({ decider, suggestion })
      .then(
        ChangeSuggesting.reject({
          decider,
          suggestion,
        }).responds({ suggestion }),
      )
      .then(respond({ suggestion })),
  {
    input: {
      required: ["decider", "suggestion"],
    },
  },
);

const WithdrawSuggestion = endpoint(
  "/suggestions/withdraw",
  ({ suggester, suggestion }) =>
    receive({ suggester, suggestion })
      .then(
        ChangeSuggesting.withdraw({
          suggester,
          suggestion,
        }).responds({ suggestion }),
      )
      .then(respond({ suggestion })),
  {
    input: {
      required: ["suggester", "suggestion"],
    },
  },
);

const ListSuggestions = endpoint("/suggestions/list", () =>
  receive({}).then(
    respond({
      suggestions: SuggestionList({}),
    }),
  ),
);

export const composition = {
    RunList,
    FriendList,
    SuggestionList,
  
    CreateRun,
    UpdateRun,
    SetFlexibility,
    CancelRun,
    ListRuns,
  
    JoinRun,
    LeaveRun,
  
    SendFriendRequest,
    AcceptFriendRequest,
    RejectFriendRequest,
    RemoveFriend,
    ListFriends,
  
    SuggestChange,
    AcceptSuggestion,
    RejectSuggestion,
    WithdrawSuggestion,
    ListSuggestions,
  
    AcceptedSuggestionUpdatesRun,
    AcceptedSuggestionJoinsSuggester,
  };