<script setup lang="ts">
import { ref } from "vue";
import { startCommons } from "./commons.ts";
import CommonsMark from "./CommonsMark.vue";
import { useSession } from "./session.ts";

/** Sends the browser to Commons to sign in. Adapted from ConceptBox's `CommonsButton.vue`. */
const session = useSession();
const working = ref(false);

async function start() {
  working.value = true;
  const leaving = await startCommons(session, (address) => window.location.assign(address));
  if (!leaving) working.value = false;
}
</script>

<template>
  <button type="button" class="commons-button" :disabled="working" @click="start">
    <CommonsMark :size="26" />
    {{ working ? "Opening Commons…" : "Sign in with MIT Commons" }}
  </button>
</template>
