# Concept Design

## RunPlanning [User]

**concept** RunPlanning [User]

**purpose** make a runner's future intent explicit while preserving how much of the plan is flexible

**principle** a user creates a run with the time, distance, pace, and location they plan to run and may specify acceptable ranges around the time, distance, and pace; they can later update the planned details or flexibility, or cancel the run

**state** \
&ensp;a set of Runs with \
&ensp;&ensp;an owner User \
&ensp;&ensp;a startTime DateTime \
&ensp;&ensp;a distance Number \
&ensp;&ensp;a pace Number \
&ensp;&ensp;a location String \
&ensp;&ensp;an optional earliestTime DateTime \
&ensp;&ensp;a optional latestTime DateTime \
&ensp;&ensp;a optional minDistance Number \
&ensp;&ensp;a optional maxDistance Number \
&ensp;&ensp;a optional minPace Number \
&ensp;&ensp;a optional maxPace Number

&ensp;**Rule:** distance > 0 \
&ensp;**Rule:** pace > 0 \
&ensp;**Rule:** earliestTime and latestTime are either both present or both absent \
&ensp;**Rule:** if earliestTime and latestTime are present, earliestTime <= startTime <= latestTime \
&ensp;**Rule:** minDistance and maxDistance are either both present or both absent \
&ensp;**Rule:** if minDistance and maxDistance are present, 0 < minDistance <= distance <= maxDistance \
&ensp;**Rule:** minPace and maxPace are either both present or both absent \
&ensp;**Rule:** if minPace and maxPace are present, 0 < minPace <= pace <= maxPace

**actions**

**create**(owner: User, startTime: DateTime, distance: Number, pace: Number, location: String, earliestTime?: DateTime, latestTime?: DateTime, minDistance?: Number, maxDistance?: Number, minPace?: Number, maxPace?: Number): (run: Run) \
&ensp;**where** the resulting run satisfies all Run state rules \
&ensp;**then** create a new run with the given owner, startTime, distance, pace, location, and provided flexibility ranges

**update**(owner: User, run: Run, startTime?: DateTime, distance?: Number, pace?: Number, location?: String) \
&ensp;**where** run exists and run.owner = owner, and the resulting run after applying all provided changes satisfies all Run state rules \
&ensp;**then** update each provided planned detail of the run

**setFlexibility**(owner: User, run: Run, earliestTime?: DateTime, latestTime?: DateTime, minDistance?: Number, maxDistance?: Number, minPace?: Number, maxPace?: Number) \
&ensp;**where** run exists and run.owner = owner, and the resulting run after replacing the existing flexibility ranges with the provided ranges satisfies all Run state rules \
&ensp;**then** replace the run's existing flexibility ranges with the provided ranges. An omitted pair removes flexibility for that detail

**cancel**(owner: User, run: Run) \
&ensp;**where** run exists and run.owner = owner \
&ensp;**then** remove the run

## Joining [User, Event]

**concept** Joining [User, Event]

**purpose** establish who intends to participate in an event

**principle** after a user joins an event, they are a participant in that event until they leave

**state** \
&ensp;a set of Participations with \
&ensp;&ensp;a user User \
&ensp;&ensp;an event Event \
&ensp;&ensp;unique user and event

**actions** 

**join**(user: User, event: Event) \
&ensp;**where** the user has not already joined the event \
&ensp;**then** add a Participation for the user and event

**leave**(user: User, event: Event) \
&ensp;**where** the user has joined the event \
&ensp;**then** remove the Participation for the user and event

## ChangeSuggesting [User, Event, Change]

**concept** ChangeSuggesting [User, Event, Change]

**purpose** enable users to negotiate adjustments to an event while preserving the decider's control over whether those adjustments are made

**principle** a user suggests a change to an event for a designated decider; the suggestion remains pending until the decider accepts or rejects it or the suggester withdraws it

SuggestionStatus is PENDING or ACCEPTED or REJECTED or WITHDRAWN

**state** \
&ensp;a set of Suggestions with \
&ensp;&ensp;a suggester User \
&ensp;&ensp;a decider User \
&ensp;&ensp;an event Event \
&ensp;&ensp;a change Change \
&ensp;&ensp;a status SuggestionStatus

**actions**

**suggest**(suggester: User, decider: User, event: Event, change: Change): (suggestion: Suggestion) \
&ensp;**where** suggester != decider \
&ensp;**then** create a suggestion with the given suggester, decider, event, and change, and status PENDING

