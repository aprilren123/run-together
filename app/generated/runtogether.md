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

- `Authenticating` — instance of `Authenticating` — [Application types](../design/types.md), line 20.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 21.

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

- `ChangeSuggesting` — instance of `ChangeSuggesting` — [Application types](../design/types.md), line 36.
  - `Change` is `RunChange` — [Application types](../design/types.md), line 39.
  - `Event` is `RunPlanning.Run` — [Application types](../design/types.md), line 38.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 37.

### Commenting

Defined in [Commenting](../design/concepts/Commenting.md), line 1.

#### Actions

- `post(author: Author, target: Target, text: String) : returns (comment: Comment)`
  - Refuses `INVALID_COMMENT`: A comment must have 1 to 500 characters.
  - Refuses `DUPLICATE_COMMENT`: You just posted that comment.
- `delete(author: Author, comment: Comment) : returns (comment: Comment)`
  - Refuses `CANNOT_DELETE`: This comment can't be deleted.
- `remove(comment: Comment) : returns (comment: Comment)`
  - Refuses `COMMENT_NOT_FOUND`: There is no such comment.

#### Queries

- `_on(target: Target) : many (comment: Comment, author: Author, text: String, at: DateTime)`
- `_get(comment: Comment) : optional (author: Author, target: Target)`

#### Instances

- `Commenting` — instance of `Commenting` — [Application types](../design/types.md), line 50.
  - `Author` is `Registering.User` — [Application types](../design/types.md), line 51.
  - `Target` is `RunPlanning.Run` — [Application types](../design/types.md), line 52.

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

- `CommonsFederating` — instance of `Federating` — [Application types](../design/types.md), line 23.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 24.

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

- `Friending` — instance of `Friending` — [Application types](../design/types.md), line 41.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 42.

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

- `Joining` — instance of `Joining` — [Application types](../design/types.md), line 32.
  - `Event` is `RunPlanning.Run` — [Application types](../design/types.md), line 34.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 33.

### Notifying

Defined in [Notifying](../design/concepts/Notifying.md), line 1.

#### Actions

- `notify(recipient: Recipient, actor: Actor, subject: Subject, kind: Kind) : returns (notification: Notification)`
- `markRead(recipient: Recipient, notification: Notification) : returns (notification: Notification)`
  - Refuses `NOT_FOUND`: There is no such notification.
- `markAllRead(recipient: Recipient) : returns (recipient: Recipient)`

#### Queries

- `_for(recipient: Recipient) : many (notification: Notification, actor: Actor, subject: Subject, kind: Kind, at: DateTime, read: Flag)`

#### Instances

- `Notifying` — instance of `Notifying` — [Application types](../design/types.md), line 44.
  - `Actor` is `Registering.User` — [Application types](../design/types.md), line 46.
  - `Kind` is `NotificationKind` — [Application types](../design/types.md), line 48.
  - `Recipient` is `Registering.User` — [Application types](../design/types.md), line 45.
  - `Subject` is `RunPlanning.Run` — [Application types](../design/types.md), line 47.

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

- `Registering` — instance of `Registering` — [Application types](../design/types.md), line 18.

### RunPlanning

Defined in [RunPlanning](../design/concepts/RunPlanning.md), line 1.

#### Actions

- `create(owner: User, startTime: String, distance: Number, pace: Number, location: String, details: String) : returns (run: Run)`
  - Refuses `INVALID_RUN`: The run details or flexibility ranges are invalid.
- `update(owner: User, run: Run, startTime?: String, distance?: Number, pace?: Number, location?: String, details?: String) : returns (run: Run)`
  - Refuses `NOT_OWNER`: The run does not exist or does not belong to this user.
  - Refuses `RUN_CANCELED`: This run has been canceled.
  - Refuses `INVALID_RUN`: The updated run details are invalid.
- `setFlexibility(owner: User, run: Run, earliestTime?: String, latestTime?: String, minDistance?: Number, maxDistance?: Number, minPace?: Number, maxPace?: Number) : returns (run: Run)`
  - Refuses `NOT_OWNER`: The run does not exist or does not belong to this user.
  - Refuses `RUN_CANCELED`: This run has been canceled.
  - Refuses `INVALID_FLEXIBILITY`: The flexibility ranges are invalid.
