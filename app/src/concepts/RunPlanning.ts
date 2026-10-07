import type { Collection, Db } from "mongodb";

export class InvalidRun extends Error {}
export class NotOwner extends Error {}
export class InvalidFlexibility extends Error {}

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
    !(
      run.earliestTime! <= run.startTime &&
      run.startTime <= run.latestTime!
    )
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
    !(
      run.minDistance! > 0 &&
      run.minDistance! <= run.distance &&
      run.distance <= run.maxDistance!
    )
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
    !(
      run.minPace! > 0 &&
      run.minPace! <= run.pace &&
      run.pace <= run.maxPace!
    )
  ) {
    return false;
  }

  return true;
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
  }: {
    owner: string;
    startTime: string;
    distance: number;
    pace: number;
    location: string;
  }) {
    if (!validRunDetails(distance, pace)) {
      throw new InvalidRun(
        "The run details or flexibility ranges are invalid.",
      );
    }
  
    const run: Run = {
      _id: crypto.randomUUID(),
      owner,
      startTime,
      distance,
      pace,
      location,
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
  }: {
    owner: string;
    run: string;
    startTime?: string;
    distance?: number;
    pace?: number;
    location?: string;
  }) {
    const existing = await this.runs.findOne({ _id: run });

    if (!existing || existing.owner !== owner) {
      throw new NotOwner(
        "The run does not exist or does not belong to this user.",
      );
    }

    const updated: Run = {
      ...existing,
      startTime: startTime ?? existing.startTime,
      distance: distance ?? existing.distance,
      pace: pace ?? existing.pace,
      location: location ?? existing.location,
    };

    if (
      !validRunDetails(updated.distance, updated.pace) ||
      !validFlexibility(updated)
    ) {
      throw new InvalidRun("The updated run details are invalid.");
    }

    await this.runs.updateOne(
      { _id: run },
      {
        $set: {
          startTime: updated.startTime,
          distance: updated.distance,
          pace: updated.pace,
          location: updated.location,
        },
      },
    );

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
      throw new NotOwner(
        "The run does not exist or does not belong to this user.",
      );
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
      throw new InvalidFlexibility(
        "The flexibility ranges are invalid.",
      );
    }
  
    await this.runs.updateOne(
      { _id: run },
      {
        $set: flexibility,
      },
    );
  
    return { run };
  }

  async cancel({
    owner,
    run,
  }: {
    owner: string;
    run: string;
  }) {
    const existing = await this.runs.findOne({ _id: run });

    if (!existing || existing.owner !== owner) {
      throw new NotOwner(
        "The run does not exist or does not belong to this user.",
      );
    }

    await this.runs.deleteOne({ _id: run });

    return { run };
  }

  async _all(_input: Record<string, never>) {
    const rows = await this.runs.find().toArray();

    return rows.map(({ _id, ...rest }) => ({
      run: _id,
      ...rest,
    }));
  }
}