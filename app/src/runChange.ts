/**
 * A RunChange proposes new values for one or more of a run's start time, meeting point, distance, pace,
 * and description. ChangeSuggesting stores it without looking inside; the compositions read it with
 * `readRunChange`, so a malformed change is refused before it is stored or applied.
 */
export interface RunChange {
  startTime?: string;
  location?: string;
  distance?: number;
  pace?: number;
  details?: string;
}

/** The change's fields, with `null` for each one it leaves alone, and whether it is a usable change. */
export interface ReadRunChange {
  valid: boolean;
  startTime: string | null;
  location: string | null;
  distance: number | null;
  pace: number | null;
  details: string | null;
}

const FIELDS = ["startTime", "location", "distance", "pace", "details"] as const;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const MAX_TEXT = 1500;

const NONE: ReadRunChange = {
  valid: false,
  startTime: null,
  location: null,
  distance: null,
  pace: null,
  details: null,
};

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const positive = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1000;

/**
 * Reads a proposed change. A plain string is a new start time, the only kind of change RunTogether
 * suggested before, so suggestions stored then still read. Anything else must be a record of known
 * fields, at least one of them, each well formed; otherwise the change is not valid.
 */
export function readRunChange({ change }: { change: unknown }): ReadRunChange {
  if (typeof change === "string") change = { startTime: change };
  if (typeof change !== "object" || change === null || Array.isArray(change)) return NONE;
  const fields = change as Record<string, unknown>;
  const keys = Object.keys(fields).filter(
    (key) => fields[key] !== undefined && fields[key] !== null,
  );
  if (keys.length === 0 || keys.some((key) => !(FIELDS as readonly string[]).includes(key))) {
    return NONE;
  }
  const { startTime, location, distance, pace, details } = fields;
  const ok =
    (startTime == null || (typeof startTime === "string" && DATETIME.test(startTime))) &&
    (location == null || text(location, 200)) &&
    (distance == null || positive(distance)) &&
    (pace == null || positive(pace)) &&
    (details == null || (typeof details === "string" && details.length <= MAX_TEXT));
  if (!ok) return NONE;
  return {
    valid: true,
    startTime: (startTime as string | undefined) ?? null,
    location: typeof location === "string" ? location.trim() : null,
    distance: (distance as number | undefined) ?? null,
    pace: (pace as number | undefined) ?? null,
    details: (details as string | undefined) ?? null,
  };
}
