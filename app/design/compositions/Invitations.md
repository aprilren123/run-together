# Invitations

A run's owner can invite friends to it directly, rather than waiting for them to find it on Home. An invitation is an Inviting invitation whose inviter is the session's user, whose invitee is a friend, and whose event is the run. Inviting keeps the invitation and its answer, Joining keeps who is going, and Notifying tells the invitee; the reactions below connect them. A run [hasn't started](view:invitations.access.upcoming) while `RunPlanning._upcoming` says its start time is now or later.

The owner of a run that is on and hasn't started can [invite a friend](reaction:invitations.sending.InviteFriend) to it by username. Inviting someone who isn't the owner's accepted friend, including the owner themselves, is refused with `NOT_FRIENDS`; someone who already joined, with `ALREADY_JOINED`; a username nobody has, with `USER_NOT_FOUND`; and a friend who already has a pending invitation to the run, by Inviting with `ALREADY_INVITED`. Inviting to a canceled run is refused with `RUN_CANCELED`, and to one that has started with `RUN_STARTED`. Anyone who can see the run but doesn't own it is refused with `NOT_OWNER`, and anyone else with `RUN_NOT_FOUND`, the same answer as for a run that doesn't exist. When an invitation is sent, the [invitee is told](reaction:invitations.sending.InvitationNotifiesInvitee) with a Notifying notification of kind `RUN_INVITED`, about the run, from its owner.

```endpoints
invitations.sending.InviteFriend at /invitations/send
```

The owner can [list the invitations to their run](reaction:invitations.reading.ListRunInvitations) using [the run's invitation list](former:invitations.reading.RunInvitationList), newest first, each with the invitee's username, its status, and when it was sent and answered. Anyone else is refused as for sending. A signed-in user can [list the invitations they received](reaction:invitations.reading.ListMyInvitations) using [their invitation list](former:invitations.reading.MyInvitationList), newest first, each with the inviter's username and the run's start time, distance, pace, meeting point, and status, so the bell can show the run. Only runs they [can still see](view:RunTogether.canSee) are listed, so once they are no longer friends with its owner, the run's details stay hidden here as everywhere else.

```endpoints
invitations.reading.ListRunInvitations at /invitations/run
invitations.reading.ListMyInvitations at /invitations/list
```

The invitee can [accept an invitation](reaction:invitations.answering.AcceptInvitation) while it is pending, the run is on and hasn't started, and they are still friends with the inviter. Accepting joins them to the run through Joining first, and marks the invitation accepted only once that has worked, so an invitation is accepted only when its invitee has joined. Joining allows one participation per person and run, so of two accepts sent at once, only one joins, and the other is refused with `ALREADY_JOINED` before it changes anything. An invitee who already joined just has their invitation marked accepted. Someone who joins the run another way, such as from the run's page, has their pending invitation to it [accepted once their request is done](reaction:invitations.answering.JoiningAcceptsInvitation), so an invitation never stays pending for someone who is going. Accepting is refused with `RUN_CANCELED`, `RUN_STARTED`, or `NOT_FRIENDS` when those no longer hold, and an invitation already answered is refused by Inviting with `CANNOT_ACCEPT`. Each endpoint reads the one invitation the request names, through [its people, run, and status](view:invitations.access.invitationInfo).

The invitee can [decline an invitation](reaction:invitations.answering.DeclineInvitation) while it is pending; declining leaves Joining alone, and one already answered is refused by Inviting with `CANNOT_DECLINE`. Anyone else's invitation, or one that doesn't exist, is refused with `INVITATION_NOT_FOUND` when accepting or declining. Reading a notification about an invitation never answers it.

```endpoints
invitations.answering.AcceptInvitation at /invitations/accept
invitations.answering.DeclineInvitation at /invitations/decline
```