- `cancel(owner: User, run: Run) : returns (run: Run)`
  - Refuses `NOT_OWNER`: The run does not exist or does not belong to this user.
  - Refuses `RUN_CANCELED`: This run has been canceled.

#### Queries

- `_all() : many (run: Run, owner: User, startTime: String, distance: Number, pace: Number, location: String, details: String, earliestTime: String, latestTime: String, minDistance: Number, maxDistance: Number, minPace: Number, maxPace: Number, status: RunStatus)`
- `_fits(run: Run, startTime?: String, distance?: Number, pace?: Number, location?: String, details?: String) : one (fits: Flag)`

#### Instances

- `RunPlanning` — instance of `RunPlanning` — [Application types](../design/types.md), line 29.
  - `User` is `Registering.User` — [Application types](../design/types.md), line 30.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (subject: Subject)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.
- `end(session: Session) : returns (session: Session)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.

#### Instances

- `Sessioning` — instance of `Sessioning` — [Application types](../design/types.md), line 26.
  - `Subject` is `Registering.User` — [Application types](../design/types.md), line 27.

## Application types

Concrete types:

- `NotificationKind` — [Application types](../design/types.md), line 13.
- `RunChange` — [Application types](../design/types.md), line 10.

## Computations

- `readRunChange(change: RunChange) : RunChange` — [RunTogether](../design/compositions/RunTogether.md), line 50.

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

### (user) is a friend of the owner of (run)

Authored path: `RunTogether.friendsRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 5.

```view
(user) is a friend of the owner of (run) — inputs (user, run); outputs (); bindings (owner)
  where
    RunPlanning._all () has (owner, run)
    view "(user) is friends with (other)" with (other: owner, user)
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

### (user) joined (run)

Authored path: `RunTogether.joined`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 5.

```view
(user) joined (run) — inputs (user, run); outputs (); bindings ()
  where Joining._all () has (event: run, user)
```

### the author and run of (comment)

Authored path: `comments.access.commentInfo`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.

```view
the author and run of (comment) — inputs (comment); outputs (author, run); bindings () — answers any number of (author, run)
  where Commenting._get (comment) has (author, target: run)
```

### the owner and status of (run)

Authored path: `RunTogether.runInfo`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 5.

```view
the owner and status of (run) — inputs (run); outputs (owner, status); bindings () — answers any number of (owner, status)
  where RunPlanning._all () has (owner, run, status)
```

### (user) owns the run of (comment)

Authored path: `comments.access.moderates`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.

```view
(user) owns the run of (comment) — inputs (user, comment); outputs (); bindings (run)
  where
    view "the author and run of (comment)" with (comment) has (run)
    view "the owner and status of (run)" with (run) has (owner: user)
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
- Covered by [Comments](../design/compositions/Comments.md), line 5.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 5.

```view
(viewer) can see (run) — inputs (viewer, run); outputs (); bindings (owner)
  where RunPlanning._all () has (owner: viewer, run)
  where
    RunPlanning._all () has (owner, run)
    view "(user) is friends with (other)" with (other: owner, user: viewer)
  where view "(user) joined (run)" with (run, user: viewer)
```

### the people and run of (suggestion)

Authored path: `RunTogether.suggestionInfo`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 5.

```view
the people and run of (suggestion) — inputs (suggestion); outputs (suggester, decider, event, change); bindings () — answers any number of (suggester, decider, event, change)
  where ChangeSuggesting._all () has (change, decider, event, suggester, suggestion)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the comments on (run)

Authored path: `comments.reading.CommentList`.
- Covered by [Comments](../design/compositions/Comments.md), line 5.

```former
Former "the comments on (run)" — inputs (run); bindings (comment, author, authorName, text, at); promises exactly one record — forms:
  a record of
    comments: each Commenting._on (target: run) has (at, author, comment, text)
      where Registering._username (user: author) has (username: authorName)
      form a record of
        at
        author: authorName
        comment
        text
