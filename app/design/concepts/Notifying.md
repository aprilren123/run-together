# Notifying

## Purpose

Keep people informed of events that concern them, until they have seen them.

## Principle

When Morgan suggests a change to Jamie's run, Jamie is notified that Morgan did so, about that run. The notification is unread, and it is listed first among Jamie's notifications, before older ones. Once Jamie marks it read, it is still listed, but no longer unread. Morgan's notifications don't include it.

## Types

```types
external Recipient
  The person who is told.

external Actor
  The person whose action caused the notification.

external Subject
  What the notification is about.

external Kind
  What happened.
```

## State

```state
a set of Notifications with
  a Recipient
  an Actor
  a Subject
  a Kind
  an at DateTime
  a read Flag
```

## Actions

```actions
notify(recipient: Recipient, actor: Actor, subject: Subject, kind: Kind) : returns (notification: Notification)
  where true
  then
    add a new unread notification for recipient, from actor, about subject, of kind, at now
    returns notification

markRead(recipient: Recipient, notification: Notification) : returns (notification: Notification)
  where notification is in Notifications and notification has recipient
  then
    update notification to be read
    returns notification
  where notification is not in Notifications or notification does not have recipient
  then
    refuses NOT_FOUND "There is no such notification."

markAllRead(recipient: Recipient) : returns (recipient: Recipient)
  where true
  then
    update every notification that has recipient to be read
    returns recipient
```

## Queries

```queries
_for(recipient: Recipient) : many (notification: Notification, actor: Actor, subject: Subject, kind: Kind, at: DateTime, read: Flag)
  Answers recipient's notifications, newest first, and no rows when there are none.
```
