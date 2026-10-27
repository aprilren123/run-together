import { describe, expect, test } from "bun:test";
import {
  canDelete,
  commentError,
  commentProblem,
  createComments,
  formatCommentTime,
  type RunComment,
} from "../../web/comments.ts";

const JAMIES: RunComment = {
  comment: "c1",
  author: "jamie",
  text: "Can we meet at the boathouse?",
  at: "2026-10-27T13:41:00.000Z",
};

/** A stand-in for the API: answers each path with the next response queued for it, and records requests. */
function fakeApi() {
  const queued: Record<string, Response[]> = {};
  const requests: { path: string; body: object }[] = [];
  const answer = (path: string, body: object, status = 200) =>
    (queued[path] ??= []).push(Response.json(body, { status }));
  const post = async (path: string, body: object) => {
    requests.push({ path, body });
    const next = queued[path]?.shift();
    if (!next) throw new TypeError("Failed to fetch");
    return next;
  };
  return { answer, post, requests };
}

describe("Comment rules in the browser", () => {
  test("a comment needs 1 to 500 characters, ignoring spaces at the ends", () => {
    expect(commentProblem("")).toBe("Write something first.");
    expect(commentProblem("   \n ")).toBe("Write something first.");
    expect(commentProblem("x".repeat(501))).toBe("Comments can be at most 500 characters.");
    expect(commentProblem(`  ${"x".repeat(500)}  `)).toBe("");
    expect(commentProblem("See you there")).toBe("");
  });

  test("the author can delete their comment, and the run's owner can remove anyone's", () => {
    expect(canDelete(JAMIES, "jamie", "morgan")).toBe(true);
    expect(canDelete(JAMIES, "morgan", "morgan")).toBe(true);
    expect(canDelete(JAMIES, "taylor", "morgan")).toBe(false);
  });

  test("times read as a date and time, with the year only when it isn't this year", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    expect(formatCommentTime(JAMIES.at, now)).toMatch(/^Oct 27, \d{1,2}:41 (AM|PM)$/);
    expect(formatCommentTime("2025-12-31T15:00:00Z", now)).toContain("2025");
  });

  test("each failure has a sentence", () => {
    expect(commentError(null, "post")).toContain("Couldn't reach RunTogether");
    expect(commentError(404, "load")).toBe("You can't see this run's comments anymore.");
    expect(commentError(404, "delete")).toBe("That comment was already deleted.");
    expect(commentError(400, "post")).toBe("Comments must be 1 to 500 characters.");
    expect(commentError(409, "post")).toBe("You just posted that comment.");
    expect(commentError(500, "post")).toBe("Something went wrong. Try again.");
  });
});

describe("The Discussion's requests", () => {
  test("loading lists the run's comments, and a failure says why", async () => {
    const api = fakeApi();
    const state = createComments(api.post);
    api.answer("/api/comments/list", { comments: { comments: [JAMIES] } });
    await state.load("run-1");
    expect(state.comments.value).toEqual([JAMIES]);
    expect(api.requests).toEqual([{ path: "/api/comments/list", body: { run: "run-1" } }]);

    api.answer("/api/comments/list", { error: "NOT_FOUND" }, 404);
    await state.load("run-1");
    expect(state.error.value).toBe("You can't see this run's comments anymore.");
  });

  test("posting sends the trimmed text once, says so, and reloads; a second click while sending does nothing", async () => {
    const api = fakeApi();
    const state = createComments(api.post);
    api.answer("/api/comments/post", { comment: "c2" });
    api.answer("/api/comments/list", { comments: { comments: [JAMIES] } });

    const first = state.send("run-1", "  On my way  ");
    const second = state.send("run-1", "  On my way  ");
    expect(await second).toBe(false);
    expect(await first).toBe(true);
    expect(api.requests.filter((r) => r.path === "/api/comments/post")).toEqual([
      { path: "/api/comments/post", body: { run: "run-1", text: "On my way" } },
    ]);
    expect(state.message.value).toBe("Comment posted.");
    expect(state.posting.value).toBe(false);
  });

  test("an invalid draft isn't sent, and a refused post shows its sentence", async () => {
    const api = fakeApi();
    const state = createComments(api.post);
    expect(await state.send("run-1", "   ")).toBe(false);
    expect(state.error.value).toBe("Write something first.");
    expect(api.requests).toEqual([]);

    api.answer("/api/comments/post", { error: "CONFLICT" }, 409);
    expect(await state.send("run-1", "Again")).toBe(false);
    expect(state.error.value).toBe("You just posted that comment.");

    expect(await state.send("run-1", "Offline")).toBe(false);
    expect(state.error.value).toContain("Couldn't reach RunTogether");
  });

  test("deleting sends the comment, says so, and reloads the list", async () => {
    const api = fakeApi();
    const state = createComments(api.post);
    api.answer("/api/comments/delete", { comment: "c1" });
    api.answer("/api/comments/list", { comments: { comments: [] } });
    await state.remove("run-1", "c1");
    expect(api.requests[0]).toEqual({ path: "/api/comments/delete", body: { comment: "c1" } });
    expect(state.message.value).toBe("Comment deleted.");
    expect(state.comments.value).toEqual([]);
    expect(state.deleting.value).toBeNull();
  });
});