```

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

### the notifications of (user)

Authored path: `notifications.reading.NotificationList`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.

```former
Former "the notifications of (user)" — inputs (user); bindings (notification, actor, actorName, subject, kind, at, read, startTime); promises exactly one record — forms:
  a record of
    notifications: each Notifying._for (recipient: user) has (actor, at, kind, notification, read, subject)
      where Registering._username (user: actor) has (username: actorName)
      where whether RunPlanning._all () has (run: subject, startTime)
      form a record of
        actor: actorName
        at
        kind
        notification
        read
        run: subject
        startTime
```

### the participant list for (viewer)

Authored path: `RunTogether.ParticipantList`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.

```former
Former "the participant list for (viewer)" — inputs (viewer); bindings (participation, user, username, run); promises exactly one record — forms:
  a record of
    participations: each Joining._all () has (event: run, participation, user)
      where view "(viewer) can see (run)" with (run, viewer)
      where Registering._username (user) has (username)
      form a record of
        event: run
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
Former "the run list for (user)" — inputs (user); bindings (run, owner, ownerName, startTime, distance, pace, location, details, earliestTime, latestTime, minDistance, maxDistance, minPace, maxPace, status); promises exactly one record — forms:
  a record of
    runs: each RunPlanning._all () has (details, distance, earliestTime, latestTime, location, maxDistance, maxPace, minDistance, minPace, owner, pace, run, startTime, status)
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
        status
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

### RunTogether.AcceptSuggestion:canceled#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
  view "the people and run of (suggestion)" with (suggestion) has (decider, event, suggester)
  view "(user) is friends with (other)" with (other: suggester, user: decider)
  view "the owner and status of (run)" with (run: event) has (status: "CANCELED")
then
  RequestBoundary.respond (error: "RUN_CANCELED", requestId)
```

### RunTogether.AcceptSuggestion:doesnt-fit#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
  view "the people and run of (suggestion)" with (suggestion) has (change, decider, event, suggester)
  view "(user) is friends with (other)" with (other: suggester, user: decider)
  view "the owner and status of (run)" with (run: event) has (status: "ACTIVE")
  (details, distance, location, pace, startTime, valid: true) is readRunChange (change)
  RunPlanning._fits (details, distance, location, pace, run: event, startTime) has (fits: false)
then
  RequestBoundary.respond (error: "CHANGE_DOESNT_FIT", requestId)
```

### RunTogether.AcceptSuggestion:friend#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
  view "the people and run of (suggestion)" with (suggestion) has (change, decider, event, suggester)
  view "(user) is friends with (other)" with (other: suggester, user: decider)
  view "the owner and status of (run)" with (run: event) has (status: "ACTIVE")
  (details, distance, location, pace, startTime, valid: true) is readRunChange (change)
  RunPlanning._fits (details, distance, location, pace, run: event, startTime) has (fits: true)
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

### RunTogether.AcceptSuggestion:invalid#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
  view "the people and run of (suggestion)" with (suggestion) has (change, decider, event, suggester)
  view "(user) is friends with (other)" with (other: suggester, user: decider)
  view "the owner and status of (run)" with (run: event) has (status: "ACTIVE")
  (valid: false) is readRunChange (change)
then
  RequestBoundary.respond (error: "INVALID_CHANGE", requestId)
```

### RunTogether.AcceptSuggestion:no-run#2

Authored path: `RunTogether.AcceptSuggestion`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 43.

```reaction
when Sessioning.use (session, subject: decider), asked by RunTogether.AcceptSuggestion
where
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
  view "the people and run of (suggestion)" with (suggestion) has (decider, event, suggester)
  view "(user) is friends with (other)" with (other: suggester, user: decider)
  no RunPlanning._all () has (run: event)
then
  RequestBoundary.respond (error: "RUN_NOT_FOUND", requestId)
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
  earlier, RequestBoundary.request (path: "/suggestions/accept", requestId, session, suggestion)
  view "the people and run of (suggestion)" with (suggestion) has (decider, suggester)
  no view "(user) is friends with (other)" with (other: suggester, user: decider)
then
  RequestBoundary.respond (error: "NOT_FRIENDS", requestId)
