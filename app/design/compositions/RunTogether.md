# RunTogether

Every RunTogether endpoint needs a signed-in session. Each one reads its user with `Sessioning.use` from the session cookie, and acts as that user: the request never names who is acting, so nobody can create, change, join, or decide as someone else. A request without a live session is refused with `NOT_SIGNED_IN`. People refer to other people by username, which `Registering._byUsername` turns into a user, and every list shows usernames from `Registering._username` in place of users.

Runs are shared only between friends. Two users [are friends](view:RunTogether.friends) when Friending has a friendship between them, whichever of them sent the request, and a user [can see a run](view:RunTogether.canSee) when it is their own, its owner is their friend, or they [joined it](view:RunTogether.joined), so a participant keeps seeing the latest plan for a run they joined even if the friendship later ends. Only a user who [is a friend of the run's owner](view:RunTogether.friendsRun) can join it or suggest a change to it. Every list shows only what its user may see, so calling an endpoint directly reveals nothing more than the app shows. Joining, suggesting, and accepting read the one run or suggestion the request names, through [the owner and status of a run](view:RunTogether.runInfo) and [the people and run of a suggestion](view:RunTogether.suggestionInfo), so each request acts on that run or suggestion alone.

A user can [create a run](reaction:RunTogether.CreateRun), [update a run](reaction:RunTogether.UpdateRun)'s time, meeting point, distance, pace, or description, [set its flexibility](reaction:RunTogether.SetFlexibility), or [cancel it](reaction:RunTogether.CancelRun). The session's user is the owner, so RunPlanning refuses changes to someone else's run with `NOT_OWNER`. A canceled run stays in the lists with status `CANCELED`, so its participants see that it was called off, and RunPlanning refuses any further update, flexibility change, or cancellation with `RUN_CANCELED`.

```endpoints
RunTogether.CreateRun at /runs/create
RunTogether.UpdateRun at /runs/update
RunTogether.SetFlexibility at /runs/flexibility
RunTogether.CancelRun at /runs/cancel
```

Users can [view upcoming runs](reaction:RunTogether.ListRuns) using the [run list](former:RunTogether.RunList), which holds their own runs and their friends', and [view run participants](reaction:RunTogether.ListParticipants) using the [participant list](former:RunTogether.ParticipantList), which holds the participants of those same runs. A user can [join a friend's run](reaction:RunTogether.JoinRun) and [leave a run](reaction:RunTogether.LeaveRun) they joined, as the session's user. Joining a canceled run is refused with `RUN_CANCELED`, and joining their own run with `OWN_RUN`, since the owner already hosts it. Joining a run whose owner isn't their friend is refused with `RUN_NOT_FOUND`, the same answer as for a run that doesn't exist, so the refusal reveals nothing about runs that belong to strangers.

```endpoints
RunTogether.ListRuns at /runs/list
RunTogether.ListParticipants at /runs/participants
RunTogether.JoinRun at /runs/join
RunTogether.LeaveRun at /runs/leave
```

To find people, a user [searches usernames](reaction:RunTogether.FindPeople): the [people found](former:RunTogether.PeopleFound) are up to 10 other users whose username contains the text, from `Registering._search`, and the answer holds only their usernames. With no text yet, the people found are the first registered users, so someone new sees who is on RunTogether; every one of them is a real account that signed up with a password. The searcher is left out. The app shows whether each person is already a friend or has a pending request from its own friend and request lists, so the search itself reveals nothing but usernames.

Users can [send friend requests](reaction:RunTogether.SendFriendRequest) by typing the other person's username, refused with `USER_NOT_FOUND` when nobody has it. The session's user is the sender, and the only one who can [accept friend requests](reaction:RunTogether.AcceptFriendRequest) or [reject friend requests](reaction:RunTogether.RejectFriendRequest) sent to them, or [remove friends](reaction:RunTogether.RemoveFriend). Users can [view their friendships](reaction:RunTogether.ListFriends) using the [friend list](former:RunTogether.FriendList), which holds only friendships [they are in](view:RunTogether.inFriendship), and [view pending friend requests](reaction:RunTogether.ListFriendRequests) using the [friend request list](former:RunTogether.FriendRequestList), which holds only requests [they sent or received](view:RunTogether.inRequest).

```endpoints
RunTogether.SendFriendRequest at /friends/request
RunTogether.AcceptFriendRequest at /friends/accept
RunTogether.RejectFriendRequest at /friends/reject
RunTogether.RemoveFriend at /friends/remove
RunTogether.ListFriends at /friends/list
RunTogether.ListFriendRequests at /friends/requests
RunTogether.FindPeople at /friends/search
```

A user can [suggest a change](reaction:RunTogether.SuggestChange) to a friend's run: a RunChange proposing new values for one or more of its start time, meeting point, distance, pace, and description. The session's user is the suggester, and the decider is always the run's owner in RunPlanning, so a suggestion can't be sent to anyone else. ChangeSuggesting stores the change without looking inside it; the composition reads it with [readRunChange](computation:readRunChange). A change that names no field or an unknown one, or gives a malformed value, is refused with `INVALID_CHANGE`, and one that the run couldn't take, such as a time outside its flexibility window, is refused with `CHANGE_DOESNT_FIT` by `RunPlanning._fits`; neither is stored. Suggesting a change to a canceled run is refused with `RUN_CANCELED`, to their own run with `OWN_RUN`, and to a run whose owner isn't their friend with `RUN_NOT_FOUND`. The run owner can [accept the suggestion](reaction:RunTogether.AcceptSuggestion) while the suggester is still their friend, the run is still on, and the change still fits the run as it is now; if the owner has since edited the run so that it doesn't, accepting is refused with `CHANGE_DOESNT_FIT`. Once the friendship has ended, accepting is refused with `NOT_FRIENDS`, and once the run is canceled, with `RUN_CANCELED`; either way nothing changes. The owner can always [reject it](reaction:RunTogether.RejectSuggestion), and the suggester can [withdraw it](reaction:RunTogether.WithdrawSuggestion). When a suggestion is accepted, the [run is updated](reaction:RunTogether.AcceptedSuggestionUpdatesRun) with every proposed value in one update, so the change is applied whole, and the [suggester joins the run](reaction:RunTogether.AcceptedSuggestionJoinsSuggester) unless they had already joined it. Rejecting leaves the run as it is. Users can [view suggestions](reaction:RunTogether.ListSuggestions) using the [suggestion list](former:RunTogether.SuggestionList), which holds only suggestions [they made or decide on](view:RunTogether.partyTo).

```endpoints
RunTogether.SuggestChange at /suggestions/create
RunTogether.AcceptSuggestion at /suggestions/accept
RunTogether.RejectSuggestion at /suggestions/reject
RunTogether.WithdrawSuggestion at /suggestions/withdraw
RunTogether.ListSuggestions at /suggestions/list
```

```computations
readRunChange(change: RunChange) : RunChange
  Reads a proposed change into a normal form: the change with each field it leaves alone as null, and a valid field saying whether it is well formed. A plain string is a new start time, as suggestions were before they could change more than the time. Otherwise the change must be a record naming at least one of startTime, location, distance, and pace, and details, and no other field: a startTime like 2026-11-07T10:30, a meeting point of 1 to 200 characters, a positive distance and pace, and a description of up to 1500 characters. Answers whether the change is valid, and each field, null when the change leaves it alone.
```
