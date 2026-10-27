import { describe, expect, test } from "bun:test";
import { freshApp } from "../support/http.ts";

type App = Awaited<ReturnType<typeof freshApp>>;
type Person = Awaited<ReturnType<App["signedUp"]>>;
type Received = {
  invitation: string;
  inviter: string;
  run: string;
  status: string;
  sent: string;
  answered: string | null;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
  runStatus: string;
};

const RUN = {
  startTime: "2030-05-04T10:30",
  distance: 5,
  pace: 10,
  location: "Charles River Esplanade",
  details: "",
};

async function befriend(a: Person, b: Person) {
  const sent = await a.post("/friends/request", { username: b.username });
  expect((await b.post("/friends/accept", { request: sent.body.request })).status).toBe(200);
}

async function unfriend(a: Person, b: Person) {
  const friendships = (await a.post("/friends/list")).body.friends.friendships as {
    friendship: string;
    user1: string;
    user2: string;
  }[];
  const ours = friendships.find((f) => [f.user1, f.user2].includes(b.username))!;
  expect((await a.post("/friends/remove", { friendship: ours.friendship })).status).toBe(200);
}

/** April's run; Jamie and Taylor are her friends, Sam is a stranger. */
async function scene(app?: App) {
  app ??= await freshApp();
  const april = await app.signedUp("april", "april");
  const jamie = await app.signedUp("jamie", "jamie");
  const taylor = await app.signedUp("taylor", "taylor");
  const sam = await app.signedUp("sam", "sam");
  await befriend(jamie, april);
  await befriend(taylor, april);
  const run = (await april.post("/runs/create", RUN)).body.run as string;
  return { app, april, jamie, taylor, sam, run };
}

const invite = (owner: Person, run: string, username: string) =>
  owner.post("/invitations/send", { run, username });
const received = async (person: Person) =>
  (await person.post("/invitations/list")).body.invitations.invitations as Received[];
const toRun = async (owner: Person, run: string) =>
  (
    (await owner.post("/invitations/run", { run })).body.invitations.invitations as {
      invitee: string;
      status: string;
    }[]
  ).map((i) => [i.invitee, i.status]);
const going = async (person: Person, run: string) =>
  (
    (await person.post("/runs/participants")).body.participants.participations as {
      user: string;
      event: string;
    }[]
  )
    .filter((p) => p.event === run)
    .map((p) => p.user);

/** Waits for a consequence that lands after the answer, such as a reaction at the end of a request. */
async function eventually(check: () => Promise<boolean>) {
  for (let i = 0; i < 50 && !(await check()); i++) await Bun.sleep(20);
  return check();
}

