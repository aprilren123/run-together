import { computed, ref } from "vue";
import { formatRunDate, runTitle } from "./runs.ts";

/** A notification as `/api/notifications/list` answers it. */
export interface Notification {
  notification: string;
  actor: string;
  run: string;
  kind:
    | "SUGGESTION_RECEIVED"
    | "RUN_EDITED"
    | "RUN_CANCELED"
    | "SUGGESTION_ACCEPTED"
    | "SUGGESTION_REJECTED";
  at: string;
  read: boolean;
  startTime: string | null;
}

/** The run a notification is about, as "Morning run on Sat, Nov 7", or "a run" when it's gone. */
function runName(startTime: string | null): string {
  return startTime ? `${runTitle(startTime)} on ${formatRunDate(startTime)}` : "a run";
}

/** What happened, in a sentence that names who did it and which run it was. */
export function messageFor(n: Notification): string {
  const run = runName(n.startTime);
  switch (n.kind) {
    case "SUGGESTION_RECEIVED":
      return `${n.actor} suggested a change to your ${run}.`;
    case "RUN_EDITED":
      return `${n.actor} updated ${run}. Check the new details.`;
    case "RUN_CANCELED":
      return `${n.actor} canceled ${run}.`;
    case "SUGGESTION_ACCEPTED":
      return `${n.actor} accepted your suggestion for ${run}. You're going!`;
    case "SUGGESTION_REJECTED":
      return `${n.actor} declined your suggestion for ${run}.`;
    default:
      return `${n.actor} changed ${run}.`;
  }
}

/** How long ago, briefly: "just now", "5 min ago", "3 h ago", "2 d ago", or the date. */
export function ago(at: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(at).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))} d ago`;
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * The signed-in user's notifications, shared by the bell on every page. They are read from the backend
 * when the app opens and whenever the user moves between pages; nothing is pushed.
 */
export function createNotifications(post: (path: string, body?: object) => Promise<Response>) {
  const items = ref<Notification[]>([]);
  const error = ref("");
  const unread = computed(() => items.value.filter((n) => !n.read).length);

  async function load() {
    try {
      const response = await post("/api/notifications/list");
      const data = await response.json();
      if (!response.ok || data.error)
        throw new Error(data.error ?? "Could not load notifications.");
      items.value = data.notifications.notifications;
      error.value = "";
    } catch {
      error.value = "Couldn't load notifications.";
    }
  }

  async function markRead(notification: string) {
    const item = items.value.find((n) => n.notification === notification);
    if (!item || item.read) return;
    item.read = true;
    const response = await post("/api/notifications/read", { notification }).catch(() => null);
    if (!response?.ok) item.read = false;
  }

  async function markAllRead() {
    const unreadItems = items.value.filter((n) => !n.read);
    for (const item of unreadItems) item.read = true;
    const response = await post("/api/notifications/read-all").catch(() => null);
    if (!response?.ok) for (const item of unreadItems) item.read = false;
  }

  return { items, unread, error, load, markRead, markAllRead };
}

export type Notifications = ReturnType<typeof createNotifications>;
