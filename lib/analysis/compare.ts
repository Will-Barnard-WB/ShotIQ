import type { ClubComparison, ClubStats, DeltaSense, MetricDelta } from "./types";

/**
 * How to read a change in each metric.
 *  "higher"      - bigger is better (carry, smash factor)
 *  "towardZero"  - closer to zero is better (path, face, deviation)
 */
type Direction = "higher" | "towardZero";

interface MetricSpec {
  metric: string;
  label: string;
  unit: string;
  key: keyof ClubStats;
  direction: Direction;
  /** Movement smaller than this is noise, not progress. */
  epsilon: number;
  dp: number;
}

export const METRIC_SPECS: MetricSpec[] = [
  { metric: "smash",      label: "Smash factor", unit: "",     key: "avgSmash",        direction: "higher",     epsilon: 0.01, dp: 2 },
  { metric: "path",       label: "Club path",    unit: "°",    key: "avgPath",         direction: "towardZero", epsilon: 0.3,  dp: 1 },
  { metric: "face",       label: "Club face",    unit: "°",    key: "avgFace",         direction: "towardZero", epsilon: 0.3,  dp: 1 },
  { metric: "faceToPath", label: "Face to path", unit: "°",    key: "avgFaceToPath",   direction: "towardZero", epsilon: 0.3,  dp: 1 },
  { metric: "deviation",  label: "Deviation",    unit: " yds", key: "avgDeviation",    direction: "towardZero", epsilon: 1.5,  dp: 1 },
  { metric: "carry",      label: "Distance",     unit: " yds", key: "avgCarry",        direction: "higher",     epsilon: 2,    dp: 0 },
  { metric: "clubSpeed",  label: "Club speed",   unit: " mph", key: "avgClubSpeed",    direction: "higher",     epsilon: 0.8,  dp: 1 },
];

function senseOf(spec: MetricSpec, previous: number, current: number): DeltaSense {
  if (spec.direction === "higher") {
    if (current - previous > spec.epsilon) return "better";
    if (previous - current > spec.epsilon) return "worse";
    return "flat";
  }
  const improvement = Math.abs(previous) - Math.abs(current);
  if (improvement > spec.epsilon) return "better";
  if (improvement < -spec.epsilon) return "worse";
  return "flat";
}

/**
 * Compares one club's stats against the same club in an earlier session.
 * Only metrics present in both sessions produce a delta.
 */
export function compareClubStats(current: ClubStats, previous: ClubStats): ClubComparison {
  const deltas: MetricDelta[] = [];

  for (const spec of METRIC_SPECS) {
    const prev = previous[spec.key];
    const curr = current[spec.key];
    if (typeof prev !== "number" || typeof curr !== "number") continue;

    const sense = senseOf(spec, prev, curr);
    const change =
      spec.direction === "higher" ? curr - prev : Math.abs(prev) - Math.abs(curr);

    deltas.push({
      metric: spec.metric,
      label: spec.label,
      unit: spec.unit,
      previous: prev,
      current: curr,
      delta: curr - prev,
      // Movement expressed in units of "the smallest change worth noticing",
      // which puts 0.08 of smash factor and 17 yards of deviation on one scale.
      magnitude: Math.abs(change) / spec.epsilon,
      sense,
    });
  }

  deltas.sort((a, b) => b.magnitude - a.magnitude);
  return { clubName: current.clubName, deltas };
}

/** Compares every club the two sessions have in common. */
export function compareSessions(
  current: ClubStats[],
  previous: ClubStats[],
): ClubComparison[] {
  const prevByClub = new Map(previous.map((c) => [c.clubName, c]));
  const out: ClubComparison[] = [];

  for (const c of current) {
    const p = prevByClub.get(c.clubName);
    if (!p) continue;
    const comparison = compareClubStats(c, p);
    if (comparison.deltas.length > 0) out.push(comparison);
  }

  // Most-changed clubs first, so the comparison grid shows what actually moved.
  out.sort((a, b) => (b.deltas[0]?.magnitude ?? 0) - (a.deltas[0]?.magnitude ?? 0));
  return out;
}

export function formatDelta(d: MetricDelta): string {
  const spec = METRIC_SPECS.find((s) => s.metric === d.metric);
  const dp = spec?.dp ?? 1;
  return `${d.previous.toFixed(dp)}${d.unit} → ${d.current.toFixed(dp)}${d.unit}`;
}
