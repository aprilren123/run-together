# Notifications

People are told about changes to runs they are involved in, so they don't have to keep checking each run. Each notification is a Notifying notification: its recipient and actor are users, its subject is the run, and its kind says what happened. Nobody is told about their own action.

When a friend [suggests a change to a run](reaction:notifications.telling.SuggestionNotifiesOwner), its owner, who decides on the suggestion, is told with kind `SUGGESTION_RECEIVED`. When a suggestion is [accepted](reaction:notifications.telling.AcceptanceNotifiesSuggester) or [rejected](reaction:notifications.telling.RejectionNotifiesSuggester), the suggester is told with kind `SUGGESTION_ACCEPTED` or `SUGGESTION_REJECTED`.

When a run is [updated](reaction:notifications.telling.EditNotifiesParticipants), whether its owner edited it or accepted a suggestion, everyone who joined it is told with kind `RUN_EDITED`. When a run is [canceled](reaction:notifications.telling.CancelNotifiesParticipants), everyone who joined it is told with kind `RUN_CANCELED`. A run's owner hosts it rather than joining it, so the owner isn't told about their own edits.

A signed-in user [lists their notifications](reaction:notifications.reading.ListNotifications) using [their notification list](former:notifications.reading.NotificationList), newest first, each with the actor's username and the run's start time. They can [mark one read](reaction:notifications.reading.MarkRead), refused with `NOT_FOUND` for a notification that isn't theirs, or [mark all read](reaction:notifications.reading.MarkAllRead). Each endpoint reads the user from the session, so nobody can read or mark another person's notifications.

```endpoints
notifications.reading.ListNotifications at /notifications/list
notifications.reading.MarkRead at /notifications/read
notifications.reading.MarkAllRead at /notifications/read-all
```
