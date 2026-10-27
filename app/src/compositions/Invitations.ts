import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { canSee, friends, joined, runInfo } from "./RunTogether.ts";

const { RunPlanning, Joining, Inviting, Notifying, Registering, Sessioning } = concepts;

// A run's owner can invite friends to it. Inviting keeps each invitation and its answer; Joining keeps
// who is going; Notifying tells the invitee. Accepting joins the run first and records the answer only
// once that has worked, so an invitation is never accepted without its invitee having joined.

// ---------- Who may do what ----------

/** (run) starts now or later. */
const upcoming = view("(run) hasn't started", ({ run }) =>
  where(RunPlanning._upcoming({ run }).is({ upcoming: true })),
).holds();

/** Who sent (invitation), to whom, for which run, and its status, read with the invitation as an input. */
const invitationInfo = view(
  "the people, run, and status of (invitation)",
  ({ invitation }, { inviter, invitee, event, status }) =>
    where(Inviting._get({ invitation }).is({ inviter, invitee, event, status })),
);

// ---------- Sending ----------

const InviteFriend = endpoint(
  "/invitations/send",
  ({ session, user, run, username, invitee, invitation }) =>
    receive({ session, run, username })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          runInfo({ run }).is({ owner: user, status: "ACTIVE" }),
          upcoming({ run }),
          Registering._byUsername({ username }).is({ user: invitee }),
          friends({ user, other: invitee }),
          no(joined({ user: invitee, run })),
        )
          .then(Inviting.invite({ inviter: user, invitee, event: run }).responds({ invitation }))
          .then(respond({ invitation }))
          .named("invite"),
        where(
          runInfo({ run }).is({ owner: user, status: "ACTIVE" }),
          upcoming({ run }),
          Registering._byUsername({ username }).is({ user: invitee }),
          friends({ user, other: invitee }),
          joined({ user: invitee, run }),
        )
          .then(respond({ error: "ALREADY_JOINED" }))
          .named("going"),
        // Only an accepted friend can be invited; inviting yourself lands here too.
        where(
          runInfo({ run }).is({ owner: user, status: "ACTIVE" }),
          upcoming({ run }),
          Registering._byUsername({ username }).is({ user: invitee }),
          no(friends({ user, other: invitee })),
        )
          .then(respond({ error: "NOT_FRIENDS" }))
          .named("not-friends"),
        where(
          runInfo({ run }).is({ owner: user, status: "ACTIVE" }),
          upcoming({ run }),
          no(Registering._byUsername({ username })),
        )
          .then(respond({ error: "USER_NOT_FOUND" }))
          .named("unknown"),
        where(runInfo({ run }).is({ owner: user, status: "ACTIVE" }), no(upcoming({ run })))
          .then(respond({ error: "RUN_STARTED" }))
          .named("started"),
        where(runInfo({ run }).is({ owner: user, status: "CANCELED" }))
          .then(respond({ error: "RUN_CANCELED" }))
          .named("canceled"),
        // Someone who can see the run but doesn't own it, such as a friend of its owner.
        where(canSee({ viewer: user, run }), no(runInfo({ run }).is({ owner: user })))
          .then(respond({ error: "NOT_OWNER" }))
          .named("not-owner"),
        where(no(canSee({ viewer: user, run })))
          .then(respond({ error: "RUN_NOT_FOUND" }))
          .named("hidden"),
      ),
  { input: { required: ["session", "run", "username"] } },
);

/** The invitee hears about the invitation through the bell. */
const InvitationNotifiesInvitee = reaction(({ inviter, invitee, event, invitation }) =>
  when(Inviting.invite({ inviter, invitee, event }).responds({ invitation })).then(
    Notifying.notify({ recipient: invitee, actor: inviter, subject: event, kind: "RUN_INVITED" }),
  ),
);

// ---------- Reading ----------

/** The invitations to (run), newest first, each with its invitee's username. */
const RunInvitationList = former(
  "the invitations to (run)",
  ({ run }, { invitation, invitee, username, status, sent, answered }) =>
    form({
      invitations: each(
        Inviting._for({ event: run }).is({ invitation, invitee, status, sent, answered }),
      )
        .where(Registering._username({ user: invitee }).is({ username }))
        .form({ invitation, invitee: username, status, sent, answered }),
    }),
);

const ListRunInvitations = endpoint(
  "/invitations/run",
  ({ session, user, run }) =>
    receive({ session, run })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(runInfo({ run }).is({ owner: user }))
          .then(respond({ invitations: RunInvitationList({ run }) }))
          .named("owner"),
        where(canSee({ viewer: user, run }), no(runInfo({ run }).is({ owner: user })))
          .then(respond({ error: "NOT_OWNER" }))
          .named("not-owner"),
        where(no(canSee({ viewer: user, run })))
          .then(respond({ error: "RUN_NOT_FOUND" }))
          .named("hidden"),
      ),
  { input: { required: ["session", "run"] } },
);

/**
 * The invitations (user) received, newest first, each with its inviter's username and the run's details,
 * so the bell can show what the run is. The row's event is bound as `run`, the name canSee takes, and only
 * runs the user can still see are listed: after an unfriending, the run is hidden here as everywhere.
 */
