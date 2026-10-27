<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  Home,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  Users,
  User,
  UserMinus,
  UserPlus,
  ChevronRight,
  ArrowLeft,
  MapPin,
  History,
  Lightbulb,
  Route,
  LogOut,
  Pencil,
  Plus,
  CircleX,
  Search,
  X,
} from "lucide-vue-next";
import { useSession } from "./auth/session.ts";
import RunCard from "./RunCard.vue";
import NotificationBell from "./NotificationBell.vue";
import RunComments from "./RunComments.vue";
import { createNotifications } from "./notifications.ts";
import {
  changeRows,
  draftError,
  draftFrom,
  proposedChange,
  type ChangeDraft,
} from "./suggestions.ts";
import {
  arrangeRuns,
  formatRunDate,
  formatRunTime,
  isCanceled,
  isFlexible,
  isUpcoming,
  mapsUrl,
  runTitle,
  type Run,
} from "./runs.ts";

interface Friendship {
  friendship: string;
  user1: string;
  user2: string;
}

// The signed-in username. The backend acts as the session's user, so requests never name who is acting.
const { me, error: sessionError, signOut, sessionEnded } = useSession();
const signedInAs = me.value?.username ?? "";
const currentUser = computed(() => signedInAs);
const signingOut = ref(false);

/** Calls the API with the session cookie, and shows the sign-in screen when the session has ended. */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) sessionEnded();
  return response;
}
// Notifications are read when the app opens and on every page change; the bell shows the unread count.
/** Posts JSON to the API with the session cookie; a 401 shows the sign-in screen. */
const postJson = (path: string, body: object = {}) =>
  apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const notifications = createNotifications(postJson);
const notice = ref("");
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
function showNotice(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ""), 5000);
}

/** Opens the run a notification is about, if the user can still see it. */
async function openRunById(runId: string) {
  await loadRuns();
  const run = runs.value.find((r) => r.run === runId);
  if (run) await openRun(run);
  else showNotice("That run is no longer available to you.");
}

async function logOut() {
  signingOut.value = true;
  await signOut();
  signingOut.value = false;
}
type Tab = "home" | "my-runs" | "friends" | "profile";
const currentPage = ref<Tab | "create" | "run-details">("home");
/** The tab the run page, or the create or edit form, goes back to. */
const returnTo = ref<Tab>("home");

/** Opens a tab with fresh data, so every list shows the latest version of each run. */
async function go(tab: Tab) {
  currentPage.value = tab;
  returnTo.value = tab;
  friendMessage.value = "";
  if (tab === "friends") void searchPeople();
  if (tab === "friends" || tab === "profile") await refreshFriends();
  void notifications.load();
  if (tab !== "friends") await Promise.all([loadRuns(), loadParticipants()]);
}

const runs = ref<Run[]>([]);
const selectedRunId = ref<string | null>(null);
const participations = ref<{ participation: string; user: string; event: string }[]>([]);
const runDetailsError = ref("");
const selectedRun = computed(() => runs.value.find((r) => r.run === selectedRunId.value) ?? null);
/** Who is going to each run: its host first, then everyone who joined, each counted once. */
const goingByRun = computed(() => {
  const going = new Map(runs.value.map((run) => [run.run, [run.owner]]));
  for (const { event, user } of participations.value) {
    const people = going.get(event);
    if (people && !people.includes(user)) people.push(user);
  }
  return going;
});
const goingTo = (run: Run) => goingByRun.value.get(run.run) ?? [run.owner];
const selectedParticipants = computed(() => (selectedRun.value ? goingTo(selectedRun.value) : []));
async function loadParticipants() {
  runDetailsError.value = "";
  try {
    const response = await apiFetch("/api/runs/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error ?? "Could not load participants.");
    participations.value = data.participants.participations;
  } catch (error) {
    runDetailsError.value = error instanceof Error ? error.message : "Could not load participants.";
  }
}
async function openRun(run: Run) {
  selectedRunId.value = run.run;
  currentPage.value = "run-details";
  runActionMessage.value = "";
  runDetailsError.value = "";
  await Promise.all([loadRuns(), loadParticipants(), loadSuggestions()]);
}

/** What the signed-in user may do with the open run. */
const isOwner = computed(() => selectedRun.value?.owner === currentUser.value);
const runIsOpen = computed(
  () => !!selectedRun.value && !isCanceled(selectedRun.value) && isUpcoming(selectedRun.value),
);

interface Suggestion {
  suggestion: string;
  suggester: string;
  decider: string;
  event: string;
  change: string;
  status: string;
}
const suggestions = ref<Suggestion[]>([]);
const suggestionOpen = ref(false);
/** The values the suggester is proposing, starting from the run's own. */
const draft = ref<ChangeDraft>({
  startTime: "",
  location: "",
  distance: null,
  pace: null,
  details: "",
});
const suggestionError = ref("");
const runActionMessage = ref("");
const runActionBusy = ref(false);
const isJoined = computed(() =>
  participations.value.some((p) => p.event === selectedRunId.value && p.user === currentUser.value),
);
const pendingSuggestions = computed(() =>
  suggestions.value.filter((s) => s.event === selectedRunId.value && s.status === "PENDING"),
);
const draftProblem = computed(() =>
  selectedRun.value ? draftError(selectedRun.value, draft.value) : "",
);
const draftRows = computed(() =>
  selectedRun.value
    ? changeRows(selectedRun.value, proposedChange(selectedRun.value, draft.value))
    : [],
);
async function postAction(path: string, body: Record<string, unknown>) {
  const response = await apiFetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.error)
    throw new Error(typeof data.error === "string" ? data.error : `Could not complete ${path}.`);
  return data;
}
async function loadSuggestions() {
  try {
    const data = await postAction("suggestions/list", {});
    suggestions.value = data.suggestions.suggestions;
  } catch (error) {
    runDetailsError.value = error instanceof Error ? error.message : "Could not load suggestions.";
  }
}
function openSuggestion() {
  if (!selectedRun.value) return;
  draft.value = draftFrom(selectedRun.value);
  suggestionError.value = "";
  suggestionOpen.value = true;
}
async function sendSuggestion() {
  if (!selectedRun.value || draftProblem.value || runActionBusy.value) return;
  suggestionError.value = "";
  runActionBusy.value = true;
  try {
    await postAction("suggestions/create", {
      event: selectedRun.value.run,
      change: proposedChange(selectedRun.value, draft.value),
    });
    suggestionOpen.value = false;
    runActionMessage.value = `Suggestion sent to ${selectedRun.value.owner}.`;
    await loadSuggestions();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    suggestionError.value =
      message === "CONFLICT"
        ? "This run can't take that change. Check its time, distance, and pace ranges."
        : message === "INVALID_REQUEST"
          ? "One of those values isn't valid. Check each detail and try again."
          : message || "Could not send suggestion.";
  } finally {
    runActionBusy.value = false;
  }
}
async function joinSelectedRun() {
  if (!selectedRun.value || runActionBusy.value || isJoined.value) return;
  runActionBusy.value = true;
  runDetailsError.value = "";
  try {
    await postAction("runs/join", { event: selectedRun.value.run });
    await loadParticipants();
    runActionMessage.value = "You joined this run!";
  } catch (error) {
    runDetailsError.value = error instanceof Error ? error.message : "Could not join run.";
  } finally {
    runActionBusy.value = false;
  }
}
async function leaveSelectedRun() {
  if (!selectedRun.value || runActionBusy.value || !isJoined.value) return;
  runActionBusy.value = true;
  runDetailsError.value = "";
  try {
    await postAction("runs/leave", { event: selectedRun.value.run });
    await loadParticipants();
    runActionMessage.value = "You left this run.";
  } catch (error) {
    runDetailsError.value = error instanceof Error ? error.message : "Could not leave run.";
  } finally {
    runActionBusy.value = false;
  }
}

