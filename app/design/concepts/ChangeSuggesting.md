# ChangeSuggesting

## Purpose

Enable users to negotiate adjustments to an event while preserving the decider's control over whether those adjustments are made.

## Principle

A user suggests a change to an event for a designated decider. The suggestion remains pending until the decider accepts or rejects it or the suggester withdraws it.

## Types

```types
external User
  The user who suggests or decides on a change.

external Event
  The event that may be changed.

external Change
  The proposed change to the event.

SuggestionStatus is PENDING or ACCEPTED or REJECTED or WITHDRAWN
```

## State

```state
a set of Suggestions with
  a suggester User
  a decider User
  an Event
  a Change
  a SuggestionStatus
```

## Actions

```actions
suggest(suggester: User, decider: User, event: Event, change: Change) : returns (suggestion: Suggestion)
  where suggester is not decider
  then
    add a new suggestion with suggester, decider, event, change, and SuggestionStatus PENDING
    returns suggestion
  where suggester is decider
  then
    refuses SAME_USER "A user cannot suggest a change to themselves."

accept(decider: User, suggestion: Suggestion) : returns (event: Event, change: Change, suggester: User)
  where suggestion is in Suggestions, suggestion has decider, and suggestion has SuggestionStatus PENDING
  then
    update suggestion to have SuggestionStatus ACCEPTED
    returns event, change, suggester
  where suggestion is not in Suggestions or suggestion does not have decider or suggestion does not have SuggestionStatus PENDING
  then
    refuses CANNOT_ACCEPT "This suggestion cannot be accepted."

reject(decider: User, suggestion: Suggestion) : returns (suggestion: Suggestion)
  where suggestion is in Suggestions, suggestion has decider, and suggestion has SuggestionStatus PENDING
  then
    update suggestion to have SuggestionStatus REJECTED
    returns suggestion
  where suggestion is not in Suggestions or suggestion does not have decider or suggestion does not have SuggestionStatus PENDING
  then
    refuses CANNOT_REJECT "This suggestion cannot be rejected."

withdraw(suggester: User, suggestion: Suggestion) : returns (suggestion: Suggestion)
  where suggestion is in Suggestions, suggestion has suggester, and suggestion has SuggestionStatus PENDING
  then
    update suggestion to have SuggestionStatus WITHDRAWN
    returns suggestion
  where suggestion is not in Suggestions or suggestion does not have suggester or suggestion does not have SuggestionStatus PENDING
  then
    refuses CANNOT_WITHDRAW "This suggestion cannot be withdrawn."
```

## Queries

```queries
_all() : many (suggestion: Suggestion, suggester: User, decider: User, event: Event, change: Change, status: SuggestionStatus)
  Answers every suggestion, and no rows when there are none.
```
