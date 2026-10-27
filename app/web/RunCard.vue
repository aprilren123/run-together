<script setup lang="ts">
import { computed } from "vue";
import { ChevronRight, Gauge, MapPin, Route } from "lucide-vue-next";
import { formatRunDate, formatRunTime, isFlexible, mapsUrl, runTitle, type Run } from "./runs.ts";

/**
 * One run in a feed. When it starts leads, since that's what people scan for; then what kind of run it is,
 * its distance and pace, where to meet, and who's going. The whole card opens the run's details.
 */
const props = defineProps<{ run: Run; going: string[]; role?: "hosting" | "joined" }>();
defineEmits<{ open: [] }>();

/** At most three faces; the rest are a "+N". */
const SHOWN = 3;
const faces = computed(() => props.going.slice(0, SHOWN));
const more = computed(() => props.going.length - faces.value.length);
const goingText = computed(() =>
  props.going.length <= 1 ? "Just the host" : `${props.going.length} going`,
);
</script>

<template>
  <article
    class="run-card clickable-run-card"
    :class="{ canceled: run.status === 'CANCELED' }"
    :data-run="run.run"
    tabindex="0"
    role="button"
    :aria-label="`${runTitle(run.startTime)} with ${run.owner}, ${formatRunDate(run.startTime)} at ${formatRunTime(run.startTime)}, ${goingText.toLowerCase()}${run.status === 'CANCELED' ? ', canceled' : ''}. View details.`"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <div class="run-card-head">
      <div class="run-when">
        <p class="run-card-date">{{ formatRunDate(run.startTime) }}</p>
        <p class="run-card-time">{{ formatRunTime(run.startTime) }}</p>
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
    <ul class="run-stats">
      <li>
        <Route :size="16" aria-hidden="true" />
        <span
          ><strong>{{ run.distance }}</strong> {{ run.distance === 1 ? "mile" : "miles" }}</span
        >
      </li>
      <li>
        <Gauge :size="16" aria-hidden="true" />
        <span
          ><strong>{{ run.pace }}</strong> min/mi</span
        >
      </li>
    </ul>
    <p class="run-card-detail">
      <MapPin :size="17" aria-hidden="true" />
      <span>Meet at {{ run.location }}</span>
    </p>

    <!-- Who's going: the host first, then up to two more faces, then a count of everyone -->
    <div class="run-card-owner">
      <span class="avatar-stack" aria-hidden="true">
        <span v-for="person in faces" :key="person" class="small-avatar" :title="person">{{
          person.charAt(0).toUpperCase()
        }}</span>
        <span v-if="more > 0" class="small-avatar avatar-more">+{{ more }}</span>
      </span>
      <span class="run-card-people"
        >{{ goingText }} · hosted by <strong>{{ run.owner }}</strong></span
      >
    </div>

    <div class="run-card-footer">
      <a
        class="run-map-link"
        :href="mapsUrl(run.location)"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Open ${run.location} in Google Maps`"
        @click.stop
        @keydown.enter.stop
        @keydown.space.stop
      >
        <MapPin :size="14" aria-hidden="true" /> Map
      </a>
      <span class="run-card-open" aria-hidden="true"
        >View details <ChevronRight :size="16" aria-hidden="true"
      /></span>
    </div>
  </article>
</template>
