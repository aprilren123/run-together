# Inviting

## Purpose

Let someone ask a particular person to take part in an event, and keep track of the answer.

*Prevents:* the same person being asked twice while the first request is still open; an answer being given twice, or two different answers given at once.

## Principle

April invites Jamie to her run. The invitation is pending, and listed both among the invitations Jamie received and among the invitations to that run. Jamie accepts it, and it is accepted from then on; she can't accept or decline it again. April invites Taylor too, and Taylor declines, so his invitation is declined. While Jamie's invitation was pending, April couldn't invite her to the same run again, but once Taylor declined, April could invite him again.

## Types

```types
external User
  The person who invites or is invited.

external Event
  What the invitation is to.

InvitationStatus is PENDING or ACCEPTED or DECLINED
```

## State

```state
a set of Invitations with
  an inviter User
  an invitee User
  an Event
  an InvitationStatus
  a sent DateTime
  an optional answered DateTime

Rule: each invitee has at most one PENDING invitation to each event.
Rule: an invitation has an answered time exactly when its InvitationStatus is ACCEPTED or DECLINED.
```

## Actions

```actions
invite(inviter: User, invitee: User, event: Event) : returns (invitation: Invitation)
  where inviter is not invitee and invitee has no PENDING invitation to event
  then
    add a new invitation from inviter to invitee for event, with InvitationStatus PENDING, sent now
    returns invitation
  where inviter is invitee
  then
    refuses CANNOT_INVITE_SELF "You can't invite yourself."
  where inviter is not invitee and invitee has a PENDING invitation to event
  then
    refuses ALREADY_INVITED "This person already has a pending invitation to this event."

accept(invitee: User, invitation: Invitation) : returns (invitation: Invitation, event: Event, inviter: User)
  where invitation is in Invitations, invitation has invitee, and invitation has InvitationStatus PENDING
  then
    update invitation to have InvitationStatus ACCEPTED, answered now
    returns invitation, event, inviter
  where invitation is not in Invitations or invitation does not have invitee or invitation does not have InvitationStatus PENDING
  then
    refuses CANNOT_ACCEPT "This invitation can't be accepted."

decline(invitee: User, invitation: Invitation) : returns (invitation: Invitation)
  where invitation is in Invitations, invitation has invitee, and invitation has InvitationStatus PENDING
  then
    update invitation to have InvitationStatus DECLINED, answered now
    returns invitation
  where invitation is not in Invitations or invitation does not have invitee or invitation does not have InvitationStatus PENDING
  then
    refuses CANNOT_DECLINE "This invitation can't be declined."
```

## Queries

```queries
_get(invitation: Invitation) : optional (inviter: User, invitee: User, event: Event, status: InvitationStatus)
  Answers who sent invitation, to whom, for which event, and its status, or no row for an unknown invitation.

_pending(invitee: User, event: Event) : optional (invitation: Invitation, inviter: User)
  Answers invitee's PENDING invitation to event, or no row when there is none.

_to(invitee: User) : many (invitation: Invitation, inviter: User, event: Event, status: InvitationStatus, sent: DateTime, answered: DateTime)
  Answers the invitations invitee received, newest first, and no rows when there are none. The answered time is null while an invitation is pending.

_for(event: Event) : many (invitation: Invitation, invitee: User, status: InvitationStatus, sent: DateTime, answered: DateTime)
  Answers the invitations to event, newest first, and no rows when there are none. The answered time is null while an invitation is pending.
```
