<!-- Generated from the RunTogether assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# RunTogether — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `set(user: User, password: String) : returns (user: User)`
  - Refuses `INVALID_PASSWORD`: A password must have 8 to 128 characters.
  - Refuses `PASSWORD_SET`: This account already has a password.
- `authenticate(user: User, password: String) : returns (user: User)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.

#### Queries

- `_acceptable(password: String) : one (acceptable: Flag)`

#### Instances

- `Authenticating` — instance of `Authenticating` — [Application types](../design/types.md), line 17.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 18.

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

- `ChangeSuggesting` — instance of `ChangeSuggesting` — [Application types](../design/types.md), line 33.
  - `Change` is `RunChange` — [Application types](../design/types.md), line 36.
  - `Event` is `RunPlanning.Run` — [Application types](../design/types.md), line 35.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 34.

### Federating

Defined in [Federating](../design/concepts/Federating.md), line 1.

#### Actions

- `start() : returns (attempt: Attempt, expiresAt: DateTime, address: String)`
- `finish(attempt: Attempt, nonce: String, code: String) : returns (username: String)`
  - Refuses `SIGN_IN_EXPIRED`: This sign-in has expired. Start again.
  - Refuses `SIGN_IN_REFUSED`: The other site didn't confirm this sign-in. Start again.
- `link(attempt: Attempt, user: User) : returns (user: User)`
  - Refuses `NOT_CONFIRMED`: This sign-in hasn't been confirmed.
  - Refuses `ALREADY_LINKED`: This account on the other site is already linked.

#### Queries

- `_user(attempt: Attempt) : optional (user: User)`
- `_linkable(attempt: Attempt) : one (linkable: Flag)`

#### Instances

- `CommonsFederating` — instance of `Federating` — [Application types](../design/types.md), line 20.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 21.

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

- `Friending` — instance of `Friending` — [Application types](../design/types.md), line 38.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 39.

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

- `Joining` — instance of `Joining` — [Application types](../design/types.md), line 29.
  - `Event` is `RunPlanning.Run` — [Application types](../design/types.md), line 31.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 30.

### Registering

Defined in [Registering](../design/concepts/Registering.md), line 1.

#### Actions

- `register(username: String) : returns (user: User)`
  - Refuses `INVALID_USERNAME`: A username must have 3 to 32 letters, digits, underscores, or hyphens.
  - Refuses `USERNAME_TAKEN`: That username is taken.

#### Queries

- `_byUsername(username: String) : optional (user: User)`
- `_username(user: User) : optional (username: String)`
- `_search(text: String) : many (user: User, username: String)`

#### Instances

- `Registering` — instance of `Registering` — [Application types](../design/types.md), line 15.

### RunPlanning

Defined in [RunPlanning](../design/concepts/RunPlanning.md), line 1.

#### Actions

- `create(owner: User, startTime: String, distance: Number, pace: Number, location: String, details: String) : returns (run: Run)`
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

- `_all() : many (run: Run, owner: User, startTime: String, distance: Number, pace: Number, location: String, details: String, earliestTime: String, latestTime: String, minDistance: Number, maxDistance: Number, minPace: Number, maxPace: Number)`

#### Instances

- `RunPlanning` — instance of `RunPlanning` — [Application types](../design/types.md), line 26.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 27.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (subject: Subject)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.
- `end(session: Session) : returns (session: Session)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.

#### Instances

- `Sessioning` — instance of `Sessioning` — [Application types](../design/types.md), line 23.
  - `Subject` is `Registering.User` — [Application types](../design/types.md), line 24.

## Application types

Concrete types:

- `RunChange` — [Application types](../design/types.md), line 10.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (user) is friends with (other)

Authored path: `RunTogether.friends`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 5.

```view
(user) is friends with (other) — inputs (user, other); outputs (); bindings ()
  where Friending._friendships () has (user1: user, user2: other)
  where Friending._friendships () has (user1: other, user2: user)
```

### (user) is in (friendship)

Authored path: `RunTogether.inFriendship`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.

```view
(user) is in (friendship) — inputs (user, friendship); outputs (); bindings ()
  where Friending._friendships () has (friendship, user1: user)
  where Friending._friendships () has (friendship, user2: user)
```

### (user) is party to (suggestion)

Authored path: `RunTogether.partyTo`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.

