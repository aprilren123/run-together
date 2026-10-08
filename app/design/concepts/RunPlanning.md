# RunPlanning

## Purpose

Make a runner's future intent explicit while preserving how much of the plan is flexible.

## Principle

A user creates a run with the time, distance, pace, and location they plan to run and may specify acceptable ranges around the time, distance, and pace. They can later update the planned details or flexibility, or cancel the run.

## Types

```types
external User
  The user who owns and plans the run.
```

## State

```state
a set of Runs with
  an owner User
  a startTime String
  a distance Number
  a pace Number
  a location String
  an optional earliestTime String
  an optional latestTime String
  an optional minDistance Number
  an optional maxDistance Number
  an optional minPace Number
  an optional maxPace Number
  a details String
  Rule: distance is greater than 0
  Rule: pace is greater than 0
```

## Actions

```actions
create(owner: User, startTime: String, distance: Number, pace: Number, location: String, details: String) : returns (run: Run)
  where the provided run details are valid
  then
    add a new run with owner, startTime, distance, pace, location, and details
    returns run
  where the provided run details are invalid
  then
    refuses INVALID_RUN "The run details or flexibility ranges are invalid."

update(owner: User, run: Run, startTime?: String, distance?: Number, pace?: Number, location?: String) : returns (run: Run)
  where run is in Runs, run has owner, and the resulting run details are valid
  then
    update run with the provided startTime, distance, pace, and location
    returns run
  where run is not in Runs or run does not have owner
  then
    refuses NOT_OWNER "The run does not exist or does not belong to this user."
  where the resulting run details are invalid
  then
    refuses INVALID_RUN "The updated run details are invalid."

setFlexibility(owner: User, run: Run, earliestTime?: String, latestTime?: String, minDistance?: Number, maxDistance?: Number, minPace?: Number, maxPace?: Number) : returns (run: Run)
  where run is in Runs, run has owner, and the resulting flexibility ranges are valid
  then
    update run with earliestTime, latestTime, minDistance, maxDistance, minPace, and maxPace
    returns run
  where run is not in Runs or run does not have owner
  then
    refuses NOT_OWNER "The run does not exist or does not belong to this user."
  where the resulting flexibility ranges are invalid
  then
    refuses INVALID_FLEXIBILITY "The flexibility ranges are invalid."

cancel(owner: User, run: Run) : returns (run: Run)
  where run is in Runs and run has owner
  then
    remove run
    returns run
  where run is not in Runs or run does not have owner
  then
    refuses NOT_OWNER "The run does not exist or does not belong to this user."
```

## Queries

```queries
_all() : many (run: Run, owner: User, startTime: String, distance: Number, pace: Number, location: String, details: String, earliestTime?: String, latestTime?: String, minDistance?: Number, maxDistance?: Number, minPace?: Number, maxPace?: Number)
  Answers every run, and no rows when there are none.
```
