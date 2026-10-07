<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Home, CalendarDays, Users, User } from "lucide-vue-next";
import { computed } from "vue";

interface Run {
  run: string;
  owner: string;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
}

const currentUser = ref("Jamie");
const currentPage = ref<"home" | "create">("home");

const runs = ref<Run[]>([]);

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

onMounted(loadRuns);
</script>

<template>
  <!-- Home page -->
  <main v-if="currentPage === 'home'">
    <header>
      <h1>RunTogether</h1>

      <label>
        Viewing as:
        <select v-model="currentUser">
          <option>Jamie</option>
          <option>Taylor</option>
        </select>
      </label>
    </header>

    <button
      class="create-run-button"
      @click="currentPage = 'create'"
    >
      + Create a Run
    </button>

    <h2>Upcoming Runs</h2>

    <p v-if="runs.length === 0">
      No upcoming runs.
    </p>

    <ul v-else>
      <li v-for="run in runs" :key="run.run">
        <strong>{{ run.owner }}</strong>
        is running {{ run.distance }} miles at {{ run.startTime }}
        along {{ run.location }}.
      </li>
    </ul>
  </main>

  <!-- Create run page -->
  <main v-else class="create-page">
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

  <!-- Bottom navigation only appears on main pages -->
  <nav v-if="currentPage === 'home'" class="bottom-nav">
    <button class="nav-item active">
      <Home class="nav-icon" />
      <span>Home</span>
    </button>

    <button class="nav-item">
      <CalendarDays class="nav-icon" />
      <span>Calendar</span>
    </button>

    <button class="nav-item">
      <Users class="nav-icon" />
      <span>Friends</span>
    </button>

    <button class="nav-item">
      <User class="nav-icon" />
      <span>Profile</span>
    </button>
  </nav>
</template>