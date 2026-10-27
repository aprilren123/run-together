import type { Collection, Db } from "mongodb";

export class CannotInviteSelf extends Error {}
export class AlreadyInvited extends Error {}
export class CannotAccept extends Error {}
export class CannotDecline extends Error {}

type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

interface Invitation {
  _id: string;
  inviter: string;
  invitee: string;
  event: string;
  status: InvitationStatus;
  sent: Date;
  answered?: Date;
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;

/** Lets someone ask a particular person to take part in an event, and keeps track of the answer. */
export class InvitingConcept {
  private readonly invitations: Collection<Invitation>;
  private indexes: Promise<unknown> | undefined;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.invitations = db.collection<Invitation>("inviting.invitations");
  }

  /**
   * Creates the indexes once: one so a person has at most one pending invitation to each event, even when
   * two invitations are sent at once, and one each to list a person's or an event's invitations.
   */
  #ready() {
    this.indexes ??= Promise.all([
      this.invitations.createIndex(
        { invitee: 1, event: 1 },
        { unique: true, partialFilterExpression: { status: "PENDING" } },
      ),
      this.invitations.createIndex({ invitee: 1, sent: -1 }),
      this.invitations.createIndex({ event: 1, sent: -1 }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async invite({ inviter, invitee, event }: { inviter: string; invitee: string; event: string }) {
    if (inviter === invitee) throw new CannotInviteSelf("You can't invite yourself.");
    await this.#ready();
    const invitation = Bun.randomUUIDv7();
    try {
      await this.invitations.insertOne({
        _id: invitation,
        inviter,
        invitee,
        event,
        status: "PENDING",
        sent: this.clock(),
      });
    } catch (error) {
      if (isDuplicate(error)) {
        throw new AlreadyInvited("This person already has a pending invitation to this event.");
      }
      throw error;
    }
    return { invitation };
  }

  // Each answer changes the invitation only while it is still PENDING, in one step, so of two answers
  // given at once (two accepts, or an accept and a decline) exactly one takes effect.

  async accept({ invitee, invitation }: { invitee: string; invitation: string }) {
    const answered = await this.invitations.findOneAndUpdate(
      { _id: invitation, invitee, status: "PENDING" },
      { $set: { status: "ACCEPTED", answered: this.clock() } },
    );
    if (!answered) throw new CannotAccept("This invitation can't be accepted.");
    return { invitation, event: answered.event, inviter: answered.inviter };
  }

  async decline({ invitee, invitation }: { invitee: string; invitation: string }) {
    const { matchedCount } = await this.invitations.updateOne(
      { _id: invitation, invitee, status: "PENDING" },
      { $set: { status: "DECLINED", answered: this.clock() } },
    );
    if (matchedCount === 0) throw new CannotDecline("This invitation can't be declined.");
    return { invitation };
  }

  async _get({ invitation }: { invitation: string }) {
    const found = await this.invitations.findOne({ _id: invitation });
    return found
      ? [
          {
            inviter: found.inviter,
            invitee: found.invitee,
            event: found.event,
            status: found.status,
          },
        ]
      : [];
  }

  async _pending({ invitee, event }: { invitee: string; event: string }) {
    const found = await this.invitations.findOne({ invitee, event, status: "PENDING" });
    return found ? [{ invitation: found._id, inviter: found.inviter }] : [];
  }

  async _to({ invitee }: { invitee: string }) {
    await this.#ready();
    const rows = await this.invitations.find({ invitee }).sort({ sent: -1, _id: -1 }).toArray();
    return rows.map(({ _id, inviter, event, status, sent, answered }) => ({
      invitation: _id,
      inviter,
      event,
      status,
      sent,
      answered: answered ?? null,
    }));
  }

  async _for({ event }: { event: string }) {
    await this.#ready();
    const rows = await this.invitations.find({ event }).sort({ sent: -1, _id: -1 }).toArray();
    return rows.map(({ _id, invitee, status, sent, answered }) => ({
      invitation: _id,
      invitee,
      status,
      sent,
      answered: answered ?? null,
    }));
  }
}
