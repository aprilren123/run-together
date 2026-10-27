import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, view, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { canSee, runInfo } from "./RunTogether.ts";

const { Commenting, Registering, Sessioning } = concepts;

// Comments are informal talk about a run. Who may read and write them follows who may see the run;
// a formal change to the run is still a suggestion.

// ---------- Who may do what ----------

/** Who wrote (comment), and the run it is on, read with the comment as an input. */
const commentInfo = view("the author and run of (comment)", ({ comment }, { author, run }) =>
  where(Commenting._get({ comment }).is({ author, target: run })),
);

/** (user) owns the run (comment) is on, and so may remove it. */
const moderates = view("(user) owns the run of (comment)", ({ user, comment }, _output, { run }) =>
  where(commentInfo({ comment }).is({ run }), runInfo({ run }).is({ owner: user })),
).holds();

// ---------- Reading ----------

/** The comments on (run), oldest first, each with its author's username. */
const CommentList = former(
  "the comments on (run)",
  ({ run }, { comment, author, authorName, text, at }) =>
    form({
      comments: each(Commenting._on({ target: run }).is({ comment, author, text, at }))
        .where(Registering._username({ user: author }).is({ username: authorName }))
        .form({ comment, author: authorName, text, at }),
    }),
);

const ListComments = endpoint(
  "/comments/list",
  ({ session, user, run }) =>
    receive({ session, run })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(canSee({ viewer: user, run }))
          .then(respond({ comments: CommentList({ run }) }))
          .named("visible"),
        where(no(canSee({ viewer: user, run })))
          .then(respond({ error: "RUN_NOT_FOUND" }))
          .named("hidden"),
      ),
  { input: { required: ["session", "run"] } },
);

// ---------- Writing ----------

const PostComment = endpoint(
  "/comments/post",
  ({ session, user, run, text, comment }) =>
    receive({ session, run, text })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(canSee({ viewer: user, run }), runInfo({ run }).is({ status: "ACTIVE" }))
          .then(Commenting.post({ author: user, target: run, text }).responds({ comment }))
          .then(respond({ comment }))
          .named("open"),
        // A canceled run keeps its comments, but takes no new ones.
        where(canSee({ viewer: user, run }), runInfo({ run }).is({ status: "CANCELED" }))
          .then(respond({ error: "RUN_CANCELED" }))
          .named("canceled"),
        where(no(canSee({ viewer: user, run })))
          .then(respond({ error: "RUN_NOT_FOUND" }))
          .named("hidden"),
      ),
  { input: { required: ["session", "run", "text"] } },
);

const DeleteComment = endpoint(
  "/comments/delete",
  ({ session, user, comment }) =>
    receive({ session, comment })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(commentInfo({ comment }).is({ author: user }))
          .then(Commenting.delete({ author: user, comment }).responds({ comment }))
          .then(respond({ comment }))
          .named("author"),
        // The run's owner may remove anyone else's comment on it.
        where(moderates({ user, comment }), no(commentInfo({ comment }).is({ author: user })))
          .then(Commenting.remove({ comment }).responds({ comment }))
          .then(respond({ comment }))
          .named("owner"),
        where(no(commentInfo({ comment }).is({ author: user })), no(moderates({ user, comment })))
          .then(respond({ error: "COMMENT_NOT_FOUND" }))
          .named("other"),
      ),
  { input: { required: ["session", "comment"] } },
);

export const composition = {
  access: { commentInfo, moderates },
  reading: { CommentList, ListComments },
  writing: { PostComment, DeleteComment },
};