// Canceling asks for confirmation first, since it can't be undone.
const confirmCancelOpen = ref(false);

// A dialog takes focus when it opens, so keyboard and screen reader users land in it, and gives focus back
// to the button that opened it when it closes.
const suggestionDialog = ref<HTMLElement | null>(null);
const confirmDialog = ref<HTMLElement | null>(null);
let openedFrom: HTMLElement | null = null;
watch(
  [suggestionOpen, confirmCancelOpen],
  async ([suggesting, confirming], [wasSuggesting, wasConfirming]) => {
    if ((suggesting && !wasSuggesting) || (confirming && !wasConfirming)) {
      openedFrom = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      await nextTick();
      (suggesting ? suggestionDialog : confirmDialog).value?.focus();
    } else if (!suggesting && !confirming) {
      if (openedFrom?.isConnected) openedFrom.focus();
      openedFrom = null;
    }
  },
);
async function cancelSelectedRun() {
  if (!selectedRun.value || runActionBusy.value) return;
  runActionBusy.value = true;
  runDetailsError.value = "";
  try {
    await postAction("runs/cancel", { run: selectedRun.value.run });
    confirmCancelOpen.value = false;
    await loadRuns();
    runActionMessage.value = "Run canceled. Everyone who joined will see it as canceled.";
  } catch (error) {
    confirmCancelOpen.value = false;
    runDetailsError.value = error instanceof Error ? error.message : "Could not cancel run.";
  } finally {
    runActionBusy.value = false;
  }
}

async function decideSuggestion(suggestion: string, action: "accept" | "reject") {
  if (runActionBusy.value) return;
  runActionBusy.value = true;
  runDetailsError.value = "";
  try {
    await postAction(`suggestions/${action}`, { suggestion });
    await Promise.all([loadSuggestions(), loadRuns(), loadParticipants()]);
    runActionMessage.value =
      action === "accept" ? "Suggestion accepted. Run updated." : "Suggestion rejected.";
  } catch (error) {
    runDetailsError.value =
      error instanceof Error && error.message === "FORBIDDEN"
        ? "You're no longer friends with this runner, so their suggestion can't be accepted."
        : error instanceof Error && error.message === "CONFLICT"
          ? "This suggestion no longer fits the run as it is now. Reject it, or edit the run first."
          : error instanceof Error
            ? error.message
            : "Could not process suggestion.";
  } finally {
    runActionBusy.value = false;
  }
}

const friendships = ref<Friendship[]>([]);
interface FriendRequest {
  request: string;
  sender: string;
  recipient: string;
}
const requests = ref<FriendRequest[]>([]);
const friendName = ref("");
const friendError = ref("");
const friendMessage = ref("");

const myFriends = computed(() =>
  friendships.value
    .filter(({ user1, user2 }) => user1 === currentUser.value || user2 === currentUser.value)
    .map(({ user1, user2 }) => (user1 === currentUser.value ? user2 : user1)),
);

const incomingRequests = computed(() =>
  requests.value.filter((r) => r.recipient === currentUser.value),
);
const outgoingRequests = computed(() =>
  requests.value.filter((r) => r.sender === currentUser.value),
);

// The backend lists only runs the user may see: their own, their friends', and ones they joined.
// Home and My Runs split those so that no run appears in both.
const joinedRuns = computed(
  () =>
    new Set(participations.value.filter((p) => p.user === currentUser.value).map((p) => p.event)),
);
const arranged = computed(() => arrangeRuns(runs.value, currentUser.value, joinedRuns.value));
const SECTIONS = ["upcoming", "past", "canceled"] as const;
const myRunsSection = ref<(typeof SECTIONS)[number]>("upcoming");
/** The arrow keys move between My Runs' tabs, as in any tab list. */
async function moveSection(step: number) {
  const at = SECTIONS.indexOf(myRunsSection.value);
  myRunsSection.value = SECTIONS[(at + step + SECTIONS.length) % SECTIONS.length]!;
  await nextTick();
  document.getElementById(`tab-${myRunsSection.value}`)?.focus();
}
const myRunsShown = computed(() => arranged.value[myRunsSection.value]);
const roleIn = (run: Run) => (run.owner === currentUser.value ? "hosting" : "joined");

async function loadFriends() {
  friendError.value = "";
  try {
    const response = await apiFetch("/api/friends/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error ?? "Could not load friends.");
    }
    friendships.value = data.friends.friendships;
  } catch (error) {
    friendError.value = error instanceof Error ? error.message : "Could not load friends.";
  }
}

