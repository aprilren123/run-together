# Application types

RunTogether uses names to identify users, runs as the events users can join or suggest changes to, and proposed run changes to represent adjustments to run details.

```types
concrete Name
  The name of a RunTogether user.

concrete RunChange
  A proposed change to one or more details of a run.
```

```instances
instantiate RunPlanning with
  User is Name

instantiate Joining with
  User is Name
  Event is RunPlanning.Run

instantiate ChangeSuggesting with
  User is Name
  Event is RunPlanning.Run
  Change is RunChange

instantiate Friending with
  User is Name
```
