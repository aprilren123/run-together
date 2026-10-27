<script setup lang="ts">
import { Bell, BellOff, ChevronRight } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { STATE_LABEL, invitationFor, invitationState, type Invitations } from "./invitations.ts";
import { ago, messageFor, type Notification, type Notifications } from "./notifications.ts";
import { formatRunDate, formatRunTime, runTitle } from "./runs.ts";

/**
 * The bell in each page's header: an unread count, and a list that opens the run each one is about. An
 * invitation is a card with the run's details that can be accepted or declined right there; opening or
 * reading it never answers it.
 */
const props = defineProps<{ notifications: Notifications; invitations: Invitations }>();
const emit = defineEmits<{ open: [run: string]; answered: [] }>();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const button = ref<HTMLButtonElement | null>(null);

async function toggle() {
  open.value = !open.value;
  if (open.value) await Promise.all([props.notifications.load(), props.invitations.load()]);
}

async function choose(n: Notification) {
  await props.notifications.markRead(n.notification);
  open.value = false;
  emit("open", n.run);
}

/** Answering also marks the notification read, since it no longer needs attention. */
async function answer(n: Notification, invitation: string, how: "accept" | "decline") {
  void props.notifications.markRead(n.notification);
  const done = await props.invitations[how](invitation);
  if (done) emit("answered");
}

function closeOutside(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
}
/** Escape closes the list and puts focus back on the bell, so keyboard users don't lose their place. */
function closeOnEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || !open.value) return;
  open.value = false;
  button.value?.focus();
}
onMounted(() => {
  document.addEventListener("click", closeOutside);
  document.addEventListener("keydown", closeOnEscape);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", closeOutside);
  document.removeEventListener("keydown", closeOnEscape);
});
</script>

<template>
  <div ref="root" class="bell">
    <button
      ref="button"
      type="button"
      class="bell-button"
      :aria-label="`Notifications${notifications.unread.value ? `, ${notifications.unread.value} unread` : ''}`"
      :aria-expanded="open"
      aria-controls="bell-panel"
      @click="toggle"
    >
      <Bell :size="22" aria-hidden="true" />
      <span v-if="notifications.unread.value" class="bell-count" data-testid="unread-count">{{
        notifications.unread.value > 9 ? "9+" : notifications.unread.value
      }}</span>
    </button>

    <section v-if="open" id="bell-panel" class="bell-panel" aria-labelledby="bell-title">
      <div class="bell-panel-header">
        <h2 id="bell-title">Notifications</h2>
        <button
          v-if="notifications.unread.value"
          type="button"
          class="text-button"
          @click="notifications.markAllRead()"
        >
          Mark all read
        </button>
      </div>
      <p v-if="notifications.error.value" class="form-error">{{ notifications.error.value }}</p>
      <div v-else-if="notifications.items.value.length === 0" class="bell-empty">
        <span class="empty-icon" aria-hidden="true"><BellOff :size="20" /></span>
        <p><strong>You're all caught up.</strong></p>
        <p class="muted-text">Changes to runs you host or join will show up here.</p>
      </div>
      <ul v-else class="bell-list">
        <li v-for="n in notifications.items.value" :key="n.notification">
          <!-- An invitation: who, the run, and its answer or the buttons to give one -->
          <template v-if="n.kind === 'RUN_INVITED'">
            <article
              v-for="inv in [invitationFor(n, invitations.items.value)]"
              :key="n.notification"
              class="bell-invite"
              :class="{ unread: !n.read }"
              data-kind="RUN_INVITED"
              :data-invitation="inv?.invitation"
              :aria-labelledby="`invite-${n.notification}`"
            >
              <span class="bell-dot" :aria-label="n.read ? undefined : 'Unread'"></span>
              <div class="bell-invite-body">
                <p :id="`invite-${n.notification}`" class="bell-invite-title">
                  <strong>{{ n.actor }}</strong> invited you to a run
                </p>
                <template v-if="inv">
                  <p class="bell-invite-run">{{ runTitle(inv.startTime) }}</p>
                  <ul class="bell-invite-facts">
                    <li>{{ formatRunDate(inv.startTime) }}, {{ formatRunTime(inv.startTime) }}</li>
                    <li>{{ inv.location }}</li>
                    <li>{{ inv.distance }} miles · {{ inv.pace }} min/mi</li>
                  </ul>
                  <div v-if="invitationState(inv) === 'open'" class="bell-invite-actions">
                    <button
                      type="button"
                      class="create-run-button"
                      :disabled="invitations.answering.value !== null"
                      :aria-busy="invitations.answering.value === inv.invitation"
                      @click="answer(n, inv.invitation, 'accept')"
                    >
                      {{
                        invitations.answering.value === inv.invitation
                          ? "Joining…"
                          : "Accept & Join"
                      }}
                    </button>
                    <button
                      type="button"
                      class="secondary-button"
                      :disabled="invitations.answering.value !== null"
                      @click="answer(n, inv.invitation, 'decline')"
                    >
                      Decline
                    </button>
                  </div>
                  <p
                    v-else
                    class="invite-state"
                    :class="`invite-state-${invitationState(inv)}`"
                    role="status"
                  >
                    {{ STATE_LABEL[invitationState(inv) as keyof typeof STATE_LABEL] }}
                  </p>
                  <p
                    v-if="invitations.feedback.value?.invitation === inv.invitation"
                    :class="invitations.feedback.value.error ? 'form-error' : 'invite-feedback'"
                    :role="invitations.feedback.value.error ? 'alert' : 'status'"
                  >
                    {{ invitations.feedback.value.text }}
                  </p>
                </template>
                <p v-else class="muted-text invite-gone">This invitation is no longer available.</p>
                <div class="bell-invite-footer">
                  <button
                    v-if="inv"
                    type="button"
                    class="text-button invite-view"
                    @click="choose(n)"
                  >
                    View run details <ChevronRight :size="15" aria-hidden="true" />
                  </button>
                  <span class="bell-time">{{ ago(n.at) }}</span>
                </div>
              </div>
            </article>
          </template>
          <button
            v-else
            type="button"
            class="bell-item"
            :class="{ unread: !n.read }"
            :data-kind="n.kind"
            @click="choose(n)"
          >
            <span class="bell-dot" :aria-label="n.read ? undefined : 'Unread'"></span>
            <span class="bell-text">
              <span>{{ messageFor(n) }}</span>
              <span class="bell-time">{{ ago(n.at) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