```

### RunTogether.AcceptedSuggestionJoinsSuggester

Authored path: `RunTogether.AcceptedSuggestionJoinsSuggester`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event, suggester)
where
  no Joining._all () has (event, user: suggester)
then
  Joining.join (event, user: suggester)
```

### RunTogether.AcceptedSuggestionUpdatesRun

Authored path: `RunTogether.AcceptedSuggestionUpdatesRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.

```reaction
when ChangeSuggesting.accept (decider, suggestion, change, event, suggester)
where
  (details, distance, location, pace, startTime, valid: true) is readRunChange (change)
then
  RunPlanning.update (details, distance, location, owner: decider, pace, run: event, startTime)
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

### RunTogether.JoinRun:canceled#2

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 21.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.JoinRun
where
  earlier, RequestBoundary.request (event, path: "/runs/join", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner, status: "CANCELED")
  view "(user) is friends with (other)" with (other: owner, user)
then
  RequestBoundary.respond (error: "RUN_CANCELED", requestId)
```

### RunTogether.JoinRun:friend#2

Authored path: `RunTogether.JoinRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 16.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 21.

```reaction
when Sessioning.use (session, subject: user), asked by RunTogether.JoinRun
where
  earlier, RequestBoundary.request (event, path: "/runs/join", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner, status: "ACTIVE")
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
  no view "(user) is a friend of the owner of (run)" with (run: event, user)
  no RunPlanning._all () has (owner: user, run: event)
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
  earlier, RequestBoundary.request (event, path: "/runs/join", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner: user)
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

### RunTogether.SuggestChange:canceled#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner: decider, status: "CANCELED")
  view "(user) is friends with (other)" with (other: decider, user: suggester)
then
  RequestBoundary.respond (error: "RUN_CANCELED", requestId)
```

### RunTogether.SuggestChange:doesnt-fit#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner: decider, status: "ACTIVE")
  view "(user) is friends with (other)" with (other: decider, user: suggester)
  (details, distance, location, pace, startTime, valid: true) is readRunChange (change)
  RunPlanning._fits (details, distance, location, pace, run: event, startTime) has (fits: false)
then
  RequestBoundary.respond (error: "CHANGE_DOESNT_FIT", requestId)
```

### RunTogether.SuggestChange:friend#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner: decider, status: "ACTIVE")
  view "(user) is friends with (other)" with (other: decider, user: suggester)
  (details, distance, location, pace, startTime, valid: true) is readRunChange (change)
  RunPlanning._fits (details, distance, location, pace, run: event, startTime) has (fits: true)
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
  no view "(user) is a friend of the owner of (run)" with (run: event, user: suggester)
  no RunPlanning._all () has (owner: suggester, run: event)
then
  RequestBoundary.respond (error: "RUN_NOT_FOUND", requestId)
```

### RunTogether.SuggestChange:invalid#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner: decider, status: "ACTIVE")
  view "(user) is friends with (other)" with (other: decider, user: suggester)
  (valid: false) is readRunChange (change)
then
  RequestBoundary.respond (error: "INVALID_CHANGE", requestId)
```

### RunTogether.SuggestChange:owner#2

Authored path: `RunTogether.SuggestChange`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 39.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 42.

```reaction
when Sessioning.use (session, subject: suggester), asked by RunTogether.SuggestChange
where
  earlier, RequestBoundary.request (change, event, path: "/suggestions/create", requestId, session)
  view "the owner and status of (run)" with (run: event) has (owner: suggester)
then
  RequestBoundary.respond (error: "OWN_RUN", requestId)
```

### RunTogether.UpdateRun

Authored path: `RunTogether.UpdateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 11.

```reaction
when RequestBoundary.request (details, distance, location, pace, path: "/runs/update", requestId, run, session, startTime)
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
  earlier, RequestBoundary.request (details, distance, location, pace, path: "/runs/update", requestId, run, session, startTime)
then
  RunPlanning.update (details, distance, location, owner, pace, run, startTime)
```

### RunTogether.UpdateRun#3

Authored path: `RunTogether.UpdateRun`.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 7.
- Covered by [RunTogether](../design/compositions/RunTogether.md), line 11.

