<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import App from "./App.vue";
import { CALLBACK_PATH } from "./auth/commons.ts";
import CommonsCallback from "./auth/CommonsCallback.vue";
import SignIn from "./auth/SignIn.vue";
import { useSession } from "./auth/session.ts";

/**
 * The page's root: the Commons callback on its path, the sign-in screen when nobody is signed in, and
 * RunTogether when someone is. On every page load, `/api/auth/me` restores the session from its cookie.
 */
const session = useSession();
const { me, checked, unreachable } = session;
const onCallback = ref(window.location.pathname === CALLBACK_PATH);
const retrying = ref(false);

/** After the callback, signed in or not, the sign-in screen or the app needs to know who is signed in. */
function callbackDone() {
  onCallback.value = false;
  if (!checked.value) void session.load();
}

async function retry() {
  retrying.value = true;
  await session.load();
  retrying.value = false;
}

/** A session can end while the tab sits in the background (a week unused, or 90 days), so check again on return. */
function recheck() {
  if (document.visibilityState === "visible" && me.value) void session.load();
}

onMounted(() => {
  document.addEventListener("visibilitychange", recheck);
  if (!onCallback.value) void session.load();
});
onBeforeUnmount(() => document.removeEventListener("visibilitychange", recheck));
</script>

<template>
  <CommonsCallback v-if="onCallback" @done="callbackDone" />
  <App v-else-if="me" :key="me.username" />
  <main v-else-if="unreachable" class="auth-page">
    <section class="auth-card" role="alert">
      <h1 class="brand-mark">RunTogether</h1>
      <p>Can't reach RunTogether. Check your connection and try again.</p>
      <button
        type="button"
        class="create-run-button"
        :disabled="retrying"
        :aria-busy="retrying"
        @click="retry"
      >
        Try again
      </button>
    </section>
  </main>
  <SignIn v-else-if="checked" />
  <main v-else class="auth-page"><p class="muted-text loading" role="status">Loading…</p></main>
</template>
