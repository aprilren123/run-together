import { ref } from "vue";
import { isUpcoming, type Run } from "./runs.ts";

/** An invitation the signed-in user received, as `/api/invitations/list` answers it. */
export interface ReceivedInvitation {
  invitation: string;
  inviter: string;
  run: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  sent: string;
  answered: string | null;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
  runStatus: "ACTIVE" | "CANCELED";
}

/** An invitation to one of the owner's runs, as `/api/invitations/run` answers it. */
export interface SentInvitation {
  invitation: string;
  invitee: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  sent: string;
  answered: string | null;
}

/**
 * Where an invitation stands for the person who received it: whether they can still answer it, and if
 * not, why. A pending invitation to a canceled or past run can't be accepted any more.
 */
export type InvitationState = "open" | "accepted" | "declined" | "canceled" | "started";

export function invitationState(i: ReceivedInvitation, now = Date.now()): InvitationState {
  if (i.status === "ACCEPTED") return "accepted";
  if (i.status === "DECLINED") return "declined";
  if (i.runStatus === "CANCELED") return "canceled";
  if (!isUpcoming({ startTime: i.startTime } as Run, now)) return "started";
  return "open";
}

export const STATE_LABEL: Record<Exclude<InvitationState, "open">, string> = {
  accepted: "Accepted · You're going",
  declined: "Declined",
  canceled: "This run was canceled",
  started: "This run has already started",
};

/**
 * The invitation a notification is about: the newest one from that person to that run sent no later
 * than the notification, so an older notification keeps pointing at the invitation it announced.
 */
export function invitationFor(
  n: { run: string; actor: string; at: string },
  invitations: ReceivedInvitation[],
): ReceivedInvitation | undefined {
  const at = new Date(n.at).getTime() + 1000;
  return invitations
    .filter((i) => i.run === n.run && i.inviter === n.actor && new Date(i.sent).getTime() <= at)
    .sort((a, b) => new Date(b.sent).getTime() - new Date(a.sent).getTime())[0];
}

/** How the owner sees each invitation: Accepted, while the friend is still going. */
export function sentLabel(i: SentInvitation, going: string[]): string {
  if (i.status === "PENDING") return "Pending";
  if (i.status === "DECLINED") return "Declined";
  return going.includes(i.invitee) ? "Accepted" : "Accepted, then left";
}

/**
 * The owner's invitations to one run, one per friend: the newest invitation to each, since a friend who
 * declined may have been invited again.
 */
export function latestPerInvitee(invitations: SentInvitation[]): SentInvitation[] {
  const seen = new Set<string>();
  return [...invitations]
    .sort((a, b) => new Date(b.sent).getTime() - new Date(a.sent).getTime())
    .filter((i) => !seen.has(i.invitee) && seen.add(i.invitee));
}

/** The sentence to show when answering fails with `status`, given the invitation as it stands now. */
export function answerError(
  status: number | null,
  current: ReceivedInvitation | undefined,
  inviter: string,
): string {
  if (status === null) return "Couldn't reach RunTogether. Check your connection and try again.";
  if (status === 404 || !current) return "This invitation is no longer available.";
  if (status === 403)
    return `You're no longer friends with ${inviter}, so you can't join this run.`;
  const state = invitationState(current);
  if (state === "canceled") return "This run was canceled, so it can't be joined.";
  if (state === "started") return "This run has already started, so it can't be joined.";
  if (state === "declined") return "You already declined this invitation.";
  if (state === "accepted" || status === 409) return "You're already going to this run.";
  return "Something went wrong. Try again.";
}

/** The signed-in user's received invitations, shared by the bell and the run page. */
export function createInvitations(post: (path: string, body?: object) => Promise<Response>) {
  const items = ref<ReceivedInvitation[]>([]);
  /** The invitation being answered, so its buttons are disabled and a double click does nothing. */
  const answering = ref<string | null>(null);
  /** The latest problem or confirmation, for the invitation it is about. */
  const feedback = ref<{ invitation: string; error: boolean; text: string } | null>(null);

  async function call(path: string, body: object): Promise<number | null> {
    try {
      const response = await post(path, body);
      const data = await response.json().catch(() => ({}));
      return response.ok && !data.error ? 200 : response.status;
    } catch {
      return null;
    }
  }

  async function load() {
    try {
      const response = await post("/api/invitations/list");
      const data = await response.json();
      if (response.ok && !data.error) items.value = data.invitations.invitations;
    } catch {
      // The bell keeps what it had; a notification without its invitation says it isn't available.
    }
  }

  /** Accepts or declines once, then reloads, so what's shown is what the server now holds. */
  async function answer(invitation: string, how: "accept" | "decline"): Promise<boolean> {
    if (answering.value) return false;
    const inviter = items.value.find((i) => i.invitation === invitation)?.inviter ?? "the host";
    answering.value = invitation;
    feedback.value = null;
    const status = await call(`/api/invitations/${how}`, { invitation });
    await load();
    answering.value = null;
    if (status === 200) {
      feedback.value = {
        invitation,
        error: false,
        text: how === "accept" ? "You're going! It's in My Runs." : "Invitation declined.",
      };
      return true;
    }
    const current = items.value.find((i) => i.invitation === invitation);
    feedback.value = { invitation, error: true, text: answerError(status, current, inviter) };
    return false;
  }

  return {
    items,
    answering,
    feedback,
    load,
    accept: (invitation: string) => answer(invitation, "accept"),
    decline: (invitation: string) => answer(invitation, "decline"),
  };
}

export type Invitations = ReturnType<typeof createInvitations>;
