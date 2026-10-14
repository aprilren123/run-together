import { describe, expect, test } from "bun:test";
import { readRunChange } from "../src/runChange.ts";

const read = (change: unknown) => readRunChange({ change });
const NONE = { startTime: null, location: null, distance: null, pace: null, details: null };

describe("readRunChange", () => {
  test("reads any combination of the five fields, with null for each one left alone", () => {
    expect(read({ startTime: "2026-11-07T10:30" })).toEqual({
      ...NONE,
      valid: true,
      startTime: "2026-11-07T10:30",
    });
    expect(
      read({ location: "  Harvard Bridge ", distance: 6, pace: 8.5, details: "Bring water" }),
    ).toEqual({
      valid: true,
      startTime: null,
      location: "Harvard Bridge",
      distance: 6,
      pace: 8.5,
      details: "Bring water",
    });
  });

  test("a plain string is a new start time, as suggestions were before", () => {
    expect(read("2026-11-07T10:30")).toMatchObject({ valid: true, startTime: "2026-11-07T10:30" });
  });

  test("refuses an empty change, an unknown field, or a malformed value", () => {
    for (const change of [
      {},
      { distance: null },
      { owner: "morgan" },
      { startTime: "2026-11-07T10:30", status: "CANCELED" },
      { startTime: "tomorrow" },
      { startTime: 10 },
      { location: "   " },
      { location: "x".repeat(201) },
      { distance: 0 },
      { distance: -3 },
      { distance: "5" },
      { pace: Number.NaN },
      { details: 7 },
      { details: "x".repeat(1501) },
      null,
      42,
      ["2026-11-07T10:30"],
      "",
    ]) {
      expect({ change, ...read(change) }).toMatchObject({ change, valid: false });
    }
  });

  test("an empty description is a change: it clears the description", () => {
    expect(read({ details: "" })).toMatchObject({ valid: true, details: "" });
  });
});
