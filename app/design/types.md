# Application types

RunTogether identifies every user by their Registering user, uses runs as the events users can join or suggest changes to, and uses proposed run changes to represent adjustments to run details.

Every account in RunTogether is a Registering user, whether it signed up with a password or signed in with Commons. That user is the one who has a password in Authenticating, the one a Commons account is linked to in CommonsFederating, and the one a session belongs to in Sessioning. CommonsFederating is Federating with Commons as the other site.

That same user owns runs in RunPlanning, participates in Joining, suggests and decides in ChangeSuggesting, and sends, receives, and holds friendships in Friending. Every RunTogether endpoint reads the acting user from `Sessioning.use`, never from the request, and people refer to each other only by username, which `Registering._byUsername` turns into a user. The [RunTogether composition](compositions/RunTogether.md) describes how. People involved in a run are told about changes to it through Notifying, as the [Notifications composition](compositions/Notifications.md) describes. People who can see a run can talk about it informally in Commenting, as the [Comments composition](compositions/Comments.md) describes; a formal change to the run is still a ChangeSuggesting suggestion. A run's owner can invite friends to it in Inviting, and accepting joins the run in Joining, as the [Invitations composition](compositions/Invitations.md) describes.

```types
concrete RunChange
  A proposed change to one or more of a run's start time, meeting point, distance, pace, and description.

concrete NotificationKind
  What happened to a run someone is involved in: a change was suggested to it, it was edited or canceled, a suggestion for it was accepted or rejected, or its owner invited them to it.
```

```instances
instantiate Registering

instantiate Authenticating with
  User is Registering.User

instantiate Federating as CommonsFederating with
  User is Registering.User

instantiate Sessioning with
  Subject is Registering.User

instantiate RunPlanning with
  User is Registering.User

instantiate Joining with
  User is Registering.User
  Event is RunPlanning.Run

instantiate ChangeSuggesting with
  User is Registering.User
  Event is RunPlanning.Run
  Change is RunChange

instantiate Friending with
  User is Registering.User

instantiate Notifying with
  Recipient is Registering.User
  Actor is Registering.User
  Subject is RunPlanning.Run
  Kind is NotificationKind

instantiate Commenting with
  Author is Registering.User
  Target is RunPlanning.Run

instantiate Inviting with
  User is Registering.User
  Event is RunPlanning.Run
```
