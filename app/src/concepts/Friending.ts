import type { Collection, Db } from "mongodb";

export class CannotRequest extends Error {}
export class CannotAccept extends Error {}
export class CannotReject extends Error {}
export class CannotRemove extends Error {}

interface FriendRequest {
  _id: string;
  sender: string;
  recipient: string;
}

interface Friendship {
  _id: string;
  user1: string;
  user2: string;
}

export class FriendingConcept {
  private readonly requests: Collection<FriendRequest>;
  private readonly friendships: Collection<Friendship>;

  constructor(db: Db) {
    this.requests = db.collection<FriendRequest>("friending.requests");
    this.friendships = db.collection<Friendship>("friending.friendships");
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

    const request = crypto.randomUUID();

    await this.requests.insertOne({
      _id: request,
      sender,
      recipient,
    });

    return { request };
  }

  async accept({ recipient, request }: { recipient: string; request: string }) {
    const existing = await this.requests.findOne({
      _id: request,
    });

    if (!existing || existing.recipient !== recipient) {
      throw new CannotAccept("This friend request cannot be accepted.");
    }

    const friendship = crypto.randomUUID();

    await this.friendships.insertOne({
      _id: friendship,
      user1: existing.sender,
      user2: recipient,
    });

    await this.requests.deleteOne({ _id: request });

    return { friendship };
  }

  async reject({ recipient, request }: { recipient: string; request: string }) {
    const existing = await this.requests.findOne({
      _id: request,
    });

    if (!existing || existing.recipient !== recipient) {
      throw new CannotReject("This friend request cannot be rejected.");
    }

    await this.requests.deleteOne({ _id: request });

    return { request };
  }

  async remove({ user, friendship }: { user: string; friendship: string }) {
    const existing = await this.friendships.findOne({
      _id: friendship,
    });

    if (!existing || (existing.user1 !== user && existing.user2 !== user)) {
      throw new CannotRemove("This friendship cannot be removed by this user.");
    }

    await this.friendships.deleteOne({ _id: friendship });

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
