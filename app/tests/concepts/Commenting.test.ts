import { describe, expect, test } from "bun:test";
import {
  CannotDelete,
  CommentNotFound,
  CommentingConcept,
  DuplicateComment,
  InvalidComment,
} from "../../src/concepts/Commenting.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

async function setup() {
  let now = new Date("2026-11-01T08:00:00Z");
  const commenting = new CommentingConcept(await testDatabase(), () => now);
  const later = (seconds: number) => (now = new Date(now.getTime() + seconds * 1000));
  /** The comments on `target` as [author, text], in the order _on gives them. */
  const on = async (target: string) =>
    (await commenting._on({ target })).map((row) => [row.author, row.text]);
  return { commenting, later, on };
}

describe("Commenting", () => {
  test("its principle: Jamie and Taylor comment on Morgan's run, oldest first, and Jamie deletes hers", async () => {
    const { commenting, later } = await setup();
    const { comment: jamies } = await commenting.post({
      author: "jamie",
      target: "run-1",
      text: "Can we meet at the boathouse instead?",
    });
    later(30);
    const { comment: taylors } = await commenting.post({
      author: "taylor",
      target: "run-1",
      text: "I'm in!",
    });
    expect(await commenting._on({ target: "run-1" })).toEqual([
      {
        comment: jamies,
        author: "jamie",
        text: "Can we meet at the boathouse instead?",
        at: new Date("2026-11-01T08:00:00Z"),
      },
      { comment: taylors, author: "taylor", text: "I'm in!", at: new Date("2026-11-01T08:00:30Z") },
    ]);

    expect(await commenting.delete({ author: "jamie", comment: jamies })).toEqual({
      comment: jamies,
    });
    expect((await commenting._on({ target: "run-1" })).map((c) => c.comment)).toEqual([taylors]);
  });

  test("a comment is stored without leading and trailing spaces, and _get says who wrote it and where", async () => {
    const { commenting } = await setup();
    const { comment } = await commenting.post({
      author: "jamie",
      target: "run-1",
      text: "   See you there!  ",
    });
    expect((await commenting._on({ target: "run-1" }))[0]?.text).toBe("See you there!");
    expect(await commenting._get({ comment })).toEqual([{ author: "jamie", target: "run-1" }]);
    expect(await commenting._get({ comment: "missing" })).toEqual([]);
  });

  test("each target has its own comments", async () => {
    const { commenting, on } = await setup();
    await commenting.post({ author: "jamie", target: "run-1", text: "First" });
    await commenting.post({ author: "jamie", target: "run-2", text: "Other run" });
    await commenting.post({ author: "sam", target: "run-1", text: "Second" });
    expect(await on("run-1")).toEqual([
      ["jamie", "First"],
      ["sam", "Second"],
    ]);
    expect(await on("run-2")).toEqual([["jamie", "Other run"]]);
    expect(await on("run-3")).toEqual([]);
  });

  test("an empty, blank, or over-long comment is refused with INVALID_COMMENT, and nothing is stored", async () => {
    const { commenting, on } = await setup();
    for (const text of ["", "   ", "\n\t", "x".repeat(501), 42 as unknown as string]) {
      const refused = commenting.post({ author: "jamie", target: "run-1", text });
      await expect(refused).rejects.toThrow(InvalidComment);
      await expect(refused).rejects.toThrow("A comment must have 1 to 500 characters.");
    }
    expect(await on("run-1")).toEqual([]);
    await commenting.post({ author: "jamie", target: "run-1", text: "x".repeat(500) });
    expect(await on("run-1")).toHaveLength(1);
  });

  test("the same comment again within 60 seconds is refused with DUPLICATE_COMMENT; later, or from someone else, it's fine", async () => {
    const { commenting, later, on } = await setup();
    await commenting.post({ author: "jamie", target: "run-1", text: "See you there!" });
    for (const text of ["See you there!", "  See you there!  "]) {
      const again = commenting.post({ author: "jamie", target: "run-1", text });
      await expect(again).rejects.toThrow(DuplicateComment);
      await expect(again).rejects.toThrow("You just posted that comment.");
    }
    later(59);
    await expect(
      commenting.post({ author: "jamie", target: "run-1", text: "See you there!" }),
    ).rejects.toThrow(DuplicateComment);
    expect(await on("run-1")).toEqual([["jamie", "See you there!"]]);

    // Someone else, or the same text on another run, isn't a repeat.
    await commenting.post({ author: "sam", target: "run-1", text: "See you there!" });
    await commenting.post({ author: "jamie", target: "run-2", text: "See you there!" });
    later(2);
    await commenting.post({ author: "jamie", target: "run-1", text: "See you there!" });
    expect(await on("run-1")).toEqual([
      ["jamie", "See you there!"],
      ["sam", "See you there!"],
      ["jamie", "See you there!"],
    ]);
  });

  test("of two identical comments posted at once, as from a double click, exactly one is stored", async () => {
    const { commenting, on } = await setup();
    const post = () => commenting.post({ author: "jamie", target: "run-1", text: "On my way" });
    await expectOneWinner([post(), post()], DuplicateComment);
    expect(await on("run-1")).toEqual([["jamie", "On my way"]]);
  });

  test("only the author can delete a comment; anyone else is refused with CANNOT_DELETE and it stays", async () => {
    const { commenting, on } = await setup();
    const { comment } = await commenting.post({ author: "jamie", target: "run-1", text: "Hi" });
    for (const author of ["taylor", "morgan"]) {
      const refused = commenting.delete({ author, comment });
      await expect(refused).rejects.toThrow(CannotDelete);
      await expect(refused).rejects.toThrow("This comment can't be deleted.");
    }
    await expect(commenting.delete({ author: "jamie", comment: "missing" })).rejects.toThrow(
      CannotDelete,
    );
    expect(await on("run-1")).toEqual([["jamie", "Hi"]]);
    await commenting.delete({ author: "jamie", comment });
    await expect(commenting.delete({ author: "jamie", comment })).rejects.toThrow(CannotDelete);
  });

  test("remove takes away any comment once, and refuses an unknown one with COMMENT_NOT_FOUND", async () => {
    const { commenting, on } = await setup();
    const { comment } = await commenting.post({ author: "jamie", target: "run-1", text: "Hi" });
    await commenting.post({ author: "sam", target: "run-1", text: "Hello" });
    expect(await commenting.remove({ comment })).toEqual({ comment });
    expect(await on("run-1")).toEqual([["sam", "Hello"]]);
    const again = commenting.remove({ comment });
    await expect(again).rejects.toThrow(CommentNotFound);
    await expect(again).rejects.toThrow("There is no such comment.");
    expect(await on("run-1")).toEqual([["sam", "Hello"]]);
  });

  test("of a delete and a remove of one comment at once, exactly one succeeds", async () => {
    const { commenting, on } = await setup();
    const { comment } = await commenting.post({ author: "jamie", target: "run-1", text: "Hi" });
    await expectOneWinner(
      [commenting.delete({ author: "jamie", comment }), commenting.remove({ comment })],
      CannotDelete,
      CommentNotFound,
    );
    expect(await on("run-1")).toEqual([]);
  });

  test("comments posted at the same instant are listed in the order they were posted", async () => {
    const { commenting, on } = await setup();
    const texts = ["one", "two", "three", "four", "five", "six", "seven", "eight"];
    for (const text of texts) await commenting.post({ author: "jamie", target: "run-1", text });
    expect((await on("run-1")).map(([, text]) => text)).toEqual(texts);
  });
});