async function loadRequests() {
  try {
    const response = await apiFetch("/api/friends/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error ?? "Could not load requests.");
    requests.value = data.requests.requests;
  } catch (error) {
    friendError.value = error instanceof Error ? error.message : "Could not load requests.";
  }
}

async function refreshFriends() {
  await Promise.all([loadFriends(), loadRequests()]);
}

async function friendAction(action: "accept" | "reject", request: string) {
  friendError.value = "";
  friendMessage.value = "";
  try {
    const response = await apiFetch(`/api/friends/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error ?? `Could not ${action} request.`);
    await refreshFriends();
    friendMessage.value =
      action === "accept" ? "Friend request accepted!" : "Friend request declined.";
  } catch (error) {
    friendError.value = error instanceof Error ? error.message : "Something went wrong.";
  }
}

// Find friends: search registered usernames. The search answers usernames only; whether each person is
// already a friend or has a pending request comes from the signed-in user's own friend and request lists.
// With an empty box, the same search lists people on RunTogether, so the page is never blank.
const MIN_SEARCH = 2;
const searchResults = ref<string[]>([]);
/** The text the shown results are for: "" for the people list, or null before anything has loaded. */
const searchedFor = ref<string | null>(null);
const searching = ref(false);
let searches = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

async function searchPeople() {
  clearTimeout(searchTimer);
  const text = friendName.value.trim();
  const search = ++searches;
  friendError.value = "";
  if (text.length > 0 && text.length < MIN_SEARCH) {
    searchResults.value = [];
    searchedFor.value = null;
    return;
  }
  searching.value = true;
  try {
    const response = await apiFetch("/api/friends/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error ?? "Could not search.");
    if (search !== searches) return;
    searchResults.value = (data.people as { username: string }[]).map((person) => person.username);
    searchedFor.value = text;
  } catch (error) {
    if (search === searches) {
      friendError.value = error instanceof Error ? error.message : "Could not search.";
    }
  } finally {
    if (search === searches) searching.value = false;
  }
}

watch(friendName, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(searchPeople, 250);
});

function friendState(username: string): "friends" | "requested" | "incoming" | "none" {
  if (myFriends.value.includes(username)) return "friends";
  if (outgoingRequests.value.some((r) => r.recipient === username)) return "requested";
  if (incomingRequests.value.some((r) => r.sender === username)) return "incoming";
  return "none";
}

function incomingRequestFrom(username: string): string {
  return incomingRequests.value.find((r) => r.sender === username)?.request ?? "";
}

async function sendFriendRequest(username: string) {
  friendError.value = "";
  friendMessage.value = "";
  const recipient = username.trim();
  if (!recipient || recipient === currentUser.value) {
    friendError.value = "Enter another user's name.";
    return;
  }
  try {
    const response = await apiFetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: recipient }),
    });
    const data = await response.json();
    if (data.error === "NOT_FOUND") throw new Error(`Nobody has the username ${recipient}.`);
    if (!response.ok || data.error) {
      throw new Error(data.error ?? "Could not send friend request.");
    }
    friendMessage.value = `Friend request sent to ${recipient}.`;
    await loadRequests();
  } catch (error) {
    friendError.value = error instanceof Error ? error.message : "Could not send friend request.";
  }
}

const startTime = ref("");
const distance = ref<number | null>(null);
const pace = ref<number | null>(null);
const location = ref("");
const details = ref("");
const hasFlexibility = ref(false);

const earliestTime = ref("");
const latestTime = ref("");

const minDistance = ref<number | null>(null);
const maxDistance = ref<number | null>(null);

const minPace = ref<number | null>(null);
const maxPace = ref<number | null>(null);

const errorMessage = ref("");
/** The run being edited, or null when the form creates a new run. */
const editingRunId = ref<string | null>(null);
const editingRun = computed(() => runs.value.find((r) => r.run === editingRunId.value) ?? null);

function resetRunForm() {
  startTime.value = "";
  distance.value = null;
  pace.value = null;
  location.value = "";
  details.value = "";
  hasFlexibility.value = false;
  earliestTime.value = "";
  latestTime.value = "";
  minDistance.value = null;
  maxDistance.value = null;
  minPace.value = null;
  maxPace.value = null;
  errorMessage.value = "";
}

function openCreate() {
  editingRunId.value = null;
  resetRunForm();
  currentPage.value = "create";
}

function openEdit() {
  const run = selectedRun.value;
  if (!run) return;
  resetRunForm();
  editingRunId.value = run.run;
  startTime.value = run.startTime.slice(0, 16);
  distance.value = run.distance;
  pace.value = run.pace;
  location.value = run.location;
  details.value = run.details ?? "";
  currentPage.value = "create";
}

function closeRunForm() {
  currentPage.value = editingRunId.value ? "run-details" : returnTo.value;
  editingRunId.value = null;
}

/** A change that falls outside the run's flexibility ranges would be refused, so say so before sending. */
const editRangeError = computed(() => {
  const run = editingRun.value;
  if (!run) return "";
  if (run.earliestTime && run.latestTime && startTime.value) {
    if (startTime.value < run.earliestTime || startTime.value > run.latestTime) {
      return `Choose a start time within this run's window, ${formatRunTime(run.earliestTime)} – ${formatRunTime(run.latestTime)}.`;
    }
  }
  const d = distance.value;
  if (run.minDistance != null && run.maxDistance != null && d !== null) {
    if (d < run.minDistance || d > run.maxDistance) {
      return `Choose a distance within this run's range, ${run.minDistance}–${run.maxDistance} miles.`;
    }
  }
  const p = pace.value;
  if (run.minPace != null && run.maxPace != null && p !== null) {
    if (p < run.minPace || p > run.maxPace) {
      return `Choose a pace within this run's range, ${run.minPace}–${run.maxPace} min/mi.`;
    }
  }
  return "";
});

async function saveEdit() {
  const run = editingRun.value;
  if (!run || distance.value === null || pace.value === null) return;
  if (editRangeError.value) {
    errorMessage.value = editRangeError.value;
    return;
  }
  errorMessage.value = "";
  try {
    await postAction("runs/update", {
      run: run.run,
      startTime: startTime.value,
      distance: distance.value,
      pace: pace.value,
      location: location.value,
      details: details.value,
    });
    await loadRuns();
    editingRunId.value = null;
    currentPage.value = "run-details";
    runActionMessage.value = "Run updated. Everyone who joined sees the new details.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    errorMessage.value =
      message === "INVALID_REQUEST"
        ? "Those details aren't valid for this run. Check the distance, pace, and flexibility ranges."
        : message === "CONFLICT"
          ? "This run has been canceled, so it can't be edited."
          : message || "Could not save changes.";
  }
}

/** Whether the run form is being sent, so it shows "Saving…" and can't be sent twice. */
const savingRun = ref(false);
async function submitRunForm() {
  if (savingRun.value) return;
  savingRun.value = true;
  try {
    if (editingRunId.value) await saveEdit();
    else await createRun();
  } finally {
    savingRun.value = false;
  }
}

