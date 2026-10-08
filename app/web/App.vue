<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  Home,
  CalendarDays,
  Users,
  User,
  ChevronRight,
  ArrowLeft,
  UserRoundPlus,
  MapPin,
  Clock3,
  Route,
} from "lucide-vue-next";

interface Run {
  run: string;
  owner: string;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
  details?: string | null;
  earliestTime?: string | null;
  latestTime?: string | null;
  minDistance?: number | null;
  maxDistance?: number | null;
  minPace?: number | null;
  maxPace?: number | null;
}

interface Friendship {
  friendship: string;
  user1: string;
  user2: string;
}

const currentUser = ref("Jamie");
const currentPage = ref<"home" | "create" | "profile" | "community" | "calendar" | "run-details">(
  "home",
);

const runs = ref<Run[]>([]);
const selectedRunId = ref<string | null>(null);
const participations = ref<{ participation: string; user: string; event: string }[]>([]);
const runDetailsError = ref("");
const selectedRun = computed(() => runs.value.find((r) => r.run === selectedRunId.value) ?? null);
const selectedParticipants = computed(() => {
  if (!selectedRun.value) return [];
  return [
    selectedRun.value.owner,
    ...new Set(
      participations.value
        .filter((p) => p.event === selectedRunId.value)
        .map((p) => p.user)
        .filter((u) => u !== selectedRun.value?.owner),
    ),
  ];
});
function isFlexible(run: Run): boolean {
  return [
    run.earliestTime,
    run.latestTime,
    run.minDistance,
    run.maxDistance,
    run.minPace,
    run.maxPace,
  ].some((v) => v !== null && v !== undefined);
}
async function loadParticipants() {
  runDetailsError.value = "";
  try {
    const response = await fetch("/api/runs/participants", {
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
  await Promise.all([loadParticipants(), loadSuggestions()]);
}

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
const suggestedTime = ref("");
const suggestionError = ref("");
const runActionMessage = ref("");
const runActionBusy = ref(false);
const isJoined = computed(() =>
  participations.value.some((p) => p.event === selectedRunId.value && p.user === currentUser.value),
);
const pendingSuggestions = computed(() =>
  suggestions.value.filter((s) => s.event === selectedRunId.value && s.status === "PENDING"),
);
const suggestionTimeError = computed(() => {
  const run = selectedRun.value;
  if (!run || !suggestedTime.value) return "Select a start time.";
  if (suggestedTime.value === run.startTime) return "Choose a different time to suggest.";
  if (!run.earliestTime || !run.latestTime)
    return "The host has not enabled time changes for this run.";
  if (suggestedTime.value < run.earliestTime || suggestedTime.value > run.latestTime) {
    return `Choose a time between ${formatRunTime(run.earliestTime)} and ${formatRunTime(run.latestTime)}.`;
  }
  return "";
});
async function postAction(path: string, body: Record<string, string>) {
  const response = await fetch(`/api/${path}`, {
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
  suggestedTime.value = selectedRun.value.startTime.slice(0, 16);
  suggestionError.value = "";
  suggestionOpen.value = true;
}
async function sendSuggestion() {
  if (!selectedRun.value || suggestionTimeError.value || runActionBusy.value) return;
  suggestionError.value = "";
  runActionBusy.value = true;
  try {
    await postAction("suggestions/create", {
      suggester: currentUser.value,
      decider: selectedRun.value.owner,
      event: selectedRun.value.run,
      change: suggestedTime.value,
    });
    suggestionOpen.value = false;
    runActionMessage.value = `Suggestion sent to ${selectedRun.value.owner}.`;
    await loadSuggestions();
  } catch (error) {
    suggestionError.value = error instanceof Error ? error.message : "Could not send suggestion.";
  } finally {
    runActionBusy.value = false;
  }
}
async function joinSelectedRun() {
  if (!selectedRun.value || runActionBusy.value || isJoined.value) return;
  runActionBusy.value = true;
  runDetailsError.value = "";
  try {
    await postAction("runs/join", { user: currentUser.value, event: selectedRun.value.run });
    await loadParticipants();
    runActionMessage.value = "You joined this run!";
  } catch (error) {
    runDetailsError.value = error instanceof Error ? error.message : "Could not join run.";
  } finally {
    runActionBusy.value = false;
  }
}
async function decideSuggestion(suggestion: string, action: "accept" | "reject") {
  if (runActionBusy.value) return;
  runActionBusy.value = true;
  runDetailsError.value = "";
  try {
    await postAction(`suggestions/${action}`, { decider: currentUser.value, suggestion });
    await Promise.all([loadSuggestions(), loadRuns(), loadParticipants()]);
    runActionMessage.value =
      action === "accept" ? "Suggestion accepted. Run updated." : "Suggestion rejected.";
  } catch (error) {
    runDetailsError.value =
      error instanceof Error ? error.message : "Could not process suggestion.";
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
const profileSection = ref<"overview" | "friends" | "requests" | "add">("overview");
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

// Show upcoming runs created by the current user or accepted friends.
// This is prototype-level filtering; the backend still returns all runs.
const visibleRuns = computed(() =>
  runs.value
    .filter(
      (run) =>
        (run.owner === currentUser.value || myFriends.value.includes(run.owner)) &&
        new Date(run.startTime).getTime() >= Date.now(),
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
);

function formatRunDate(start: string): string {
  return new Date(start).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatRunTime(start: string): string {
  return new Date(start).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function runTitle(start: string): string {
  const hour = new Date(start).getHours();
  if (hour < 11) return "Morning run";
  if (hour < 16) return "Afternoon run";
  return "Evening run";
}

function mapsUrl(meetingPoint: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingPoint)}`;
}

async function loadFriends() {
  friendError.value = "";
  try {
    const response = await fetch("/api/friends/list", {
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
    const response = await fetch("/api/friends/requests", {
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

async function openProfile() {
  currentPage.value = "profile";
  profileSection.value = "overview";
  friendMessage.value = "";
  await refreshFriends();
}

async function friendAction(action: "accept" | "reject", request: string) {
  friendError.value = "";
  friendMessage.value = "";
  try {
    const response = await fetch(`/api/friends/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: currentUser.value, request }),
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

async function sendFriendRequest() {
  friendError.value = "";
  friendMessage.value = "";
  const recipient = friendName.value.trim();
  if (!recipient || recipient === currentUser.value) {
    friendError.value = "Enter another user's name.";
    return;
  }
  try {
    const response = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: currentUser.value, recipient }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error ?? "Could not send friend request.");
    }
    friendMessage.value = `Friend request sent to ${recipient}.`;
    friendName.value = "";
    await loadRequests();
  } catch (error) {
    friendError.value = error instanceof Error ? error.message : "Could not send friend request.";
  }
}

watch(currentUser, () => {
  friendMessage.value = "";
  friendError.value = "";
  friendName.value = "";
  profileSection.value = "overview";
  void refreshFriends();
});

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

async function loadRuns() {
  const response = await fetch("/api/runs/list", {
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
    const response = await fetch("/api/runs/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: currentUser.value,
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
      const flexibilityResponse = await fetch("/api/runs/flexibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: currentUser.value,
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

    await loadRuns();
    currentPage.value = "home";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Something went wrong.";
  }
}

onMounted(async () => {
  await Promise.all([loadRuns(), refreshFriends()]);
});
</script>

<template>
  <!-- Home page -->
  <main v-if="currentPage === 'home'">
    <header>
      <h1>RunTogether</h1>
    </header>

    <div class="home-heading">
      <h2>Upcoming runs</h2>
      <button class="create-run-button" type="button" @click="currentPage = 'create'">
        + Create a Run
      </button>
    </div>

    <p v-if="visibleRuns.length === 0" class="muted-text">
      No upcoming runs from you or your friends. Create a run to get started!
    </p>

    <div v-else class="run-feed">
      <article
        v-for="run in visibleRuns"
        :key="run.run"
        class="run-card clickable-run-card"
        tabindex="0"
        role="button"
        :aria-label="`View ${run.owner}'s run`"
        @click="openRun(run)"
        @keydown.enter="openRun(run)"
        @keydown.space.prevent="openRun(run)"
      >
        <div class="run-card-owner">
          <span class="small-avatar">{{ run.owner.charAt(0).toUpperCase() }}</span>
          <div>
            <strong>{{ run.owner }}</strong>
            <p class="run-card-date">{{ formatRunDate(run.startTime) }}</p>
          </div>
          <span v-if="run.owner === currentUser" class="your-run-badge">Your run</span>
        </div>

        <div class="run-title-row">
          <h3>{{ runTitle(run.startTime) }}</h3>
          <span class="flex-badge" :class="isFlexible(run) ? 'flexible' : 'fixed'">{{
            isFlexible(run) ? "Flexible" : "Fixed"
          }}</span>
        </div>
        <div class="run-card-detail">
          <Route :size="17" />
          <span
            >{{ run.distance }} {{ run.distance === 1 ? "mile" : "miles" }} ·
            {{ run.pace }} min/mi</span
          >
        </div>
        <div class="run-card-detail">
          <Clock3 :size="17" />
          <span>{{ formatRunTime(run.startTime) }}</span>
        </div>
        <div class="run-card-detail">
          <MapPin :size="17" />
          <span>Meet at {{ run.location }}</span>
        </div>
        <a
          class="run-map-link"
          :href="mapsUrl(run.location)"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          View meeting point on Google Maps
          <ChevronRight :size="16" />
        </a>
      </article>
    </div>
  </main>

  <!-- Create run page -->
  <main v-else-if="currentPage === 'create'" class="create-page">
    <div class="create-header">
      <button class="back-button" type="button" @click="currentPage = 'home'">←</button>

      <h1>Create a run</h1>
    </div>

    <form class="create-form" @submit.prevent="createRun">
      <label>
        Start time
        <input v-model="startTime" type="datetime-local" required />
      </label>

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

      <label>
        Meeting point
        <input
          v-model="location"
          type="text"
          placeholder="e.g. Arthur Fiedler Footbridge, Boston"
          required
        />
        <span class="field-hint"
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
        <MapPin :size="17" />
        Check this meeting point on Google Maps
        <ChevronRight :size="16" />
      </a>

      <label>
        Details (optional)
        <textarea
          v-model="details"
          rows="4"
          maxlength="1500"
          placeholder="Describe the route, meeting instructions, or anything friends should know."
        ></textarea>
      </label>

      <section class="flexibility-section">
        <div class="flexibility-heading">
          <div>
            <strong>Set flexibility (optional)</strong>
            <p>Let friends suggest small changes to this run.</p>
          </div>

          <input v-model="hasFlexibility" type="checkbox" class="flexibility-toggle" />
        </div>

        <div v-if="hasFlexibility" class="flexibility-fields">
          <label>
            Time window

            <div class="range-inputs">
              <input v-model="earliestTime" type="time" />

              <span>–</span>

              <input v-model="latestTime" type="time" />
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
              />
              <span>–</span>
              <input
                v-model.number="maxDistance"
                type="number"
                min="0"
                step="0.1"
                placeholder="Max"
              />
              <span>miles</span>
            </div>
          </label>

          <label>
            Pace range
            <div class="range-inputs">
              <input v-model.number="minPace" type="number" min="0" step="0.1" placeholder="Min" />
              <span>–</span>
              <input v-model.number="maxPace" type="number" min="0" step="0.1" placeholder="Max" />
              <span>min/mi</span>
            </div>
          </label>
        </div>
      </section>

      <p v-if="errorMessage" class="form-error">
        {{ errorMessage }}
      </p>

      <p v-if="flexibilityError" class="form-error">
        {{ flexibilityError }}
      </p>

      <button class="save-run-button" type="submit">Save run</button>
    </form>
  </main>

  <!-- Run details -->
  <main v-else-if="currentPage === 'run-details' && selectedRun" class="run-details-page">
    <div class="details-header">
      <button
        class="back-button"
        type="button"
        aria-label="Back to home"
        @click="currentPage = 'home'"
      >
        <ArrowLeft :size="25" />
      </button>
      <span class="small-avatar">{{ selectedRun.owner.charAt(0).toUpperCase() }}</span>
      <div>
        <strong>{{ selectedRun.owner }}</strong>
        <p class="run-card-date">
          {{ formatRunDate(selectedRun.startTime) }} · {{ formatRunTime(selectedRun.startTime) }}
        </p>
      </div>
    </div>
    <div class="run-title-row">
      <h1>{{ runTitle(selectedRun.startTime) }}</h1>
      <span class="flex-badge" :class="isFlexible(selectedRun) ? 'flexible' : 'fixed'">{{
        isFlexible(selectedRun) ? "Flexible" : "Fixed"
      }}</span>
    </div>
    <div class="run-card-detail">
      <MapPin :size="19" /><span>Meet at {{ selectedRun.location }}</span>
    </div>
    <div class="run-card-detail">
      <Route :size="19" /><span
        >{{ selectedRun.distance }} miles · {{ selectedRun.pace }} min/mi</span
      >
    </div>
    <div class="run-card-detail">
      <Clock3 :size="19" /><span>{{ formatRunTime(selectedRun.startTime) }}</span>
    </div>
    <div v-if="isFlexible(selectedRun)" class="flex-ranges">
      <p v-if="selectedRun.earliestTime && selectedRun.latestTime">
        Time window: {{ formatRunTime(selectedRun.earliestTime) }} –
        {{ formatRunTime(selectedRun.latestTime) }}
      </p>
      <p v-if="selectedRun.minDistance != null && selectedRun.maxDistance != null">
        Distance: {{ selectedRun.minDistance }}–{{ selectedRun.maxDistance }} miles
      </p>
      <p v-if="selectedRun.minPace != null && selectedRun.maxPace != null">
        Pace: {{ selectedRun.minPace }}–{{ selectedRun.maxPace }} min/mi
      </p>
    </div>
    <a
      class="details-map-link"
      :href="mapsUrl(selectedRun.location)"
      target="_blank"
      rel="noopener noreferrer"
      ><MapPin :size="19" /> View meeting point on Google Maps <ChevronRight :size="17"
    /></a>
    <section class="run-details-section">
      <h2>Going ({{ selectedParticipants.length }})</h2>
      <p v-if="runDetailsError" class="form-error">{{ runDetailsError }}</p>
      <div class="participants-list">
        <div v-for="participant in selectedParticipants" :key="participant" class="participant">
          <span class="small-avatar">{{ participant.charAt(0).toUpperCase() }}</span
          ><strong>{{ participant }}</strong
          ><span v-if="participant === selectedRun.owner" class="muted-text">Host</span>
        </div>
      </div>
    </section>
    <p v-if="runActionMessage" class="success-message" role="status">{{ runActionMessage }}</p>
    <section v-if="selectedRun.owner !== currentUser" class="run-actions">
      <button
        class="save-run-button"
        type="button"
        :disabled="runActionBusy || isJoined"
        @click="joinSelectedRun"
      >
        {{ isJoined ? "Joined" : "Join run" }}
      </button>
      <button class="outline-action-button" type="button" @click="openSuggestion">
        Suggest a change
      </button>
    </section>
    <section v-else-if="pendingSuggestions.length" class="run-details-section">
      <h2>Pending suggestions</h2>
      <div
        v-for="suggestion in pendingSuggestions"
        :key="suggestion.suggestion"
        class="suggestion-item"
      >
        <div>
          <strong>{{ suggestion.suggester }}</strong> suggests
          {{ formatRunTime(suggestion.change) }}
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
    <section class="run-details-section">
      <h2>Details</h2>
      <p class="description-text">{{ selectedRun.details || "No additional details provided." }}</p>
    </section>
  </main>

  <!-- Community: public discovery needs visibility and location support in the backend -->
  <main v-else-if="currentPage === 'community'" class="community-page">
    <header>
      <h1>Community</h1>
    </header>
    <h2>Discover nearby runs</h2>
    <p class="muted-text">
      Public runs in your area will appear here once location-based discovery and public-run
      visibility are supported.
    </p>
  </main>

  <!-- Calendar placeholder -->
  <main v-else-if="currentPage === 'calendar'" class="calendar-page">
    <h1>Calendar</h1>
    <p class="muted-text">Your scheduled runs will appear here.</p>
  </main>

  <!-- Profile and nested friend management screens -->
  <main v-else-if="currentPage === 'profile'" class="profile-page">
    <header>
      <button
        v-if="profileSection !== 'overview'"
        class="back-button"
        type="button"
        @click="profileSection = 'overview'"
        aria-label="Back to profile"
      >
        <ArrowLeft :size="24" />
      </button>
      <h1>
        {{
          profileSection === "overview"
            ? "Profile"
            : profileSection === "friends"
              ? "Friends"
              : profileSection === "requests"
                ? "Friend Requests"
                : "Add Friends"
        }}
      </h1>
    </header>

    <template v-if="profileSection === 'overview'">
      <section class="profile-card">
        <div class="profile-avatar">{{ currentUser.charAt(0) }}</div>
        <div>
          <h2 class="profile-name">{{ currentUser }}</h2>
          <p class="muted-text">RunTogether member</p>
        </div>
      </section>

      <div class="profile-stats">
        <button class="stat-card" @click="profileSection = 'friends'">
          <strong>{{ myFriends.length }}</strong>
          <span>{{ myFriends.length === 1 ? "Friend" : "Friends" }}</span>
          <ChevronRight :size="18" />
        </button>
        <div class="stat-card stat-static">
          <strong>{{ runs.filter((r) => r.owner === currentUser).length }}</strong>
          <span>Runs planned</span>
        </div>
      </div>

      <button class="profile-menu-item" @click="profileSection = 'requests'">
        <span
          >Friend Requests
          <span v-if="incomingRequests.length" class="request-count">{{
            incomingRequests.length
          }}</span></span
        >
        <ChevronRight :size="20" />
      </button>
      <button class="profile-menu-item" @click="profileSection = 'add'">
        <span><UserRoundPlus :size="19" class="inline-icon" /> Add Friends</span>
        <ChevronRight :size="20" />
      </button>
      <div class="demo-switch">
        <label for="demo-user">Switch demo user</label>
        <select id="demo-user" v-model="currentUser">
          <option>Jamie</option>
          <option>Taylor</option>
          <option>Morgan</option>
          <option>Alice</option>
          <option>Elaine</option>
        </select>
        <p class="muted-text">For testing the two sides of a friend request.</p>
      </div>
    </template>

    <section v-else-if="profileSection === 'friends'" class="friends-section">
      <p v-if="myFriends.length === 0" class="muted-text">No friends yet.</p>
      <ul v-else class="friend-list">
        <li v-for="friend in myFriends" :key="friend" class="friend-row">
          <span class="small-avatar">{{ friend.charAt(0) }}</span
          >{{ friend }}
        </li>
      </ul>
    </section>

    <section v-else-if="profileSection === 'requests'" class="friends-section">
      <p v-if="friendError" class="form-error">{{ friendError }}</p>
      <p v-if="friendMessage" class="success-message" role="status">{{ friendMessage }}</p>
      <h2>Incoming requests</h2>
      <p v-if="incomingRequests.length === 0" class="muted-text">No pending requests.</p>
      <div v-for="request in incomingRequests" :key="request.request" class="request-row">
        <strong>{{ request.sender }}</strong>
        <div class="request-actions">
          <button class="create-run-button" @click="friendAction('accept', request.request)">
            Accept
          </button>
          <button class="secondary-button" @click="friendAction('reject', request.request)">
            Decline
          </button>
        </div>
      </div>
      <h2>Sent requests</h2>
      <p v-if="outgoingRequests.length === 0" class="muted-text">No pending sent requests.</p>
      <div v-for="request in outgoingRequests" :key="request.request" class="request-row">
        To {{ request.recipient }} · Pending
      </div>
    </section>

    <section v-else class="friends-section">
      <h2>Send a friend request</h2>
      <form class="add-friend-form" @submit.prevent="sendFriendRequest">
        <input
          v-model="friendName"
          type="text"
          placeholder="Enter a friend's name"
          aria-label="Friend's name"
          required
        />
        <button class="create-run-button" type="submit">Send Request</button>
      </form>
      <p v-if="friendError" class="form-error">{{ friendError }}</p>
      <p v-if="friendMessage" class="success-message" role="status">{{ friendMessage }}</p>
    </section>
  </main>

  <!-- Prefilled suggestion modal: backend currently supports start-time changes only -->
  <div
    v-if="suggestionOpen && selectedRun"
    class="suggestion-backdrop"
    @click.self="suggestionOpen = false"
  >
    <div
      class="suggestion-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-title"
    >
      <div class="suggestion-modal-header">
        <h2 id="suggestion-title">Suggest a change</h2>
        <button
          type="button"
          class="suggestion-close"
          aria-label="Close suggestion"
          @click="suggestionOpen = false"
        >
          ×
        </button>
      </div>
      <p class="muted-text">
        Propose a new start time to join this run. Your suggestion will be sent to
        {{ selectedRun.owner }}.
      </p>
      <form class="suggestion-form" @submit.prevent="sendSuggestion">
        <label
          >Start time
          <input
            v-model="suggestedTime"
            type="datetime-local"
            required
            :min="selectedRun.earliestTime || undefined"
            :max="selectedRun.latestTime || undefined"
          />
        </label>
        <p v-if="suggestionTimeError" class="form-error" role="alert">{{ suggestionTimeError }}</p>
        <p v-else class="field-hint">Within the host's allowed time window.</p>
        <label
          >Distance (currently unchanged)
          <input :value="selectedRun.distance + ' miles'" disabled />
        </label>
        <label
          >Pace (currently unchanged)
          <input :value="selectedRun.pace + ' min/mi'" disabled />
        </label>
        <label
          >Location (currently unchanged)
          <input :value="selectedRun.location" disabled />
        </label>
        <p v-if="suggestionError" class="form-error" role="alert">{{ suggestionError }}</p>
        <button
          class="save-run-button"
          type="submit"
          :disabled="!!suggestionTimeError || runActionBusy"
        >
          {{ runActionBusy ? "Sending…" : "Send suggestion" }}
        </button>
      </form>
    </div>
  </div>

  <!-- Bottom navigation -->
  <nav
    v-if="currentPage !== 'create' && currentPage !== 'run-details'"
    class="bottom-nav"
    aria-label="Main navigation"
  >
    <button
      class="nav-item"
      :class="{ active: currentPage === 'home' }"
      @click="currentPage = 'home'"
    >
      <Home class="nav-icon" />
      <span>Home</span>
    </button>

    <button
      class="nav-item"
      :class="{ active: currentPage === 'calendar' }"
      @click="currentPage = 'calendar'"
    >
      <CalendarDays class="nav-icon" />
      <span>Calendar</span>
    </button>

    <button
      class="nav-item"
      :class="{ active: currentPage === 'community' }"
      @click="currentPage = 'community'"
    >
      <Users class="nav-icon" />
      <span>Community</span>
    </button>

    <button class="nav-item" :class="{ active: currentPage === 'profile' }" @click="openProfile">
      <User class="nav-icon" />
      <span>Profile</span>
    </button>
  </nav>
</template>
