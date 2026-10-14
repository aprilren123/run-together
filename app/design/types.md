# Application types

RunTogether identifies every user by their Registering user, uses runs as the events users can join or suggest changes to, and uses proposed run changes to represent adjustments to run details.

Every account in RunTogether is a Registering user, whether it signed up with a password or signed in with Commons. That user is the one who has a password in Authenticating, the one a Commons account is linked to in CommonsFederating, and the one a session belongs to in Sessioning. CommonsFederating is Federating with Commons as the other site.

That same user owns runs in RunPlanning, participates in Joining, suggests and decides in ChangeSuggesting, and sends, receives, and holds friendships in Friending. Every RunTogether endpoint reads the acting user from `Sessioning.use`, never from the request, and people refer to each other only by username, which `Registering._byUsername` turns into a user. The [RunTogether composition](compositions/RunTogether.md) describes how.

```types
concrete RunChange
  A proposed change to one or more details of a run.
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
```