```view
(user) is party to (suggestion) — inputs (user, suggestion); outputs (); bindings ()
  where ChangeSuggesting._all () has (suggester: user, suggestion)
  where ChangeSuggesting._all () has (decider: user, suggestion)
```

### (user) sent or received (request)

Authored path: `RunTogether.inRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.

```view
(user) sent or received (request) — inputs (user, request); outputs (); bindings ()
  where Friending._requests () has (request, sender: user)
  where Friending._requests () has (recipient: user, request)
```

### (viewer) can see (run)

Authored path: `RunTogether.canSee`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 5.

```view
(viewer) can see (run) — inputs (viewer, run); outputs (); bindings (owner)
  where RunPlanning._all () has (owner: viewer, run)
  where
    RunPlanning._all () has (owner, run)
    view "(user) is friends with (other)" with (other: owner, user: viewer)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the friend list for (user)

Authored path: `RunTogether.FriendList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.

```former
Former "the friend list for (user)" — inputs (user); bindings (friendship, user1, user2, username1, username2); promises exactly one record — forms:
  a record of
    friendships: each Friending._friendships () has (friendship, user1, user2)
      where view "(user) is in (friendship)" with (friendship, user)
      where Registering._username (user: user1) has (username: username1)
      where Registering._username (user: user2) has (username: username2)
      form a record of
        friendship
        user1: username1
        user2: username2
```

### the friend request list for (user)

Authored path: `RunTogether.FriendRequestList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.

```former
Former "the friend request list for (user)" — inputs (user); bindings (request, sender, recipient, senderName, recipientName); promises exactly one record — forms:
  a record of
    requests: each Friending._requests () has (recipient, request, sender)
      where view "(user) sent or received (request)" with (request, user)
      where Registering._username (user: sender) has (username: senderName)
      where Registering._username (user: recipient) has (username: recipientName)
      form a record of
        recipient: recipientName
        request
        sender: senderName
```

### the participant list for (viewer)

Authored path: `RunTogether.ParticipantList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.

```former
Former "the participant list for (viewer)" — inputs (viewer); bindings (participation, user, username, event); promises exactly one record — forms:
  a record of
    participations: each Joining._all () has (event, participation, user)
      where view "(viewer) can see (run)" with (run: event, viewer)
      where Registering._username (user) has (username)
      form a record of
        event
        participation
        user: username
```

### the people matching (text) for (user)

Authored path: `RunTogether.PeopleFound`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 25.

```former
Former "the people matching (text) for (user)" — inputs (text, user); bindings (username); promises exactly one record — forms:
  each Registering._search (text) has (username)
    where no Registering._byUsername (username) has (user)
    form a record of
      username
```

### the run list for (user)

Authored path: `RunTogether.RunList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.

```former
Former "the run list for (user)" — inputs (user); bindings (run, owner, ownerName, startTime, distance, pace, location, details, earliestTime, latestTime, minDistance, maxDistance, minPace, maxPace); promises exactly one record — forms:
  a record of
    runs: each RunPlanning._all () has (details, distance, earliestTime, latestTime, location, maxDistance, maxPace, minDistance, minPace, owner, pace, run, startTime)
      where view "(viewer) can see (run)" with (run, viewer: user)
      where Registering._username (user: owner) has (username: ownerName)
      form a record of
        details
        distance
        earliestTime
        latestTime
        location
        maxDistance
        maxPace
        minDistance
        minPace
        owner: ownerName
        pace
        run
        startTime
```

### the suggestion list for (user)

Authored path: `RunTogether.SuggestionList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.

```former
Former "the suggestion list for (user)" — inputs (user); bindings (suggestion, suggester, decider, suggesterName, deciderName, event, change, status); promises exactly one record — forms:
  a record of
    suggestions: each ChangeSuggesting._all () has (change, decider, event, status, suggester, suggestion)
      where view "(user) is party to (suggestion)" with (suggestion, user)
      where Registering._username (user: suggester) has (username: suggesterName)
      where Registering._username (user: decider) has (username: deciderName)
      form a record of
        change
        decider: deciderName
        event
        status
        suggester: suggesterName
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
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 31.

```reaction
when RequestBoundary.request (path: "/friends/accept", request, requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.AcceptFriendRequest#2

Authored path: `RunTogether.AcceptFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 31.