const runDate = computed(() => startTime.value.split("T")[0]);

const flexibilityError = computed(() => {
  if (!hasFlexibility.value) return "";

  if (earliestTime.value && latestTime.value) {
    if (earliestTime.value > latestTime.value) {
      return "Earliest time must be before latest time.";
    }
  }

  if (minDistance.value !== null && maxDistance.value !== null) {
    if (minDistance.value > maxDistance.value) {
      return "Minimum distance cannot exceed maximum distance.";
    }
  }

  if (minPace.value !== null && maxPace.value !== null) {
    if (minPace.value > maxPace.value) {
      return "Minimum pace cannot exceed maximum pace.";
    }
  }

  const plannedTime = startTime.value.split("T")[1];

  if (plannedTime) {
    if (earliestTime.value && plannedTime < earliestTime.value) {
      return "The planned start time must be within the flexibility window.";
    }

    if (latestTime.value && plannedTime > latestTime.value) {
      return "The planned start time must be within the flexibility window.";
    }
  }

  return "";
});

/** The run form's problems, each once: a failed save can repeat what the live checks already say. */
const formProblems = computed(() => [
  ...new Set(
    [
      errorMessage.value,
      editingRunId.value ? "" : flexibilityError.value,
      editRangeError.value,
    ].filter(Boolean),
  ),
]);

async function loadRuns() {
  const response = await apiFetch("/api/runs/list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  runs.value = data.runs.runs;
}

async function createRun() {
  if (distance.value === null || pace.value === null) {
    return;
  }
  if (flexibilityError.value) {
    errorMessage.value = flexibilityError.value;
    return;
  }

  errorMessage.value = "";

  try {
    const response = await apiFetch("/api/runs/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startTime: startTime.value,
        distance: distance.value,
        pace: pace.value,
        location: location.value,
        details: details.value,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error || !data.run) {
      throw new Error(data.error ?? "Could not create run.");
    }

    if (hasFlexibility.value) {
      const flexibilityResponse = await apiFetch("/api/runs/flexibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          run: data.run,
          earliestTime: earliestTime.value ? `${runDate.value}T${earliestTime.value}` : null,

          latestTime: latestTime.value ? `${runDate.value}T${latestTime.value}` : null,
          minDistance: minDistance.value,
          maxDistance: maxDistance.value,
          minPace: minPace.value,
          maxPace: maxPace.value,
        }),
      });

      const flexibilityData = await flexibilityResponse.json();

      if (!flexibilityResponse.ok || flexibilityData.error) {
        throw new Error(
          flexibilityData.error ?? "Run created, but flexibility could not be saved.",
        );
      }
    }

    resetRunForm();
    await go("my-runs");
    myRunsSection.value = "upcoming";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Something went wrong.";
  }
}

onMounted(async () => {
  await Promise.all([loadRuns(), loadParticipants(), refreshFriends(), notifications.load()]);
});
</script>