```reaction
when RunPlanning.update (details, distance, location, owner, pace, run, startTime), asked by RunTogether.UpdateRun#2
where
  earlier, RequestBoundary.request (details, distance, location, pace, path: "/runs/update", requestId, run, session, startTime)
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

### comments.reading.ListComments

Authored path: `comments.reading.ListComments`.
- Covered by [Comments](../design/compositions/Comments.md), line 5.
- Covered by [Comments](../design/compositions/Comments.md), line 8.

```reaction
when RequestBoundary.request (path: "/comments/list", requestId, run, session)
then
  Sessioning.use (session)
```

### comments.reading.ListComments:hidden#2

Authored path: `comments.reading.ListComments`.
- Covered by [Comments](../design/compositions/Comments.md), line 5.
- Covered by [Comments](../design/compositions/Comments.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by comments.reading.ListComments
where
  earlier, RequestBoundary.request (path: "/comments/list", requestId, run, session)
  no view "(viewer) can see (run)" with (run, viewer: user)
then
  RequestBoundary.respond (error: "RUN_NOT_FOUND", requestId)
```

### comments.reading.ListComments:visible#2

Authored path: `comments.reading.ListComments`.
- Covered by [Comments](../design/compositions/Comments.md), line 5.
- Covered by [Comments](../design/compositions/Comments.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by comments.reading.ListComments
where
  earlier, RequestBoundary.request (path: "/comments/list", requestId, run, session)
  view "(viewer) can see (run)" with (run, viewer: user)
then
  RequestBoundary.respond (comments: former "the comments on (run)" with (run), requestId)
```

### comments.writing.DeleteComment

Authored path: `comments.writing.DeleteComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.
- Covered by [Comments](../design/compositions/Comments.md), line 17.

```reaction
when RequestBoundary.request (comment, path: "/comments/delete", requestId, session)
then
  Sessioning.use (session)
```

### comments.writing.DeleteComment:author#2

Authored path: `comments.writing.DeleteComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.
- Covered by [Comments](../design/compositions/Comments.md), line 17.

```reaction
when Sessioning.use (session, subject: user), asked by comments.writing.DeleteComment
where
  earlier, RequestBoundary.request (comment, path: "/comments/delete", requestId, session)
  view "the author and run of (comment)" with (comment) has (author: user)
then
  Commenting.delete (author: user, comment)
```

### comments.writing.DeleteComment:author#3

Authored path: `comments.writing.DeleteComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.
- Covered by [Comments](../design/compositions/Comments.md), line 17.

```reaction
when Commenting.delete (author: user, comment), asked by comments.writing.DeleteComment:author#2
where
  earlier, RequestBoundary.request (comment, path: "/comments/delete", requestId, session)
then
  RequestBoundary.respond (comment, requestId)
```

### comments.writing.DeleteComment:other#2

Authored path: `comments.writing.DeleteComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.
- Covered by [Comments](../design/compositions/Comments.md), line 17.

```reaction
when Sessioning.use (session, subject: user), asked by comments.writing.DeleteComment
where
  earlier, RequestBoundary.request (comment, path: "/comments/delete", requestId, session)
  no view "the author and run of (comment)" with (comment) has (author: user)
  no view "(user) owns the run of (comment)" with (comment, user)
then
  RequestBoundary.respond (error: "COMMENT_NOT_FOUND", requestId)
```

### comments.writing.DeleteComment:owner#2

Authored path: `comments.writing.DeleteComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.
- Covered by [Comments](../design/compositions/Comments.md), line 17.

```reaction
when Sessioning.use (session, subject: user), asked by comments.writing.DeleteComment
where
  earlier, RequestBoundary.request (comment, path: "/comments/delete", requestId, session)
  view "(user) owns the run of (comment)" with (comment, user)
  no view "the author and run of (comment)" with (comment) has (author: user)
then
  Commenting.remove (comment)
```

### comments.writing.DeleteComment:owner#3

Authored path: `comments.writing.DeleteComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 13.
- Covered by [Comments](../design/compositions/Comments.md), line 17.

```reaction
when Commenting.remove (comment), asked by comments.writing.DeleteComment:owner#2
where
  earlier, RequestBoundary.request (comment, path: "/comments/delete", requestId, session)
then
  RequestBoundary.respond (comment, requestId)
```

### comments.writing.PostComment

Authored path: `comments.writing.PostComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 11.
- Covered by [Comments](../design/compositions/Comments.md), line 16.

```reaction
when RequestBoundary.request (path: "/comments/post", requestId, run, session, text)
then
  Sessioning.use (session)
```

### comments.writing.PostComment:canceled#2

Authored path: `comments.writing.PostComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 11.
- Covered by [Comments](../design/compositions/Comments.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by comments.writing.PostComment
where
  earlier, RequestBoundary.request (path: "/comments/post", requestId, run, session, text)
  view "(viewer) can see (run)" with (run, viewer: user)
  view "the owner and status of (run)" with (run) has (status: "CANCELED")
then
  RequestBoundary.respond (error: "RUN_CANCELED", requestId)
```

### comments.writing.PostComment:hidden#2

Authored path: `comments.writing.PostComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 11.
- Covered by [Comments](../design/compositions/Comments.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by comments.writing.PostComment
where
  earlier, RequestBoundary.request (path: "/comments/post", requestId, run, session, text)
  no view "(viewer) can see (run)" with (run, viewer: user)
then
  RequestBoundary.respond (error: "RUN_NOT_FOUND", requestId)
```

### comments.writing.PostComment:open#2

Authored path: `comments.writing.PostComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 11.
- Covered by [Comments](../design/compositions/Comments.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by comments.writing.PostComment
where
  earlier, RequestBoundary.request (path: "/comments/post", requestId, run, session, text)
  view "(viewer) can see (run)" with (run, viewer: user)
  view "the owner and status of (run)" with (run) has (status: "ACTIVE")
then
  Commenting.post (author: user, target: run, text)
```

### comments.writing.PostComment:open#3

Authored path: `comments.writing.PostComment`.
- Covered by [Comments](../design/compositions/Comments.md), line 11.
- Covered by [Comments](../design/compositions/Comments.md), line 16.

```reaction
when Commenting.post (author: user, target: run, text, comment), asked by comments.writing.PostComment:open#2
where
  earlier, RequestBoundary.request (path: "/comments/post", requestId, run, session, text)
then
  RequestBoundary.respond (comment, requestId)
```

### notifications.reading.ListNotifications

Authored path: `notifications.reading.ListNotifications`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 12.

```reaction
when RequestBoundary.request (path: "/notifications/list", requestId, session)
then
  Sessioning.use (session)
```

### notifications.reading.ListNotifications#2

Authored path: `notifications.reading.ListNotifications`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 12.

```reaction
when Sessioning.use (session, subject: user), asked by notifications.reading.ListNotifications
where
  earlier, RequestBoundary.request (path: "/notifications/list", requestId, session)
then
  RequestBoundary.respond (notifications: former "the notifications of (user)" with (user), requestId)
```

### notifications.reading.MarkAllRead

Authored path: `notifications.reading.MarkAllRead`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 14.

```reaction
when RequestBoundary.request (path: "/notifications/read-all", requestId, session)
then
  Sessioning.use (session)
```

### notifications.reading.MarkAllRead#2

Authored path: `notifications.reading.MarkAllRead`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by notifications.reading.MarkAllRead
then
  Notifying.markAllRead (recipient: user)
```

### notifications.reading.MarkAllRead#3

Authored path: `notifications.reading.MarkAllRead`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 14.

```reaction
when Notifying.markAllRead (recipient: user), asked by notifications.reading.MarkAllRead#2
where
  earlier, RequestBoundary.request (path: "/notifications/read-all", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### notifications.reading.MarkRead

Authored path: `notifications.reading.MarkRead`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 13.

```reaction
when RequestBoundary.request (notification, path: "/notifications/read", requestId, session)
then
  Sessioning.use (session)
```

### notifications.reading.MarkRead#2

Authored path: `notifications.reading.MarkRead`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 13.

```reaction
when Sessioning.use (session, subject: user), asked by notifications.reading.MarkRead
where
  earlier, RequestBoundary.request (notification, path: "/notifications/read", requestId, session)
then
  Notifying.markRead (notification, recipient: user)
```

### notifications.reading.MarkRead#3

Authored path: `notifications.reading.MarkRead`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 9.
- Covered by [Notifications](../design/compositions/Notifications.md), line 13.

```reaction
when Notifying.markRead (notification, recipient: user), asked by notifications.reading.MarkRead#2
where
  earlier, RequestBoundary.request (notification, path: "/notifications/read", requestId, session)
then
  RequestBoundary.respond (notification, requestId)
```

### notifications.telling.AcceptanceNotifiesSuggester

Authored path: `notifications.telling.AcceptanceNotifiesSuggester`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 5.

```reaction
when ChangeSuggesting.accept (decider, suggestion, event, suggester)
then
  Notifying.notify (actor: decider, kind: "SUGGESTION_ACCEPTED", recipient: suggester, subject: event)
```

### notifications.telling.CancelNotifiesParticipants

Authored path: `notifications.telling.CancelNotifiesParticipants`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 7.

```reaction
when RunPlanning.cancel (owner, run)
where
  Joining._all () has (event: run, user: participant)
then
  Notifying.notify (actor: owner, kind: "RUN_CANCELED", recipient: participant, subject: run)
```

### notifications.telling.EditNotifiesParticipants

Authored path: `notifications.telling.EditNotifiesParticipants`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 7.

```reaction
when RunPlanning.update (owner, run)
where
  Joining._all () has (event: run, user: participant)
then
  Notifying.notify (actor: owner, kind: "RUN_EDITED", recipient: participant, subject: run)
```

### notifications.telling.RejectionNotifiesSuggester

Authored path: `notifications.telling.RejectionNotifiesSuggester`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 5.

```reaction
when ChangeSuggesting.reject (decider, suggestion)
where
  ChangeSuggesting._all () has (event, suggester, suggestion)
then
  Notifying.notify (actor: decider, kind: "SUGGESTION_REJECTED", recipient: suggester, subject: event)
```

### notifications.telling.SuggestionNotifiesOwner

Authored path: `notifications.telling.SuggestionNotifiesOwner`.
- Covered by [Notifications](../design/compositions/Notifications.md), line 5.

```reaction
when ChangeSuggesting.suggest (decider, event, suggester, suggestion)
then
  Notifying.notify (actor: suggester, kind: "SUGGESTION_RECEIVED", recipient: decider, subject: event)
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
- `/comments/delete` — requires `session`, `comment`
- `/comments/list` — requires `session`, `run`
- `/comments/post` — requires `session`, `run`, `text`
- `/friends/accept` — requires `session`, `request`
- `/friends/list` — requires `session`
- `/friends/reject` — requires `session`, `request`
- `/friends/remove` — requires `session`, `friendship`
- `/friends/request` — requires `session`, `username`
- `/friends/requests` — requires `session`
- `/friends/search` — requires `session`, `text`
- `/notifications/list` — requires `session`
- `/notifications/read` — requires `session`, `notification`
- `/notifications/read-all` — requires `session`
- `/runs/cancel` — requires `session`, `run`
- `/runs/create` — requires `details`, `distance`, `location`, `pace`, `session`, `startTime`
- `/runs/flexibility` — requires `session`, `run`; fills `earliestTime` with null when absent; fills `latestTime` with null when absent; fills `maxDistance` with null when absent; fills `maxPace` with null when absent; fills `minDistance` with null when absent; fills `minPace` with null when absent
- `/runs/join` — requires `session`, `event`
- `/runs/leave` — requires `session`, `event`
- `/runs/list` — requires `session`
- `/runs/participants` — requires `session`
- `/runs/update` — requires `session`, `run`; fills `details` with null when absent; fills `distance` with null when absent; fills `location` with null when absent; fills `pace` with null when absent; fills `startTime` with null when absent
- `/suggestions/accept` — requires `session`, `suggestion`
- `/suggestions/create` — requires `session`, `event`, `change`
- `/suggestions/list` — requires `session`
- `/suggestions/reject` — requires `session`, `suggestion`
- `/suggestions/withdraw` — requires `session`, `suggestion`
