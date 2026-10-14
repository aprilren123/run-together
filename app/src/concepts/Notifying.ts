import type { Collection, Db } from "mongodb";

export class NotificationNotFound extends Error {}

interface Notification {
  _id: string;
  recipient: string;
  actor: string;
  subject: string;
  kind: string;
  at: Date;
  read: boolean;
}

/** Keeps people informed of events that concern them, until they have seen them. */
export class NotifyingConcept {
  private readonly notifications: Collection<Notification>;
  private indexes: Promise<unknown> | undefined;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.notifications = db.collection<Notification>("notifying.notifications");
  }

  /** Creates the index once, so a person's notifications are found newest first. */
  #ready() {
    this.indexes ??= this.notifications
      .createIndex({ recipient: 1, at: -1 })
      .catch((error: unknown) => {
        this.indexes = undefined;
        throw error;
      });
    return this.indexes;
  }

  async notify({
    recipient,
    actor,
    subject,
    kind,
  }: {
    recipient: string;
    actor: string;
    subject: string;
    kind: string;
  }) {
    await this.#ready();
    const notification = crypto.randomUUID();
    await this.notifications.insertOne({
      _id: notification,
      recipient,
      actor,
      subject,
      kind,
      at: this.clock(),
      read: false,
    });
    return { notification };
  }

  async markRead({ recipient, notification }: { recipient: string; notification: string }) {
    const { matchedCount } = await this.notifications.updateOne(
      { _id: notification, recipient },
      { $set: { read: true } },
    );
    if (matchedCount === 0) throw new NotificationNotFound("There is no such notification.");
    return { notification };
  }

  async markAllRead({ recipient }: { recipient: string }) {
    await this.notifications.updateMany({ recipient, read: false }, { $set: { read: true } });
    return { recipient };
  }

  async _for({ recipient }: { recipient: string }) {
    await this.#ready();
    const rows = await this.notifications.find({ recipient }).sort({ at: -1, _id: -1 }).toArray();
    return rows.map(({ _id, actor, subject, kind, at, read }) => ({
      notification: _id,
      actor,
      subject,
      kind,
      at,
      read,
    }));
  }
}
