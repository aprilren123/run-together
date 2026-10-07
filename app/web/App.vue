<script setup lang="ts">
import { onMounted, ref } from "vue";

interface Run {
  run: string;
  owner: string;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
}

const currentUser = ref("Jamie");
const runs = ref<Run[]>([]);

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

onMounted(loadRuns);
</script>

<template>
  <main>
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

    <h2>Upcoming Runs</h2>

    <p v-if="runs.length === 0">No upcoming runs.</p>

    <ul v-else>
      <li v-for="run in runs" :key="run.run">
        <strong>{{ run.owner }}</strong>
        is running {{ run.distance }} miles at {{ run.startTime }}
        along {{ run.location }}.
      </li>
    </ul>
  </main>
</template>