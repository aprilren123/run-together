import { describe, expect, test } from "bun:test";
import { AlreadyJoined, JoiningConcept, NotJoined } from "../../src/concepts/Joining.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

async function setup() {
  const joining = new JoiningConcept(await testDatabase());
  /** Every participation as [user, event], in a stable order. */
  const state = async () =>
    (await joining._all({}))
      .map((row) => [row.user, row.event])
      .sort((a, b) => a.join().localeCompare(b.join()));
  return { joining, state };
}

describe("Joining", () => {
  test("its principle: after Jamie joins Morgan's run she is a participant in it, until she leaves", async () => {
    const { joining } = await setup();
    const { participation } = await joining.join({ user: "jamie", event: "run-1" });
    expect(await joining._all({})).toEqual([{ participation, user: "jamie", event: "run-1" }]);

    expect(await joining.leave({ user: "jamie", event: "run-1" })).toEqual({ participation });
    expect(await joining._all({})).toEqual([]);
  });

  test("a user can join several events, and several users one event; each participation is separate", async () => {
    const { joining, state } = await setup();
    await joining.join({ user: "jamie", event: "run-1" });
    await joining.join({ user: "jamie", event: "run-2" });
    await joining.join({ user: "taylor", event: "run-1" });
    expect(await state()).toEqual([
      ["jamie", "run-1"],
      ["jamie", "run-2"],
      ["taylor", "run-1"],
    ]);

    // Leaving one run leaves only that participation; the others are untouched.
    await joining.leave({ user: "jamie", event: "run-1" });
    expect(await state()).toEqual([
      ["jamie", "run-2"],
      ["taylor", "run-1"],
    ]);
  });

  test("joining an event twice is refused with ALREADY_JOINED, and leaves one participation", async () => {
    const { joining, state } = await setup();
    const { participation } = await joining.join({ user: "jamie", event: "run-1" });
    const again = joining.join({ user: "jamie", event: "run-1" });
    await expect(again).rejects.toThrow(AlreadyJoined);
    await expect(again).rejects.toThrow("The user has already joined this event.");
    expect(await joining._all({})).toEqual([{ participation, user: "jamie", event: "run-1" }]);
    expect(await state()).toHaveLength(1);
  });

  test("leaving an event the user hasn't joined is refused with NOT_JOINED, and changes nothing", async () => {
    const { joining, state } = await setup();
    await joining.join({ user: "jamie", event: "run-1" });
    await joining.join({ user: "taylor", event: "run-2" });
    const before = await state();

    for (const [user, event] of [
      ["jamie", "run-2"],
      ["taylor", "run-1"],
      ["sam", "run-1"],
    ] as const) {
      const refused = joining.leave({ user, event });
      await expect(refused).rejects.toThrow(NotJoined);
      await expect(refused).rejects.toThrow("The user has not joined this event.");
    }
    expect(await state()).toEqual(before);
  });

  test("leaving twice is refused the second time, and a user can join again after leaving", async () => {
    const { joining, state } = await setup();
    await joining.join({ user: "jamie", event: "run-1" });
    await joining.leave({ user: "jamie", event: "run-1" });
    await expect(joining.leave({ user: "jamie", event: "run-1" })).rejects.toThrow(NotJoined);
    const { participation } = await joining.join({ user: "jamie", event: "run-1" });
    expect(await joining._all({})).toEqual([{ participation, user: "jamie", event: "run-1" }]);
    expect(await state()).toHaveLength(1);
  });

  test("of two joins of one event at once, one succeeds and the other is refused with ALREADY_JOINED", async () => {
    const { joining, state } = await setup();
    await expectOneWinner(
      [
        joining.join({ user: "jamie", event: "run-1" }),
        joining.join({ user: "jamie", event: "run-1" }),
      ],
      AlreadyJoined,
    );
    expect(await state()).toEqual([["jamie", "run-1"]]);
  });

  test("_all answers no rows when nobody has joined anything", async () => {
    const { joining } = await setup();
    expect(await joining._all({})).toEqual([]);
  });
});
