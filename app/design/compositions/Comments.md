# Comments

People who can see a run can talk about it informally, in short comments under its details. A comment is a Commenting comment whose author is the session's user and whose target is the run. Comments are for conversation, such as "Running a bit late" or "Can we meet at the boathouse?". A change to the run itself is still a ChangeSuggesting suggestion, which the owner accepts or rejects; a comment changes nothing about the run.

Whoever [can see the run](view:RunTogether.canSee), its owner, a friend of the owner, or someone who joined it, can [list its comments](reaction:comments.reading.ListComments) using [the comment list](former:comments.reading.CommentList), oldest first, each with its author's username, its text, and when it was written. Anyone else is refused with `RUN_NOT_FOUND`, the same answer as for a run that doesn't exist, so the refusal reveals nothing about strangers' runs.

```endpoints
comments.reading.ListComments at /comments/list
```

The same people can [post a comment](reaction:comments.writing.PostComment) while the run is on; Commenting refuses an empty comment or one over 500 characters with `INVALID_COMMENT`, and the same comment again within a minute, such as from a double click, with `DUPLICATE_COMMENT`. A canceled run keeps its comments, but posting to it is refused with `RUN_CANCELED`.

An author can [delete a comment](reaction:comments.writing.DeleteComment) they wrote. A run's owner, who [owns the run a comment is on](view:comments.access.moderates), can also remove anyone else's comment on their run, by Commenting's `remove`. Anyone else is refused with `COMMENT_NOT_FOUND`. Each of these reads the one comment the request names, through [the author and run of a comment](view:comments.access.commentInfo).

```endpoints
comments.writing.PostComment at /comments/post
comments.writing.DeleteComment at /comments/delete
```
