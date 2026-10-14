# Run Together

A social running app that makes it easier for friends to turn the runs they are already planning into opportunities to run together.

## Design

### P1

- [Problem Framing and Stakeholders](p1/problem-framing.md)
- [Application Pitch](p1/application-pitch.md)
- [Concept Design](p1/concept-design.md)
- [UI Sketches](p1/ui-sketches.md)
- [User Journey](p1/user-journey.md)

### P2

- [User Journey](p2/user-journey.md)
- [Screen Recording](https://youtu.be/rXpD_nYZTWs)

### P3

- [Visual Design Study](p3/visual-design.md)
- [Saved Test Execution Output](p3/test-results.txt)
- [Updated User Journey](p3/updated-user-journey.md)
- [Automated Test Results](p3/test-results.txt)
- [Updated Screen Recording](https://youtu.be/-aXSI0hk5QA)

## Testing

RunTogether's automated tests use Bun's test framework: concept tests, HTTP integration tests, and frontend unit tests, all checked with `expect` assertions. Separate scripts drive the app in Chrome. The latest run is saved in [`p3/test-results.txt`](p3/test-results.txt).

### Prerequisites

- [Bun](https://bun.sh) (tested with 1.4.2)
- [Podman](https://podman.io) with Podman Compose (tested with 6.1.3), which runs MongoDB 8.0 in a container
- Google Chrome, only for the browser tests

### Setup

From the repository root:

```bash
cd app
bun install
cp .env.example .env   # MONGODB_URL for the local MongoDB container
bun run db:up          # starts MongoDB (podman compose up -d mongo)
```

### Running the automated tests

From `app/`:

```bash
bun run test
```

This runs `bun test --timeout 60000`, every `*.test.ts` file under `app/tests/`. Use `bun run test` rather than plain `bun test`: Bun ignores a timeout set in `bunfig.toml`, and the tests that register many accounts can take longer than Bun's 5-second default.

To run part of the suite, pass a path or a test name:

```bash
bun run test tests/concepts                     # all concept tests
bun run test tests/concepts/Joining.test.ts     # one concept
bun run test -t "its principle"                 # each concept's operational principle
```

### Running the checks

```bash
bun run check:design   # the concept specifications, types, and composition documents
bun run check          # concept specs vs. implementations, generated artifacts, and type checking (tsc --noEmit)
```

### Test organization

| Location | What it tests |
|---|---|
| `app/tests/concepts/` | One file per concept: Registering, Authenticating, Sessioning, Federating (plus its Commons provider), RunPlanning, Joining, Friending, ChangeSuggesting, and Notifying. Each file has a test of the operational principle, further scenarios (repeated actions, updates, cancellations, removals, several records at once, simultaneous requests), and refusals that check the exact error and that nothing changed. Every action and query of every concept is executed in its own file. |
| `app/tests/http/` | The compositions through the real HTTP handler: sign-in and sessions, authorization (who may see, join, edit, cancel, suggest, and decide), friend discovery, multi-field suggestions, and notifications |
| `app/tests/web/`, `app/tests/runChange.test.ts`, `app/tests/frontend.test.ts` | Frontend logic (session handling, run lists, suggestion and notification text), the RunChange reader, and how the production server serves the built pages |
| `app/tests/browser/` | Scripts that drive the app in headless Chrome. These aren't `bun test` files, because they need running servers. |

### Test databases

The tests use the real local MongoDB, not an in-memory one, so start it first with `bun run db:up`. They never touch the app's `myapp` database: `tests/support/setup.ts`, preloaded through `bunfig.toml`, points each test at a fresh database named `runtogether-test-<pid>-<n>` on the same MongoDB server (or the server in `TEST_MONGODB_URL`), and drops all of them when the run ends.

### Running the browser tests

The browser scripts need the backend and frontend running, and Chrome installed. To keep test accounts out of `myapp`, run a separate backend and frontend on their own database and ports. In one terminal, from `app/`:

```bash
export BROWSER_MONGODB_URL='mongodb://dev:dev@127.0.0.1:27017/runtogether-browser?authSource=admin'
MONGODB_URL=$BROWSER_MONGODB_URL PORT=3091 PUBLIC_ORIGIN=http://localhost:8091 bun src/main.ts
```

In another terminal, from `app/`:

```bash
BACKEND_URL=http://127.0.0.1:3091 bunx vite --port 8091 --strictPort
```

Then, from `app/`:

```bash
export BROWSER_MONGODB_URL='mongodb://dev:dev@127.0.0.1:27017/runtogether-browser?authSource=admin'
bun tests/browser/journey.browser.ts http://localhost:8091    # the Morgan–Jamie journey, run management, notifications
bun tests/browser/auth.browser.ts http://localhost:8091       # sign-in, cookies, sessions, Commons redirect
bun tests/browser/profile.browser.ts http://localhost:8091    # Profile layout at four screen widths
```

`journey` and `auth` use `BROWSER_MONGODB_URL` to age a session, so they can test what happens when it expires. The discovery check needs a database with no accounts, plus a restart of the backend between its two phases:

```bash
bun tests/browser/discovery.browser.ts http://localhost:8091 fresh
# stop the backend (Ctrl-C) and start it again with the same command
bun tests/browser/discovery.browser.ts http://localhost:8091 restarted
```

Each script prints one PASS or FAIL line per check, ends with a summary, and exits with status 1 if any check failed. Set `CHROME` if Chrome isn't at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. When you're done, drop the `runtogether-browser` database, for example with `bun run db:shell`.

### Latest results

From [`p3/test-results.txt`](p3/test-results.txt), run on October 14, 2026:

- `bun run check:design` and `bun run check`: passed
- `bun run test`: **200 tests in 22 files, 200 passed, 0 failed**
  - 83 concept tests (10 files)
  - 79 HTTP integration tests (7 files)
  - 38 other unit tests (5 files)
- Chrome: discovery 20/20, then 5/5 after a backend restart; journey 65/65; sign-in 38/38; Profile 46/46

The log also includes a table of which test covers each concept action and refusal, and the bugs these tests found.