describe("Sending invitations", () => {
  test("the owner invites a friend, who is told through the bell and sees the run's details", async () => {
    const { april, jamie, run } = await scene();
    const sent = await invite(april, run, "jamie");
    expect(sent).toMatchObject({ status: 200, body: { invitation: expect.any(String) } });

    const [mine] = await received(jamie);
    expect(mine).toMatchObject({
      invitation: sent.body.invitation,
      inviter: "april",
      run,
      status: "PENDING",
      answered: null,
      startTime: "2030-05-04T10:30",
      distance: 5,
      pace: 10,
      location: "Charles River Esplanade",
      runStatus: "ACTIVE",
    });
    // Usernames only, never account ids.
    expect(Object.keys(mine!).sort()).toEqual([
      "answered",
      "distance",
      "invitation",
      "inviter",
      "location",
      "pace",
      "run",
      "runStatus",
      "sent",
      "startTime",
      "status",
    ]);

    const notifications = (await jamie.post("/notifications/list")).body.notifications
      .notifications;
    expect(notifications).toEqual([
      expect.objectContaining({ actor: "april", run, kind: "RUN_INVITED", read: false }),
    ]);
    expect(await toRun(april, run)).toEqual([["jamie", "PENDING"]]);
    expect(await received(april)).toEqual([]);
  });

  test("only the owner can invite, or see who was invited; a stranger can't tell the run exists", async () => {
    const { april, taylor, sam, run } = await scene();
    expect(await invite(taylor, run, "jamie")).toMatchObject({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
    expect((await taylor.post("/invitations/run", { run })).status).toBe(403);
    expect((await invite(sam, run, "jamie")).status).toBe(404);
    expect((await sam.post("/invitations/run", { run })).status).toBe(404);
    expect((await invite(april, "no-such-run", "jamie")).status).toBe(404);
    expect(await toRun(april, run)).toEqual([]);
  });

  test("only accepted friends can be invited: not a stranger, a pending request, yourself, or nobody", async () => {
    const { app, april, sam, run } = await scene();
    const pending = await app.signedUp("casey", "casey");
    await pending.post("/friends/request", { username: "april" });
    expect((await invite(april, run, "sam")).status).toBe(403);
    expect((await invite(april, run, "casey")).status).toBe(403);
    expect((await invite(april, run, "april")).status).toBe(403);
    expect((await invite(april, run, "nobody-here")).status).toBe(404);
    expect(await toRun(april, run)).toEqual([]);
    expect(await received(sam)).toEqual([]);
  });

  test("a friend with a pending invitation, or who already joined, can't be invited again", async () => {
    const { april, jamie, taylor, run } = await scene();
    expect((await invite(april, run, "jamie")).status).toBe(200);
    expect(await invite(april, run, "jamie")).toMatchObject({
      status: 409,
      body: { error: "CONFLICT" },
    });
    expect((await taylor.post("/runs/join", { event: run })).status).toBe(200);
    expect((await invite(april, run, "taylor")).status).toBe(409);
    expect(await toRun(april, run)).toEqual([["jamie", "PENDING"]]);
    expect((await jamie.post("/notifications/list")).body.notifications.notifications).toHaveLength(
      1,
    );
  });

  test("of two invitations to the same friend at once, exactly one is sent", async () => {
    const { april, jamie, run } = await scene();
    const answers = await Promise.all([invite(april, run, "jamie"), invite(april, run, "jamie")]);
    expect(answers.map((a) => a.status).sort()).toEqual([200, 409]);
    expect(await toRun(april, run)).toEqual([["jamie", "PENDING"]]);
    expect(await received(jamie)).toHaveLength(1);
  });

  test("a canceled run or one that has started can't take new invitations", async () => {
    const { april, jamie, run } = await scene();
    const past = (await april.post("/runs/create", { ...RUN, startTime: "2020-01-04T10:30" })).body
      .run as string;
    expect(await invite(april, past, "jamie")).toMatchObject({ status: 409 });
    await april.post("/runs/cancel", { run });
    expect((await invite(april, run, "jamie")).status).toBe(409);
    expect(await received(jamie)).toEqual([]);
  });

  test("without a session, nothing can be sent, listed, or answered", async () => {
    const { app, april, run } = await scene();
    const { body } = await invite(april, run, "jamie");
    const anonymous = app.browser();
    for (const [path, input] of [
      ["/invitations/send", { run, username: "jamie" }],
      ["/invitations/list", {}],
      ["/invitations/run", { run }],
      ["/invitations/accept", { invitation: body.invitation }],
      ["/invitations/decline", { invitation: body.invitation }],
    ] as const) {
      expect((await anonymous.post(path, input)).status).toBe(401);
    }
    expect(await toRun(april, run)).toEqual([["jamie", "PENDING"]]);
  });
});

describe("Answering invitations", () => {
  test("accepting joins the run, so it's in the invitee's runs and the owner sees it accepted", async () => {
    const { april, jamie, taylor, run } = await scene();
    const { invitation } = (await invite(april, run, "jamie")).body;
    expect(await jamie.post("/invitations/accept", { invitation })).toMatchObject({
      status: 200,
      body: { invitation, event: run },
    });
    expect(await going(jamie, run)).toEqual(["jamie"]);
    expect(await going(taylor, run)).toEqual(["jamie"]);
    const [mine] = await received(jamie);
    expect(mine).toMatchObject({ status: "ACCEPTED", answered: expect.any(String) });
    expect(await toRun(april, run)).toEqual([["jamie", "ACCEPTED"]]);

    // Answered once: accepting or declining again changes nothing.
    expect((await jamie.post("/invitations/accept", { invitation })).status).toBe(409);
    expect((await jamie.post("/invitations/decline", { invitation })).status).toBe(409);
    expect(await going(jamie, run)).toEqual(["jamie"]);
  });

  test("declining leaves the invitee out of the run, and the owner may invite them again later", async () => {
    const { april, jamie, run } = await scene();
    const { invitation } = (await invite(april, run, "jamie")).body;
    expect(await jamie.post("/invitations/decline", { invitation })).toMatchObject({
      status: 200,
      body: { invitation },
    });
    expect(await going(jamie, run)).toEqual([]);
    expect(await toRun(april, run)).toEqual([["jamie", "DECLINED"]]);
    expect((await jamie.post("/invitations/accept", { invitation })).status).toBe(409);
    expect(await going(jamie, run)).toEqual([]);

    expect((await invite(april, run, "jamie")).status).toBe(200);
    expect(await toRun(april, run)).toEqual([
      ["jamie", "PENDING"],
      ["jamie", "DECLINED"],
    ]);
  });

  test("nobody can answer someone else's invitation, or one that doesn't exist", async () => {
    const { april, jamie, taylor, sam, run } = await scene();
    const { invitation } = (await invite(april, run, "jamie")).body;
    for (const person of [taylor, sam, april]) {
      expect((await person.post("/invitations/accept", { invitation })).status).toBe(404);
      expect((await person.post("/invitations/decline", { invitation })).status).toBe(404);
    }
    expect((await jamie.post("/invitations/accept", { invitation: "missing" })).status).toBe(404);
    expect(await going(april, run)).toEqual([]);
    expect(await toRun(april, run)).toEqual([["jamie", "PENDING"]]);
  });

  test("a double click, or two accepts at once, joins once and accepts once", async () => {
    const { april, jamie, run } = await scene();
    const { invitation } = (await invite(april, run, "jamie")).body;
    const answers = await Promise.all([
      jamie.post("/invitations/accept", { invitation }),
      jamie.post("/invitations/accept", { invitation }),
    ]);
    expect(answers.map((a) => a.status).sort()).toEqual([200, 409]);
    expect(await going(april, run)).toEqual(["jamie"]);
    expect(await toRun(april, run)).toEqual([["jamie", "ACCEPTED"]]);
  });

  test("once the run is canceled, the invitation can't be accepted, but can still be declined", async () => {
    const { april, jamie, taylor, run } = await scene();
    const jamies = (await invite(april, run, "jamie")).body.invitation;
    const taylors = (await invite(april, run, "taylor")).body.invitation;
    await april.post("/runs/cancel", { run });
    expect(await jamie.post("/invitations/accept", { invitation: jamies })).toMatchObject({
      status: 409,
      body: { error: "CONFLICT" },
    });
    expect(await going(jamie, run)).toEqual([]);
    const [mine] = await received(jamie);
    expect(mine).toMatchObject({ status: "PENDING", runStatus: "CANCELED" });
    expect((await taylor.post("/invitations/decline", { invitation: taylors })).status).toBe(200);
  });

  test("once the run's start time has passed, the invitation can't be accepted", async () => {
    const { april, jamie, run } = await scene();
    const { invitation } = (await invite(april, run, "jamie")).body;
    // Moving the run into the past stands in for waiting until it starts.
    expect((await april.post("/runs/update", { run, startTime: "2020-05-04T10:30" })).status).toBe(
      200,
    );
    expect((await jamie.post("/invitations/accept", { invitation })).status).toBe(409);
    expect(await going(jamie, run)).toEqual([]);
    expect(await toRun(april, run)).toEqual([["jamie", "PENDING"]]);
  });

  test("after an unfriending, the invitation can't be accepted, and the run's details are hidden", async () => {
    const { april, jamie, run } = await scene();
    const { invitation } = (await invite(april, run, "jamie")).body;
    await unfriend(jamie, april);
    expect(await jamie.post("/invitations/accept", { invitation })).toMatchObject({
      status: 403,
    });
    expect(await going(april, run)).toEqual([]);
    expect(await received(jamie)).toEqual([]);
    expect(await toRun(april, run)).toEqual([["jamie", "PENDING"]]);
  });

  test("joining from the run's page accepts a pending invitation; accepting after that still works", async () => {
    const { april, jamie, taylor, run } = await scene();
    const jamies = (await invite(april, run, "jamie")).body.invitation;
    expect((await jamie.post("/runs/join", { event: run })).status).toBe(200);
    expect(
      await eventually(async () =>
        (await toRun(april, run)).some(([who, status]) => who === "jamie" && status === "ACCEPTED"),
      ),
    ).toBe(true);
    expect((await jamie.post("/invitations/accept", { invitation: jamies })).status).toBe(409);
    expect(await going(jamie, run)).toEqual(["jamie"]);

    // Leaving keeps the answer; the owner sees from the participants that Taylor isn't going.
    const taylors = (await invite(april, run, "taylor")).body.invitation;
    expect((await taylor.post("/invitations/accept", { invitation: taylors })).status).toBe(200);
    expect((await taylor.post("/runs/leave", { event: run })).status).toBe(200);
    expect(await going(april, run)).toEqual(["jamie"]);
    expect(await toRun(april, run)).toEqual([
      ["taylor", "ACCEPTED"],
      ["jamie", "ACCEPTED"],
    ]);
  });

  test("reading the notification about an invitation never answers it", async () => {
    const { april, jamie, run } = await scene();
    await invite(april, run, "jamie");
    const [notification] = (await jamie.post("/notifications/list")).body.notifications
      .notifications;
    expect(
      (await jamie.post("/notifications/read", { notification: notification.notification })).status,
    ).toBe(200);
    expect((await jamie.post("/notifications/read-all")).status).toBe(200);
    expect(await received(jamie)).toEqual([expect.objectContaining({ status: "PENDING" })]);
    expect(await going(jamie, run)).toEqual([]);
  });
});

describe("Invitations over time", () => {
  test("invitations and their answers survive a restart", async () => {
    const before = await scene();
    const { april, jamie, taylor, run } = before;
    const jamies = (await invite(april, run, "jamie")).body.invitation;
    await invite(april, run, "taylor");
    await taylor.post("/invitations/decline", {
      invitation: (await received(taylor))[0]!.invitation,
    });

    // A second app on the same data, as after restarting the server; the sessions are still good.
    const after = await freshApp(before.app.database);
    const again = (person: Person) => ({
      ...person,
      post: (path: string, body: object = {}) => {
        const cookie = [...person.jar].map(([name, value]) => `${name}=${value}`).join("; ");
        return after
          .handle(
            new Request(`http://localhost:8080/api${path}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Origin: "http://localhost:8080",
                Cookie: cookie,
              },
              body: JSON.stringify(body),
            }),
          )
          .then(async (r) => ({ status: r.status, body: (await r.json()) as any }));
      },
    });
    const april2 = again(april);
    const jamie2 = again(jamie);
    expect(await toRun(april2 as Person, run)).toEqual([
      ["taylor", "DECLINED"],
      ["jamie", "PENDING"],
    ]);
    expect((await jamie2.post("/invitations/accept", { invitation: jamies })).status).toBe(200);
    expect(await going(jamie2 as Person, run)).toEqual(["jamie"]);
  });
});
