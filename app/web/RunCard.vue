<script setup lang="ts">
import { ChevronRight, Clock3, MapPin, Route } from "lucide-vue-next";
import { formatRunDate, formatRunTime, isFlexible, mapsUrl, runTitle, type Run } from "./runs.ts";

/** One run in a feed: who hosts it, when, how far and fast, and where to meet. */
defineProps<{ run: Run; role?: "hosting" | "joined" }>();
defineEmits<{ open: [] }>();
</script>

<template>
  <article
    class="run-card clickable-run-card"
    :class="{ canceled: run.status === 'CANCELED' }"
    :data-run="run.run"
    tabindex="0"
    role="button"
    :aria-label="`View ${run.owner}'s run`"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <div class="run-card-owner">
      <span class="small-avatar">{{ run.owner.charAt(0).toUpperCase() }}</span>
      <div>
        <strong>{{ run.owner }}</strong>
        <p class="run-card-date">{{ formatRunDate(run.startTime) }}</p>
      </div>
      <span class="run-card-badges">
        <span v-if="run.status === 'CANCELED'" class="status-badge canceled">Canceled</span>
        <span v-if="role === 'hosting'" class="your-run-badge">Hosting</span>
        <span v-else-if="role === 'joined'" class="status-badge joined">Joined</span>
      </span>
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
</template>
