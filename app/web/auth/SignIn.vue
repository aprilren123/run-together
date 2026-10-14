<script setup lang="ts">
import CommonsButton from "./CommonsButton.vue";
import PasswordForm from "./PasswordForm.vue";
import { useSession } from "./session.ts";

/** The sign-in screen: MIT Commons, or a RunTogether username and password. Adapted from ConceptBox's `SignIn.vue`. */
const { error } = useSession();
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="sign-in-title">
      <div>
        <h1 id="sign-in-title">RunTogether</h1>
        <p class="muted-text">Log in to plan runs with your friends.</p>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <CommonsButton />
      <p class="auth-divider"><span>or</span></p>
      <PasswordForm />
    </section>
  </main>
</template>
