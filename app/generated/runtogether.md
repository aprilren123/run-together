<!-- Generated from the RunTogether assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# RunTogether — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### ChangeSuggesting

Defined in [ChangeSuggesting](../design/concepts/ChangeSuggesting.md), line 1.

#### Actions

- `suggest(suggester: User, decider: User, event: Event, change: Change) : returns (suggestion: Suggestion)`
  - Refuses `SAME_USER`: A user cannot suggest a change to themselves.
- `accept(decider: User, suggestion: Suggestion) : returns (event: Event, change: Change, suggester: User)`
  - Refuses `CANNOT_ACCEPT`: This suggestion cannot be accepted.
- `reject(decider: User, suggestion: Suggestion) : returns (suggestion: Suggestion)`
  - Refuses `CANNOT_REJECT`: This suggestion cannot be rejected.
- `withdraw(suggester: User, suggestion: Suggestion) : returns (suggestion: Suggestion)`
  - Refuses `CANNOT_WITHDRAW`: This suggestion cannot be withdrawn.

#### Queries

- `_all() : many (suggestion: Suggestion, suggester: User, decider: User, event: Event, change: Change, status: SuggestionStatus)`

#### Instances

- `ChangeSuggesting` — instance of `ChangeSuggesting` — [Application types](../design/types.md), line 21.
  - `Change` is `RunChange` — [Application types](../design/types.md), line 24.
  - `Event` is `RunPlanning.Run` — [Application types](../design/types.md), line 23.
  - `User` is `Name` — [Application types](../design/types.md), line 22.

### Friending

Defined in [Friending](../design/concepts/Friending.md), line 1.

#### Actions

- `request(sender: User, recipient: User) : returns (request: FriendRequest)`
  - Refuses `CANNOT_REQUEST`: A friend request cannot be created between these users.
- `accept(recipient: User, request: FriendRequest) : returns (friendship: Friendship)`
  - Refuses `CANNOT_ACCEPT`: This friend request cannot be accepted.
- `reject(recipient: User, request: FriendRequest) : returns (request: FriendRequest)`
  - Refuses `CANNOT_REJECT`: This friend request cannot be rejected.
- `remove(user: User, friendship: Friendship) : returns (friendship: Friendship)`
  - Refuses `CANNOT_REMOVE`: This friendship cannot be removed by this user.

#### Queries

- `_requests() : many (request: FriendRequest, sender: User, recipient: User)`
- `_friendships() : many (friendship: Friendship, user1: User, user2: User)`

#### Instances

- `Friending` — instance of `Friending` — [Application types](../design/types.md), line 26.
  - `User` is `Name` — [Application types](../design/types.md), line 27.

### Joining

Defined in [Joining](../design/concepts/Joining.md), line 1.

#### Actions

- `join(user: User, event: Event) : returns (participation: Participation)`
  - Refuses `ALREADY_JOINED`: The user has already joined this event.
- `leave(user: User, event: Event) : returns (participation: Participation)`
  - Refuses `NOT_JOINED`: The user has not joined this event.

#### Queries

- `_all() : many (participation: Participation, user: User, event: Event)`

#### Instances

- `Joining` — instance of `Joining` — [Application types](../design/types.md), line 17.
  - `Event` is `RunPlanning.Run` — [Application types](../design/types.md), line 19.
  - `User` is `Name` — [Application types](../design/types.md), line 18.

### RunPlanning

Defined in [RunPlanning](../design/concepts/RunPlanning.md), line 1.

#### Actions

- `create(owner: User, startTime: String, distance: Number, pace: Number, location: String) : returns (run: Run)`
  - Refuses `INVALID_RUN`: The run details or flexibility ranges are invalid.
- `update(owner: User, run: Run, startTime?: String, distance?: Number, pace?: Number, location?: String) : returns (run: Run)`
  - Refuses `NOT_OWNER`: The run does not exist or does not belong to this user.
  - Refuses `INVALID_RUN`: The updated run details are invalid.
