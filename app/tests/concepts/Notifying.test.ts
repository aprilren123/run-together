import { describe, expect, test } from "bun:test";
import { NotificationNotFound, NotifyingConcept } from "../../src/concepts/Notifying.ts";
import { testDatabase } from "../support/mongo.ts";

async function setup() {
  let now = new Date("2026-11-01T08:00:00Z");
  const notifying = new NotifyingConcept(await testDatabase(), () => now);
  const later = (minutes: number) => (now = new Date(now.getTime() + minutes * 60_000));
  return { notifying, later };
}

describe("Notifying", () => {
  test("its principle: Jamie is told about Morgan's suggestion, unread and first, until she marks it read", async () => {
    const { notifying, later } = await setup();
    const { notification: older } = await notifying.notify({
      recipient: "jamie",
      actor: "taylor",
      subject: "run-1",
      kind: "RUN_EDITED",
    });
    later(5);
    const { notification } = await notifying.notify({
      recipient: "jamie",
      actor: "morgan",
      subject: "run-2",
      kind: "SUGGESTION_RECEIVED",
    });

    const listed = await notifying._for({ recipient: "jamie" });
    expect(listed.map((row) => row.notification)).toEqual([notification, older]);
    expect(listed[0]).toMatchObject({
      actor: "morgan",
      subject: "run-2",
      kind: "SUGGESTION_RECEIVED",
      at: new Date("2026-11-01T08:05:00Z"),
      read: false,
    });

    expect(await notifying.markRead({ recipient: "jamie", notification })).toEqual({
      notification,
    });
    const after = await notifying._for({ recipient: "jamie" });
    expect(after.map((row) => [row.notification, row.read])).toEqual([
      [notification, true],
      [older, false],
    ]);
    expect(await notifying._for({ recipient: "morgan" })).toEqual([]);
  });

  test("only the recipient can mark a notification read; anyone else is refused with NOT_FOUND", async () => {
    const { notifying } = await setup();
    const { notification } = await notifying.notify({
      recipient: "jamie",
      actor: "morgan",
      subject: "run-1",
      kind: "RUN_CANCELED",
    });
    await expect(notifying.markRead({ recipient: "morgan", notification })).rejects.toThrow(
      NotificationNotFound,
    );
    await expect(
      notifying.markRead({ recipient: "jamie", notification: "missing" }),
    ).rejects.toThrow(NotificationNotFound);
    expect((await notifying._for({ recipient: "jamie" }))[0]?.read).toBe(false);
  });

  test("markAllRead marks every one of the recipient's notifications, and no one else's", async () => {
    const { notifying } = await setup();
    for (const recipient of ["jamie", "jamie", "taylor"]) {
      await notifying.notify({ recipient, actor: "morgan", subject: "run-1", kind: "RUN_EDITED" });
    }
    expect(await notifying.markAllRead({ recipient: "jamie" })).toEqual({ recipient: "jamie" });
    expect((await notifying._for({ recipient: "jamie" })).every((row) => row.read)).toBe(true);
    expect((await notifying._for({ recipient: "taylor" })).every((row) => !row.read)).toBe(true);
  });

  test("marking a notification read twice keeps it read, and marking all read with none unread changes nothing", async () => {
    const { notifying } = await setup();
    expect(await notifying.markAllRead({ recipient: "jamie" })).toEqual({ recipient: "jamie" });
    expect(await notifying._for({ recipient: "jamie" })).toEqual([]);

    const { notification } = await notifying.notify({
      recipient: "jamie",
      actor: "morgan",
      subject: "run-1",
      kind: "RUN_EDITED",
    });
    await notifying.markRead({ recipient: "jamie", notification });
    expect(await notifying.markRead({ recipient: "jamie", notification })).toEqual({
      notification,
    });
    await notifying.markAllRead({ recipient: "jamie" });
    expect((await notifying._for({ recipient: "jamie" })).map((n) => n.read)).toEqual([true]);
  });

  test("one event can notify several people, and each person's notifications and read state are their own", async () => {
    const { notifying } = await setup();
    const sent: Record<string, string> = {};
    for (const recipient of ["jamie", "taylor"]) {
      sent[recipient] = (
        await notifying.notify({
          recipient,
          actor: "morgan",
          subject: "run-1",
          kind: "RUN_CANCELED",
        })
      ).notification;
    }
    expect(sent.jamie).not.toBe(sent.taylor);
    await notifying.markRead({ recipient: "jamie", notification: sent.jamie! });
    expect(await notifying._for({ recipient: "jamie" })).toEqual([
      expect.objectContaining({ notification: sent.jamie, read: true }),
    ]);
    expect(await notifying._for({ recipient: "taylor" })).toEqual([
      expect.objectContaining({ notification: sent.taylor, read: false }),
    ]);
  });
});
