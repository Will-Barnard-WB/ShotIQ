import { bestWorstCohorts, MIN_COHORT } from "./cohorts";
import { mean, nums, stdev } from "./math";
import type { DominantMetric, DominantResult, Shot } from "./types";

/**
 * Candidate metrics for the dominant-variable search.
 *
 * These are all swing *inputs* -- things a golfer can go and change. Smash
 * factor and carry are deliberately excluded: they are outcomes, and they are
 * also what the auto-tagger uses to decide good from bad, so they would come
 * out "dominant" on almost every club by construction. Strike quality is
 * reported separately as the good-vs-bad carry gap.
 */
interface Candidate {
  metric: DominantMetric;
  label: string;
  unit: string;
  key: keyof Shot;
  /**
   * Ranking discount. Face-to-path is face minus path, so it is collinear with
   * two other candidates and its effect size swings on whichever way path
   * noise happens to fall. Discounting it means it only takes the headline
   * when it beats face and path by a clear margin -- and "your face is closed"
   * is a more actionable cue than "your face-to-path is +7" when the two say
   * the same thing.
   */
  rankWeight: number;
}

const CANDIDATES: Candidate[] = [
  { metric: "clubFace",    label: "Club face",    unit: "°",    key: "clubFace",    rankWeight: 1 },
  { metric: "clubPath",    label: "Club path",    unit: "°",    key: "clubPath",    rankWeight: 1 },
  { metric: "faceToPath",  label: "Face to path", unit: "°",    key: "faceToPath",  rankWeight: 0.7 },
  { metric: "attackAngle", label: "Attack angle", unit: "°",    key: "attackAngle", rankWeight: 1 },
  { metric: "clubSpeed",   label: "Club speed",   unit: " mph", key: "clubSpeed",   rankWeight: 1 },
];

function valuesOf(shots: Shot[], key: keyof Shot): number[] {
  return nums(shots.map((s) => s[key] as number | null));
}

/** Pooled standard deviation for two independent samples. */
function pooledSd(a: number[], b: number[]): number | null {
  const sa = stdev(a);
  const sb = stdev(b);
  if (sa === null || sb === null) return null;
  const df = a.length + b.length - 2;
  if (df <= 0) return null;
  const pooled = Math.sqrt(
    (((a.length - 1) * sa * sa) + ((b.length - 1) * sb * sb)) / df,
  );
  return Number.isFinite(pooled) && pooled > 0 ? pooled : null;
}

/**
 * Finds the swing input that best separates a club's best shots from its
 * worst, ranked by the standardised mean difference (Cohen's d) between the
 * two cohorts. This is the product's headline claim -- "face angle is the
 * dominant variable: good shots avg -2.8, bad shots avg -9.4".
 *
 * Cohorts come from bestWorstCohorts, a relative split, not from the absolute
 * good/bad tags -- see the note there.
 *
 * Returns null when either cohort is too small to say anything.
 */
export function findDominantVariable(shots: Shot[]): DominantResult | null {
  const { best: good, worst: bad } = bestWorstCohorts(shots);
  if (good.length < MIN_COHORT || bad.length < MIN_COHORT) return null;

  let best: DominantResult | null = null;
  let bestRank = 0;

  for (const c of CANDIDATES) {
    const g = valuesOf(good, c.key);
    const b = valuesOf(bad, c.key);
    if (g.length < MIN_COHORT || b.length < MIN_COHORT) continue;

    const gm = mean(g);
    const bm = mean(b);
    const sd = pooledSd(g, b);
    if (gm === null || bm === null || sd === null) continue;

    const effect = (gm - bm) / sd;
    if (!Number.isFinite(effect)) continue;

    const rank = Math.abs(effect) * c.rankWeight;
    if (best === null || rank > bestRank) {
      bestRank = rank;
      best = {
        metric: c.metric,
        label: c.label,
        goodMean: gm,
        badMean: bm,
        effect,   // the true, undiscounted effect size is what gets reported
        unit: c.unit,
      };
    }
  }

  return best;
}

/** Conventional reading of a Cohen's d magnitude. */
export function effectSizeLabel(effect: number): "small" | "moderate" | "large" | "very large" {
  const d = Math.abs(effect);
  if (d < 0.5) return "small";
  if (d < 0.8) return "moderate";
  if (d < 1.3) return "large";
  return "very large";
}
