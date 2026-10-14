<script setup lang="ts">
import { Bell } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ago, messageFor, type Notification, type Notifications } from "./notifications.ts";

/** The bell in each page's header: an unread count, and a list that opens the run each one is about. */
const props = defineProps<{ notifications: Notifications }>();
const emit = defineEmits<{ open: [run: string] }>();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

async function toggle() {
  open.value = !open.value;
  if (open.value) await props.notifications.load();
}

async function choose(n: Notification) {
  await props.notifications.markRead(n.notification);
  open.value = false;
  emit("open", n.run);
}

function closeOutside(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
}
function closeOnEscape(event: KeyboardEvent) {
  if (event.key === "Escape") open.value = false;
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
      type="button"
      class="bell-button"
      :aria-label="`Notifications${notifications.unread.value ? `, ${notifications.unread.value} unread` : ''}`"
      :aria-expanded="open"
      @click="toggle"
    >
      <Bell :size="22" />
      <span v-if="notifications.unread.value" class="bell-count" data-testid="unread-count">{{
        notifications.unread.value > 9 ? "9+" : notifications.unread.value
      }}</span>
    </button>

    <section v-if="open" class="bell-panel" aria-label="Notifications">
      <div class="bell-panel-header">
        <h2>Notifications</h2>
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
      <p v-else-if="notifications.items.value.length === 0" class="muted-text bell-empty">
        You're all caught up. Changes to runs you host or join will show up here.
      </p>
      <ul v-else class="bell-list">
        <li v-for="n in notifications.items.value" :key="n.notification">
          <button
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
