import type { Collection, Db } from "mongodb";

export class AlreadyJoined extends Error {}
export class NotJoined extends Error {}

interface Participation {
  _id: string;
  user: string;
  event: string;
}

export class JoiningConcept {
  private readonly participations: Collection<Participation>;
  private indexed = false;

  constructor(db: Db) {
    this.participations =
      db.collection<Participation>("joining.participations");
  }

  async join({ user, event }: { user: string; event: string }) {
    if (!this.indexed) {
      await this.participations.createIndex(
        { user: 1, event: 1 },
        { unique: true },
      );
      this.indexed = true;
    }

    const participation = crypto.randomUUID();

    try {
      await this.participations.insertOne({
        _id: participation,
        user,
        event,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AlreadyJoined("The user has already joined this event.");
      }
      throw error;
    }

    return { participation };
  }

  async leave({ user, event }: { user: string; event: string }) {
    const result = await this.participations.findOneAndDelete({
      user,
      event,
    });

    if (!result) {
      throw new NotJoined("The user has not joined this event.");
    }

    return { participation: result._id };
  }

  async _all(_input: Record<string, never>) {
    const rows = await this.participations.find().toArray();

    return rows.map(({ _id, user, event }) => ({
      participation: _id,
      user,
      event,
    }));
  }
}