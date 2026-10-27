<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { MessageCircle, Trash2 } from "lucide-vue-next";
import {
  MAX_COMMENT,
  canDelete,
  commentProblem,
  createComments,
  formatCommentTime,
} from "./comments.ts";
import type { Run } from "./runs.ts";

/**
 * The Discussion under a run's details: informal comments from everyone who can see the run. A change to
 * the run itself still goes through Edit run or Suggest a change.
 */
const props = defineProps<{
  run: Run;
  me: string;
  post: (path: string, body: object) => Promise<Response>;
}>();

const { comments, loading, posting, deleting, error, message, load, send, remove } = createComments(
  props.post,
);
const draft = ref("");
const canceled = computed(() => props.run.status === "CANCELED");
const isOwner = computed(() => props.run.owner === props.me);
const length = computed(() => draft.value.trim().length);
const draftProblem = computed(() => (draft.value ? commentProblem(draft.value) : ""));

async function submit() {
  if (await send(props.run.run, draft.value)) draft.value = "";
}

onMounted(() => load(props.run.run));
</script>

<template>
  <section class="run-details-section comments-section" aria-labelledby="comments-title">
    <h2 id="comments-title">
      Discussion
      <span v-if="comments.length" class="segment-count">{{ comments.length }}</span>
    </h2>
    <p v-if="!canceled" class="field-hint comments-hint">
      For chatting about the run. To change the run itself,
      {{ isOwner ? "use Edit run." : "use Suggest a change." }}
    </p>

    <p v-if="loading && comments.length === 0" class="muted-text loading" role="status">
      Loading comments…
    </p>
    <div v-else-if="comments.length === 0 && !error" class="empty-state comments-empty">
      <span class="empty-icon" aria-hidden="true"><MessageCircle :size="20" /></span>
      <p v-if="canceled" class="muted-text">No one commented on this run.</p>
      <p v-else class="muted-text">No comments yet. Say hi or ask a question!</p>
    </div>
    <ol v-if="comments.length" class="comment-list">
      <li v-for="c in comments" :key="c.comment" class="comment" :data-comment="c.comment">
        <span class="small-avatar" aria-hidden="true">{{ c.author.charAt(0).toUpperCase() }}</span>
        <div class="comment-body">
          <p class="comment-meta">
            <strong>{{ c.author }}</strong>
            <span v-if="c.author === run.owner" class="comment-host">Host</span>
            <time :datetime="c.at">{{ formatCommentTime(c.at) }}</time>
          </p>
          <p class="comment-text">{{ c.text }}</p>
        </div>
        <button
          v-if="canDelete(c, me, run.owner)"
          type="button"
          class="comment-delete"
          :disabled="deleting !== null"
          :aria-label="c.author === me ? 'Delete your comment' : `Remove ${c.author}'s comment`"
          @click="remove(run.run, c.comment)"
        >
          <Trash2 :size="16" aria-hidden="true" />
          {{ deleting === c.comment ? "Deleting…" : c.author === me ? "Delete" : "Remove" }}
        </button>
      </li>
    </ol>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="message" class="success-message" role="status">{{ message }}</p>

    <p v-if="canceled" class="comments-closed">
      Comments are closed because this run was canceled.
    </p>
    <form v-else class="comment-form" @submit.prevent="submit">
      <label for="comment-text" class="visually-hidden">Write a comment</label>
      <textarea
        id="comment-text"
        v-model="draft"
        rows="2"
        :maxlength="MAX_COMMENT"
        placeholder="Write a comment…"
        aria-describedby="comment-count"
        :aria-invalid="draftProblem ? 'true' : undefined"
        :disabled="posting"
      ></textarea>
      <div class="comment-form-footer">
        <span id="comment-count" class="field-hint" :class="{ 'form-error': draftProblem }">
          {{ length }}/{{ MAX_COMMENT }}
        </span>
        <button
          type="submit"
          class="create-run-button"
          :disabled="posting || length === 0 || !!draftProblem"
          :aria-busy="posting"
        >
          {{ posting ? "Posting…" : "Post" }}
        </button>
      </div>
    </form>
  </section>
</template>
