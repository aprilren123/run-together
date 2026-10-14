import { describe, expect, test } from "bun:test";
import { browser, signedUp } from "../support/http.ts";

type Person = Awaited<ReturnType<typeof signedUp>>;
type Notification = {
  notification: string;
  actor: string;
  run: string;
  kind: string;
  at: string;
  read: boolean;
  startTime: string | null;
};

const RUN = {
  startTime: "2026-11-07T10:00",
  distance: 5,
  pace: 9,
  location: "Charles River Esplanade",
  details: "",
};

async function befriend(a: Person, b: Person) {
  const sent = await a.post("/friends/request", { username: b.username });
  expect((await b.post("/friends/accept", { request: sent.body.request })).status).toBe(200);
}

const inbox = async (person: Person) =>
  (await person.post("/notifications/list")).body.notifications.notifications as Notification[];
const kinds = async (person: Person) => (await inbox(person)).map((n) => n.kind);

/** Morgan's run; Jamie and Taylor are friends who joined it, Sam a friend who didn't. */
async function scene() {
  const morgan = await signedUp("morgan");
  const jamie = await signedUp("jamie");
  const taylor = await signedUp("taylor");
  const sam = await signedUp("sam");
  for (const friend of [jamie, taylor, sam]) await befriend(friend, morgan);
  const run = (await morgan.post("/runs/create", RUN)).body.run as string;
  for (const participant of [jamie, taylor]) await participant.post("/runs/join", { event: run });
  return { morgan, jamie, taylor, sam, run };
}

describe("Who is told about what", () => {
  test("editing a run tells everyone who joined it, not the owner or friends who didn't join", async () => {
    const { morgan, jamie, taylor, sam, run } = await scene();
    expect((await morgan.post("/runs/update", { run, location: "Harvard Bridge" })).status).toBe(
      200,
    );
    for (const participant of [jamie, taylor]) {
      expect(await inbox(participant)).toEqual([
        expect.objectContaining({
          actor: morgan.username,
          run,
          kind: "RUN_EDITED",
          read: false,
          startTime: RUN.startTime,
        }),
      ]);
    }
    expect(await inbox(morgan)).toEqual([]);
    expect(await inbox(sam)).toEqual([]);
  });

  test("canceling a run tells everyone who joined it", async () => {
    const { morgan, jamie, taylor, sam, run } = await scene();
    await morgan.post("/runs/cancel", { run });
    expect(await kinds(jamie)).toEqual(["RUN_CANCELED"]);
    expect(await kinds(taylor)).toEqual(["RUN_CANCELED"]);
    expect(await kinds(sam)).toEqual([]);
    expect(await kinds(morgan)).toEqual([]);
  });

  test("a suggestion tells the owner, and its acceptance tells the suggester and updates the other participants", async () => {
    const { morgan, jamie, taylor, sam, run } = await scene();
    const { suggestion } = (
      await sam.post("/suggestions/create", { event: run, change: { pace: 8 } })
    ).body;
    expect(await inbox(morgan)).toEqual([
      expect.objectContaining({ actor: sam.username, run, kind: "SUGGESTION_RECEIVED" }),
    ]);

    await morgan.post("/suggestions/accept", { suggestion });
    expect(await kinds(sam)).toContain("SUGGESTION_ACCEPTED");
    for (const participant of [jamie, taylor])
      expect(await kinds(participant)).toEqual(["RUN_EDITED"]);
  });

  test("rejecting a suggestion tells the suggester, and nobody else hears of a change", async () => {
    const { morgan, jamie, sam, run } = await scene();
    const { suggestion } = (
      await sam.post("/suggestions/create", { event: run, change: { distance: 8 } })
    ).body;
    await morgan.post("/suggestions/reject", { suggestion });
    expect(await inbox(sam)).toEqual([
      expect.objectContaining({ actor: morgan.username, run, kind: "SUGGESTION_REJECTED" }),
    ]);
    expect(await kinds(jamie)).toEqual([]);
  });

  test("a refused suggestion or edit tells nobody", async () => {
    const { morgan, jamie, run } = await scene();
    await jamie.post("/suggestions/create", { event: run, change: { distance: -1 } });
    await jamie.post("/runs/update", { run, distance: 9 });
    expect(await kinds(morgan)).toEqual([]);
    expect(await kinds(jamie)).toEqual([]);
  });
});

describe("Reading notifications", () => {
  test("newest first, persisted across sign-ins, and unread until marked read", async () => {
    const { morgan, jamie, run } = await scene();
    await morgan.post("/runs/update", { run, distance: 6 });
    await morgan.post("/runs/cancel", { run });
    expect(await kinds(jamie)).toEqual(["RUN_CANCELED", "RUN_EDITED"]);

    // A new sign-in, as after closing the browser, still finds them.
    const again = browser();
    await again.post("/auth/login", { username: jamie.username, password: "sea-shells-42" });
    const listed = (await again.post("/notifications/list")).body.notifications
      .notifications as Notification[];
    expect(listed.map((n) => [n.kind, n.read])).toEqual([
      ["RUN_CANCELED", false],
      ["RUN_EDITED", false],
    ]);

    expect(
      (await again.post("/notifications/read", { notification: listed[1]!.notification })).status,
    ).toBe(200);
    expect((await inbox(jamie)).map((n) => n.read)).toEqual([false, true]);
    expect((await again.post("/notifications/read-all")).status).toBe(200);
    expect((await inbox(jamie)).map((n) => n.read)).toEqual([true, true]);
  });

  test("nobody can read or mark someone else's notifications", async () => {
    const { morgan, jamie, taylor, run } = await scene();
    await morgan.post("/runs/update", { run, distance: 6 });
    const [mine] = await inbox(jamie);
    expect(
      await taylor.post("/notifications/read", { notification: mine!.notification }),
    ).toMatchObject({
      status: 404,
    });
    await taylor.post("/notifications/read-all");
    expect((await inbox(jamie))[0]?.read).toBe(false);
    expect(
      await morgan.post("/notifications/read", { notification: mine!.notification }),
    ).toMatchObject({
      status: 404,
    });
  });

  test("the notification endpoints need a signed-in session", async () => {
    const anonymous = browser();
    for (const [path, body] of [
      ["/notifications/list", {}],
      ["/notifications/read", { notification: "n" }],
      ["/notifications/read-all", {}],
    ] as const) {
      expect(await anonymous.post(path, body)).toMatchObject({ status: 401 });
    }
  });
});
