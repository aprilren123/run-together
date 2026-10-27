<script setup lang="ts">
import { computed, ref } from "vue";
import { post, useSession } from "./session.ts";

/** Sign in, or create an account, with a username and password. Adapted from ConceptBox's `PasswordForm.vue`. */
const { enter, error } = useSession();
const creating = ref(false);
const username = ref("");
const password = ref("");
const working = ref(false);
const words = computed(() =>
  creating.value
    ? { action: "Create account", other: "Have an account?", switchTo: "Log in" }
    : { action: "Log in", other: "New to RunTogether?", switchTo: "Create an account" },
);

async function submit() {
  if (working.value) return;
  working.value = true;
  const body = { username: username.value.trim(), password: password.value };
  if (creating.value) {
    await enter(post("/auth/register", body), {
      CONFLICT: "That username is taken.",
      INVALID_REQUEST: "That username or password doesn't follow the rules under each box.",
    });
  } else {
    await enter(post("/auth/login", body), {
      UNAUTHORIZED: "The username or password is incorrect.",
    });
  }
  working.value = false;
}

function switchMode() {
  creating.value = !creating.value;
  error.value = null;
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <label>
      Username
      <!-- Browsers compile `pattern` with the v flag, which needs the hyphen escaped. -->
      <input
        v-model="username"
        name="username"
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        required
        :pattern="creating ? '[A-Za-z0-9_\\-]{3,32}' : undefined"
      />
      <span v-if="creating" class="field-hint">3 to 32 letters, digits, _ or -</span>
    </label>
    <label>
      Password
      <input
        v-model="password"
        name="password"
        type="password"
        :autocomplete="creating ? 'new-password' : 'current-password'"
        required
        :minlength="creating ? 8 : undefined"
        :maxlength="creating ? 128 : undefined"
      />
      <span v-if="creating" class="field-hint">8 to 128 characters</span>
    </label>
    <button type="submit" class="create-run-button" :disabled="working" :aria-busy="working">
      {{ working ? "Please wait…" : words.action }}
    </button>
    <p class="auth-switch">
      {{ words.other }}
      <button type="button" class="text-button" @click="switchMode">{{ words.switchTo }}</button>
    </p>
  </form>
</template>
