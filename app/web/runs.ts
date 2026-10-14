/** A run as `/api/runs/list` answers it, with the owner's username. */
export interface Run {
  run: string;
  owner: string;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
  details?: string | null;
  earliestTime?: string | null;
  latestTime?: string | null;
  minDistance?: number | null;
  maxDistance?: number | null;
  minPace?: number | null;
  maxPace?: number | null;
  status?: "ACTIVE" | "CANCELED";
}

export function isFlexible(run: Run): boolean {
  return [
    run.earliestTime,
    run.latestTime,
    run.minDistance,
    run.maxDistance,
    run.minPace,
    run.maxPace,
  ].some((v) => v !== null && v !== undefined);
}

export const isCanceled = (run: Run) => run.status === "CANCELED";
export const startsAt = (run: Run) => new Date(run.startTime).getTime();
export const isUpcoming = (run: Run, now = Date.now()) => startsAt(run) >= now;

export function formatRunDate(start: string): string {
  return new Date(start).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatRunTime(start: string): string {
  return new Date(start).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function runTitle(start: string): string {
  const hour = new Date(start).getHours();
  if (hour < 11) return "Morning run";
  if (hour < 16) return "Afternoon run";
  return "Evening run";
}

export function mapsUrl(meetingPoint: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingPoint)}`;
}

/**
 * Splits the runs a user can see into Home and My Runs, so no run appears in both. Home holds upcoming,
 * active runs hosted by friends that the user hasn't joined; My Runs holds every run the user hosts or
 * joined, as upcoming, past, or canceled.
 */
export function arrangeRuns(runs: Run[], me: string, joined: Set<string>, now = Date.now()) {
  const mine = (run: Run) => run.owner === me || joined.has(run.run);
  const soonestFirst = (a: Run, b: Run) => startsAt(a) - startsAt(b);
  const latestFirst = (a: Run, b: Run) => startsAt(b) - startsAt(a);
  return {
    home: runs
      .filter((run) => !mine(run) && !isCanceled(run) && isUpcoming(run, now))
      .sort(soonestFirst),
    upcoming: runs
      .filter((run) => mine(run) && !isCanceled(run) && isUpcoming(run, now))
      .sort(soonestFirst),
    past: runs
      .filter((run) => mine(run) && !isCanceled(run) && !isUpcoming(run, now))
      .sort(latestFirst),
    canceled: runs.filter((run) => mine(run) && isCanceled(run)).sort(latestFirst),
  };
}
