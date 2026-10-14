import { describe, expect, test } from "bun:test";
import {
  CannotAccept,
  CannotReject,
  CannotRemove,
  CannotRequest,
  FriendingConcept,
} from "../../src/concepts/Friending.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

async function setup() {
  const friending = new FriendingConcept(await testDatabase());
  /** All requests and friendships, as people, so a test can check nothing else changed. */
  const state = async () => ({
    requests: (await friending._requests({})).map((r) => [r.sender, r.recipient]).sort(),
    friendships: (await friending._friendships({})).map((f) => [f.user1, f.user2]).sort(),
  });
  return { friending, state };
}

describe("Friending", () => {
  test("its principle: Jamie's request to Morgan makes them friends when Morgan accepts, until either removes the friendship", async () => {
    const { friending } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    expect(await friending._requests({})).toEqual([
      { request, sender: "jamie", recipient: "morgan" },
    ]);
    expect(await friending._friendships({})).toEqual([]);

    const { friendship } = await friending.accept({ recipient: "morgan", request });
    expect(await friending._requests({})).toEqual([]);
    expect(await friending._friendships({})).toEqual([
      { friendship, user1: "jamie", user2: "morgan" },
    ]);

    // Either friend can end it; here Jamie, who sent the request, does.
    expect(await friending.remove({ user: "jamie", friendship })).toEqual({ friendship });
    expect(await friending._friendships({})).toEqual([]);
  });

  test("the recipient can reject a request, which removes it and makes no friendship", async () => {
    const { friending, state } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    expect(await friending.reject({ recipient: "morgan", request })).toEqual({ request });
    expect(await state()).toEqual({ requests: [], friendships: [] });
  });

  test("the other friend can remove a friendship too, and afterwards either can send a new request", async () => {
    const { friending, state } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    const { friendship } = await friending.accept({ recipient: "morgan", request });
    await friending.remove({ user: "morgan", friendship });
    expect(await state()).toEqual({ requests: [], friendships: [] });
    await friending.request({ sender: "morgan", recipient: "jamie" });
    expect(await state()).toEqual({ requests: [["morgan", "jamie"]], friendships: [] });
  });

  test("a request to oneself, a repeated request, a reverse request, or a request between friends is refused with CANNOT_REQUEST", async () => {
    const { friending, state } = await setup();
    const self = friending.request({ sender: "jamie", recipient: "jamie" });
    await expect(self).rejects.toThrow(CannotRequest);
    await expect(self).rejects.toThrow("A friend request cannot be created between these users.");

    await friending.request({ sender: "jamie", recipient: "morgan" });
    const pending = await state();
    await expect(friending.request({ sender: "jamie", recipient: "morgan" })).rejects.toThrow(
      CannotRequest,
    );
    await expect(friending.request({ sender: "morgan", recipient: "jamie" })).rejects.toThrow(
      CannotRequest,
    );
    expect(await state()).toEqual(pending);

    const [{ request }] = await friending._requests({});
    await friending.accept({ recipient: "morgan", request: request! });
    const friends = await state();
    for (const [sender, recipient] of [
      ["jamie", "morgan"],
      ["morgan", "jamie"],
    ] as const) {
      await expect(friending.request({ sender, recipient })).rejects.toThrow(CannotRequest);
    }
    expect(await state()).toEqual(friends);
  });

  test("only the recipient can accept or reject a request; anyone else is refused and the request stays", async () => {
    const { friending, state } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    const before = await state();
    for (const person of ["jamie", "taylor"]) {
      const accepted = friending.accept({ recipient: person, request });
      await expect(accepted).rejects.toThrow(CannotAccept);
      await expect(accepted).rejects.toThrow("This friend request cannot be accepted.");
      const rejected = friending.reject({ recipient: person, request });
      await expect(rejected).rejects.toThrow(CannotReject);
      await expect(rejected).rejects.toThrow("This friend request cannot be rejected.");
    }
    expect(await state()).toEqual(before);
  });

  test("an unknown, accepted, or rejected request can't be accepted or rejected again", async () => {
    const { friending, state } = await setup();
    await expect(friending.accept({ recipient: "morgan", request: "missing" })).rejects.toThrow(
      CannotAccept,
    );
    await expect(friending.reject({ recipient: "morgan", request: "missing" })).rejects.toThrow(
      CannotReject,
    );

    const { request: accepted } = await friending.request({ sender: "jamie", recipient: "morgan" });
    await friending.accept({ recipient: "morgan", request: accepted });
    const { request: rejected } = await friending.request({ sender: "sam", recipient: "morgan" });
    await friending.reject({ recipient: "morgan", request: rejected });
    const after = await state();

    for (const request of [accepted, rejected]) {
      await expect(friending.accept({ recipient: "morgan", request })).rejects.toThrow(
        CannotAccept,
      );
      await expect(friending.reject({ recipient: "morgan", request })).rejects.toThrow(
        CannotReject,
      );
    }
    expect(await state()).toEqual(after);
    expect(after.friendships).toEqual([["jamie", "morgan"]]);
  });

  test("only one of the two friends can remove a friendship, and only once", async () => {
    const { friending, state } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    const { friendship } = await friending.accept({ recipient: "morgan", request });
    const before = await state();

    const stranger = friending.remove({ user: "taylor", friendship });
    await expect(stranger).rejects.toThrow(CannotRemove);
    await expect(stranger).rejects.toThrow("This friendship cannot be removed by this user.");
    await expect(friending.remove({ user: "jamie", friendship: "missing" })).rejects.toThrow(
      CannotRemove,
    );
    expect(await state()).toEqual(before);

    await friending.remove({ user: "jamie", friendship });
    await expect(friending.remove({ user: "morgan", friendship })).rejects.toThrow(CannotRemove);
    expect(await state()).toEqual({ requests: [], friendships: [] });
  });

  test("accepting one request or removing one friendship leaves every other request and friendship alone", async () => {
    const { friending, state } = await setup();
    const { request: fromJamie } = await friending.request({
      sender: "jamie",
      recipient: "morgan",
    });
    await friending.request({ sender: "sam", recipient: "morgan" });
    await friending.request({ sender: "taylor", recipient: "jamie" });

    await friending.accept({ recipient: "morgan", request: fromJamie });
    expect(await state()).toEqual({
      requests: [
        ["sam", "morgan"],
        ["taylor", "jamie"],
      ],
      friendships: [["jamie", "morgan"]],
    });

    const [{ request: fromTaylor }] = (await friending._requests({})).filter(
      (r) => r.sender === "taylor",
    );
    const { friendship: jamieTaylor } = await friending.accept({
      recipient: "jamie",
      request: fromTaylor!,
    });
    await friending.remove({ user: "taylor", friendship: jamieTaylor });
    expect(await state()).toEqual({
      requests: [["sam", "morgan"]],
      friendships: [["jamie", "morgan"]],
    });
  });

  test("of an accept and a reject of one request at once, exactly one succeeds, and at most one friendship results", async () => {
    const { friending, state } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    await expectOneWinner(
      [
        friending.accept({ recipient: "morgan", request }),
        friending.reject({ recipient: "morgan", request }),
      ],
      CannotAccept,
      CannotReject,
    );
    const after = await state();
    expect(after.requests).toEqual([]);
    expect(after.friendships.length).toBeLessThanOrEqual(1);
  });

  test("of two accepts of one request at once, one succeeds, and exactly one friendship results", async () => {
    const { friending, state } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    await expectOneWinner(
      [
        friending.accept({ recipient: "morgan", request }),
        friending.accept({ recipient: "morgan", request }),
      ],
      CannotAccept,
    );
    expect(await state()).toEqual({ requests: [], friendships: [["jamie", "morgan"]] });
  });

  test("of two requests between the same people at once, in either direction, exactly one is made", async () => {
    const { friending, state } = await setup();
    await expectOneWinner(
      [
        friending.request({ sender: "jamie", recipient: "morgan" }),
        friending.request({ sender: "morgan", recipient: "jamie" }),
      ],
      CannotRequest,
    );
    expect((await state()).requests).toHaveLength(1);
    await expectOneWinner(
      [
        friending.request({ sender: "sam", recipient: "taylor" }),
        friending.request({ sender: "sam", recipient: "taylor" }),
      ],
      CannotRequest,
    );
    expect((await state()).requests).toHaveLength(2);
  });

  test("of two removals of one friendship at once, exactly one succeeds", async () => {
    const { friending, state } = await setup();
    const { request } = await friending.request({ sender: "jamie", recipient: "morgan" });
    const { friendship } = await friending.accept({ recipient: "morgan", request });
    await expectOneWinner(
      [
        friending.remove({ user: "jamie", friendship }),
        friending.remove({ user: "morgan", friendship }),
      ],
      CannotRemove,
    );
    expect(await state()).toEqual({ requests: [], friendships: [] });
  });
});