- `setFlexibility(owner: User, run: Run, earliestTime?: String, latestTime?: String, minDistance?: Number, maxDistance?: Number, minPace?: Number, maxPace?: Number) : returns (run: Run)`
  - Refuses `NOT_OWNER`: The run does not exist or does not belong to this user.
  - Refuses `INVALID_FLEXIBILITY`: The flexibility ranges are invalid.
- `cancel(owner: User, run: Run) : returns (run: Run)`
  - Refuses `NOT_OWNER`: The run does not exist or does not belong to this user.

#### Queries

- `_all() : many (run: Run, owner: User, startTime: String, distance: Number, pace: Number, location: String, earliestTime?: String, latestTime?: String, minDistance?: Number, maxDistance?: Number, minPace?: Number, maxPace?: Number)`

#### Instances

- `RunPlanning` — instance of `RunPlanning` — [Application types](../design/types.md), line 14.
  - `User` is `Name` — [Application types](../design/types.md), line 15.

## Application types

Concrete types:

- `Name` — [Application types](../design/types.md), line 6.
- `RunChange` — [Application types](../design/types.md), line 9.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the friend list

Authored path: `RunTogether.FriendList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.

```former
Former "the friend list" — inputs (); bindings (friendship, user1, user2); promises exactly one record — forms:
  a record of
    friendships: each Friending._friendships () has (friendship, user1, user2)
      form a record of
        friendship
        user1
        user2
```

### the run list

Authored path: `RunTogether.RunList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.

```former
Former "the run list" — inputs (); bindings (run, owner, startTime, distance, pace, location); promises exactly one record — forms:
  a record of
    runs: each RunPlanning._all () has (distance, location, owner, pace, run, startTime)
      form a record of
        distance
        location
        owner
        pace
        run
        startTime
```

### the suggestion list

Authored path: `RunTogether.SuggestionList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.

```former
Former "the suggestion list" — inputs (); bindings (suggestion, suggester, decider, event, change, status); promises exactly one record — forms:
  a record of
    suggestions: each ChangeSuggesting._all () has (change, decider, event, status, suggester, suggestion)
      form a record of
        change
        decider
        event
        status
        suggester
        suggestion
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### RunTogether.AcceptFriendRequest

Authored path: `RunTogether.AcceptFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 24.

```reaction
when RequestBoundary.request (path: "/friends/accept", recipient, request, requestId)
then
  Friending.accept (recipient, request)
```

### RunTogether.AcceptFriendRequest#2

Authored path: `RunTogether.AcceptFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 24.

```reaction
when Friending.accept (recipient, request, friendship), asked by RunTogether.AcceptFriendRequest
where
  earlier, RequestBoundary.request (path: "/friends/accept", recipient, request, requestId)
then
  RequestBoundary.respond (friendship, requestId)
```

### RunTogether.AcceptSuggestion

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 34.

```reaction
when RequestBoundary.request (decider, path: "/suggestions/accept", requestId, suggestion)
then
  ChangeSuggesting.accept (decider, suggestion)
```

### RunTogether.AcceptSuggestion#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 34.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event, suggester), asked by RunTogether.AcceptSuggestion
where
  earlier, RequestBoundary.request (decider, path: "/suggestions/accept", requestId, suggestion)
then
  RequestBoundary.respond (change, event, requestId, suggester)
```

### RunTogether.AcceptedSuggestionJoinsSuggester

Authored path: `RunTogether.AcceptedSuggestionJoinsSuggester`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event, suggester)
then
  Joining.join (event, user: suggester)
```

### RunTogether.AcceptedSuggestionUpdatesRun

Authored path: `RunTogether.AcceptedSuggestionUpdatesRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event, suggester)
then
  RunPlanning.update (owner: decider, run: event, startTime: change)
```

### RunTogether.CancelRun

Authored path: `RunTogether.CancelRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 9.

```reaction
when RequestBoundary.request (owner, path: "/runs/cancel", requestId, run)
then
  RunPlanning.cancel (owner, run)
```

### RunTogether.CancelRun#2

Authored path: `RunTogether.CancelRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 9.

```reaction
when RunPlanning.cancel (owner, run), asked by RunTogether.CancelRun
where
  earlier, RequestBoundary.request (owner, path: "/runs/cancel", requestId, run)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.CreateRun

Authored path: `RunTogether.CreateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 6.

