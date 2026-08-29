import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseR10Csv } from "./parseR10";
import { autoTagShots } from "./tag";
import { computeClubStats } from "./stats";

/**
 * Parses a genuine Garmin R10 export, as opposed to the synthetic fixtures.
 * This is what pins down the quirks of the real format: the BOM, the units
 * row, and "Club Name" being blank with the club in "Club Type".
 */
const root = path.resolve(__dirname, "../..");
const realFile = readdirSync(path.join(root, "fixtures")).find(
  (f) => f.startsWith("DrivingRange") && f.endsWith(".csv"),
);

describe.runIf(realFile)("a real Garmin R10 export", () => {
  const text = readFileSync(path.join(root, "fixtures", realFile!), "utf8");
  const parsed = parseR10Csv(text);

  it("parses every shot", () => {
    expect(parsed.missingHeaders).toEqual([]);
    expect(parsed.shots).toHaveLength(52);
  });

  it("recognises every column the export carries", () => {
    expect(parsed.unmappedHeaders).toEqual([]);
  });

  it("drops the units row rather than reading it as a shot", () => {
    // The units row has no club and no carry, so a naive parse would either
    // count it or warn about a skipped row. Neither should happen.
    expect(parsed.warnings.filter((w) => /skipped/.test(w))).toEqual([]);
  });

  it("reads units from the units row", () => {
    expect(parsed.units).toEqual({ distance: "yards", speed: "mph" });
  });

  it("identifies clubs from Club Type, since Club Name is blank", () => {
    const clubs = [...new Set(parsed.shots.map((s) => s.clubName))].sort();
    expect(clubs).toEqual(["3 Wood", "5 Iron", "7 Iron", "8 Iron"]);
    expect(parsed.shots.every((s) => s.clubName.trim().length > 0)).toBe(true);
  });

  it("categorises those clubs for benchmarking", () => {
    const cats = new Map(parsed.shots.map((s) => [s.clubName, s.clubCategory]));
    expect(cats.get("3 Wood")).toBe("wood");
    expect(cats.get("7 Iron")).toBe("iron");
    expect(cats.get("8 Iron")).toBe("iron");
    expect(cats.get("5 Iron")).toBe("iron");
  });

  it("reads the day-first date format", () => {
    expect(parsed.sessionDate).toBe("2026-03-29");
    expect(parsed.dates).toEqual(["2026-03-29"]);
  });

  it("produces usable club stats", () => {
    const stats = computeClubStats(autoTagShots(parsed.shots));
    expect(stats.map((s) => s.clubName)).toEqual(["3 Wood", "5 Iron", "7 Iron", "8 Iron"]);
    for (const c of stats) {
      expect(c.n).toBeGreaterThan(0);
      expect(c.avgCarry).toBeGreaterThan(0);
      expect(c.avgSmash).toBeGreaterThan(0.5);
      expect(c.avgPath).not.toBeNull();
      expect(c.avgFace).not.toBeNull();
    }
  });
});