<template>
  <!-- Home: friends' upcoming runs to discover and join -->
  <main v-if="currentPage === 'home'" class="home-page">
    <header>
      <h1 class="brand-mark">RunTogether</h1>
      <div class="header-actions">
        <button
          type="button"
          class="account-chip"
          :aria-label="`Your profile, signed in as ${signedInAs}`"
          @click="go('profile')"
        >
          <span class="small-avatar" aria-hidden="true">{{
            signedInAs.charAt(0).toUpperCase()
          }}</span>
          <span class="account-name" data-testid="signed-in-username">{{ signedInAs }}</span>
        </button>
        <NotificationBell :notifications="notifications" @open="openRunById" />
      </div>
    </header>
    <p v-if="sessionError" class="form-error error-banner" role="alert">{{ sessionError }}</p>

    <section class="create-panel" aria-labelledby="create-panel-title">
      <div>
        <h2 id="create-panel-title">Planning a run?</h2>
        <p>Post it for your friends to join. If you're flexible, they can suggest changes.</p>
      </div>
      <button class="create-run-button create-run-cta" type="button" @click="openCreate">
        <Plus :size="18" aria-hidden="true" /> Create a Run
      </button>
    </section>

    <div class="section-heading">
      <h2>Runs from friends</h2>
      <span v-if="arranged.home.length" class="segment-count">{{ arranged.home.length }}</span>
    </div>
    <p class="section-hint">See what your friends have planned and join them.</p>
    <div v-if="arranged.home.length === 0" class="empty-state">
      <template v-if="myFriends.length === 0">
        <span class="empty-icon" aria-hidden="true"><Users :size="22" /></span>
        <p><strong>Add friends to see their runs here.</strong></p>
        <p class="muted-text">Find people you run with by their username.</p>
        <button class="secondary-button" type="button" @click="go('friends')">
          <UserPlus :size="17" aria-hidden="true" /> Find friends
        </button>
      </template>
      <template v-else>
        <span class="empty-icon" aria-hidden="true"><CalendarDays :size="22" /></span>
        <p><strong>No new runs from your friends.</strong></p>
        <p class="muted-text">
          Runs you host or join are in My Runs. Create a run to invite your friends.
        </p>
      </template>
    </div>
    <div v-else class="run-feed">
      <RunCard
        v-for="run in arranged.home"
        :key="run.run"
        :run="run"
        :going="goingTo(run)"
        @open="openRun(run)"
      />
    </div>
  </main>

  <!-- My Runs: runs I host or joined -->
  <main v-else-if="currentPage === 'my-runs'" class="my-runs-page">
    <header>
      <div>
        <h1>My Runs</h1>
        <p class="page-subtitle">Runs you host or joined.</p>
      </div>
      <NotificationBell :notifications="notifications" @open="openRunById" />
    </header>
    <div class="segmented" role="tablist" aria-label="My runs">
      <button
        v-for="section in SECTIONS"
        :id="`tab-${section}`"
        :key="section"
        type="button"
        role="tab"
        class="segment"
        :class="{ active: myRunsSection === section }"
        :aria-selected="myRunsSection === section"
        aria-controls="my-runs-panel"
        :tabindex="myRunsSection === section ? 0 : -1"
        @click="myRunsSection = section"
        @keydown.right.prevent="moveSection(1)"
        @keydown.left.prevent="moveSection(-1)"
      >
        {{ section.charAt(0).toUpperCase() + section.slice(1) }}
        <span class="segment-count">{{ arranged[section].length }}</span>
      </button>
    </div>
    <div id="my-runs-panel" role="tabpanel" :aria-labelledby="`tab-${myRunsSection}`">
      <div v-if="myRunsShown.length === 0" class="empty-state">
        <template v-if="myRunsSection === 'upcoming'">
          <span class="empty-icon" aria-hidden="true"><CalendarPlus :size="22" /></span>
          <p><strong>No upcoming runs yet.</strong></p>
          <p class="muted-text">Create a run, or join one of your friends' runs from Home.</p>
          <button class="create-run-button" type="button" @click="openCreate">
            <Plus :size="18" aria-hidden="true" /> Create a Run
          </button>
        </template>
        <template v-else-if="myRunsSection === 'past'">
          <span class="empty-icon" aria-hidden="true"><History :size="22" /></span>
          <p><strong>No past runs yet.</strong></p>
          <p class="muted-text">Runs you hosted or joined will appear here after they happen.</p>
        </template>
        <template v-else>
          <span class="empty-icon" aria-hidden="true"><CalendarX :size="22" /></span>
          <p><strong>No canceled runs.</strong></p>
          <p class="muted-text">If a run you host or joined is canceled, it will show up here.</p>
        </template>
      </div>
      <div v-else class="run-feed">
        <RunCard
          v-for="run in myRunsShown"
          :key="run.run"
          :run="run"
          :going="goingTo(run)"
          :role="roleIn(run)"
          @open="openRun(run)"
        />
      </div>
    </div>
  </main>

  <!-- Create or edit a run -->
  <main v-else-if="currentPage === 'create'" class="create-page">
    <div class="create-header">
      <button class="back-button" type="button" aria-label="Back" @click="closeRunForm">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <h1>{{ editingRunId ? "Edit run" : "Create a run" }}</h1>
    </div>

    <form class="create-form" @submit.prevent="submitRunForm">
      <section class="form-section" aria-labelledby="when-where-title">
        <h2 id="when-where-title" class="form-section-title">When and where</h2>
        <label>
          Start time
          <input v-model="startTime" type="datetime-local" required />
        </label>
        <label>
          Meeting point
          <input
            v-model="location"
            type="text"
            placeholder="e.g. Arthur Fiedler Footbridge, Boston"
            aria-describedby="location-hint"
            required
          />
          <span id="location-hint" class="field-hint"
            >Where should friends meet to start the run? Enter a public landmark or address.</span
          >
        </label>
        <a
          v-if="location.trim()"
          class="meeting-point-preview"
          :href="mapsUrl(location)"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin :size="17" aria-hidden="true" />
          Check this meeting point on Google Maps
          <ChevronRight :size="16" aria-hidden="true" />
        </a>
      </section>

      <section class="form-section" aria-labelledby="run-details-title">
        <h2 id="run-details-title" class="form-section-title">The run</h2>
        <div class="form-row">
          <label>
            Distance
            <div class="input-with-unit">
              <input v-model.number="distance" type="number" min="0" step="0.1" required />
              <span>miles</span>
            </div>
          </label>
          <label>
            Pace
            <div class="input-with-unit">
              <input v-model.number="pace" type="number" min="0" step="0.1" required />
              <span>min / mile</span>
            </div>
          </label>
        </div>
        <label>
          <span>Description <span class="optional">(optional)</span></span>
          <textarea
            v-model="details"
            rows="4"
            maxlength="1500"
            placeholder="Describe the route, meeting instructions, or anything friends should know."
          ></textarea>
        </label>
        <p v-if="editingRun && isFlexible(editingRun)" class="field-hint">
          This run's flexibility ranges stay the same, so the new details need to fit within them.
        </p>
      </section>

      <section v-if="!editingRunId" class="flexibility-section">
        <label class="flexibility-heading">
          <span>
            <strong>Set flexibility</strong> <span class="optional">(optional)</span>
            <span class="flexibility-description"
              >Let friends suggest small changes to this run, within ranges you choose.</span
            >
          </span>
          <input
            v-model="hasFlexibility"
            type="checkbox"
            role="switch"
            class="flexibility-toggle"
          />
        </label>

        <div v-if="hasFlexibility" class="flexibility-fields">
          <label>
            Time window
            <div class="range-inputs">
              <input v-model="earliestTime" type="time" aria-label="Earliest start time" />
              <span aria-hidden="true">–</span>
              <input v-model="latestTime" type="time" aria-label="Latest start time" />
            </div>
          </label>
          <label>
            Distance range
            <div class="range-inputs">
              <input
                v-model.number="minDistance"
                type="number"
                min="0"
                step="0.1"
                placeholder="Min"
                aria-label="Minimum distance in miles"
              />
              <span aria-hidden="true">–</span>
              <input
                v-model.number="maxDistance"
                type="number"
                min="0"
                step="0.1"
                placeholder="Max"
                aria-label="Maximum distance in miles"
              />
              <span>miles</span>
            </div>
          </label>
          <label>
            Pace range
            <div class="range-inputs">
              <input
                v-model.number="minPace"
                type="number"
                min="0"
                step="0.1"
                placeholder="Min"
                aria-label="Fastest pace in minutes per mile"
              />
              <span aria-hidden="true">–</span>
              <input
                v-model.number="maxPace"
                type="number"
                min="0"
                step="0.1"
                placeholder="Max"
                aria-label="Slowest pace in minutes per mile"
              />
              <span>min/mi</span>
            </div>
          </label>
        </div>
      </section>

      <div v-if="formProblems.length" class="form-problems" role="alert">
        <p v-for="problem in formProblems" :key="problem" class="form-error">{{ problem }}</p>
      </div>

      <button
        class="save-run-button form-submit"
        type="submit"
        :disabled="savingRun"
        :aria-busy="savingRun"
      >
        {{ savingRun ? "Saving…" : editingRunId ? "Save changes" : "Save run" }}
      </button>
    </form>
  </main>

  <!-- Run details: the run, what you can do with it, then suggestions, who's going, and the talk -->
  <main v-else-if="currentPage === 'run-details' && selectedRun" class="run-details-page">
    <div class="details-header">
      <button class="back-button" type="button" aria-label="Back" @click="go(returnTo)">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <div class="details-host">
        <span class="small-avatar" aria-hidden="true">{{
          selectedRun.owner.charAt(0).toUpperCase()
        }}</span>
        <p>
          Hosted by <strong>{{ selectedRun.owner }}</strong
          ><template v-if="isOwner"> (you)</template>
        </p>
      </div>
    </div>
    <p v-if="isCanceled(selectedRun)" class="canceled-banner" role="status">
      <CircleX :size="18" aria-hidden="true" /> This run was canceled by
      {{ isOwner ? "you" : selectedRun.owner }}.
    </p>

    <section class="details-hero" aria-labelledby="run-heading">
      <div class="run-title-row" :class="{ 'canceled-title': isCanceled(selectedRun) }">
        <h1 id="run-heading">{{ runTitle(selectedRun.startTime) }}</h1>
        <span class="flex-badge" :class="isFlexible(selectedRun) ? 'flexible' : 'fixed'">{{
          isFlexible(selectedRun) ? "Flexible" : "Fixed"
        }}</span>
      </div>
      <dl class="run-facts">
        <div>
          <dt><CalendarDays :size="15" aria-hidden="true" />When</dt>
          <dd>
            {{ formatRunDate(selectedRun.startTime) }} · {{ formatRunTime(selectedRun.startTime) }}
          </dd>
        </div>
        <div>
          <dt><Route :size="15" aria-hidden="true" />Distance and pace</dt>
          <dd>{{ selectedRun.distance }} miles · {{ selectedRun.pace }} min/mi</dd>
        </div>
        <div>
          <dt><MapPin :size="15" aria-hidden="true" />Where</dt>
          <dd>Meet at {{ selectedRun.location }}</dd>
        </div>
      </dl>
      <div v-if="isFlexible(selectedRun)" class="flex-ranges">
        <h2>Open to changes within</h2>
        <ul>
          <li v-if="selectedRun.earliestTime && selectedRun.latestTime">
            Time window: {{ formatRunTime(selectedRun.earliestTime) }} –
            {{ formatRunTime(selectedRun.latestTime) }}
          </li>
          <li v-if="selectedRun.minDistance != null && selectedRun.maxDistance != null">
            Distance: {{ selectedRun.minDistance }}–{{ selectedRun.maxDistance }} miles
          </li>
          <li v-if="selectedRun.minPace != null && selectedRun.maxPace != null">
            Pace: {{ selectedRun.minPace }}–{{ selectedRun.maxPace }} min/mi
          </li>
        </ul>
      </div>
      <a
        class="details-map-link"
        :href="mapsUrl(selectedRun.location)"
        target="_blank"
        rel="noopener noreferrer"
        ><MapPin :size="18" aria-hidden="true" /> View meeting point on Google Maps
        <ChevronRight :size="17" aria-hidden="true"
      /></a>
    </section>

    <p v-if="runActionMessage" class="success-message" role="status">{{ runActionMessage }}</p>
    <p v-if="runDetailsError" class="form-error error-banner" role="alert">
      {{ runDetailsError }}
    </p>

    <!-- What the signed-in user can do with this run -->
    <section v-if="runIsOpen" class="run-actions" aria-label="Run actions">
      <template v-if="isOwner">
        <button class="save-run-button" type="button" :disabled="runActionBusy" @click="openEdit">
          <Pencil :size="17" aria-hidden="true" /> Edit run
        </button>
        <button
          class="danger-button"
          type="button"
          :disabled="runActionBusy"
          @click="confirmCancelOpen = true"
        >
          <CircleX :size="17" aria-hidden="true" /> Cancel run
        </button>
      </template>
      <template v-else-if="isJoined">
        <button class="outline-action-button" type="button" @click="openSuggestion">
          <Lightbulb :size="17" aria-hidden="true" /> Suggest a change
        </button>
        <button
          class="secondary-button"
          type="button"
          :disabled="runActionBusy"
          :aria-busy="runActionBusy"
          @click="leaveSelectedRun"
        >
          <UserMinus :size="17" aria-hidden="true" /> Leave run
        </button>
      </template>
      <template v-else>
        <button
          class="save-run-button"
          type="button"
          :disabled="runActionBusy"
          :aria-busy="runActionBusy"
          @click="joinSelectedRun"
        >
          <UserPlus :size="17" aria-hidden="true" /> Join run
        </button>
        <button class="outline-action-button" type="button" @click="openSuggestion">
          <Lightbulb :size="17" aria-hidden="true" /> Suggest a change
        </button>
      </template>
    </section>
    <p v-else-if="!isCanceled(selectedRun)" class="run-status-note">
      This run has already happened.
    </p>

    <section
      v-if="isOwner && runIsOpen && pendingSuggestions.length"
      class="run-details-section"
      aria-labelledby="suggestions-title"
    >
      <h2 id="suggestions-title">
        Pending suggestions <span class="segment-count">{{ pendingSuggestions.length }}</span>
      </h2>
      <div
        v-for="suggestion in pendingSuggestions"
        :key="suggestion.suggestion"
        class="suggestion-item"
      >
        <div class="suggestion-summary">
          <p>
            <strong>{{ suggestion.suggester }}</strong> suggests
            {{ changeRows(selectedRun, suggestion.change).length === 1 ? "a change" : "changes" }}:
          </p>
          <dl class="change-rows">
            <div v-for="row in changeRows(selectedRun, suggestion.change)" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>
                <span class="change-from">{{ row.from }}</span>
                <span aria-label="to"> → </span>
                <strong class="change-to">{{ row.to }}</strong>
              </dd>
            </div>
          </dl>
        </div>
        <div class="suggestion-buttons">
          <button
            type="button"
            class="create-run-button"
            :disabled="runActionBusy"
            @click="decideSuggestion(suggestion.suggestion, 'accept')"
          >
            Accept
          </button>
          <button
            type="button"
            class="outline-action-button"
            :disabled="runActionBusy"
            @click="decideSuggestion(suggestion.suggestion, 'reject')"
          >
            Reject
          </button>
        </div>
      </div>
    </section>

    <section class="run-details-section" aria-labelledby="going-title">
      <h2 id="going-title">Going ({{ selectedParticipants.length }})</h2>
      <div class="participants-list">
        <div v-for="participant in selectedParticipants" :key="participant" class="participant">
          <span class="small-avatar" aria-hidden="true">{{
            participant.charAt(0).toUpperCase()
          }}</span
          ><strong>{{ participant }}</strong
          ><span v-if="participant === selectedRun.owner" class="comment-host">Host</span>
        </div>
      </div>
    </section>
    <section class="run-details-section" aria-labelledby="description-title">
      <h2 id="description-title">Description</h2>
      <p class="description-text" :class="{ empty: !selectedRun.details }">
        {{ selectedRun.details || "No description provided." }}
      </p>
    </section>
    <RunComments :key="selectedRun.run" :run="selectedRun" :me="currentUser" :post="postJson" />
  </main>

  <!-- Friends: find people, answer requests, and see friends -->
  <main v-else-if="currentPage === 'friends'" class="friends-page">
    <header>
      <div>
        <h1>Friends</h1>
        <p class="page-subtitle">Your friends' runs show up on Home.</p>
      </div>
      <NotificationBell :notifications="notifications" @open="openRunById" />
    </header>

    <section class="friends-section" aria-labelledby="find-title">
      <h2 id="find-title">Find friends</h2>
      <form class="add-friend-form" role="search" @submit.prevent="searchPeople">
        <div class="search-field">
          <Search :size="18" aria-hidden="true" />
          <input
            v-model="friendName"
            type="search"
            placeholder="Search by username"
            aria-label="Search by username"
            aria-describedby="search-hint"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>
        <button class="create-run-button" type="submit">Search</button>
      </form>
      <p id="search-hint" class="field-hint">
        Type at least {{ MIN_SEARCH }} letters of a username, or browse the people below.
      </p>
      <p v-if="friendError" class="form-error error-banner" role="alert">{{ friendError }}</p>
      <p v-if="friendMessage" class="success-message" role="status">{{ friendMessage }}</p>
      <h3 v-if="searchedFor !== null" class="results-heading">
        {{ searchedFor === "" ? "People on RunTogether" : `Results for “${searchedFor}”` }}
      </h3>
      <p v-if="searching && searchResults.length === 0" class="muted-text loading" role="status">
        Searching…
      </p>
      <div
        v-else-if="searchedFor === '' && searchResults.length === 0"
        class="empty-state"
        data-testid="no-people"
      >
        <span class="empty-icon" aria-hidden="true"><Users :size="22" /></span>
        <p><strong>You're the first one here.</strong></p>
        <p class="muted-text">
          Invite your friends to sign up for RunTogether, then find them here by username.
        </p>
      </div>
      <p v-else-if="searchedFor && searchResults.length === 0" class="muted-text">
        No users found.
      </p>
      <ul
        v-if="searchResults.length"
        class="search-results"
        :aria-label="searchedFor ? 'Search results' : 'People on RunTogether'"
      >
        <li
          v-for="name in searchResults"
          :key="name"
          class="request-row search-result"
          :data-username="name"
        >
          <span class="search-result-name"
            ><span class="small-avatar" aria-hidden="true">{{ name.charAt(0).toUpperCase() }}</span
            >{{ name }}</span
          >
          <span v-if="friendState(name) === 'friends'" class="flex-badge flexible"
            >Already friends</span
          >
          <span v-else-if="friendState(name) === 'requested'" class="flex-badge fixed"
            >Requested</span
          >
          <div v-else-if="friendState(name) === 'incoming'" class="request-actions">
            <button
              class="create-run-button"
              type="button"
              @click="friendAction('accept', incomingRequestFrom(name))"
            >
              Accept
            </button>
            <button
              class="secondary-button"
              type="button"
              @click="friendAction('reject', incomingRequestFrom(name))"
            >
              Decline
            </button>
          </div>
          <button v-else class="create-run-button" type="button" @click="sendFriendRequest(name)">
            <UserPlus :size="16" aria-hidden="true" /> Add Friend
          </button>
        </li>
      </ul>
    </section>

    <section class="friends-section" aria-labelledby="requests-title">
      <h2 id="requests-title">
        Friend requests
        <span v-if="incomingRequests.length" class="request-count">{{
          incomingRequests.length
        }}</span>
      </h2>
      <p v-if="incomingRequests.length === 0 && outgoingRequests.length === 0" class="muted-text">
        No pending requests.
      </p>
      <div v-for="request in incomingRequests" :key="request.request" class="request-row">
        <span class="search-result-name"
          ><span class="small-avatar" aria-hidden="true">{{
            request.sender.charAt(0).toUpperCase()
          }}</span
          >{{ request.sender }}</span
        >
        <div class="request-actions">
          <button
            class="create-run-button"
            type="button"
            @click="friendAction('accept', request.request)"
          >
            Accept
          </button>
          <button
            class="secondary-button"
            type="button"
            @click="friendAction('reject', request.request)"
          >
            Decline
          </button>
        </div>
      </div>
      <div v-for="request in outgoingRequests" :key="request.request" class="request-row">
        <span class="search-result-name"
          ><span class="small-avatar" aria-hidden="true">{{
            request.recipient.charAt(0).toUpperCase()
          }}</span
          >{{ request.recipient }}</span
        >
        <span class="flex-badge fixed">Requested</span>
      </div>
    </section>

    <section class="friends-section" aria-labelledby="your-friends-title">
      <h2 id="your-friends-title">Your friends ({{ myFriends.length }})</h2>
      <div v-if="myFriends.length === 0" class="empty-state">
        <span class="empty-icon" aria-hidden="true"><UserPlus :size="22" /></span>
        <p><strong>No friends yet.</strong></p>
        <p class="muted-text">Search above for people you run with to see and join their runs.</p>
      </div>
      <ul v-else class="friend-list" aria-label="Your friends">
        <li v-for="friend in myFriends" :key="friend" class="friend-row">
          <span class="small-avatar" aria-hidden="true">{{ friend.charAt(0).toUpperCase() }}</span
          >{{ friend }}
        </li>
      </ul>
    </section>
  </main>

  <!-- Profile: account and logout -->
  <main v-else-if="currentPage === 'profile'" class="profile-page">
    <header>
      <h1>Profile</h1>
      <NotificationBell :notifications="notifications" @open="openRunById" />
    </header>
    <section class="profile-card">
      <div class="profile-avatar" aria-hidden="true">
        {{ currentUser.charAt(0).toUpperCase() }}
      </div>
      <div class="profile-identity">
        <h2 class="profile-name">{{ currentUser }}</h2>
        <p class="muted-text">Signed in as @{{ signedInAs }}</p>
      </div>
    </section>

    <div class="profile-stats">
      <button class="stat-card" type="button" @click="go('friends')">
        <strong>{{ myFriends.length }}</strong>
        <span>{{ myFriends.length === 1 ? "Friend" : "Friends" }}</span>
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
      <button class="stat-card" type="button" @click="go('my-runs')">
        <strong>{{ arranged.upcoming.length }}</strong>
        <span>Upcoming {{ arranged.upcoming.length === 1 ? "run" : "runs" }}</span>
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </div>

    <section class="profile-section" aria-labelledby="account-title">
      <h2 id="account-title">Account</h2>
      <button
        class="profile-menu-item"
        type="button"
        :disabled="signingOut"
        :aria-busy="signingOut"
        @click="logOut"
      >
        <span class="menu-label"
          ><LogOut :size="19" aria-hidden="true" /><span>Log out of {{ signedInAs }}</span></span
        >
      </button>
      <p v-if="sessionError" class="form-error" role="alert">{{ sessionError }}</p>
    </section>
  </main>

  <!-- Suggest a change: any of the run's time, meeting point, distance, pace, and description -->
  <div
    v-if="suggestionOpen && selectedRun"
    class="suggestion-backdrop"
    @click.self="suggestionOpen = false"
    @keydown.esc="suggestionOpen = false"
  >
    <div
      ref="suggestionDialog"
      class="suggestion-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-title"
      tabindex="-1"
    >
      <div class="suggestion-modal-header">
        <h2 id="suggestion-title">Suggest a change</h2>
        <button
          type="button"
          class="icon-button suggestion-close"
          aria-label="Close suggestion"
          @click="suggestionOpen = false"
        >
          <X :size="22" aria-hidden="true" />
        </button>
      </div>
      <p class="muted-text">
        Propose new details for this run. {{ selectedRun.owner }} will see what you'd change, and if
        they accept, the run is updated and you'll be going.
      </p>
      <form class="suggestion-form" @submit.prevent="sendSuggestion">
        <label
          >Start time
          <input
            v-model="draft.startTime"
            type="datetime-local"
            required
            :min="selectedRun.earliestTime || undefined"
            :max="selectedRun.latestTime || undefined"
          />
        </label>
        <p v-if="selectedRun.earliestTime && selectedRun.latestTime" class="field-hint">
          Between {{ formatRunTime(selectedRun.earliestTime) }} and
          {{ formatRunTime(selectedRun.latestTime) }}.
        </p>
        <label
          >Meeting point
          <input v-model="draft.location" type="text" maxlength="200" required />
        </label>
        <div class="suggestion-pair">
          <label
            >Distance (miles)
            <input v-model.number="draft.distance" type="number" min="0" step="0.1" required />
          </label>
          <label
            >Pace (min/mi)
            <input v-model.number="draft.pace" type="number" min="0" step="0.1" required />
          </label>
        </div>
        <label
          >Description
          <textarea v-model="draft.details" rows="3" maxlength="1500"></textarea>
        </label>

        <div v-if="draftRows.length" class="suggestion-preview">
          <p><strong>You're suggesting</strong></p>
          <dl class="change-rows">
            <div v-for="row in draftRows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>
                <span class="change-from">{{ row.from }}</span>
                <span aria-label="to"> → </span>
                <strong class="change-to">{{ row.to }}</strong>
              </dd>
            </div>
          </dl>
        </div>
        <p v-if="draftProblem" class="form-error" role="alert">{{ draftProblem }}</p>
        <p v-if="suggestionError" class="form-error" role="alert">{{ suggestionError }}</p>
        <button
          class="save-run-button"
          type="submit"
          :disabled="!!draftProblem || runActionBusy"
          :aria-busy="runActionBusy"
        >
          {{ runActionBusy ? "Sending…" : "Send suggestion" }}
        </button>
      </form>
    </div>
  </div>

  <!-- Confirm before canceling: it can't be undone -->
  <div
    v-if="confirmCancelOpen && selectedRun"
    class="suggestion-backdrop"
    @click.self="confirmCancelOpen = false"
    @keydown.esc="confirmCancelOpen = false"
  >
    <div
      ref="confirmDialog"
      class="suggestion-modal confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      aria-describedby="cancel-description"
      tabindex="-1"
    >
      <h2 id="cancel-title">Cancel this run?</h2>
      <p id="cancel-description" class="muted-text">
        {{ runTitle(selectedRun.startTime) }} on {{ formatRunDate(selectedRun.startTime) }} at
        {{ formatRunTime(selectedRun.startTime) }} will be marked canceled for everyone who joined.
        This can't be undone.
      </p>
      <div class="confirm-buttons">
        <button
          class="secondary-button"
          type="button"
          :disabled="runActionBusy"
          @click="confirmCancelOpen = false"
        >
          Keep run
        </button>
        <button
          class="danger-button"
          type="button"
          :disabled="runActionBusy"
          :aria-busy="runActionBusy"
          @click="cancelSelectedRun"
        >
          {{ runActionBusy ? "Canceling…" : "Cancel run" }}
        </button>
      </div>
    </div>
  </div>

  <p v-if="notice" class="toast" role="status">{{ notice }}</p>

  <!-- Bottom navigation -->
  <nav
    v-if="currentPage !== 'create' && currentPage !== 'run-details'"
    class="bottom-nav"
    aria-label="Main navigation"
  >
    <button
      type="button"
      class="nav-item"
      :class="{ active: currentPage === 'home' }"
      :aria-current="currentPage === 'home' ? 'page' : undefined"
      @click="go('home')"
    >
      <Home class="nav-icon" aria-hidden="true" />
      <span>Home</span>
    </button>
    <button
      type="button"
      class="nav-item"
      :class="{ active: currentPage === 'my-runs' }"
      :aria-current="currentPage === 'my-runs' ? 'page' : undefined"
      @click="go('my-runs')"
    >
      <CalendarCheck class="nav-icon" aria-hidden="true" />
      <span>My Runs</span>
    </button>
    <button
      type="button"
      class="nav-item"
      :class="{ active: currentPage === 'friends' }"
      :aria-current="currentPage === 'friends' ? 'page' : undefined"
      :aria-label="incomingRequests.length ? 'Friends, new friend requests' : undefined"
      @click="go('friends')"
    >
      <Users class="nav-icon" aria-hidden="true" />
      <span>Friends</span>
      <span v-if="incomingRequests.length" class="nav-dot"></span>
    </button>
    <button
      type="button"
      class="nav-item"
      :class="{ active: currentPage === 'profile' }"
      :aria-current="currentPage === 'profile' ? 'page' : undefined"
      @click="go('profile')"
    >
      <User class="nav-icon" aria-hidden="true" />
      <span>Profile</span>
    </button>
  </nav>
</template>