```reaction
when RequestBoundary.request (distance, location, owner, pace, path: "/runs/create", requestId, startTime)
then
  RunPlanning.create (distance, location, owner, pace, startTime)
```

### RunTogether.CreateRun#2

Authored path: `RunTogether.CreateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 6.

```reaction
when RunPlanning.create (distance, location, owner, pace, startTime, run), asked by RunTogether.CreateRun
where
  earlier, RequestBoundary.request (distance, location, owner, pace, path: "/runs/create", requestId, startTime)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.JoinRun

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.

```reaction
when RequestBoundary.request (event, path: "/runs/join", requestId, user)
then
  Joining.join (event, user)
```

### RunTogether.JoinRun#2

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.

```reaction
when Joining.join (event, user, participation), asked by RunTogether.JoinRun
where
  earlier, RequestBoundary.request (event, path: "/runs/join", requestId, user)
then
  RequestBoundary.respond (participation, requestId)
```

### RunTogether.LeaveRun

Authored path: `RunTogether.LeaveRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 17.

```reaction
when RequestBoundary.request (event, path: "/runs/leave", requestId, user)
then
  Joining.leave (event, user)
```

### RunTogether.LeaveRun#2

Authored path: `RunTogether.LeaveRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 17.

```reaction
when Joining.leave (event, user, participation), asked by RunTogether.LeaveRun
where
  earlier, RequestBoundary.request (event, path: "/runs/leave", requestId, user)
then
  RequestBoundary.respond (participation, requestId)
```

### RunTogether.ListFriends

Authored path: `RunTogether.ListFriends`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.

```reaction
when RequestBoundary.request (path: "/friends/list", requestId)
then
  RequestBoundary.respond (friends: former "the friend list", requestId)
```

### RunTogether.ListRuns

Authored path: `RunTogether.ListRuns`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 15.

```reaction
when RequestBoundary.request (path: "/runs/list", requestId)
then
  RequestBoundary.respond (requestId, runs: former "the run list")
```

### RunTogether.ListSuggestions

Authored path: `RunTogether.ListSuggestions`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 37.

```reaction
when RequestBoundary.request (path: "/suggestions/list", requestId)
then
  RequestBoundary.respond (requestId, suggestions: former "the suggestion list")
```

### RunTogether.RejectFriendRequest

Authored path: `RunTogether.RejectFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 25.

```reaction
when RequestBoundary.request (path: "/friends/reject", recipient, request, requestId)
then
  Friending.reject (recipient, request)
```

### RunTogether.RejectFriendRequest#2

Authored path: `RunTogether.RejectFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 25.

```reaction
when Friending.reject (recipient, request), asked by RunTogether.RejectFriendRequest
where
  earlier, RequestBoundary.request (path: "/friends/reject", recipient, request, requestId)
then
  RequestBoundary.respond (request, requestId)
```

### RunTogether.RejectSuggestion

Authored path: `RunTogether.RejectSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 35.

```reaction
when RequestBoundary.request (decider, path: "/suggestions/reject", requestId, suggestion)
then
  ChangeSuggesting.reject (decider, suggestion)
```

### RunTogether.RejectSuggestion#2

Authored path: `RunTogether.RejectSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 35.

```reaction
when ChangeSuggesting.reject (decider, suggestion), asked by RunTogether.RejectSuggestion
where
  earlier, RequestBoundary.request (decider, path: "/suggestions/reject", requestId, suggestion)
then
  RequestBoundary.respond (requestId, suggestion)
```

### RunTogether.RemoveFriend

Authored path: `RunTogether.RemoveFriend`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 26.

```reaction
when RequestBoundary.request (friendship, path: "/friends/remove", requestId, user)
then
  Friending.remove (friendship, user)
```

### RunTogether.RemoveFriend#2

Authored path: `RunTogether.RemoveFriend`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 26.

```reaction
when Friending.remove (friendship, user), asked by RunTogether.RemoveFriend
where
  earlier, RequestBoundary.request (friendship, path: "/friends/remove", requestId, user)
then
  RequestBoundary.respond (friendship, requestId)
```

