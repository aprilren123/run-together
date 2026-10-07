# RunTogether

A user can [create a run](reaction:RunTogether.CreateRun), [update a run](reaction:RunTogether.UpdateRun), [set its flexibility](reaction:RunTogether.SetFlexibility), or [cancel it](reaction:RunTogether.CancelRun).

```endpoints
RunTogether.CreateRun at /runs/create
RunTogether.UpdateRun at /runs/update
RunTogether.SetFlexibility at /runs/flexibility
RunTogether.CancelRun at /runs/cancel
```

Users can [view upcoming runs](reaction:RunTogether.ListRuns) using the [run list](former:RunTogether.RunList), [join a run](reaction:RunTogether.JoinRun), or [leave a run](reaction:RunTogether.LeaveRun).

```endpoints
RunTogether.ListRuns at /runs/list
RunTogether.JoinRun at /runs/join
RunTogether.LeaveRun at /runs/leave
```

Users can [send friend requests](reaction:RunTogether.SendFriendRequest), [accept friend requests](reaction:RunTogether.AcceptFriendRequest), [reject friend requests](reaction:RunTogether.RejectFriendRequest), [remove friends](reaction:RunTogether.RemoveFriend), and [view their friendships](reaction:RunTogether.ListFriends) using the [friend list](former:RunTogether.FriendList).

```endpoints
RunTogether.SendFriendRequest at /friends/request
RunTogether.AcceptFriendRequest at /friends/accept
RunTogether.RejectFriendRequest at /friends/reject
RunTogether.RemoveFriend at /friends/remove
RunTogether.ListFriends at /friends/list
```

A user can [suggest a change](reaction:RunTogether.SuggestChange) to a friend's run. The run owner can [accept the suggestion](reaction:RunTogether.AcceptSuggestion) or [reject it](reaction:RunTogether.RejectSuggestion), and the suggester can [withdraw it](reaction:RunTogether.WithdrawSuggestion). When a suggestion is accepted, the [run is updated](reaction:RunTogether.AcceptedSuggestionUpdatesRun) and the [suggester joins the run](reaction:RunTogether.AcceptedSuggestionJoinsSuggester). Users can [view suggestions](reaction:RunTogether.ListSuggestions) using the [suggestion list](former:RunTogether.SuggestionList).

```endpoints
RunTogether.SuggestChange at /suggestions/create
RunTogether.AcceptSuggestion at /suggestions/accept
RunTogether.RejectSuggestion at /suggestions/reject
RunTogether.WithdrawSuggestion at /suggestions/withdraw
RunTogether.ListSuggestions at /suggestions/list
```