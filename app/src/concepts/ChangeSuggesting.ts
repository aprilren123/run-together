import type { Collection, Db } from "mongodb";

export class SameUser extends Error {}
export class CannotAccept extends Error {}
export class CannotReject extends Error {}
export class CannotWithdraw extends Error {}

type SuggestionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

interface Suggestion {
  _id: string;
  suggester: string;
  decider: string;
  event: string;
  change: string;
  status: SuggestionStatus;
}

export class ChangeSuggestingConcept {
  private readonly suggestions: Collection<Suggestion>;

  constructor(db: Db) {
    this.suggestions =
      db.collection<Suggestion>("changesuggesting.suggestions");
  }

  async suggest({
    suggester,
    decider,
    event,
    change,
  }: {
    suggester: string;
    decider: string;
    event: string;
    change: string;
  }) {
    if (suggester === decider) {
      throw new SameUser(
        "A user cannot suggest a change to themselves.",
      );
    }

    const suggestion = crypto.randomUUID();

    await this.suggestions.insertOne({
      _id: suggestion,
      suggester,
      decider,
      event,
      change,
      status: "PENDING",
    });

    return { suggestion };
  }

  async accept({
    decider,
    suggestion,
  }: {
    decider: string;
    suggestion: string;
  }) {
    const existing = await this.suggestions.findOne({
      _id: suggestion,
    });

    if (
      !existing ||
      existing.decider !== decider ||
      existing.status !== "PENDING"
    ) {
      throw new CannotAccept(
        "This suggestion cannot be accepted.",
      );
    }

    await this.suggestions.updateOne(
      { _id: suggestion },
      { $set: { status: "ACCEPTED" } },
    );

    return {
      event: existing.event,
      change: existing.change,
      suggester: existing.suggester,
    };
  }

  async reject({
    decider,
    suggestion,
  }: {
    decider: string;
    suggestion: string;
  }) {
    const existing = await this.suggestions.findOne({
      _id: suggestion,
    });

    if (
      !existing ||
      existing.decider !== decider ||
      existing.status !== "PENDING"
    ) {
      throw new CannotReject(
        "This suggestion cannot be rejected.",
      );
    }

    await this.suggestions.updateOne(
      { _id: suggestion },
      { $set: { status: "REJECTED" } },
    );

    return { suggestion };
  }

  async withdraw({
    suggester,
    suggestion,
  }: {
    suggester: string;
    suggestion: string;
  }) {
    const existing = await this.suggestions.findOne({
      _id: suggestion,
    });

    if (
      !existing ||
      existing.suggester !== suggester ||
      existing.status !== "PENDING"
    ) {
      throw new CannotWithdraw(
        "This suggestion cannot be withdrawn.",
      );
    }

    await this.suggestions.updateOne(
      { _id: suggestion },
      { $set: { status: "WITHDRAWN" } },
    );

    return { suggestion };
  }

  async _all(_input: Record<string, never>) {
    const rows = await this.suggestions.find().toArray();

    return rows.map(
      ({ _id, suggester, decider, event, change, status }) => ({
        suggestion: _id,
        suggester,
        decider,
        event,
        change,
        status,
      }),
    );
  }
}