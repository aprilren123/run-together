import { describe, expect, test } from "bun:test";
import { arrangeRuns, type Run } from "../../web/runs.ts";

const NOW = new Date("2026-11-01T12:00").getTime();

function run(id: string, owner: string, startTime: string, status: Run["status"] = "ACTIVE"): Run {
  return { run: id, owner, startTime, distance: 5, pace: 9, location: "Esplanade", status };
}

const RUNS = [
  run("friends-next", "morgan", "2026-11-03T10:00"),
  run("friends-soon", "taylor", "2026-11-02T08:00"),
  run("friends-joined", "morgan", "2026-11-04T10:00"),
  run("friends-past", "morgan", "2026-10-20T10:00"),
  run("friends-canceled", "morgan", "2026-11-05T10:00", "CANCELED"),
  run("mine-upcoming", "jamie", "2026-11-06T07:00"),
  run("mine-past", "jamie", "2026-10-25T07:00"),
  run("mine-canceled", "jamie", "2026-11-07T07:00", "CANCELED"),
  run("joined-past", "taylor", "2026-10-28T07:00"),
  run("joined-canceled", "taylor", "2026-11-08T07:00", "CANCELED"),
];
const JOINED = new Set(["friends-joined", "joined-past", "joined-canceled"]);

describe("Home and My Runs", () => {
  const arranged = arrangeRuns(RUNS, "jamie", JOINED, NOW);
  const ids = (runs: Run[]) => runs.map((each) => each.run);

  test("Home holds friends' upcoming, active runs I haven't joined, soonest first", () => {
    expect(ids(arranged.home)).toEqual(["friends-soon", "friends-next"]);
  });

  test("My Runs holds runs I host or joined: upcoming soonest first, past and canceled latest first", () => {
    expect(ids(arranged.upcoming)).toEqual(["friends-joined", "mine-upcoming"]);
    expect(ids(arranged.past)).toEqual(["joined-past", "mine-past"]);
    expect(ids(arranged.canceled)).toEqual(["joined-canceled", "mine-canceled"]);
  });

  test("no run appears in both Home and My Runs, or in two My Runs sections", () => {
    const all = [arranged.home, arranged.upcoming, arranged.past, arranged.canceled].flatMap(ids);
    expect(new Set(all).size).toBe(all.length);
  });

  test("friends' past and canceled runs I never joined aren't shown anywhere", () => {
    const all = [arranged.home, arranged.upcoming, arranged.past, arranged.canceled].flatMap(ids);
    expect(all).not.toContain("friends-past");
    expect(all).not.toContain("friends-canceled");
  });

  test("leaving a run moves it from My Runs back to Home", () => {
    const left = arrangeRuns(RUNS, "jamie", new Set(), NOW);
    expect(ids(left.home)).toContain("friends-joined");
    expect(ids(left.upcoming)).not.toContain("friends-joined");
  });
});