**accept**(decider: User, suggestion: Suggestion): (event: Event, change: Change, suggester: User) \
&ensp;**where** suggestion exists and suggestion.decider = decider and suggestion.status = PENDING \
&ensp;**then** set suggestion.status to ACCEPTED and return suggestion.event, suggestion.change, and suggestion.suggester

**reject**(decider: User, suggestion: Suggestion) \
&ensp;**where** suggestion exists and suggestion.decider = decider and suggestion.status = PENDING \
&ensp;**then** set suggestion.status to REJECTED

**withdraw**(suggester: User, suggestion: Suggestion) \
&ensp;**where** suggestion exists and suggestion.suggester = suggester and suggestion.status = PENDING \
&ensp;**then** set suggestion.status to WITHDRAWN

## Friending [User]

**concept** Friending [User]

**purpose** enable interactions that require mutual agreement between users

**principle** after one user sends another user a friend request, they become friends if the recipient accepts it, and remain friends until either user removes the friendship

**state** \
&ensp;a set of FriendRequests with \
&ensp;&ensp;a sender User \
&ensp;&ensp;a recipient User \
&ensp;&ensp;unique sender and recipient

&ensp;a set of Friendships with \
&ensp;&ensp;a user1 User \
&ensp;&ensp;a user2 User \
&ensp;&ensp;unique user1 and user2

&ensp;**Rule:** the two users in a Friendship are different \
&ensp;**Rule:** at most one Friendship exists between any pair of users, regardless of order

**actions**

**request**(sender: User, recipient: User): (request: FriendRequest) \
&ensp;**where** sender != recipient, no FriendRequest exists between sender and recipient in either direction, and no Friendship exists between sender and recipient \
&ensp;**then** create a FriendRequest from sender to recipient

**accept**(recipient: User, request: FriendRequest) \
&ensp;**where** request exists and request.recipient = recipient \
&ensp;**then** remove the request and create a Friendship between request.sender and recipient

**reject**(recipient: User, request: FriendRequest) \
&ensp;**where** request exists and request.recipient = recipient \
&ensp;**then** remove the request

**remove**(user: User, friendship: Friendship) \
&ensp;**where** friendship exists and user is one of the users in the friendship \
&ensp;**then** remove the friendship

## Essential reactions

**reaction** suggestChange \
&ensp;**when** Requesting.suggestChange(suggester, owner, run, change) \
&ensp;**then** ChangeSuggesting.suggest(suggester, decider: owner, event: run, change)

**reaction** applyAcceptedChange \
&ensp;**when** ChangeSuggesting.accept(decider, suggestion): (event, change, suggester) \
&ensp;**then** RunPlanning.update(owner: decider, run: event, startTime: change.startTime, distance: change.distance, pace: change.pace, location: change.location)

**reaction** joinAfterAcceptedChange \
&ensp;**when** ChangeSuggesting.accept(decider, suggestion): (event, change, suggester) \
&ensp;**then** Joining.join(user: suggester, event)

## Note

`RunPlanning` represents the runs that users are planning to do. It stores the runner's current plan along with how flexible they are willing to be about the time, distance, and pace. This keeps the details of the run itself separate from the social interactions that happen around it.

`Joining` keeps track of who is participating in a run. In `RunTogether`, its generic `Event` parameter is instantiated with `RunPlanning.Run`. Keeping this separate from `RunPlanning` means that a run can exist on its own, while friends can independently join or leave it.

`ChangeSuggesting` handles cases where a friend's run almost works for someone, but they would need one of the details to change before joining. Its `Event` parameter is instantiated with `RunPlanning.Run`, and `Change` is instantiated as a proposed run change containing optional startTime, distance, pace, and location fields, which map directly to the optional parameters of `RunPlanning.update`. The run's owner is used as the suggestion's decider. Making a suggestion means that the user wants to join the run if their proposed change is accepted. If the owner accepts it, reactions update the run and add the suggester as a participant. This allows friends to adjust a shared plan without giving them direct control over someone else's run.


`Friending` keeps track of mutual relationships between users. `RunTogether` uses friendships to determine whose upcoming runs a user can discover. Keeping this separate from `RunPlanning` means that the run itself does not need to keep track of who is allowed to see or interact with it.

Together, these concepts separate the runner's plan, participation in the run, negotiation over possible changes, and relationships between users. They work together to let an individual run naturally become a shared run when friends want to join, without requiring someone to organize a separate group event.