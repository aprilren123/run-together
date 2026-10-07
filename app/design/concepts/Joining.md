# Joining

## Purpose

Establish who intends to participate in an event.

## Principle

After a user joins an event, they are a participant in that event until they leave.

## Types

```types
external User
  The user who participates in an event.

external Event
  The event the user participates in.
```

## State

```state
a set of Participations with
  a User
  an Event
  Rule: each User and Event pair is unique
```

## Actions

```actions
join(user: User, event: Event) : returns (participation: Participation)
  where user has not already joined event
  then
    add a new participation with user and event
    returns participation
  where user has already joined event
  then
    refuses ALREADY_JOINED "The user has already joined this event."

leave(user: User, event: Event) : returns (participation: Participation)
  where a participation exists with user and event
  then
    remove participation
    returns participation
  where no participation exists with user and event
  then
    refuses NOT_JOINED "The user has not joined this event."
```

## Queries

```queries
_all() : many (participation: Participation, user: User, event: Event)
  Answers every participation, and no rows when there are none.
```