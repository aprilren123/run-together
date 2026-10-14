import { describe, expect, test } from "bun:test";
import {
  InvalidUsername,
  RegisteringConcept,
  type User,
  UsernameTaken,
} from "../../src/concepts/Registering/Registering.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

async function setup() {
  return { registering: new RegisteringConcept(await testDatabase()) };
}

describe("Registering", () => {
  test("its principle: Sam finds Maya by her username, and Ben registers another when hers is taken", async () => {
    const { registering } = await setup();

    const { user: maya } = await registering.register({ username: "maya" });
    expect(await registering._byUsername({ username: "maya" })).toEqual([{ user: maya }]);
    expect(await registering._username({ user: maya })).toEqual([{ username: "maya" }]);

    const taken = registering.register({ username: "maya" });
    await expect(taken).rejects.toThrow(UsernameTaken);
    await expect(taken).rejects.toThrow("That username is taken.");
    const { user: ben } = await registering.register({ username: "ben" });
    expect(ben).not.toBe(maya);
  });

  test("a username must have 3 to 32 ASCII letters, digits, underscores, or hyphens", async () => {
    const { registering } = await setup();
    for (const username of ["ma", "x".repeat(33), "maya lee", "maya!", ""]) {
      await expect(registering.register({ username })).rejects.toThrow(InvalidUsername);
    }
    for (const username of ["abc", "x".repeat(32), "maya_lee-2"]) {
      await registering.register({ username });
    }
  });

  test("usernames are case-sensitive, so `Maya` is a different username from `maya`", async () => {
    const { registering } = await setup();
    const { user: maya } = await registering.register({ username: "maya" });
    const { user: other } = await registering.register({ username: "Maya" });
    expect(other).not.toBe(maya);
  });

  test("of two registrations of one username at once, one succeeds and the other is refused with USERNAME_TAKEN", async () => {
    const { registering } = await setup();
    await expectOneWinner(
      [registering.register({ username: "maya" }), registering.register({ username: "maya" })],
      UsernameTaken,
    );
  });

  test("_search finds up to 10 usernames containing the text, ignoring case, in alphabetical order", async () => {
    const { registering } = await setup();
    const users: Record<string, User> = {};
    for (const username of ["maya", "Mayra", "jamaya", "morgan", "jamie"]) {
      users[username] = (await registering.register({ username })).user;
    }
    expect(await registering._search({ text: "MAY" })).toEqual([
      { user: users.jamaya, username: "jamaya" },
      { user: users.maya, username: "maya" },
      { user: users.Mayra, username: "Mayra" },
    ]);
    expect(await registering._search({ text: "zz" })).toEqual([]);

    for (let i = 0; i < 12; i += 1)
      await registering.register({ username: `runner${String(i).padStart(2, "0")}` });
    const many = await registering._search({ text: "runner" });
    expect(many.map((row) => row.username)).toEqual(
      Array.from({ length: 10 }, (_, i) => `runner${String(i).padStart(2, "0")}`),
    );
  });

  test("_search needs 2 to 32 characters, and treats regular-expression characters as text", async () => {
    const { registering } = await setup();
    await registering.register({ username: "maya" });
    for (const text of ["m", "x".repeat(33), ".*", "ma.a", "(m"]) {
      expect(await registering._search({ text })).toEqual([]);
    }
  });

  test("_search with empty text lists the first 10 users alphabetically, and nobody when there are none", async () => {
    const { registering } = await setup();
    expect(await registering._search({ text: "" })).toEqual([]);
    const names = [
      "kai",
      "Ana",
      "bob",
      "Cyd",
      "dee",
      "Eli",
      "fay",
      "Gus",
      "hal",
      "Ivy",
      "joe",
      "Lua",
    ];
    for (const username of names) await registering.register({ username });
    expect((await registering._search({ text: "" })).map((row) => row.username)).toEqual([
      "Ana",
      "bob",
      "Cyd",
      "dee",
      "Eli",
      "fay",
      "Gus",
      "hal",
      "Ivy",
      "joe",
    ]);
  });

  test("_username and _byUsername return no row for an unknown user or username", async () => {
    const { registering } = await setup();
    expect(await registering._username({ user: "missing" as User })).toEqual([]);
    expect(await registering._byUsername({ username: "nobody" })).toEqual([]);
  });

  test("a refused registration stores nothing, and a taken username keeps its original user", async () => {
    const { registering } = await setup();
    const { user: maya } = await registering.register({ username: "maya" });
    for (const username of ["ma", "maya lee", "x".repeat(33)]) {
      const refused = registering.register({ username });
      await expect(refused).rejects.toThrow(InvalidUsername);
      await expect(refused).rejects.toThrow(
        "A username must have 3 to 32 letters, digits, underscores, or hyphens.",
      );
      expect(await registering._byUsername({ username })).toEqual([]);
    }
    await expect(registering.register({ username: "maya" })).rejects.toThrow(UsernameTaken);
    expect(await registering._byUsername({ username: "maya" })).toEqual([{ user: maya }]);
    expect(await registering._search({ text: "" })).toEqual([{ user: maya, username: "maya" }]);
  });
});