const MyInvitationList = former(
  "the invitations (user) received",
  (
    { user },
    {
      invitation,
      inviter,
      inviterName,
      run,
      status,
      sent,
      answered,
      startTime,
      distance,
      pace,
      location,
      runStatus,
    },
  ) =>
    form({
      invitations: each(
        Inviting._to({ invitee: user }).is({
          invitation,
          inviter,
          event: run,
          status,
          sent,
          answered,
        }),
      )
        .where(
          canSee({ viewer: user, run }),
          Registering._username({ user: inviter }).is({ username: inviterName }),
          RunPlanning._all({}).is({
            run,
            startTime,
            distance,
            pace,
            location,
            status: runStatus,
          }),
        )
        .form({
          invitation,
          inviter: inviterName,
          run,
          status,
          sent,
          answered,
          startTime,
          distance,
          pace,
          location,
          runStatus,
        }),
    }),
);

const ListMyInvitations = endpoint(
  "/invitations/list",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ invitations: MyInvitationList({ user }) })),
  { input: { required: ["session"] } },
);

// ---------- Answering ----------

const AcceptInvitation = endpoint(
  "/invitations/accept",
  ({ session, user, invitation, inviter, event, participation }) =>
    receive({ session, invitation })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        // Join first: of two accepts at once, Joining lets only one join, and the other is refused with
        // ALREADY_JOINED before it records anything.
        where(
          invitationInfo({ invitation }).is({ invitee: user, inviter, event, status: "PENDING" }),
          runInfo({ run: event }).is({ status: "ACTIVE" }),
          upcoming({ run: event }),
          friends({ user, other: inviter }),
          no(joined({ user, run: event })),
        )
          .then(Joining.join({ user, event }).responds({ participation }))
          .then(Inviting.accept({ invitee: user, invitation }).responds({ event }))
          .then(respond({ invitation, event }))
          .named("join"),
        // Already going, such as after joining from the run's page: just record the answer.
        where(
          invitationInfo({ invitation }).is({ invitee: user, inviter, event, status: "PENDING" }),
          runInfo({ run: event }).is({ status: "ACTIVE" }),
          upcoming({ run: event }),
          friends({ user, other: inviter }),
          joined({ user, run: event }),
        )
          .then(Inviting.accept({ invitee: user, invitation }).responds({ event }))
          .then(respond({ invitation, event }))
          .named("going"),
        where(
          invitationInfo({ invitation }).is({ invitee: user, event, status: "PENDING" }),
          runInfo({ run: event }).is({ status: "CANCELED" }),
        )
          .then(respond({ error: "RUN_CANCELED" }))
          .named("canceled"),
        where(
          invitationInfo({ invitation }).is({ invitee: user, event, status: "PENDING" }),
          runInfo({ run: event }).is({ status: "ACTIVE" }),
          no(upcoming({ run: event })),
        )
          .then(respond({ error: "RUN_STARTED" }))
          .named("started"),
        where(
          invitationInfo({ invitation }).is({ invitee: user, inviter, event, status: "PENDING" }),
          runInfo({ run: event }).is({ status: "ACTIVE" }),
          upcoming({ run: event }),
          no(friends({ user, other: inviter })),
        )
          .then(respond({ error: "NOT_FRIENDS" }))
          .named("not-friends"),
        where(
          invitationInfo({ invitation }).is({ invitee: user, event, status: "PENDING" }),
          no(RunPlanning._all({}).is({ run: event })),
        )
          .then(respond({ error: "RUN_NOT_FOUND" }))
          .named("no-run"),
        // Already accepted or declined: Inviting refuses with CANNOT_ACCEPT.
        where(
          invitationInfo({ invitation }).is({ invitee: user }),
          no(invitationInfo({ invitation }).is({ invitee: user, status: "PENDING" })),
        )
          .then(Inviting.accept({ invitee: user, invitation }).responds({ event }))
          .then(respond({ invitation, event }))
          .named("answered"),
        // Someone else's invitation, or one that doesn't exist.
        where(no(invitationInfo({ invitation }).is({ invitee: user })))
          .then(respond({ error: "INVITATION_NOT_FOUND" }))
          .named("not-yours"),
      ),
  { input: { required: ["session", "invitation"] } },
);

/**
 * Joining a run some other way, such as from the run's page, accepts the joiner's pending invitation to it.
 * It waits until the rest of the request is done: after Accept & Join the invitation is already accepted,
 * so nothing is left pending here.
 */
const JoiningAcceptsInvitation = reaction(({ user, event, participation, invitation }) =>
  when(Joining.join({ user, event }).responds({ participation }))
    .afterFlowSettles()
    .where(Inviting._pending({ invitee: user, event }).is({ invitation }))
    .then(Inviting.accept({ invitee: user, invitation })),
);

const DeclineInvitation = endpoint(
  "/invitations/decline",
  ({ session, user, invitation }) =>
    receive({ session, invitation })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        // Inviting refuses with CANNOT_DECLINE once the invitation is answered.
        where(invitationInfo({ invitation }).is({ invitee: user }))
          .then(Inviting.decline({ invitee: user, invitation }).responds({ invitation }))
          .then(respond({ invitation }))
          .named("mine"),
        where(no(invitationInfo({ invitation }).is({ invitee: user })))
          .then(respond({ error: "INVITATION_NOT_FOUND" }))
          .named("not-yours"),
      ),
  { input: { required: ["session", "invitation"] } },
);

export const composition = {
  access: { upcoming, invitationInfo },
  sending: { InviteFriend, InvitationNotifiesInvitee },
  reading: { RunInvitationList, ListRunInvitations, MyInvitationList, ListMyInvitations },
  answering: { AcceptInvitation, JoiningAcceptsInvitation, DeclineInvitation },
};
