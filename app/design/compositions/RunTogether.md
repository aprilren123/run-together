# RunTogether

Every RunTogether endpoint needs a signed-in session. Each one reads its user with `Sessioning.use` from the session cookie, and acts as that user: the request never names who is acting, so nobody can create, change, join, or decide as someone else. A request without a live session is refused with `NOT_SIGNED_IN`. People refer to other people by username, which `Registering._byUsername` turns into a user, and every list shows usernames from `Registering._username` in place of users.

Runs are shared only between friends. Two users [are friends](view:RunTogether.friends) when Friending has a friendship between them, whichever of them sent the request, and a user [can see a run](view:RunTogether.canSee) when it is their own or its owner is their friend. Every list shows only what its user may see, so calling an endpoint directly reveals nothing more than the app shows.

A user can [create a run](reaction:RunTogether.CreateRun), [update a run](reaction:RunTogether.UpdateRun), [set its flexibility](reaction:RunTogether.SetFlexibility), or [cancel it](reaction:RunTogether.CancelRun). The session's user is the owner, so RunPlanning refuses changes to someone else's run with `NOT_OWNER`.

```endpoints
RunTogether.CreateRun at /runs/create
RunTogether.UpdateRun at /runs/update
RunTogether.SetFlexibility at /runs/flexibility
RunTogether.CancelRun at /runs/cancel
```

Users can [view upcoming runs](reaction:RunTogether.ListRuns) using the [run list](former:RunTogether.RunList), which holds their own runs and their friends', and [view run participants](reaction:RunTogether.ListParticipants) using the [participant list](former:RunTogether.ParticipantList), which holds the participants of those same runs. A user can [join a friend's run](reaction:RunTogether.JoinRun) and [leave a run](reaction:RunTogether.LeaveRun) as the session's user. Joining their own run is refused with `OWN_RUN`, since the owner already hosts it, and joining a run they can't see is refused with `RUN_NOT_FOUND`, the same answer as for a run that doesn't exist, so the refusal reveals nothing about runs that belong to strangers.

```endpoints
RunTogether.ListRuns at /runs/list
RunTogether.ListParticipants at /runs/participants
RunTogether.JoinRun at /runs/join
RunTogether.LeaveRun at /runs/leave
```

To find people, a user [searches usernames](reaction:RunTogether.FindPeople): the [people found](former:RunTogether.PeopleFound) are up to 10 other users whose username contains the text, from `Registering._search`, and the answer holds only their usernames. The searcher is left out. The app shows whether each person is already a friend or has a pending request from its own friend and request lists, so the search itself reveals nothing but usernames.

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

A user can [suggest a change](reaction:RunTogether.SuggestChange) to a friend's run. The session's user is the suggester, and the decider is always the run's owner in RunPlanning, so a suggestion can't be sent to anyone else. Suggesting a change to their own run is refused with `OWN_RUN`, and to a run they can't see with `RUN_NOT_FOUND`. The run owner can [accept the suggestion](reaction:RunTogether.AcceptSuggestion) while the suggester is still their friend, and is refused with `NOT_FRIENDS`, changing nothing, once the friendship has ended; the owner can always [reject it](reaction:RunTogether.RejectSuggestion), and the suggester can [withdraw it](reaction:RunTogether.WithdrawSuggestion). When a suggestion is accepted, the [run is updated](reaction:RunTogether.AcceptedSuggestionUpdatesRun) and the [suggester joins the run](reaction:RunTogether.AcceptedSuggestionJoinsSuggester). Users can [view suggestions](reaction:RunTogether.ListSuggestions) using the [suggestion list](former:RunTogether.SuggestionList), which holds only suggestions [they made or decide on](view:RunTogether.partyTo).

```endpoints
RunTogether.SuggestChange at /suggestions/create
RunTogether.AcceptSuggestion at /suggestions/accept
RunTogether.RejectSuggestion at /suggestions/reject
RunTogether.WithdrawSuggestion at /suggestions/withdraw
RunTogether.ListSuggestions at /suggestions/list
```
