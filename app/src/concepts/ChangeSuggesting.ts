import type { Collection, Db } from "mongodb";

export class SameUser extends Error {}
export class CannotAccept extends Error {}
export class CannotReject extends Error {}
export class CannotWithdraw extends Error {}

type SuggestionStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

/** ChangeSuggesting never looks inside a change: it stores the change it is given and returns it on acceptance. */
type Change = unknown;

interface Suggestion {
  _id: string;
  suggester: string;
  decider: string;
  event: string;
  change: Change;
  status: SuggestionStatus;
}

export class ChangeSuggestingConcept {
  private readonly suggestions: Collection<Suggestion>;

  constructor(db: Db) {
    this.suggestions = db.collection<Suggestion>("changesuggesting.suggestions");
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
    change: Change;
  }) {
    if (suggester === decider) {
      throw new SameUser("A user cannot suggest a change to themselves.");
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

  // Each decision changes the suggestion only while it is still PENDING, in one step, so of two decisions
  // made at once (two accepts, or an accept and a reject or withdrawal) exactly one takes effect.

  async accept({ decider, suggestion }: { decider: string; suggestion: string }) {
    const existing = await this.suggestions.findOneAndUpdate(
      { _id: suggestion, decider, status: "PENDING" },
      { $set: { status: "ACCEPTED" } },
    );

    if (!existing) {
      throw new CannotAccept("This suggestion cannot be accepted.");
    }

    return {
      event: existing.event,
      change: existing.change,
      suggester: existing.suggester,
    };
  }

  async reject({ decider, suggestion }: { decider: string; suggestion: string }) {
    const { matchedCount } = await this.suggestions.updateOne(
      { _id: suggestion, decider, status: "PENDING" },
      { $set: { status: "REJECTED" } },
    );

    if (matchedCount === 0) {
      throw new CannotReject("This suggestion cannot be rejected.");
    }

    return { suggestion };
  }

  async withdraw({ suggester, suggestion }: { suggester: string; suggestion: string }) {
    const { matchedCount } = await this.suggestions.updateOne(
      { _id: suggestion, suggester, status: "PENDING" },
      { $set: { status: "WITHDRAWN" } },
    );

    if (matchedCount === 0) {
      throw new CannotWithdraw("This suggestion cannot be withdrawn.");
    }

    return { suggestion };
  }

  async _all(_input: Record<string, never>) {
    const rows = await this.suggestions.find().toArray();

    return rows.map(({ _id, suggester, decider, event, change, status }) => ({
      suggestion: _id,
      suggester,
      decider,
      event,
      change,
      status,
    }));
  }
}
