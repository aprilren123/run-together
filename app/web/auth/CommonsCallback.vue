<script setup lang="ts">
import { onMounted, ref } from "vue";
import { chooseUsername, finishCommons } from "./commons.ts";
import CommonsMark from "./CommonsMark.vue";
import { useSession } from "./session.ts";

/**
 * The page Commons sends the browser back to, at `/auth/commons/callback?code=…&state=…`. Adapted from
 * ConceptBox's `CommonsCallback.vue`. The page is served with `Referrer-Policy: no-referrer`, so the code
 * never leaves in a `Referer` header.
 */
const emit = defineEmits<{ done: [] }>();
const session = useSession();
const { error } = session;
const choosing = ref(false);
const username = ref("");
const working = ref(false);

onMounted(async () => {
  const search = window.location.search;
  // Clear the code from the address before posting it, so reloading or going back doesn't post it again.
  window.history.replaceState(null, "", "/");
  if ((await finishCommons(session, search)) === "choose") choosing.value = true;
  else emit("done");
});

async function choose() {
  working.value = true;
  const next = await chooseUsername(session, username.value);
  working.value = false;
  if (next === "done") emit("done");
}
</script>

<template>
  <main class="auth-page">
    <form v-if="choosing" class="auth-card" @submit.prevent="choose">
      <h1>Choose a username</h1>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="auth-form">
        <label>
          Username
          <input
            v-model="username"
            name="username"
            autocomplete="username"
            autocapitalize="off"
            spellcheck="false"
            required
            pattern="[A-Za-z0-9_\-]{3,32}"
          />
          <span class="field-hint">3 to 32 letters, digits, _ or -</span>
        </label>
        <button type="submit" class="create-run-button" :disabled="working">Continue</button>
      </div>
    </form>
    <p v-else class="auth-card auth-waiting" role="status">
      <CommonsMark :size="32" />Signing in with MIT Commons…
    </p>
  </main>
</template>