### RunTogether.SendFriendRequest

Authored path: `RunTogether.SendFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 23.

```reaction
when RequestBoundary.request (path: "/friends/request", recipient, requestId, sender)
then
  Friending.request (recipient, sender)
```

### RunTogether.SendFriendRequest#2

Authored path: `RunTogether.SendFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 23.

```reaction
when Friending.request (recipient, sender, request), asked by RunTogether.SendFriendRequest
where
  earlier, RequestBoundary.request (path: "/friends/request", recipient, requestId, sender)
then
  RequestBoundary.respond (request, requestId)
```

### RunTogether.SetFlexibility

Authored path: `RunTogether.SetFlexibility`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 8.

```reaction
when RequestBoundary.request (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, owner, path: "/runs/flexibility", requestId, run)
then
  RunPlanning.setFlexibility (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, owner, run)
```

### RunTogether.SetFlexibility#2

Authored path: `RunTogether.SetFlexibility`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 8.

```reaction
when RunPlanning.setFlexibility (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, owner, run), asked by RunTogether.SetFlexibility
where
  earlier, RequestBoundary.request (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, owner, path: "/runs/flexibility", requestId, run)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.SuggestChange

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 33.

```reaction
when RequestBoundary.request (change, decider, event, path: "/suggestions/create", requestId, suggester)
then
  ChangeSuggesting.suggest (change, decider, event, suggester)
```

### RunTogether.SuggestChange#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 33.

```reaction
when ChangeSuggesting.suggest (change, decider, event, suggester, suggestion), asked by RunTogether.SuggestChange
where
  earlier, RequestBoundary.request (change, decider, event, path: "/suggestions/create", requestId, suggester)
then
  RequestBoundary.respond (requestId, suggestion)
```

### RunTogether.UpdateRun

Authored path: `RunTogether.UpdateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.

```reaction
when RequestBoundary.request (distance, location, owner, pace, path: "/runs/update", requestId, run, startTime)
then
  RunPlanning.update (distance, location, owner, pace, run, startTime)
```

### RunTogether.UpdateRun#2

Authored path: `RunTogether.UpdateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 3.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.

```reaction
when RunPlanning.update (distance, location, owner, pace, run, startTime), asked by RunTogether.UpdateRun
where
  earlier, RequestBoundary.request (distance, location, owner, pace, path: "/runs/update", requestId, run, startTime)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.WithdrawSuggestion

Authored path: `RunTogether.WithdrawSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 36.

```reaction
when RequestBoundary.request (path: "/suggestions/withdraw", requestId, suggester, suggestion)
then
  ChangeSuggesting.withdraw (suggester, suggestion)
```

### RunTogether.WithdrawSuggestion#2

Authored path: `RunTogether.WithdrawSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 36.

```reaction
when ChangeSuggesting.withdraw (suggester, suggestion), asked by RunTogether.WithdrawSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/withdraw", requestId, suggester, suggestion)
then
  RequestBoundary.respond (requestId, suggestion)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/friends/accept` — requires `recipient`, `request`
- `/friends/reject` — requires `recipient`, `request`
- `/friends/remove` — requires `user`, `friendship`
- `/friends/request` — requires `sender`, `recipient`
- `/runs/cancel` — requires `owner`, `run`
- `/runs/create` — requires `owner`, `startTime`, `distance`, `pace`, `location`
- `/runs/flexibility` — requires `owner`, `run`; fills `earliestTime` with null when absent; fills `latestTime` with null when absent; fills `maxDistance` with null when absent; fills `maxPace` with null when absent; fills `minDistance` with null when absent; fills `minPace` with null when absent
- `/runs/join` — requires `user`, `event`
- `/runs/leave` — requires `user`, `event`
- `/runs/update` — requires `owner`, `run`; fills `distance` with null when absent; fills `location` with null when absent; fills `pace` with null when absent; fills `startTime` with null when absent
- `/suggestions/accept` — requires `decider`, `suggestion`
- `/suggestions/create` — requires `suggester`, `decider`, `event`, `change`
- `/suggestions/reject` — requires `decider`, `suggestion`
- `/suggestions/withdraw` — requires `suggester`, `suggestion`
