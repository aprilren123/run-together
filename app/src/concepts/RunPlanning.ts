import type { Collection, Db } from "mongodb";

export class InvalidRun extends Error {}
export class NotOwner extends Error {}
export class InvalidFlexibility extends Error {}
export class RunCanceled extends Error {}

interface Run {
  _id: string;
  owner: string;
  startTime: string;
  distance: number;
  pace: number;
  location: string;
  earliestTime?: string;
  latestTime?: string;
  minDistance?: number;
  maxDistance?: number;
  minPace?: number;
  maxPace?: number;
  details?: string;
  status?: "ACTIVE" | "CANCELED";
}

function validRunDetails(distance: number, pace: number) {
  return distance > 0 && pace > 0;
}

function validFlexibility(run: Run) {
  const hasEarliest = run.earliestTime != null;
  const hasLatest = run.latestTime != null;

  if (hasEarliest !== hasLatest) {
    return false;
  }

  if (
    hasEarliest &&
    hasLatest &&
    !(run.earliestTime! <= run.startTime && run.startTime <= run.latestTime!)
  ) {
    return false;
  }

  const hasMinDistance = run.minDistance != null;
  const hasMaxDistance = run.maxDistance != null;

  if (hasMinDistance !== hasMaxDistance) {
    return false;
  }

  if (
    hasMinDistance &&
    hasMaxDistance &&
    !(run.minDistance! > 0 && run.minDistance! <= run.distance && run.distance <= run.maxDistance!)
  ) {
    return false;
  }

  const hasMinPace = run.minPace != null;
  const hasMaxPace = run.maxPace != null;

  if (hasMinPace !== hasMaxPace) {
    return false;
  }

  if (
    hasMinPace &&
    hasMaxPace &&
    !(run.minPace! > 0 && run.minPace! <= run.pace && run.pace <= run.maxPace!)
  ) {
    return false;
  }

  return true;
}

type Changes = {
  startTime?: string | null;
  distance?: number | null;
  pace?: number | null;
  location?: string | null;
  details?: string | null;
};

/** The run with each given value in place of its own; a value left out or null keeps the run's. */
function withChanges(existing: Run, changes: Changes): Run {
  return {
    ...existing,
    startTime: changes.startTime ?? existing.startTime,
    distance: changes.distance ?? existing.distance,
    pace: changes.pace ?? existing.pace,
    location: changes.location ?? existing.location,
    details: changes.details ?? existing.details ?? "",
  };
}

/** Whether an updated run is one `update` accepts: positive distance and pace, within its flexibility ranges. */
function validUpdate(run: Run): boolean {
  return validRunDetails(run.distance, run.pace) && validFlexibility(run);
}

/**
 * Matches the owner's run only while it is not canceled. Every change writes through this, so a run
 * canceled after a change was checked is still never changed, and only one of two cancellations succeeds.
 * Runs are never deleted and the owner was checked first, so a write that matches nothing means the run
 * was canceled in between.
 */
function stillActive(run: string, owner: string) {
  return { _id: run, owner, status: { $ne: "CANCELED" as const } };
}

export class RunPlanningConcept {
  private readonly runs: Collection<Run>;

  constructor(db: Db) {
    this.runs = db.collection<Run>("runplanning.runs");
  }

  async create({
    owner,
    startTime,
    distance,
    pace,
    location,
    details,
  }: {
    owner: string;
    startTime: string;
    distance: number;
    pace: number;
    location: string;
    details: string;
  }) {
    if (!validRunDetails(distance, pace)) {
      throw new InvalidRun("The run details or flexibility ranges are invalid.");
    }

    const run: Run = {
      _id: crypto.randomUUID(),
      owner,
      startTime,
      distance,
      pace,
      location,
      details,
      status: "ACTIVE",
    };

    await this.runs.insertOne(run);

    return { run: run._id };
  }

