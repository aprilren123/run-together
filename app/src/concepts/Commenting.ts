import { createHash } from "node:crypto";
import type { Collection, Db } from "mongodb";

export class InvalidComment extends Error {}
export class DuplicateComment extends Error {}
export class CannotDelete extends Error {}
export class CommentNotFound extends Error {}

interface Comment {
  _id: string;
  author: string;
  target: string;
  text: string;
  at: Date;
  /** The author, target, text, and minute, so a unique index refuses a repeat posted in the same minute. */
  repeat: string;
}

const MAX_LENGTH = 500;
const MINUTE = 60_000;

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;

/** Lets people talk informally about something they share, in short remarks everyone there can read. */
export class CommentingConcept {
  private readonly comments: Collection<Comment>;
  private indexes: Promise<unknown> | undefined;

  constructor(
    db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.comments = db.collection<Comment>("commenting.comments");
  }

  /** Creates the indexes once: one to read a target's comments in order, one to refuse repeats. */
  #ready() {
    this.indexes ??= Promise.all([
      this.comments.createIndex({ target: 1, at: 1 }),
      this.comments.createIndex({ repeat: 1 }, { unique: true }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async post({ author, target, text }: { author: string; target: string; text: string }) {
    const trimmed = typeof text === "string" ? text.trim() : "";
    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
      throw new InvalidComment("A comment must have 1 to 500 characters.");
    }
    await this.#ready();
    const at = this.clock();
    const said = createHash("sha256").update(trimmed).digest("hex");
    const repeatKey = (minute: number) => `${author}\u0000${target}\u0000${said}\u0000${minute}`;
    const minute = Math.floor(at.getTime() / MINUTE);

    // The same comment from the last 60 seconds may sit in the previous minute's key.
    const recent = await this.comments.findOne({
      repeat: repeatKey(minute - 1),
      at: { $gt: new Date(at.getTime() - MINUTE) },
    });
    if (recent) throw new DuplicateComment("You just posted that comment.");

    // A time-ordered id, so comments posted at the same instant still list in the order they were posted.
    const comment = Bun.randomUUIDv7();
    try {
      await this.comments.insertOne({
        _id: comment,
        author,
        target,
        text: trimmed,
        at,
        repeat: repeatKey(minute),
      });
    } catch (error) {
      if (isDuplicate(error)) throw new DuplicateComment("You just posted that comment.");
      throw error;
    }
    return { comment };
  }

  async delete({ author, comment }: { author: string; comment: string }) {
    const deleted = await this.comments.findOneAndDelete({ _id: comment, author });
    if (!deleted) throw new CannotDelete("This comment can't be deleted.");
    return { comment };
  }

  async remove({ comment }: { comment: string }) {
    const removed = await this.comments.findOneAndDelete({ _id: comment });
    if (!removed) throw new CommentNotFound("There is no such comment.");
    return { comment };
  }

  async _on({ target }: { target: string }) {
    const rows = await this.comments.find({ target }).sort({ at: 1, _id: 1 }).toArray();
    return rows.map(({ _id, author, text, at }) => ({ comment: _id, author, text, at }));
  }

  async _get({ comment }: { comment: string }) {
    const found = await this.comments.findOne({ _id: comment });
    return found ? [{ author: found.author, target: found.target }] : [];
  }
}
