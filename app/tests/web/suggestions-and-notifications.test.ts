import { describe, expect, test } from "bun:test";
import {
  ago,
  createNotifications,
  messageFor,
  type Notification,
} from "../../web/notifications.ts";
import type { Run } from "../../web/runs.ts";
import { changeRows, draftError, draftFrom, proposedChange } from "../../web/suggestions.ts";

const RUN: Run = {
  run: "r1",
  owner: "morgan",
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "Easy pace",
  earliestTime: "2026-11-07T09:30",
  latestTime: "2026-11-07T11:00",
  status: "ACTIVE",
};

describe("Suggesting changes", () => {
  test("a draft starts from the run, and proposes only what changed", () => {
    const draft = draftFrom(RUN);
    expect(proposedChange(RUN, draft)).toEqual({});
    expect(draftError(RUN, draft)).toBe("Change at least one detail to suggest.");
    expect(
      proposedChange(RUN, { ...draft, location: " Harvard Bridge ", pace: 8, details: "" }),
    ).toEqual({ location: "Harvard Bridge", pace: 8, details: "" });
  });

  test("a draft outside the run's window, or with a non-positive distance, says why", () => {
    const draft = draftFrom(RUN);
    expect(draftError(RUN, { ...draft, startTime: "2026-11-07T12:00" })).toContain(
      "Choose a time between",
    );
    expect(draftError(RUN, { ...draft, distance: 0 })).toBe("Distance must be more than 0.");
    expect(draftError(RUN, { ...draft, startTime: "2026-11-07T10:30" })).toBe("");
  });

  test("each proposed detail is shown as current → proposed, and a plain time is a time change", () => {
    expect(changeRows(RUN, { location: "Harvard Bridge", distance: 6 })).toEqual([
      { label: "Meeting point", from: "Charles River Esplanade", to: "Harvard Bridge" },
      { label: "Distance", from: "5 miles", to: "6 miles" },
    ]);
    const [time] = changeRows(RUN, "2026-11-07T10:30");
    expect(time?.label).toBe("Start time");
    expect(time?.from).toContain("10:00 AM");
    expect(time?.to).toContain("10:30 AM");
  });
});

describe("Notification messages", () => {
  const base: Notification = {
    notification: "n1",
    actor: "morgan",
    run: "r1",
    kind: "RUN_EDITED",
    at: "2026-11-01T08:00:00.000Z",
    read: false,
    startTime: "2026-11-07T10:00",
  };

  test("each kind says who did what to which run", () => {
    const say = (kind: Notification["kind"], actor = "morgan") =>
      messageFor({ ...base, kind, actor });
    expect(say("SUGGESTION_RECEIVED", "jamie")).toBe(
      "jamie suggested a change to your Morning run on Sat, Nov 7.",
    );
    expect(say("RUN_EDITED")).toBe(
      "morgan updated Morning run on Sat, Nov 7. Check the new details.",
    );
    expect(say("RUN_CANCELED")).toBe("morgan canceled Morning run on Sat, Nov 7.");
    expect(say("SUGGESTION_ACCEPTED")).toBe(
      "morgan accepted your suggestion for Morning run on Sat, Nov 7. You're going!",
    );
    expect(say("SUGGESTION_REJECTED")).toBe(
      "morgan declined your suggestion for Morning run on Sat, Nov 7.",
    );
  });

  test("a run that's gone is 'a run'", () => {
    expect(messageFor({ ...base, kind: "RUN_CANCELED", startTime: null })).toBe(
      "morgan canceled a run.",
    );
  });

  test("times read briefly", () => {
    const at = new Date("2026-11-01T08:00:00Z").getTime();
    expect(ago(base.at, at + 30_000)).toBe("just now");
    expect(ago(base.at, at + 5 * 60_000)).toBe("5 min ago");
    expect(ago(base.at, at + 3 * 3_600_000)).toBe("3 h ago");
    expect(ago(base.at, at + 2 * 86_400_000)).toBe("2 d ago");
  });
});

describe("The bell's notifications", () => {
  test("a load still in flight when everything is marked read doesn't bring the unread badge back", async () => {
    const unread = {
      notification: "n1",
      actor: "april",
      run: "run-1",
      kind: "RUN_INVITED",
      at: "2026-10-27T13:41:00.000Z",
      read: false,
      startTime: "2026-11-07T10:00",
    };
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let lists = 0;
    const post = async (path: string) => {
      if (path !== "/api/notifications/list") return Response.json({});
      // The first list answers at once; the second is held until after Mark all read.
      if (++lists === 2) await held;
      return Response.json({ notifications: { notifications: [{ ...unread }] } });
    };
    const bell = createNotifications(post);
    await bell.load();
    expect(bell.unread.value).toBe(1);

    const loading = bell.load();
    await bell.markAllRead();
    expect(bell.unread.value).toBe(0);
    release();
    await loading;
    expect(bell.unread.value).toBe(0);
  });

  test("an invitation reads as one, naming who sent it and the run", () => {
    const n = {
      notification: "n1",
      actor: "april",
      run: "run-1",
      kind: "RUN_INVITED",
      at: "2026-10-27T13:41:00.000Z",
      read: false,
      startTime: "2026-11-07T10:00",
    } as const;
    expect(messageFor(n)).toBe("april invited you to Morning run on Sat, Nov 7.");
  });
});