  async update({
    owner,
    run,
    startTime,
    distance,
    pace,
    location,
    details,
  }: {
    owner: string;
    run: string;
    startTime?: string;
    distance?: number;
    pace?: number;
    location?: string;
    details?: string;
  }) {
    const existing = await this.runs.findOne({ _id: run });

    if (!existing || existing.owner !== owner) {
      throw new NotOwner("The run does not exist or does not belong to this user.");
    }
    if (existing.status === "CANCELED") {
      throw new RunCanceled("This run has been canceled.");
    }

    const updated = withChanges(existing, { startTime, distance, pace, location, details });

    if (!validUpdate(updated)) {
      throw new InvalidRun("The updated run details are invalid.");
    }

    const { matchedCount } = await this.runs.updateOne(stillActive(run, owner), {
      $set: {
        startTime: updated.startTime,
        distance: updated.distance,
        pace: updated.pace,
        location: updated.location,
        details: updated.details,
      },
    });
    if (matchedCount === 0) throw new RunCanceled("This run has been canceled.");

    return { run };
  }

  async setFlexibility({
    owner,
    run,
    earliestTime,
    latestTime,
    minDistance,
    maxDistance,
    minPace,
    maxPace,
  }: {
    owner: string;
    run: string;
    earliestTime?: string | null;
    latestTime?: string | null;
    minDistance?: number | null;
    maxDistance?: number | null;
    minPace?: number | null;
    maxPace?: number | null;
  }) {
    const existing = await this.runs.findOne({ _id: run });

    if (!existing || existing.owner !== owner) {
      throw new NotOwner("The run does not exist or does not belong to this user.");
    }
    if (existing.status === "CANCELED") {
      throw new RunCanceled("This run has been canceled.");
    }

    const flexibility = {
      earliestTime: earliestTime ?? undefined,
      latestTime: latestTime ?? undefined,
      minDistance: minDistance ?? undefined,
      maxDistance: maxDistance ?? undefined,
      minPace: minPace ?? undefined,
      maxPace: maxPace ?? undefined,
    };

    const updated: Run = {
      ...existing,
      ...flexibility,
    };

    if (!validFlexibility(updated)) {
      throw new InvalidFlexibility("The flexibility ranges are invalid.");
    }

    const { matchedCount } = await this.runs.updateOne(stillActive(run, owner), {
      $set: flexibility,
    });
    if (matchedCount === 0) throw new RunCanceled("This run has been canceled.");

    return { run };
  }

  async cancel({ owner, run }: { owner: string; run: string }) {
    const existing = await this.runs.findOne({ _id: run });

    if (!existing || existing.owner !== owner) {
      throw new NotOwner("The run does not exist or does not belong to this user.");
    }
    if (existing.status === "CANCELED") {
      throw new RunCanceled("This run has been canceled.");
    }

    // A canceled run is kept, so participants still see that it was called off.
    const { matchedCount } = await this.runs.updateOne(stillActive(run, owner), {
      $set: { status: "CANCELED" },
    });
    if (matchedCount === 0) throw new RunCanceled("This run has been canceled.");

    return { run };
  }

  async _fits({ run, ...changes }: { run: string } & Changes) {
    const existing = await this.runs.findOne({ _id: run });
    const fits =
      !!existing && existing.status !== "CANCELED" && validUpdate(withChanges(existing, changes));
    return { fits };
  }

  async _all(_input: Record<string, never>) {
    const rows = await this.runs.find().toArray();

    return rows.map(({ _id, ...rest }) => ({
      run: _id,
      ...rest,
      details: rest.details ?? "",
      earliestTime: rest.earliestTime ?? null,
      latestTime: rest.latestTime ?? null,
      minDistance: rest.minDistance ?? null,
      maxDistance: rest.maxDistance ?? null,
      minPace: rest.minPace ?? null,
      maxPace: rest.maxPace ?? null,
      // Runs from before cancellation was kept have no status, and are active.
      status: rest.status ?? "ACTIVE",
    }));
  }
}