```reaction
when Sessioning.use (session, subject: recipient), asked by RunTogether.AcceptFriendRequest
where
  earlier, RequestBoundary.request (path: "/friends/accept", request, requestId, session)
then
  Friending.accept (recipient, request)
```

### RunTogether.AcceptFriendRequest#3

Authored path: `RunTogether.AcceptFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 31.

```reaction
when Friending.accept (recipient, request, friendship), asked by RunTogether.AcceptFriendRequest#2
where
  earlier, RequestBoundary.request (path: "/friends/accept", request, requestId, session)
then
  RequestBoundary.respond (friendship, requestId)
```

### RunTogether.AcceptSuggestion

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
then
  Sessioning.use (session)
```

### RunTogether.AcceptSuggestion:friend#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  ChangeSuggesting._all () has (decider, suggester, suggestion)
  view "(user) is friends with (other)" with (other: suggester, user: decider)
then
  ChangeSuggesting.accept (decider, suggestion)
```

### RunTogether.AcceptSuggestion:friend#3

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event), asked by RunTogether.AcceptSuggestion:friend#2
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
then
  RequestBoundary.respond (change, event, requestId)
```

### RunTogether.AcceptSuggestion:not-decider#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
  no ChangeSuggesting._all () has (decider, suggestion)
then
  ChangeSuggesting.accept (decider, suggestion)
```

### RunTogether.AcceptSuggestion:not-decider#3

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event), asked by RunTogether.AcceptSuggestion:not-decider#2
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
then
  RequestBoundary.respond (change, event, requestId)
```

### RunTogether.AcceptSuggestion:not-friends#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  ChangeSuggesting._all () has (decider, suggester, suggestion)
  no view "(user) is friends with (other)" with (other: suggester, user: decider)
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
then
  RequestBoundary.respond (error: "NOT_FRIENDS", requestId)
```

### RunTogether.AcceptedSuggestionJoinsSuggester

Authored path: `RunTogether.AcceptedSuggestionJoinsSuggester`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event, suggester)
then
  Joining.join (event, user: suggester)
```

### RunTogether.AcceptedSuggestionUpdatesRun

Authored path: `RunTogether.AcceptedSuggestionUpdatesRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event, suggester)
then
  RunPlanning.update (owner: decider, run: event, startTime: change)
```

### RunTogether.CancelRun

Authored path: `RunTogether.CancelRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 13.

```reaction
when RequestBoundary.request (path: "/runs/cancel", requestId, run, session)
then
  Sessioning.use (session)
```

### RunTogether.CancelRun#2

Authored path: `RunTogether.CancelRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 13.

```reaction
when Sessioning.use (session, subject: owner), asked by RunTogether.CancelRun
where
  earlier, RequestBoundary.request (path: "/runs/cancel", requestId, run, session)
then
  RunPlanning.cancel (owner, run)
```

### RunTogether.CancelRun#3

Authored path: `RunTogether.CancelRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 13.

```reaction
when RunPlanning.cancel (owner, run), asked by RunTogether.CancelRun#2
where
  earlier, RequestBoundary.request (path: "/runs/cancel", requestId, run, session)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.CreateRun

Authored path: `RunTogether.CreateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 10.

```reaction
when RequestBoundary.request (details, distance, location, pace, path: "/runs/create", requestId, session, startTime)
then
  Sessioning.use (session)
```

### RunTogether.CreateRun#2

Authored path: `RunTogether.CreateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 10.

```reaction
when Sessioning.use (session, subject: owner), asked by RunTogether.CreateRun
where
  earlier, RequestBoundary.request (details, distance, location, pace, path: "/runs/create", requestId, session, startTime)
then
  RunPlanning.create (details, distance, location, owner, pace, startTime)
```

### RunTogether.CreateRun#3

Authored path: `RunTogether.CreateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 10.

```reaction
when RunPlanning.create (details, distance, location, owner, pace, startTime, run), asked by RunTogether.CreateRun#2
where
  earlier, RequestBoundary.request (details, distance, location, pace, path: "/runs/create", requestId, session, startTime)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.FindPeople

Authored path: `RunTogether.FindPeople`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 25.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 36.

```reaction
when RequestBoundary.request (path: "/friends/search", requestId, session, text)
then
  Sessioning.use (session)
```

