<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { Home, CalendarDays, Users, User, ChevronRight, ArrowLeft, UserRoundPlus } from "lucide-vue-next";

interface Run {
  run: string;
  owner: string;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
}

interface Friendship {
  friendship: string;
  user1: string;
  user2: string;
}

const currentUser = ref("Jamie");
const currentPage = ref<"home" | "create" | "profile" | "community" | "calendar">("home");

const runs = ref<Run[]>([]);
const friendships = ref<Friendship[]>([]);
interface FriendRequest { request: string; sender: string; recipient: string; }
const requests = ref<FriendRequest[]>([]);
const profileSection = ref<"overview" | "friends" | "requests" | "add">("overview");
const friendName = ref("");
const friendError = ref("");
const friendMessage = ref("");

const myFriends = computed(() =>
  friendships.value
    .filter(({ user1, user2 }) =>
      user1 === currentUser.value || user2 === currentUser.value,
    )
    .map(({ user1, user2 }) =>
      user1 === currentUser.value ? user2 : user1,
    ),
);

const incomingRequests = computed(() => requests.value.filter(r => r.recipient === currentUser.value));
const outgoingRequests = computed(() => requests.value.filter(r => r.sender === currentUser.value));

// Home shows only runs belonging to the selected user or accepted friends.
const visibleRuns = computed(() =>
  runs.value.filter(
    (run) => run.owner === currentUser.value || myFriends.value.includes(run.owner),
  ),
);

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
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: currentUser.value, request }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error ?? `Could not ${action} request.`);
    await refreshFriends();
    friendMessage.value = action === "accept" ? "Friend request accepted!" : "Friend request declined.";
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
          earliestTime: earliestTime.value
            ? `${runDate.value}T${earliestTime.value}`
            : null,

          latestTime: latestTime.value
            ? `${runDate.value}T${latestTime.value}`
            : null,
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
    errorMessage.value =
      error instanceof Error ? error.message : "Something went wrong.";
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

    <button
      class="create-run-button"
      @click="currentPage = 'create'"
    >
      + Create a Run
    </button>

    <h2>Upcoming Runs</h2>

    <p v-if="visibleRuns.length === 0">
      No upcoming runs.
    </p>

    <ul v-else>
      <li v-for="run in visibleRuns" :key="run.run">
        <strong>{{ run.owner }}</strong>
        is running {{ run.distance }} miles at {{ run.startTime }}
        along {{ run.location }}.
      </li>
    </ul>
  </main>

  <!-- Create run page -->
  <main v-else-if="currentPage === 'create'" class="create-page">
    <div class="create-header">
      <button
        class="back-button"
        type="button"
        @click="currentPage = 'home'"
      >
        ←
      </button>

      <h1>Create a run</h1>
    </div>

    <form class="create-form" @submit.prevent="createRun">
      <label>
        Start time
        <input
          v-model="startTime"
          type="datetime-local"
          required
        />
      </label>

      <label>
        Distance
        <div class="input-with-unit">
          <input
            v-model.number="distance"
            type="number"
            min="0"
            step="0.1"
            required
          />
          <span>miles</span>
        </div>
      </label>

      <label>
        Pace
        <div class="input-with-unit">
          <input
            v-model.number="pace"
            type="number"
            min="0"
            step="0.1"
            required
          />
          <span>min / mile</span>
        </div>
      </label>

      <label>
        Location
        <input
          v-model="location"
          type="text"
          required
        />
      </label>

      <section class="flexibility-section">
        <div class="flexibility-heading">
            <div>
            <strong>Set flexibility (optional)</strong>
            <p>Let friends suggest small changes to this run.</p>
            </div>

            <input
            v-model="hasFlexibility"
            type="checkbox"
            class="flexibility-toggle"
            />
        </div>

        <div v-if="hasFlexibility" class="flexibility-fields">
            <label>
            Time window

            <div class="range-inputs">
                <input
                v-model="earliestTime"
                type="time"
                />

                <span>–</span>

                <input
                v-model="latestTime"
                type="time"
                />
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
                <input
                v-model.number="minPace"
                type="number"
                min="0"
                step="0.1"
                placeholder="Min"
                />
                <span>–</span>
                <input
                v-model.number="maxPace"
                type="number"
                min="0"
                step="0.1"
                placeholder="Max"
                />
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

      <button class="save-run-button" type="submit">
        Save run
      </button>
    </form>
  </main>

  <!-- Community: public discovery needs visibility and location support in the backend -->
  <main v-else-if="currentPage === 'community'" class="community-page">
    <header>
      <h1>Community</h1>

    </header>
    <h2>Discover nearby runs</h2>
    <p class="muted-text">
      Public runs in your area will appear here once location-based discovery
      and public-run visibility are supported.
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
      <button v-if="profileSection !== 'overview'" class="back-button" type="button" @click="profileSection = 'overview'" aria-label="Back to profile"><ArrowLeft :size="24" /></button>
      <h1>{{ profileSection === 'overview' ? 'Profile' : profileSection === 'friends' ? 'Friends' : profileSection === 'requests' ? 'Friend Requests' : 'Add Friends' }}</h1>
    </header>

    <template v-if="profileSection === 'overview'">
      <section class="profile-card">
        <div class="profile-avatar">{{ currentUser.charAt(0) }}</div>
        <div><h2 class="profile-name">{{ currentUser }}</h2><p class="muted-text">RunTogether member</p></div>
      </section>

      <div class="profile-stats">
        <button class="stat-card" @click="profileSection = 'friends'">
          <strong>{{ myFriends.length }}</strong>
          <span>{{ myFriends.length === 1 ? 'Friend' : 'Friends' }}</span>
          <ChevronRight :size="18" />
        </button>
        <div class="stat-card stat-static">
          <strong>{{ runs.filter(r => r.owner === currentUser).length }}</strong>
          <span>Runs planned</span>
        </div>
      </div>

      <button class="profile-menu-item" @click="profileSection = 'requests'">
        <span>Friend Requests <span v-if="incomingRequests.length" class="request-count">{{ incomingRequests.length }}</span></span>
        <ChevronRight :size="20" />
      </button>
      <button class="profile-menu-item" @click="profileSection = 'add'">
        <span><UserRoundPlus :size="19" class="inline-icon" /> Add Friends</span>
        <ChevronRight :size="20" />
      </button>
      <div class="demo-switch">
        <label for="demo-user">Switch demo user</label>
        <select id="demo-user" v-model="currentUser"><option>Jamie</option><option>Taylor</option></select>
        <p class="muted-text">For testing the two sides of a friend request.</p>
      </div>
    </template>

    <section v-else-if="profileSection === 'friends'" class="friends-section">
      <p v-if="myFriends.length === 0" class="muted-text">No friends yet.</p>
      <ul v-else class="friend-list">
        <li v-for="friend in myFriends" :key="friend" class="friend-row"><span class="small-avatar">{{ friend.charAt(0) }}</span>{{ friend }}</li>
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
          <button class="create-run-button" @click="friendAction('accept', request.request)">Accept</button>
          <button class="secondary-button" @click="friendAction('reject', request.request)">Decline</button>
        </div>
      </div>
      <h2>Sent requests</h2>
      <p v-if="outgoingRequests.length === 0" class="muted-text">No pending sent requests.</p>
      <div v-for="request in outgoingRequests" :key="request.request" class="request-row">To {{ request.recipient }} · Pending</div>
    </section>

    <section v-else class="friends-section">
      <h2>Send a friend request</h2>
      <form class="add-friend-form" @submit.prevent="sendFriendRequest">
        <input v-model="friendName" type="text" placeholder="Enter a friend's name" aria-label="Friend's name" required />
        <button class="create-run-button" type="submit">Send Request</button>
      </form>
      <p v-if="friendError" class="form-error">{{ friendError }}</p>
      <p v-if="friendMessage" class="success-message" role="status">{{ friendMessage }}</p>
    </section>
  </main>

  <!-- Bottom navigation -->
  <nav v-if="currentPage !== 'create'" class="bottom-nav" aria-label="Main navigation">
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

    <button
      class="nav-item"
      :class="{ active: currentPage === 'profile' }"
      @click="openProfile"
    >
      <User class="nav-icon" />
      <span>Profile</span>
    </button>
  </nav>
</template>
