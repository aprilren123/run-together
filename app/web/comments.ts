import { ref } from "vue";

/** A comment as `/api/comments/list` answers it: its author's username, never an account id. */
export interface RunComment {
  comment: string;
  author: string;
  text: string;
  at: string;
}

export const MAX_COMMENT = 500;

/** Why `text` can't be posted, or "" when it can. Mirrors the backend's check. */
export function commentProblem(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "Write something first.";
  if (trimmed.length > MAX_COMMENT) return `Comments can be at most ${MAX_COMMENT} characters.`;
  return "";
}

/** When a comment was written, as "Oct 27, 9:41 AM", with the year when it isn't this year. */
export function formatCommentTime(at: string, now = new Date()): string {
  const date = new Date(at);
  // The date and the time are formatted apart and joined, so every runtime writes them the same way.
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

/** The author can delete their comment, and the run's owner can remove any comment on their run. */
export function canDelete(comment: RunComment, me: string, owner: string): boolean {
  return comment.author === me || owner === me;
}

/** The sentence to show when a comments request fails with `status`. */
export function commentError(status: number | null, action: "load" | "post" | "delete"): string {
  if (status === null) return "Couldn't reach RunTogether. Check your connection and try again.";
  if (status === 404) {
    return action === "delete"
      ? "That comment was already deleted."
      : "You can't see this run's comments anymore.";
  }
  if (status === 400) return `Comments must be 1 to ${MAX_COMMENT} characters.`;
  if (status === 409) return "You just posted that comment.";
  return "Something went wrong. Try again.";
}

/** The comments on one run, and the actions on them, for the Discussion section. */
export function createComments(post: (path: string, body: object) => Promise<Response>) {
  const comments = ref<RunComment[]>([]);
  const loading = ref(false);
  const posting = ref(false);
  const error = ref("");
  const message = ref("");
  const deleting = ref<string | null>(null);

  async function call(path: string, body: object): Promise<{ status: number | null; data: any }> {
    try {
      const response = await post(path, body);
      const data = await response.json().catch(() => ({}));
      return { status: response.ok && !data.error ? 200 : response.status, data };
    } catch {
      return { status: null, data: {} };
    }
  }

  async function load(run: string) {
    loading.value = true;
    const { status, data } = await call("/api/comments/list", { run });
    loading.value = false;
    if (status === 200) {
      comments.value = data.comments.comments;
      error.value = "";
    } else {
      error.value = commentError(status, "load");
    }
  }

  /** Posts `text` once: a second call while the first is sending does nothing. Returns whether it posted. */
  async function send(run: string, text: string): Promise<boolean> {
    if (posting.value) return false;
    const problem = commentProblem(text);
    if (problem) {
      error.value = problem;
      return false;
    }
    posting.value = true;
    message.value = "";
    error.value = "";
    const { status } = await call("/api/comments/post", { run, text: text.trim() });
    posting.value = false;
    if (status !== 200) {
      error.value = commentError(status, "post");
      return false;
    }
    // Reload first, so the confirmation appears together with the comment it confirms.
    await load(run);
    message.value = "Comment posted.";
    return true;
  }

  async function remove(run: string, comment: string) {
    if (deleting.value) return;
    deleting.value = comment;
    message.value = "";
    error.value = "";
    const { status } = await call("/api/comments/delete", { comment });
    await load(run);
    deleting.value = null;
    if (status === 200) message.value = "Comment deleted.";
    else error.value = commentError(status, "delete");
  }

  return { comments, loading, posting, deleting, error, message, load, send, remove };
}
