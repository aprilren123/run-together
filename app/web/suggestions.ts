import { formatRunDate, formatRunTime, type Run } from "./runs.ts";

/** A proposed change to one or more of a run's details, as `/api/suggestions/create` takes it. */
export interface RunChange {
  startTime?: string;
  location?: string;
  distance?: number;
  pace?: number;
  details?: string;
}

/** The values a suggester is editing, starting from the run's own. */
export interface ChangeDraft {
  startTime: string;
  location: string;
  distance: number | null;
  pace: number | null;
  details: string;
}

export function draftFrom(run: Run): ChangeDraft {
  return {
    startTime: run.startTime.slice(0, 16),
    location: run.location,
    distance: run.distance,
    pace: run.pace,
    details: run.details ?? "",
  };
}

/** A stored change as a RunChange: suggestions made before they could change more than the time are a plain string. */
export function changeOf(change: unknown): RunChange {
  if (typeof change === "string") return { startTime: change };
  return typeof change === "object" && change !== null ? (change as RunChange) : {};
}

/** Only the details the draft changes, so the owner sees exactly what is proposed. */
export function proposedChange(run: Run, draft: ChangeDraft): RunChange {
  const change: RunChange = {};
  if (draft.startTime && draft.startTime !== run.startTime.slice(0, 16)) {
    change.startTime = draft.startTime;
  }
  if (draft.location.trim() && draft.location.trim() !== run.location) {
    change.location = draft.location.trim();
  }
  if (draft.distance !== null && draft.distance !== run.distance) change.distance = draft.distance;
  if (draft.pace !== null && draft.pace !== run.pace) change.pace = draft.pace;
  if (draft.details !== (run.details ?? "")) change.details = draft.details;
  return change;
}

/** Why the draft can't be sent, or "" when it can. Mirrors the checks the backend makes. */
export function draftError(run: Run, draft: ChangeDraft): string {
  const change = proposedChange(run, draft);
  if (Object.keys(change).length === 0) return "Change at least one detail to suggest.";
  if (!draft.location.trim()) return "Enter a meeting point.";
  if (draft.distance === null || !(draft.distance > 0)) return "Distance must be more than 0.";
  if (draft.pace === null || !(draft.pace > 0)) return "Pace must be more than 0.";
  if (change.startTime && run.earliestTime && run.latestTime) {
    if (change.startTime < run.earliestTime || change.startTime > run.latestTime) {
      return `Choose a time between ${formatRunTime(run.earliestTime)} and ${formatRunTime(run.latestTime)}.`;
    }
  }
  if (change.distance !== undefined && run.minDistance != null && run.maxDistance != null) {
    if (change.distance < run.minDistance || change.distance > run.maxDistance) {
      return `Choose a distance between ${run.minDistance} and ${run.maxDistance} miles.`;
    }
  }
  if (change.pace !== undefined && run.minPace != null && run.maxPace != null) {
    if (change.pace < run.minPace || change.pace > run.maxPace) {
      return `Choose a pace between ${run.minPace} and ${run.maxPace} min/mi.`;
    }
  }
  return "";
}

const show = {
  startTime: (value: string) => `${formatRunDate(value)}, ${formatRunTime(value)}`,
  location: (value: string) => value,
  distance: (value: number) => `${value} ${value === 1 ? "mile" : "miles"}`,
  pace: (value: number) => `${value} min/mi`,
  details: (value: string) => value || "(no description)",
};

/** One line per proposed detail: what it is now, and what the suggestion would make it. */
export function changeRows(
  run: Run,
  change: unknown,
): { label: string; from: string; to: string }[] {
  const proposed = changeOf(change);
  const rows: { label: string; from: string; to: string }[] = [];
  if (proposed.startTime !== undefined) {
    rows.push({
      label: "Start time",
      from: show.startTime(run.startTime),
      to: show.startTime(proposed.startTime),
    });
  }
  if (proposed.location !== undefined) {
    rows.push({ label: "Meeting point", from: run.location, to: proposed.location });
  }
  if (proposed.distance !== undefined) {
    rows.push({
      label: "Distance",
      from: show.distance(run.distance),
      to: show.distance(proposed.distance),
    });
  }
  if (proposed.pace !== undefined) {
    rows.push({ label: "Pace", from: show.pace(run.pace), to: show.pace(proposed.pace) });
  }
  if (proposed.details !== undefined) {
    rows.push({
      label: "Description",
      from: show.details(run.details ?? ""),
      to: show.details(proposed.details),
    });
  }
  return rows;
}
