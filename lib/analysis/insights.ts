import { effectSizeLabel } from "./dominant";
import { formatDelta } from "./compare";
import { mean } from "./math";
import type {
  BenchmarkRow, ClubComparison, ClubStats, HandicapBand, Tip,
} from "./types";

/** Thresholds that decide when something is worth telling the golfer about. */
const GOOD_BAD_GAP_YDS = 30;   // good-vs-bad carry spread that counts as a fault
const IDEAL_PATH_DEG = 3;      // "ideal path is within +/-3 degrees"
const MIN_DELTA_MAGNITUDE = 1.5;

const f = (n: number, dp = 1) => n.toFixed(dp);
const deg = (n: number, dp = 1) => `${n > 0 ? "+" : ""}${n.toFixed(dp)}°`;

export interface InsightContext {
  clubs: ClubStats[];
  comparisons: ClubComparison[];
  benchmarks: BenchmarkRow[];
  band: HandicapBand;
}

/* ------------------------------------------------------------------ */
/* Improvements: what got better since last session                    */
/* ------------------------------------------------------------------ */

export function buildImprovements(ctx: InsightContext): Tip[] {
  const tips: Tip[] = [];

  // Single-club standouts, biggest movement first.
  for (const comp of ctx.comparisons) {
    const better = comp.deltas.filter(
      (d) => d.sense === "better" && d.magnitude >= MIN_DELTA_MAGNITUDE,
    );
    if (better.length === 0) continue;

    const headline = better[0];
    const rest = better.slice(1, 3);
    const extra = rest.length
      ? ` ${rest.map((d) => `${d.label} ${formatDelta(d)}`).join(", ")}.`
      : "";

    tips.push({
      kind: "good",
      title: `${comp.clubName}: ${headline.label.toLowerCase()} improved`,
      body: `${headline.label} moved ${formatDelta(headline)}.${extra}`,
    });
    if (tips.length >= 3) break;
  }

  // Cross-club pattern: path improving on most irons at once is worth its
  // own line, because it points at the swing rather than at one club.
  const ironPathGains = ctx.comparisons.filter((c) => {
    const club = ctx.clubs.find((k) => k.clubName === c.clubName);
    if (club?.clubCategory !== "iron") return false;
    return c.deltas.some((d) => d.metric === "path" && d.sense === "better");
  });

  if (ironPathGains.length >= 2) {
    const worst = ctx.clubs
      .filter((c) => c.clubCategory === "iron" && c.avgPath !== null)
      .sort((a, b) => Math.abs(b.avgPath!) - Math.abs(a.avgPath!))[0];
    tips.unshift({
      kind: "good",
      title: "Path improvement across the irons",
      body:
        `${ironPathGains.length} irons show a less severe path this session` +
        (worst
          ? `. ${worst.clubName} now averages ${deg(worst.avgPath!)}, still outside the ±${IDEAL_PATH_DEG}° ideal but moving the right way.`
          : "."),
    });
  }

  return tips.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Faults: what to fix, worst first                                    */
/* ------------------------------------------------------------------ */

export function buildFaults(ctx: InsightContext): Tip[] {
  const tips: Tip[] = [];

  // 1. Clubs with a wide gap between the best and worst shots.
  const gappy = ctx.clubs
    .filter((c) => !c.isShortGame && (c.goodBadCarryGap ?? 0) >= GOOD_BAD_GAP_YDS)
    .sort((a, b) => (b.goodBadCarryGap ?? 0) - (a.goodBadCarryGap ?? 0))
    .slice(0, 2);

  if (gappy.length > 0) {
    const names = gappy.map((c) => c.clubName).join(" & ");
    const worst = gappy[0];
    const driver = worst.dominant;
    tips.push({
      kind: "warn",
      title: `${names}: too much spread between best and worst`,
      body:
        `${gappy.length > 1 ? "Both clubs show" : "This club shows"} a ` +
        `${Math.round(Math.max(...gappy.map((c) => c.goodBadCarryGap ?? 0)))}+ yard gap between good and bad shots` +
        (driver
          ? `, and ${driver.label.toLowerCase()} is the variable that separates them: ${deg(driver.goodMean)} on good shots against ${deg(driver.badMean)} on bad ones (a ${effectSizeLabel(driver.effect)} difference).`
          : ". Centre contact before speed."),
    });
  }

  // 2. Club path outside the ideal window across the bag.
  const offPath = ctx.clubs.filter(
    (c) => !c.isShortGame && c.avgPath !== null && Math.abs(c.avgPath) > IDEAL_PATH_DEG,
  );
  if (offPath.length >= 2) {
    const avg = mean(offPath.map((c) => c.avgPath!));
    const dir = (avg ?? 0) < 0 ? "out-to-in" : "in-to-out";
    const lo = Math.min(...offPath.map((c) => Math.abs(c.avgPath!)));
    const hi = Math.max(...offPath.map((c) => Math.abs(c.avgPath!)));
    tips.push({
      kind: "warn",
      title: `Club path outside the ideal window on ${offPath.length} clubs`,
      body:
        `Ideal path is within ±${IDEAL_PATH_DEG}°. Yours average ${f(lo)}° to ${f(hi)}° ${dir}. ` +
        `This is the single most repeated pattern in the session, so it is a swing trait rather than a club problem.`,
    });
  }

  // 3. Face angle as the repeated dominant variable.
  const faceDominant = ctx.clubs.filter(
    (c) => c.dominant?.metric === "clubFace" || c.dominant?.metric === "faceToPath",
  );
  if (faceDominant.length >= 2) {
    tips.push({
      kind: "warn",
      title: "Face control is what separates your good and bad shots",
      body:
        `On ${faceDominant.length} clubs the face is the dominant variable between good and bad shots. ` +
        `Fix face first: path changes will not help while the face is the bigger error.`,
    });
  }

  // 4. Short game distance control.
  for (const c of ctx.clubs.filter((k) => k.isShortGame)) {
    if (c.carryMin === null || c.carryMax === null) continue;
    const spread = c.carryMax - c.carryMin;
    if (c.avgCarry !== null && spread > c.avgCarry * 0.8) {
      tips.push({
        kind: "warn",
        title: `${c.clubName}: inconsistent chip distances`,
        body:
          `Carries range from ${Math.round(c.carryMin)} to ${Math.round(c.carryMax)} yds around a ${Math.round(c.avgCarry)} yd average. ` +
          `Direction is fine — it is distance control that is costing shots.`,
      });
      break;
    }
  }

  return tips.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Cues: three things to take to the next session                      */
/* ------------------------------------------------------------------ */

interface CueRule {
  id: string;
  applies: (ctx: InsightContext) => boolean;
  build: (ctx: InsightContext) => Tip;
}

/** Evaluated in order; the first three that apply are used. */
const CUE_RULES: CueRule[] = [
  {
    id: "out-to-in-path",
    applies: (ctx) =>
      ctx.clubs.filter(
        (c) => !c.isShortGame && c.avgPath !== null && c.avgPath < -IDEAL_PATH_DEG,
      ).length >= 2,
    build: () => ({
      kind: "info",
      title: 'All irons: "swing to right field"',
      body:
        "Your path is consistently too far left. Pick a spot 10 yards right of your target and swing through it. " +
        "It will feel extreme, but trust the data.",
    }),
  },
  {
    id: "in-to-out-path",
    applies: (ctx) =>
      ctx.clubs.filter(
        (c) => !c.isShortGame && c.avgPath !== null && c.avgPath > IDEAL_PATH_DEG,
      ).length >= 2,
    build: () => ({
      kind: "info",
      title: 'All irons: "cover the ball"',
      body:
        "Your path runs too far right. Feel your chest turning through impact rather than hanging back, " +
        "and let the exit of the swing move left of target.",
    }),
  },
  {
    id: "closed-face",
    applies: (ctx) =>
      ctx.clubs.filter(
        (c) => !c.isShortGame && c.avgFace !== null && c.avgFace < -2,
      ).length >= 2,
    build: (ctx) => {
      const worst = ctx.clubs
        .filter((c) => !c.isShortGame && c.avgFace !== null)
        .sort((a, b) => a.avgFace! - b.avgFace!)[0];
      return {
        kind: "info",
        title: 'Face control: "logo to the target"',
        body:
          `Your face is closed at impact on most clubs (${worst.clubName} averages ${deg(worst.avgFace!)}). ` +
          "Feel the glove logo pointing at the target through impact and hold the face open a fraction longer.",
      };
    },
  },
  {
    id: "wood-strike",
    applies: (ctx) =>
      ctx.clubs.some(
        (c) =>
          (c.clubCategory === "wood" || c.clubCategory === "driver" || c.clubCategory === "hybrid") &&
          (c.goodBadCarryGap ?? 0) >= GOOD_BAD_GAP_YDS,
      ),
    build: (ctx) => {
      const club = ctx.clubs
        .filter((c) => c.clubCategory === "wood" || c.clubCategory === "driver" || c.clubCategory === "hybrid")
        .sort((a, b) => (b.goodBadCarryGap ?? 0) - (a.goodBadCarryGap ?? 0))[0];
      return {
        kind: "info",
        title: `${club.clubName}: "brush the tee forward"`,
        body:
          "Your bad shots with this club point at fat contact. Focus on a sweeping motion that brushes an " +
          "imaginary tee out from under the ball rather than digging at it.",
      };
    },
  },
  {
    id: "chipping",
    applies: (ctx) => ctx.clubs.some((c) => c.isShortGame),
    build: () => ({
      kind: "info",
      title: 'Chipping: "same length back and through"',
      body:
        "Keep the backswing and follow-through equal in length, and let swing length control distance " +
        "rather than hand speed.",
    }),
  },
  {
    id: "attack-angle",
    applies: (ctx) =>
      ctx.clubs.some(
        (c) => c.clubCategory === "iron" && c.avgAttackAngle !== null && c.avgAttackAngle > 0,
      ),
    build: () => ({
      kind: "info",
      title: 'Irons: "ball first, turf second"',
      body:
        "You are hitting up on your irons. Move the ball a fraction back in your stance and feel the " +
        "low point of the swing in front of the ball.",
    }),
  },
  {
    id: "dispersion",
    applies: (ctx) => ctx.clubs.some((c) => !c.isShortGame && (c.avgAbsDeviation ?? 0) > 15),
    build: (ctx) => {
      const worst = ctx.clubs
        .filter((c) => !c.isShortGame)
        .sort((a, b) => (b.avgAbsDeviation ?? 0) - (a.avgAbsDeviation ?? 0))[0];
      return {
        kind: "info",
        title: `${worst.clubName}: narrow the start line`,
        body:
          `Shots with this club finish an average of ${Math.round(worst.avgAbsDeviation ?? 0)} yards off line. ` +
          "Put an alignment stick down and hit ten balls at a gate 3 yards wide, 5 yards in front of you.",
      };
    },
  },
  {
    id: "consistency-fallback",
    applies: () => true,
    build: () => ({
      kind: "info",
      title: "Build a baseline: same club, ten balls",
      body:
        "Your numbers are in a good place. Hit ten balls with one club and note the carry spread. " +
        "Tightening that range is what lowers scores from here.",
    }),
  },
];

export function buildCues(ctx: InsightContext): Tip[] {
  const tips: Tip[] = [];
  for (const rule of CUE_RULES) {
    if (tips.length >= 3) break;
    if (!rule.applies(ctx)) continue;
    tips.push(rule.build(ctx));
  }
  // Number them, as the design does.
  return tips.map((t, i) => ({ ...t, title: `${i + 1}. ${t.title}` }));
}
