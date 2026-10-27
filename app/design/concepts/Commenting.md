# Commenting

## Purpose

Let people talk informally about something they share, in short remarks everyone there can read.

*Prevents:* a remark sent twice by a double click; an empty or very long remark.

## Principle

Jamie comments "Can we meet at the boathouse instead?" on Morgan's run, and then Taylor comments "I'm in!". Anyone reading the run's comments sees both, oldest first, each with who wrote it and when. Jamie deletes her comment, and only Taylor's is left. Taylor can't delete Jamie's comments, but whoever looks after the run can remove any comment on it.

## Types

```types
external Author
  The person who writes a comment.

external Target
  What the comment is about.
```

## State

```state
a set of Comments with
  an Author
  a Target
  a text String
  an at DateTime

Rule: a comment's text has 1 to 500 characters, with no leading or trailing spaces.
```

## Actions

```actions
post(author: Author, target: Target, text: String) : returns (comment: Comment)
  where text, without leading and trailing spaces, has 1 to 500 characters, and author has no comment on target with that text from the last 60 seconds
  then
    add a new comment by author on target with text, without leading and trailing spaces, at now
    returns comment
  where text, without leading and trailing spaces, is empty or has more than 500 characters
  then
    refuses INVALID_COMMENT "A comment must have 1 to 500 characters."
  where author has a comment on target with that text from the last 60 seconds
  then
    refuses DUPLICATE_COMMENT "You just posted that comment."

delete(author: Author, comment: Comment) : returns (comment: Comment)
  where comment is in Comments and comment has author
  then
    remove comment
    returns comment
  where comment is not in Comments or comment does not have author
  then
    refuses CANNOT_DELETE "This comment can't be deleted."

remove(comment: Comment) : returns (comment: Comment)
  where comment is in Comments
  then
    remove comment
    returns comment
  where comment is not in Comments
  then
    refuses COMMENT_NOT_FOUND "There is no such comment."
```

## Queries

```queries
_on(target: Target) : many (comment: Comment, author: Author, text: String, at: DateTime)
  Answers the comments on target, oldest first, and no rows when there are none.

_get(comment: Comment) : optional (author: Author, target: Target)
  Answers who wrote comment and what it is on, or no row for an unknown comment.
```
