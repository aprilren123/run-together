import { describe, expect, test } from "bun:test";
import {
  answerError,
  createInvitations,
  invitationFor,
  invitationState,
  latestPerInvitee,
  sentLabel,
  type ReceivedInvitation,
  type SentInvitation,
} from "../../web/invitations.ts";

const NOW = new Date("2030-05-01T12:00").getTime();
const OPEN: ReceivedInvitation = {
  invitation: "i1",
  inviter: "april",
  run: "run-1",
  status: "PENDING",
  sent: "2030-05-01T10:00:00.000Z",
  answered: null,
  startTime: "2030-05-04T10:30",
  distance: 5,
  pace: 10,
  location: "Charles River Esplanade",
  runStatus: "ACTIVE",
};

describe("Where an invitation stands", () => {
  test("pending invitations can be answered until the run is canceled or starts", () => {
    expect(invitationState(OPEN, NOW)).toBe("open");
    expect(invitationState({ ...OPEN, status: "ACCEPTED" }, NOW)).toBe("accepted");
    expect(invitationState({ ...OPEN, status: "DECLINED" }, NOW)).toBe("declined");
    expect(invitationState({ ...OPEN, runStatus: "CANCELED" }, NOW)).toBe("canceled");
    expect(invitationState({ ...OPEN, startTime: "2030-04-01T10:30" }, NOW)).toBe("started");
    // An answer stands even after the run is canceled.
    expect(invitationState({ ...OPEN, status: "ACCEPTED", runStatus: "CANCELED" }, NOW)).toBe(
      "accepted",
    );
  });

  test("a notification points at the invitation it announced, not a later one to the same run", () => {
    const first = { ...OPEN, invitation: "old", sent: "2030-05-01T10:00:00.000Z" };
    const second = { ...OPEN, invitation: "new", sent: "2030-05-02T10:00:00.000Z" };
    const n = (at: string) => ({ run: "run-1", actor: "april", at });
    expect(invitationFor(n("2030-05-01T10:00:00.050Z"), [second, first])?.invitation).toBe("old");
    expect(invitationFor(n("2030-05-02T10:00:00.050Z"), [second, first])?.invitation).toBe("new");
    expect(invitationFor({ ...n("2030-05-02T10:00:00Z"), actor: "sam" }, [first])).toBeUndefined();
    expect(invitationFor(n("2030-05-02T10:00:00Z"), [])).toBeUndefined();
  });

  test("the owner sees each friend once, by their latest invitation, and who left after accepting", () => {
    const sent = (invitee: string, status: SentInvitation["status"], day: number) => ({
      invitation: `${invitee}-${day}`,
      invitee,
      status,
      sent: `2030-05-0${day}T10:00:00.000Z`,
      answered: null,
    });
    const rows = latestPerInvitee([
      sent("taylor", "DECLINED", 1),
      sent("jamie", "ACCEPTED", 1),
      sent("taylor", "PENDING", 2),
      sent("sam", "ACCEPTED", 1),
    ]);
    expect(rows.map((r) => [r.invitee, sentLabel(r, ["april", "jamie"])])).toEqual([
      ["taylor", "Pending"],
      ["jamie", "Accepted"],
      ["sam", "Accepted, then left"],
    ]);
    expect(sentLabel(sent("x", "DECLINED", 1), [])).toBe("Declined");
  });

  test("each failure says why, from the invitation as it now stands", () => {
    expect(answerError(null, OPEN, "april")).toContain("Couldn't reach RunTogether");
    expect(answerError(404, OPEN, "april")).toBe("This invitation is no longer available.");
    expect(answerError(409, undefined, "april")).toBe("This invitation is no longer available.");
    expect(answerError(403, OPEN, "april")).toBe(
      "You're no longer friends with april, so you can't join this run.",
    );
    expect(answerError(409, { ...OPEN, runStatus: "CANCELED" }, "april")).toContain("canceled");
    expect(answerError(409, { ...OPEN, startTime: "2020-01-01T10:00" }, "april")).toContain(
      "already started",
    );
    expect(answerError(409, { ...OPEN, status: "ACCEPTED" }, "april")).toBe(
      "You're already going to this run.",
    );
    expect(answerError(409, { ...OPEN, status: "DECLINED" }, "april")).toBe(
      "You already declined this invitation.",
    );
    // Two accepts at once: the one that lost finds the invitation still open, but the person is going.
    expect(answerError(409, OPEN, "april")).toBe("You're already going to this run.");
  });
});

/** A stand-in for the API: answers each path with the next response queued for it, and records requests. */
function fakeApi() {
  const queued: Record<string, Response[]> = {};
  const requests: string[] = [];
  const answer = (path: string, body: object, status = 200) =>
    (queued[path] ??= []).push(Response.json(body, { status }));
  const post = async (path: string) => {
    requests.push(path);
    const next = queued[path]?.shift();
    if (!next) throw new TypeError("Failed to fetch");
    return next;
  };
  return { answer, post, requests };
}

describe("Answering from the app", () => {
  test("accepting sends once, reloads, and confirms; a second click while sending does nothing", async () => {
    const api = fakeApi();
    const state = createInvitations(api.post);
    api.answer("/api/invitations/list", { invitations: { invitations: [OPEN] } });
    await state.load();
    api.answer("/api/invitations/accept", { invitation: "i1", event: "run-1" });
    api.answer("/api/invitations/list", {
      invitations: { invitations: [{ ...OPEN, status: "ACCEPTED" }] },
    });
    const first = state.accept("i1");
    const second = state.accept("i1");
    expect(await second).toBe(false);
    expect(await first).toBe(true);
    expect(api.requests.filter((p) => p === "/api/invitations/accept")).toHaveLength(1);
    expect(state.items.value[0]?.status).toBe("ACCEPTED");
    expect(state.feedback.value).toEqual({
      invitation: "i1",
      error: false,
      text: "You're going! It's in My Runs.",
    });
    expect(state.answering.value).toBeNull();
  });

  test("a refused accept reloads and explains, so the card doesn't show a stale state", async () => {
    const api = fakeApi();
    const state = createInvitations(api.post);
    api.answer("/api/invitations/list", { invitations: { invitations: [OPEN] } });
    await state.load();
    api.answer("/api/invitations/accept", { error: "CONFLICT" }, 409);
    api.answer("/api/invitations/list", {
      invitations: { invitations: [{ ...OPEN, runStatus: "CANCELED" }] },
    });
    expect(await state.accept("i1")).toBe(false);
    expect(state.items.value[0]?.runStatus).toBe("CANCELED");
    expect(state.feedback.value?.text).toBe("This run was canceled, so it can't be joined.");
  });

  test("declining confirms, and leaves the run alone", async () => {
    const api = fakeApi();
    const state = createInvitations(api.post);
    api.answer("/api/invitations/decline", { invitation: "i1" });
    api.answer("/api/invitations/list", {
      invitations: { invitations: [{ ...OPEN, status: "DECLINED" }] },
    });
    expect(await state.decline("i1")).toBe(true);
    expect(api.requests).toEqual(["/api/invitations/decline", "/api/invitations/list"]);
    expect(state.feedback.value?.text).toBe("Invitation declined.");
  });
});
