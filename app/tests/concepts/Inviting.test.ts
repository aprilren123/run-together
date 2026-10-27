import { describe, expect, test } from "bun:test";
import {
  AlreadyInvited,
  CannotAccept,
  CannotDecline,
  CannotInviteSelf,
  InvitingConcept,
} from "../../src/concepts/Inviting.ts";
import { testDatabase } from "../support/mongo.ts";
import { expectOneWinner } from "../support/race.ts";

async function setup() {
  let now = new Date("2026-11-01T08:00:00Z");
  const inviting = new InvitingConcept(await testDatabase(), () => now);
  const later = (seconds: number) => (now = new Date(now.getTime() + seconds * 1000));
  /** The invitations to `event` as [invitee, status], newest first. */
  const to = async (event: string) =>
    (await inviting._for({ event })).map((row) => [row.invitee, row.status]);
  return { inviting, later, to };
}

describe("Inviting", () => {
  test("its principle: April invites Jamie, who accepts, and Taylor, who declines and can be invited again", async () => {
    const { inviting, later, to } = await setup();
    const { invitation: jamies } = await inviting.invite({
      inviter: "april",
      invitee: "jamie",
      event: "run-1",
    });
    expect(await inviting._get({ invitation: jamies })).toEqual([
      { inviter: "april", invitee: "jamie", event: "run-1", status: "PENDING" },
    ]);
    expect(await inviting._pending({ invitee: "jamie", event: "run-1" })).toEqual([
      { invitation: jamies, inviter: "april" },
    ]);
    await expect(
      inviting.invite({ inviter: "april", invitee: "jamie", event: "run-1" }),
    ).rejects.toThrow(AlreadyInvited);

    later(60);
    expect(await inviting.accept({ invitee: "jamie", invitation: jamies })).toEqual({
      invitation: jamies,
      event: "run-1",
      inviter: "april",
    });
    expect(await inviting._pending({ invitee: "jamie", event: "run-1" })).toEqual([]);
    await expect(inviting.accept({ invitee: "jamie", invitation: jamies })).rejects.toThrow(
      CannotAccept,
    );
    await expect(inviting.decline({ invitee: "jamie", invitation: jamies })).rejects.toThrow(
      CannotDecline,
    );

    later(60);
    const { invitation: taylors } = await inviting.invite({
      inviter: "april",
      invitee: "taylor",
      event: "run-1",
    });
    expect(await inviting.decline({ invitee: "taylor", invitation: taylors })).toEqual({
      invitation: taylors,
    });
    later(60);
    const { invitation: again } = await inviting.invite({
      inviter: "april",
      invitee: "taylor",
      event: "run-1",
    });
    expect(await to("run-1")).toEqual([
      ["taylor", "PENDING"],
      ["taylor", "DECLINED"],
      ["jamie", "ACCEPTED"],
    ]);
    expect(again).not.toBe(taylors);
  });

  test("_to lists what a person received, newest first, with when each was sent and answered", async () => {
    const { inviting, later } = await setup();
    const { invitation: first } = await inviting.invite({
      inviter: "april",
      invitee: "jamie",
      event: "run-1",
    });
    later(30);
    const { invitation: second } = await inviting.invite({
      inviter: "morgan",
      invitee: "jamie",
      event: "run-2",
    });
    later(30);
    await inviting.decline({ invitee: "jamie", invitation: first });
    expect(await inviting._to({ invitee: "jamie" })).toEqual([
      {
        invitation: second,
        inviter: "morgan",
        event: "run-2",
        status: "PENDING",
        sent: new Date("2026-11-01T08:00:30Z"),
        answered: null,
      },
      {
        invitation: first,
        inviter: "april",
        event: "run-1",
        status: "DECLINED",
        sent: new Date("2026-11-01T08:00:00Z"),
        answered: new Date("2026-11-01T08:01:00Z"),
      },
    ]);
    expect(await inviting._to({ invitee: "april" })).toEqual([]);
    expect(await inviting._get({ invitation: "missing" })).toEqual([]);
  });

  test("nobody can invite themselves", async () => {
    const { inviting, to } = await setup();
    const refused = inviting.invite({ inviter: "april", invitee: "april", event: "run-1" });
    await expect(refused).rejects.toThrow(CannotInviteSelf);
    await expect(refused).rejects.toThrow("You can't invite yourself.");
    expect(await to("run-1")).toEqual([]);
  });

  test("only the invitee can answer, and an unknown invitation can't be answered", async () => {
    const { inviting, to } = await setup();
    const { invitation } = await inviting.invite({
      inviter: "april",
      invitee: "jamie",
      event: "run-1",
    });
    for (const invitee of ["april", "taylor"]) {
      await expect(inviting.accept({ invitee, invitation })).rejects.toThrow(
        "This invitation can't be accepted.",
      );
      await expect(inviting.decline({ invitee, invitation })).rejects.toThrow(
        "This invitation can't be declined.",
      );
    }
    await expect(inviting.accept({ invitee: "jamie", invitation: "missing" })).rejects.toThrow(
      CannotAccept,
    );
    expect(await to("run-1")).toEqual([["jamie", "PENDING"]]);
  });

  test("each person's invitations to each event are kept apart", async () => {
    const { inviting, to } = await setup();
    await inviting.invite({ inviter: "april", invitee: "jamie", event: "run-1" });
    await inviting.invite({ inviter: "april", invitee: "jamie", event: "run-2" });
    await inviting.invite({ inviter: "april", invitee: "taylor", event: "run-1" });
    expect(await to("run-1")).toEqual([
      ["taylor", "PENDING"],
      ["jamie", "PENDING"],
    ]);
    expect(await to("run-2")).toEqual([["jamie", "PENDING"]]);
  });

  test("of two invitations sent at once to the same person and event, exactly one is kept", async () => {
    const { inviting, to } = await setup();
    const send = () => inviting.invite({ inviter: "april", invitee: "jamie", event: "run-1" });
    await expectOneWinner([send(), send()], AlreadyInvited);
    expect(await to("run-1")).toEqual([["jamie", "PENDING"]]);
  });

  test("of two answers at once, two accepts or an accept and a decline, exactly one takes effect", async () => {
    const { inviting } = await setup();
    const { invitation } = await inviting.invite({
      inviter: "april",
      invitee: "jamie",
      event: "run-1",
    });
    const accept = () => inviting.accept({ invitee: "jamie", invitation });
    await expectOneWinner([accept(), accept()], CannotAccept);

    const { invitation: other } = await inviting.invite({
      inviter: "april",
      invitee: "jamie",
      event: "run-2",
    });
    await expectOneWinner(
      [
        inviting.accept({ invitee: "jamie", invitation: other }),
        inviting.decline({ invitee: "jamie", invitation: other }),
      ],
      CannotAccept,
      CannotDecline,
    );
    const [answer] = await inviting._get({ invitation: other });
    expect(["ACCEPTED", "DECLINED"]).toContain(answer!.status);
  });
});
