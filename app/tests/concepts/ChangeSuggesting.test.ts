import { describe, expect, test } from "bun:test";
import {
  CannotAccept,
  CannotReject,
  CannotWithdraw,
  ChangeSuggestingConcept,
  SameUser,
} from "../../src/concepts/ChangeSuggesting.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

const LATER = { startTime: "2026-11-07T10:30" };

async function setup() {
  const suggesting = new ChangeSuggestingConcept(await testDatabase());
  const statusOf = async (suggestion: string) =>
    (await suggesting._all({})).find((row) => row.suggestion === suggestion)?.status;
  const all = async () =>
    (await suggesting._all({}))
      .map(({ suggestion, ...rest }) => ({ suggestion, ...rest }))
      .sort((a, b) => a.suggestion.localeCompare(b.suggestion));
  return { suggesting, statusOf, all };
}

describe("ChangeSuggesting", () => {
  test("its principle: Jamie suggests a change to Morgan's run, which stays pending until Morgan accepts it", async () => {
    const { suggesting } = await setup();
    const { suggestion } = await suggesting.suggest({
      suggester: "jamie",
      decider: "morgan",
      event: "run-1",
      change: LATER,
    });
    expect(await suggesting._all({})).toEqual([
      {
        suggestion,
        suggester: "jamie",
        decider: "morgan",
        event: "run-1",
        change: LATER,
        status: "PENDING",
      },
    ]);

    expect(await suggesting.accept({ decider: "morgan", suggestion })).toEqual({
      event: "run-1",
      change: LATER,
      suggester: "jamie",
    });
    expect((await suggesting._all({}))[0]?.status).toBe("ACCEPTED");
  });

  test("the decider can reject a pending suggestion, and the suggester can withdraw one", async () => {
    const { suggesting, statusOf } = await setup();
    const { suggestion: rejected } = await suggesting.suggest({
      suggester: "jamie",
      decider: "morgan",
      event: "run-1",
      change: LATER,
    });
    expect(await suggesting.reject({ decider: "morgan", suggestion: rejected })).toEqual({
      suggestion: rejected,
    });
    expect(await statusOf(rejected)).toBe("REJECTED");

    const { suggestion: withdrawn } = await suggesting.suggest({
      suggester: "jamie",
      decider: "morgan",
      event: "run-1",
      change: { distance: 6 },
    });
    expect(await suggesting.withdraw({ suggester: "jamie", suggestion: withdrawn })).toEqual({
      suggestion: withdrawn,
    });
    expect(await statusOf(withdrawn)).toBe("WITHDRAWN");
  });

  test("a change is stored and returned exactly as given, whatever its shape", async () => {
    const { suggesting } = await setup();
    const change = { location: "Harvard Bridge", distance: 6, pace: 8.5, details: "Bring water" };
    const { suggestion: several } = await suggesting.suggest({
      suggester: "jamie",
      decider: "morgan",
      event: "run-1",
      change,
    });
    const { suggestion: plain } = await suggesting.suggest({
      suggester: "jamie",
      decider: "morgan",
      event: "run-2",
      change: "2026-11-07T10:30",
    });
    expect((await suggesting.accept({ decider: "morgan", suggestion: several })).change).toEqual(
      change,
    );
    expect((await suggesting.accept({ decider: "morgan", suggestion: plain })).change).toBe(
      "2026-11-07T10:30",
    );
  });

  test("suggesting a change to oneself is refused with SAME_USER, and nothing is stored", async () => {
    const { suggesting } = await setup();
    const refused = suggesting.suggest({
      suggester: "morgan",
      decider: "morgan",
      event: "run-1",
      change: LATER,
    });
    await expect(refused).rejects.toThrow(SameUser);
    await expect(refused).rejects.toThrow("A user cannot suggest a change to themselves.");
    expect(await suggesting._all({})).toEqual([]);
  });

  test("only the decider can accept or reject, and only the suggester can withdraw; others change nothing", async () => {
    const { suggesting, all } = await setup();
    const { suggestion } = await suggesting.suggest({
      suggester: "jamie",
      decider: "morgan",
      event: "run-1",
      change: LATER,
    });
    const before = await all();

    for (const person of ["jamie", "taylor"]) {
      const accepted = suggesting.accept({ decider: person, suggestion });
      await expect(accepted).rejects.toThrow(CannotAccept);
      await expect(accepted).rejects.toThrow("This suggestion cannot be accepted.");
      const rejected = suggesting.reject({ decider: person, suggestion });
      await expect(rejected).rejects.toThrow(CannotReject);
      await expect(rejected).rejects.toThrow("This suggestion cannot be rejected.");
    }
    for (const person of ["morgan", "taylor"]) {
      const withdrawn = suggesting.withdraw({ suggester: person, suggestion });
      await expect(withdrawn).rejects.toThrow(CannotWithdraw);
      await expect(withdrawn).rejects.toThrow("This suggestion cannot be withdrawn.");
    }
    expect(await all()).toEqual(before);
  });

  test("once accepted, rejected, or withdrawn, a suggestion can't be decided or withdrawn again", async () => {
    const { suggesting, all } = await setup();
    const made: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      made.push(
        (
          await suggesting.suggest({
            suggester: "jamie",
            decider: "morgan",
            event: `run-${i}`,
            change: LATER,
          })
        ).suggestion,
      );
    }
    const [accepted, rejected, withdrawn] = made as [string, string, string];
    await suggesting.accept({ decider: "morgan", suggestion: accepted });
    await suggesting.reject({ decider: "morgan", suggestion: rejected });
    await suggesting.withdraw({ suggester: "jamie", suggestion: withdrawn });
    const decided = await all();

    for (const suggestion of [...made, "missing"]) {
      await expect(suggesting.accept({ decider: "morgan", suggestion })).rejects.toThrow(
        CannotAccept,
      );
      await expect(suggesting.reject({ decider: "morgan", suggestion })).rejects.toThrow(
        CannotReject,
      );
      await expect(suggesting.withdraw({ suggester: "jamie", suggestion })).rejects.toThrow(
        CannotWithdraw,
      );
    }
    expect(await all()).toEqual(decided);
    expect(decided.map((s) => s.status).sort()).toEqual(["ACCEPTED", "REJECTED", "WITHDRAWN"]);
  });

  test("accepting one suggestion leaves the decider's other suggestions pending", async () => {
    const { suggesting, statusOf } = await setup();
    const ids: string[] = [];
    for (const [suggester, event] of [
      ["jamie", "run-1"],
      ["jamie", "run-2"],
      ["taylor", "run-1"],
    ] as const) {
      ids.push(
        (await suggesting.suggest({ suggester, decider: "morgan", event, change: LATER }))
          .suggestion,
      );
    }
    await suggesting.accept({ decider: "morgan", suggestion: ids[0]! });
    expect(await Promise.all(ids.map(statusOf))).toEqual(["ACCEPTED", "PENDING", "PENDING"]);
    await suggesting.reject({ decider: "morgan", suggestion: ids[2]! });
    expect(await Promise.all(ids.map(statusOf))).toEqual(["ACCEPTED", "PENDING", "REJECTED"]);
  });

  test("of an accept and a reject of one suggestion at once, exactly one succeeds", async () => {
    const { suggesting, statusOf } = await setup();
    const { suggestion } = await suggesting.suggest({
      suggester: "jamie",
      decider: "morgan",
      event: "run-1",
      change: LATER,
    });
    await expectOneWinner(
      [
        suggesting.accept({ decider: "morgan", suggestion }),
        suggesting.reject({ decider: "morgan", suggestion }),
      ],
      CannotAccept,
      CannotReject,
    );
    expect(["ACCEPTED", "REJECTED"]).toContain((await statusOf(suggestion))!);
  });

  test("of two accepts, or an accept and a withdrawal, of one suggestion at once, exactly one succeeds", async () => {
    const { suggesting } = await setup();
    const make = async () =>
      (
        await suggesting.suggest({
          suggester: "jamie",
          decider: "morgan",
          event: "run-1",
          change: LATER,
        })
      ).suggestion;
    const twice = await make();
    await expectOneWinner(
      [
        suggesting.accept({ decider: "morgan", suggestion: twice }),
        suggesting.accept({ decider: "morgan", suggestion: twice }),
      ],
      CannotAccept,
    );
    const raced = await make();
    await expectOneWinner(
      [
        suggesting.accept({ decider: "morgan", suggestion: raced }),
        suggesting.withdraw({ suggester: "jamie", suggestion: raced }),
      ],
      CannotAccept,
      CannotWithdraw,
    );
  });

  test("_all answers no rows when there are no suggestions", async () => {
    const { suggesting } = await setup();
    expect(await suggesting._all({})).toEqual([]);
  });
});
