import type { Collection, Db } from "mongodb";

export class CannotRequest extends Error {}
export class CannotAccept extends Error {}
export class CannotReject extends Error {}
export class CannotRemove extends Error {}

interface FriendRequest {
  _id: string;
  sender: string;
  recipient: string;
  /** The two people in either order, so a unique index allows one request per pair. */
  pair?: string;
}

interface Friendship {
  _id: string;
  user1: string;
  user2: string;
  /** The two people in either order, so a unique index allows one friendship per pair. */
  pair?: string;
}

/** The same key for (a, b) and (b, a). */
const pairOf = (a: string, b: string) => [a, b].sort().join("\u0000");

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;

export class FriendingConcept {
  private readonly requests: Collection<FriendRequest>;
  private readonly friendships: Collection<Friendship>;

  private indexes: Promise<unknown> | undefined;

  constructor(db: Db) {
    this.requests = db.collection<FriendRequest>("friending.requests");
    this.friendships = db.collection<Friendship>("friending.friendships");
  }

  /**
   * Creates the unique pair indexes once, so two people can't end up with two requests or two
   * friendships even when both act at the same moment. Records stored before pairs were kept have no
   * pair and are left out of the indexes; the checks in `request` still cover them.
   */
  #ready() {
    const onlyPaired = { unique: true, partialFilterExpression: { pair: { $exists: true } } };
    this.indexes ??= Promise.all([
      this.requests.createIndex({ pair: 1 }, onlyPaired),
      this.friendships.createIndex({ pair: 1 }, onlyPaired),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async request({ sender, recipient }: { sender: string; recipient: string }) {
    if (sender === recipient) {
      throw new CannotRequest("A friend request cannot be created between these users.");
    }

    const existingRequest = await this.requests.findOne({
      $or: [
        { sender, recipient },
        { sender: recipient, recipient: sender },
      ],
    });

    const existingFriendship = await this.friendships.findOne({
      $or: [
        { user1: sender, user2: recipient },
        { user1: recipient, user2: sender },
      ],
    });

    if (existingRequest || existingFriendship) {
      throw new CannotRequest("A friend request cannot be created between these users.");
    }

    await this.#ready();
    const request = crypto.randomUUID();

    try {
      await this.requests.insertOne({
        _id: request,
        sender,
        recipient,
        pair: pairOf(sender, recipient),
      });
    } catch (error) {
      if (isDuplicate(error)) {
        throw new CannotRequest("A friend request cannot be created between these users.");
      }
      throw error;
    }

    return { request };
  }

  async accept({ recipient, request }: { recipient: string; request: string }) {
    await this.#ready();
    // Taking the request in one step means only one accept or reject of it can succeed.
    const existing = await this.requests.findOneAndDelete({ _id: request, recipient });

    if (!existing) {
      throw new CannotAccept("This friend request cannot be accepted.");
    }

    const friendship = crypto.randomUUID();

    try {
      await this.friendships.insertOne({
        _id: friendship,
        user1: existing.sender,
        user2: recipient,
        pair: pairOf(existing.sender, recipient),
      });
    } catch (error) {
      // They are already friends: put the request back, so a refused accept changes nothing.
      await this.requests.insertOne(existing);
      if (isDuplicate(error)) throw new CannotAccept("This friend request cannot be accepted.");
      throw error;
    }

    return { friendship };
  }

  async reject({ recipient, request }: { recipient: string; request: string }) {
    const existing = await this.requests.findOneAndDelete({ _id: request, recipient });

    if (!existing) {
      throw new CannotReject("This friend request cannot be rejected.");
    }

    return { request };
  }

  async remove({ user, friendship }: { user: string; friendship: string }) {
    const existing = await this.friendships.findOneAndDelete({
      _id: friendship,
      $or: [{ user1: user }, { user2: user }],
    });

    if (!existing) {
      throw new CannotRemove("This friendship cannot be removed by this user.");
    }

    return { friendship };
  }

  async _requests(_input: Record<string, never>) {
    const rows = await this.requests.find().toArray();

    return rows.map(({ _id, sender, recipient }) => ({
      request: _id,
      sender,
      recipient,
    }));
  }

  async _friendships(_input: Record<string, never>) {
    const rows = await this.friendships.find().toArray();

    return rows.map(({ _id, user1, user2 }) => ({
      friendship: _id,
      user1,
      user2,
    }));
  }
}