### RunTogether.FindPeople#2

Authored path: `RunTogether.FindPeople`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 25.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 36.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.FindPeople
where
  earlier, RequestBoundary.request (path: "/friends/search", requestId, session, text)
then
  RequestBoundary.respond (people: former "the people matching (text) for (user)" with (text, user), requestId)
```

### RunTogether.JoinRun

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 21.

```reaction
when RequestBoundary.request (event, path: "/runs/join", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.JoinRun:friend#2

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 21.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.JoinRun
where
  RunPlanning._all () has (owner, run: event)
  view "(user) is friends with (other)" with (other: owner, user)
then
  Joining.join (event, user)
```

### RunTogether.JoinRun:friend#3

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 21.

```reaction
when Joining.join (event, user, participation), asked by RunTogether.JoinRun:friend#2
where
  earlier, RequestBoundary.request (event, path: "/runs/join", requestId, session)
then
  RequestBoundary.respond (participation, requestId)
```

### RunTogether.JoinRun:hidden#2

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 21.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.JoinRun
where
  earlier, RequestBoundary.request (event, path: "/runs/join", requestId, session)
  no view "(viewer) can see (run)" with (run: event, viewer: user)
then
  RequestBoundary.respond (error: "RUN_NOT_FOUND", requestId)
```

### RunTogether.JoinRun:owner#2

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 21.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.JoinRun
where
  RunPlanning._all () has (owner: user, run: event)
  earlier, RequestBoundary.request (event, path: "/runs/join", requestId, session)
then
  RequestBoundary.respond (error: "OWN_RUN", requestId)
```

### RunTogether.LeaveRun

Authored path: `RunTogether.LeaveRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 22.

```reaction
when RequestBoundary.request (event, path: "/runs/leave", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.LeaveRun#2

Authored path: `RunTogether.LeaveRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 22.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.LeaveRun
where
  earlier, RequestBoundary.request (event, path: "/runs/leave", requestId, session)
then
  Joining.leave (event, user)
```

### RunTogether.LeaveRun#3

Authored path: `RunTogether.LeaveRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 22.

```reaction
when Joining.leave (event, user, participation), asked by RunTogether.LeaveRun#2
where
  earlier, RequestBoundary.request (event, path: "/runs/leave", requestId, session)
then
  RequestBoundary.respond (participation, requestId)
```

### RunTogether.ListFriendRequests

Authored path: `RunTogether.ListFriendRequests`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 35.

```reaction
when RequestBoundary.request (path: "/friends/requests", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.ListFriendRequests#2

Authored path: `RunTogether.ListFriendRequests`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 35.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.ListFriendRequests
where
  earlier, RequestBoundary.request (path: "/friends/requests", requestId, session)
then
  RequestBoundary.respond (requestId, requests: former "the friend request list for (user)" with (user))
```

### RunTogether.ListFriends

Authored path: `RunTogether.ListFriends`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 34.

```reaction
when RequestBoundary.request (path: "/friends/list", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.ListFriends#2

Authored path: `RunTogether.ListFriends`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 34.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.ListFriends
where
  earlier, RequestBoundary.request (path: "/friends/list", requestId, session)
then
  RequestBoundary.respond (friends: former "the friend list for (user)" with (user), requestId)
```

### RunTogether.ListParticipants

Authored path: `RunTogether.ListParticipants`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.

```reaction
when RequestBoundary.request (path: "/runs/participants", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.ListParticipants#2

Authored path: `RunTogether.ListParticipants`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 20.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.ListParticipants
where
  earlier, RequestBoundary.request (path: "/runs/participants", requestId, session)
then
  RequestBoundary.respond (participants: former "the participant list for (viewer)" with (viewer: user), requestId)
```

### RunTogether.ListRuns

Authored path: `RunTogether.ListRuns`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 19.

```reaction
when RequestBoundary.request (path: "/runs/list", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.ListRuns#2

Authored path: `RunTogether.ListRuns`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 19.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.ListRuns
where
  earlier, RequestBoundary.request (path: "/runs/list", requestId, session)
then
  RequestBoundary.respond (requestId, runs: former "the run list for (user)" with (user))
```

### RunTogether.ListSuggestions

Authored path: `RunTogether.ListSuggestions`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 46.

```reaction
when RequestBoundary.request (path: "/suggestions/list", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.ListSuggestions#2

Authored path: `RunTogether.ListSuggestions`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 46.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.ListSuggestions
where
  earlier, RequestBoundary.request (path: "/suggestions/list", requestId, session)
then
  RequestBoundary.respond (requestId, suggestions: former "the suggestion list for (user)" with (user))
```

### RunTogether.RejectFriendRequest

Authored path: `RunTogether.RejectFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 32.

```reaction
when RequestBoundary.request (path: "/friends/reject", request, requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.RejectFriendRequest#2

Authored path: `RunTogether.RejectFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 32.

```reaction
when Sessioning.use (session, subject: recipient), asked by RunTogether.RejectFriendRequest
where
  earlier, RequestBoundary.request (path: "/friends/reject", request, requestId, session)
then
  Friending.reject (recipient, request)
```

### RunTogether.RejectFriendRequest#3

Authored path: `RunTogether.RejectFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 32.

```reaction
when Friending.reject (recipient, request), asked by RunTogether.RejectFriendRequest#2
where
  earlier, RequestBoundary.request (path: "/friends/reject", request, requestId, session)
then
  RequestBoundary.respond (request, requestId)
```

### RunTogether.RejectSuggestion

Authored path: `RunTogether.RejectSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 44.

```reaction
when RequestBoundary.request (path: "/suggestions/reject", requestId, session, suggestion)
then
  Sessioning.use (session)
```

### RunTogether.RejectSuggestion#2

Authored path: `RunTogether.RejectSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 44.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.RejectSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/reject", requestId, session, suggestion)
then
  ChangeSuggesting.reject (decider, suggestion)
```

### RunTogether.RejectSuggestion#3

Authored path: `RunTogether.RejectSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 44.

```reaction
when ChangeSuggesting.reject (decider, suggestion), asked by RunTogether.RejectSuggestion#2
where
  earlier, RequestBoundary.request (path: "/suggestions/reject", requestId, session, suggestion)
then
  RequestBoundary.respond (requestId, suggestion)
```

### RunTogether.RemoveFriend

Authored path: `RunTogether.RemoveFriend`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 33.

```reaction
when RequestBoundary.request (friendship, path: "/friends/remove", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.RemoveFriend#2

Authored path: `RunTogether.RemoveFriend`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 33.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.RemoveFriend
where
  earlier, RequestBoundary.request (friendship, path: "/friends/remove", requestId, session)
then
  Friending.remove (friendship, user)
```

### RunTogether.RemoveFriend#3

Authored path: `RunTogether.RemoveFriend`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 33.

```reaction
when Friending.remove (friendship, user), asked by RunTogether.RemoveFriend#2
where
  earlier, RequestBoundary.request (friendship, path: "/friends/remove", requestId, session)
then
  RequestBoundary.respond (friendship, requestId)
```

### RunTogether.SendFriendRequest

Authored path: `RunTogether.SendFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.

```reaction
when RequestBoundary.request (path: "/friends/request", requestId, session, username)
then
  Sessioning.use (session)
```

### RunTogether.SendFriendRequest:found#2

Authored path: `RunTogether.SendFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.

```reaction
when Sessioning.use (session, subject: sender), asked by RunTogether.SendFriendRequest
where
  earlier, RequestBoundary.request (path: "/friends/request", requestId, session, username)
  Registering._byUsername (username) has (user: recipient)
then
  Friending.request (recipient, sender)
```

### RunTogether.SendFriendRequest:found#3

Authored path: `RunTogether.SendFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.

```reaction
when Friending.request (recipient, sender, request), asked by RunTogether.SendFriendRequest:found#2
where
  earlier, RequestBoundary.request (path: "/friends/request", requestId, session, username)
then
  RequestBoundary.respond (request, requestId)
```

### RunTogether.SendFriendRequest:unknown#2

Authored path: `RunTogether.SendFriendRequest`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 27.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 30.

```reaction
when Sessioning.use (session, subject: sender), asked by RunTogether.SendFriendRequest
where
  earlier, RequestBoundary.request (path: "/friends/request", requestId, session, username)
  no Registering._byUsername (username)
then
  RequestBoundary.respond (error: "USER_NOT_FOUND", requestId)
```

### RunTogether.SetFlexibility

Authored path: `RunTogether.SetFlexibility`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.

```reaction
when RequestBoundary.request (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, path: "/runs/flexibility", requestId, run, session)
then
  Sessioning.use (session)
```

### RunTogether.SetFlexibility#2

Authored path: `RunTogether.SetFlexibility`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.

```reaction
when Sessioning.use (session, subject: owner), asked by RunTogether.SetFlexibility
where
  earlier, RequestBoundary.request (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, path: "/runs/flexibility", requestId, run, session)
then
  RunPlanning.setFlexibility (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, owner, run)
```

### RunTogether.SetFlexibility#3

Authored path: `RunTogether.SetFlexibility`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 12.

```reaction
when RunPlanning.setFlexibility (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, owner, run), asked by RunTogether.SetFlexibility#2
where
  earlier, RequestBoundary.request (earliestTime, latestTime, maxDistance, maxPace, minDistance, minPace, path: "/runs/flexibility", requestId, run, session)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.SuggestChange

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
then
  Sessioning.use (session)
```

### RunTogether.SuggestChange:friend#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  RunPlanning._all () has (owner: decider, run: event)
  view "(user) is friends with (other)" with (other: decider, user: suggester)
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
then
  ChangeSuggesting.suggest (change, decider, event, suggester)
```

### RunTogether.SuggestChange:friend#3

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when ChangeSuggesting.suggest (change, decider, event, suggester, suggestion), asked by RunTogether.SuggestChange:friend#2
where
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
then
  RequestBoundary.respond (requestId, suggestion)
```

### RunTogether.SuggestChange:hidden#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
  no view "(viewer) can see (run)" with (run: event, viewer: suggester)
then
  RequestBoundary.respond (error: "RUN_NOT_FOUND", requestId)
```

### RunTogether.SuggestChange:owner#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  RunPlanning._all () has (owner: suggester, run: event)
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
then
  RequestBoundary.respond (error: "OWN_RUN", requestId)
```

### RunTogether.UpdateRun

Authored path: `RunTogether.UpdateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 11.

```reaction
when RequestBoundary.request (distance, location, pace, path: "/runs/update", requestId, run, session, startTime)
then
  Sessioning.use (session)
```

### RunTogether.UpdateRun#2

Authored path: `RunTogether.UpdateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 11.

```reaction
when Sessioning.use (session, subject: owner), asked by RunTogether.UpdateRun
where
  earlier, RequestBoundary.request (distance, location, pace, path: "/runs/update", requestId, run, session, startTime)
then
  RunPlanning.update (distance, location, owner, pace, run, startTime)
```

### RunTogether.UpdateRun#3

Authored path: `RunTogether.UpdateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 11.

```reaction
when RunPlanning.update (distance, location, owner, pace, run, startTime), asked by RunTogether.UpdateRun#2
where
  earlier, RequestBoundary.request (distance, location, pace, path: "/runs/update", requestId, run, session, startTime)
then
  RequestBoundary.respond (requestId, run)
```

### RunTogether.WithdrawSuggestion

Authored path: `RunTogether.WithdrawSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 45.

```reaction
when RequestBoundary.request (path: "/suggestions/withdraw", requestId, session, suggestion)
then
  Sessioning.use (session)
```

### RunTogether.WithdrawSuggestion#2

Authored path: `RunTogether.WithdrawSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 45.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.WithdrawSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/withdraw", requestId, session, suggestion)
then
  ChangeSuggesting.withdraw (suggester, suggestion)
```

### RunTogether.WithdrawSuggestion#3

Authored path: `RunTogether.WithdrawSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 45.

```reaction
when ChangeSuggesting.withdraw (suggester, suggestion), asked by RunTogether.WithdrawSuggestion#2
where
  earlier, RequestBoundary.request (path: "/suggestions/withdraw", requestId, session, suggestion)
then
  RequestBoundary.respond (requestId, suggestion)
```

### reusable.accounts.identifying.Me

Authored path: `reusable.accounts.identifying.Me`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 5.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 8.

```reaction
when RequestBoundary.request (path: "/auth/me", requestId, session)
then
  Sessioning.use (session)
```

### reusable.accounts.identifying.Me#2

Authored path: `reusable.accounts.identifying.Me`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 5.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by reusable.accounts.identifying.Me
where
  Registering._username (user) has (username)
  earlier, RequestBoundary.request (path: "/auth/me", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### reusable.accounts.leaving.SignOut

Authored path: `reusable.accounts.leaving.SignOut`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 11.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 14.

```reaction
when RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  Sessioning.end (session)
```

### reusable.accounts.leaving.SignOut#2

Authored path: `reusable.accounts.leaving.SignOut`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 11.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 14.

```reaction
when Sessioning.end (session), asked by reusable.accounts.leaving.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### reusable.commons.finishing.ChooseUsername:expired

Authored path: `reusable.commons.finishing.ChooseUsername`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 22.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 26.

```reaction
when RequestBoundary.request (attempt, path: "/auth/commons/choose", requestId, username)
where
  CommonsFederating._linkable (attempt) has (linkable: false)
then
  RequestBoundary.respond (error: "SIGN_IN_EXPIRED", requestId)
```

### reusable.commons.finishing.ChooseUsername:linkable

Authored path: `reusable.commons.finishing.ChooseUsername`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 22.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 26.

```reaction
when RequestBoundary.request (attempt, path: "/auth/commons/choose", requestId, username)
where
  CommonsFederating._linkable (attempt) has (linkable: true)
then
  Registering.register (username)
```

### reusable.commons.finishing.ChooseUsername:linkable#2

Authored path: `reusable.commons.finishing.ChooseUsername`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 22.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 26.

```reaction
when Registering.register (username, user), asked by reusable.commons.finishing.ChooseUsername:linkable
where
  earlier, RequestBoundary.request (attempt, path: "/auth/commons/choose", requestId, username)
then
  CommonsFederating.link (attempt, user)
```

### reusable.commons.finishing.ChooseUsername:linkable#3

Authored path: `reusable.commons.finishing.ChooseUsername`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 22.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 26.

```reaction
when CommonsFederating.link (attempt, user), asked by reusable.commons.finishing.ChooseUsername:linkable#2
then
  Sessioning.start (subject: user)
```

### reusable.commons.finishing.ChooseUsername:linkable#4

Authored path: `reusable.commons.finishing.ChooseUsername`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 22.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 26.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by reusable.commons.finishing.ChooseUsername:linkable#3
where
  earlier, RequestBoundary.request (attempt, path: "/auth/commons/choose", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.commons.finishing.FinishCommons

Authored path: `reusable.commons.finishing.FinishCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 15.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 25.

```reaction
when RequestBoundary.request (attempt, code, path: "/auth/commons/finish", requestId, state)
then
  CommonsFederating.finish (attempt, code, nonce: state)
```

### reusable.commons.finishing.FinishCommons:new#2

Authored path: `reusable.commons.finishing.FinishCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 15.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 25.

```reaction
when CommonsFederating.finish (attempt, code, nonce: state, username), asked by reusable.commons.finishing.FinishCommons
where
  no CommonsFederating._user (attempt)
then
  Registering.register (username)
```

### reusable.commons.finishing.FinishCommons:new#3

Authored path: `reusable.commons.finishing.FinishCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 15.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 25.

```reaction
when Registering.register (username, user), asked by reusable.commons.finishing.FinishCommons:new#2
where
  earlier, CommonsFederating.finish (attempt, code, nonce: state, username), asked by reusable.commons.finishing.FinishCommons
then
  CommonsFederating.link (attempt, user)
```

### reusable.commons.finishing.FinishCommons:new#4

Authored path: `reusable.commons.finishing.FinishCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 15.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 25.

```reaction
when CommonsFederating.link (attempt, user), asked by reusable.commons.finishing.FinishCommons:new#3
then
  Sessioning.start (subject: user)
```

### reusable.commons.finishing.FinishCommons:new#5

Authored path: `reusable.commons.finishing.FinishCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 15.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 25.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by reusable.commons.finishing.FinishCommons:new#4
where
  earlier, RequestBoundary.request (attempt, code, path: "/auth/commons/finish", requestId, state)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.commons.finishing.FinishCommons:returning#2

Authored path: `reusable.commons.finishing.FinishCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 15.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 25.

```reaction
when CommonsFederating.finish (attempt, code, nonce: state, username), asked by reusable.commons.finishing.FinishCommons
where
  CommonsFederating._user (attempt) has (user)
then
  Sessioning.start (subject: user)
```

### reusable.commons.finishing.FinishCommons:returning#3

Authored path: `reusable.commons.finishing.FinishCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 15.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 25.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by reusable.commons.finishing.FinishCommons:returning#2
where
  earlier, RequestBoundary.request (attempt, code, path: "/auth/commons/finish", requestId, state)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.commons.starting.StartCommons

Authored path: `reusable.commons.starting.StartCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 7.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 10.

```reaction
when RequestBoundary.request (path: "/auth/commons/start", requestId)
then
  CommonsFederating.start ()
```

### reusable.commons.starting.StartCommons#2

Authored path: `reusable.commons.starting.StartCommons`.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 7.
- Covered by [Signing in with Commons](../design/compositions/reusable/commons.md), line 10.

```reaction
when CommonsFederating.start (address, attempt, expiresAt), asked by reusable.commons.starting.StartCommons
where
  earlier, RequestBoundary.request (path: "/auth/commons/start", requestId)
then
  RequestBoundary.respond (address, attempt, expiresAt, requestId)
```

### reusable.passwords.entering.Register:accepted

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
where
  Authenticating._acceptable (password) has (acceptable: true)
then
  Registering.register (username)
```

### reusable.passwords.entering.Register:accepted#2

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Registering.register (username, user), asked by reusable.passwords.entering.Register:accepted
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.set (password, user)
```

### reusable.passwords.entering.Register:accepted#3

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Authenticating.set (password, user), asked by reusable.passwords.entering.Register:accepted#2
then
  Sessioning.start (subject: user)
```

### reusable.passwords.entering.Register:accepted#4

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by reusable.passwords.entering.Register:accepted#3
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.passwords.entering.Register:refused

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
where
  Authenticating._acceptable (password) has (acceptable: false)
then
  RequestBoundary.respond (error: "INVALID_PASSWORD", requestId)
```

### reusable.passwords.entering.SignIn:known

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
where
  Registering._byUsername (username) has (user)
then
  Authenticating.authenticate (password, user)
```

### reusable.passwords.entering.SignIn:known#2

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when Authenticating.authenticate (password, user), asked by reusable.passwords.entering.SignIn:known
then
  Sessioning.start (subject: user)
```

### reusable.passwords.entering.SignIn:known#3

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by reusable.passwords.entering.SignIn:known#2
where
  earlier, RequestBoundary.request (password, path: "/auth/login", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.passwords.entering.SignIn:unknown

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
where
  no Registering._byUsername (username)
then
  RequestBoundary.respond (error: "INVALID_CREDENTIALS", requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/commons/choose` — requires `attempt`, `username`
- `/auth/commons/finish` — requires `attempt`, `code`, `state`
- `/auth/login` — requires `password`, `username`
- `/auth/logout` — requires `session`
- `/auth/me` — requires `session`
- `/auth/register` — requires `password`, `username`
- `/friends/accept` — requires `session`, `request`
- `/friends/list` — requires `session`
- `/friends/reject` — requires `session`, `request`
- `/friends/remove` — requires `session`, `friendship`
- `/friends/request` — requires `session`, `username`
- `/friends/requests` — requires `session`
- `/friends/search` — requires `session`, `text`
- `/runs/cancel` — requires `session`, `run`
- `/runs/create` — requires `details`, `distance`, `location`, `pace`, `session`, `startTime`
- `/runs/flexibility` — requires `session`, `run`; fills `earliestTime` with null when absent; fills `latestTime` with null when absent; fills `maxDistance` with null when absent; fills `maxPace` with null when absent; fills `minDistance` with null when absent; fills `minPace` with null when absent
- `/runs/join` — requires `session`, `event`
- `/runs/leave` — requires `session`, `event`
- `/runs/list` — requires `session`
- `/runs/participants` — requires `session`
- `/runs/update` — requires `session`, `run`; fills `distance` with null when absent; fills `location` with null when absent; fills `pace` with null when absent; fills `startTime` with null when absent
- `/suggestions/accept` — requires `session`, `suggestion`
- `/suggestions/create` — requires `session`, `event`, `change`
- `/suggestions/list` — requires `session`
- `/suggestions/reject` — requires `session`, `suggestion`
- `/suggestions/withdraw` — requires `session`, `suggestion`
