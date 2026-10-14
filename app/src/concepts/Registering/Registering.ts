import { type Collection, type Db, MongoServerError } from "mongodb";

export class InvalidUsername extends Error {}
export class UsernameTaken extends Error {}

const USERNAME = /^[A-Za-z0-9_-]{3,32}$/;

export type User = string & { readonly __brand: "User" };

interface UserDocument {
  _id: User;
  username: string;
}

/** Lets people choose a username that others can find them by. */
export class RegisteringConcept {
  private readonly users: Collection<UserDocument>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Registering") {
    this.users = database.collection(`${name.toLowerCase()}.users`);
  }

  /** Creates the unique index once. It makes MongoDB refuse a username that is already taken, even when two people register it at once. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.users
      .createIndex({ username: 1 }, { unique: true })
      .catch((error: unknown) => {
        this.indexes = undefined;
        throw error;
      });
    return this.indexes;
  }

  async register({ username }: { username: string }) {
    if (!USERNAME.test(username)) {
      throw new InvalidUsername(
        "A username must have 3 to 32 letters, digits, underscores, or hyphens.",
      );
    }
    const user = crypto.randomUUID() as User;
    await this.#ready();
    try {
      await this.users.insertOne({ _id: user, username });
    } catch (error) {
      if (isDuplicate(error)) throw new UsernameTaken("That username is taken.");
      throw error;
    }
    return { user };
  }

  async _byUsername({ username }: { username: string }) {
    const found = await this.users.findOne({ username });
    return found === null ? [] : [{ user: found._id }];
  }

  async _username({ user }: { user: User }) {
    const found = await this.users.findOne({ _id: user });
    return found === null ? [] : [{ username: found.username }];
  }

  /** Up to 10 users whose username contains `text`, ignoring case, so people can find each other without listing everyone. */
  async _search({ text }: { text: string }) {
    if (typeof text !== "string" || text.length < MIN_SEARCH || text.length > 32) return [];
    const pattern = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const found = await this.users
      .find({ username: pattern })
      // Alphabetical, ignoring case, so `Mayra` sorts between `maya` and `morgan`.
      .collation({ locale: "en", strength: 2 })
      .sort({ username: 1 })
      .limit(MAX_RESULTS)
      .toArray();
    return found.map(({ _id, username }) => ({ user: _id, username }));
  }
}

const MIN_SEARCH = 2;
const MAX_RESULTS = 10;

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
