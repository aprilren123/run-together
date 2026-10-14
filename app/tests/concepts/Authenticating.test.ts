import { describe, expect, test } from "bun:test";
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidPassword,
  PasswordSet,
} from "../../src/concepts/Authenticating/Authenticating.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

async function setup() {
  const database = await testDatabase();
  return { authenticating: new AuthenticatingConcept<string>(database), database };
}

describe("Authenticating", () => {
  test("its principle: Ben authenticates with his password, and Leo can neither guess it nor set a new one", async () => {
    const { authenticating } = await setup();

    expect(await authenticating.set({ user: "ben", password: "sea-shells-42" })).toEqual({ user: "ben" });
    expect(await authenticating.authenticate({ user: "ben", password: "sea-shells-42" })).toEqual({ user: "ben" });

    const guessed = authenticating.authenticate({ user: "ben", password: "guessed-password" });
    await expect(guessed).rejects.toThrow(InvalidCredentials);
    await expect(guessed).rejects.toThrow("The username or password is incorrect.");

    const reset = authenticating.set({ user: "ben", password: "leos-password" });
    await expect(reset).rejects.toThrow(PasswordSet);
    await expect(reset).rejects.toThrow("This account already has a password.");
    expect(await authenticating.authenticate({ user: "ben", password: "sea-shells-42" })).toEqual({ user: "ben" });
  });

  test("a user with no password, such as one who signed in with Commons, is refused like a wrong password", async () => {
    const { authenticating } = await setup();
    await expect(authenticating.authenticate({ user: "sam", password: "any-password" })).rejects.toThrow(
      InvalidCredentials,
    );
  });

  test("Authenticating stores an argon2id hash, never the password", async () => {
    const { authenticating, database } = await setup();
    await authenticating.set({ user: "ben", password: "sea-shells-42" });
    const stored = await database.collection<{ _id: string; verifier: string }>("authenticating.users").findOne({ _id: "ben" });
    expect(JSON.stringify(stored)).not.toContain("sea-shells-42");
    expect(stored?.verifier).toStartWith("$argon2id$");
  });

  test("a password must have 8 to 128 characters, and _acceptable returns the same answer as set", async () => {
    const { authenticating } = await setup();
    for (const password of ["short12", "p".repeat(129)]) {
      expect(await authenticating._acceptable({ password })).toEqual({ acceptable: false });
      await expect(authenticating.set({ user: "ben", password })).rejects.toThrow(InvalidPassword);
    }
    for (const password of ["p".repeat(8), "p".repeat(128)]) {
      expect(await authenticating._acceptable({ password })).toEqual({ acceptable: true });
    }
    await expect(authenticating.authenticate({ user: "ben", password: "short12" })).rejects.toThrow(InvalidCredentials);
  });

  test("of two passwords set for one user at once, one is set and the other is refused with PASSWORD_SET", async () => {
    const { authenticating } = await setup();
    await expectOneWinner(
      [
        authenticating.set({ user: "ben", password: "sea-shells-42" }),
        authenticating.set({ user: "ben", password: "other-password" }),
      ],
      PasswordSet,
    );
  });
});
