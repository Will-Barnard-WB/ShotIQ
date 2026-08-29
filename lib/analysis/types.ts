/** A single shot, units normalised to yards / mph / degrees. */
export interface Shot {
  shotIndex: number;
  hitAt: string | null;
  /** Local calendar date (YYYY-MM-DD) the shot was hit. */
  shotDate: string | null;
  clubName: string;
  clubTypeRaw: string | null;
  clubCategory: ClubCategory;

  clubSpeed: number | null;
  attackAngle: number | null;
  clubPath: number | null;
  clubFace: number | null;
  faceToPath: number | null;
  ballSpeed: number | null;
  smashFactor: number | null;
  launchAngle: number | null;
  launchDirection: number | null;
  backspin: number | null;
  sidespin: number | null;
  spinRate: number | null;
  spinAxis: number | null;
  apexHeight: number | null;

  carryDistance: number | null;
  carryDeviationAngle: number | null;
  carryDeviationDistance: number | null;
  totalDistance: number | null;
  totalDeviationAngle: number | null;
  totalDeviationDistance: number | null;

  quality: Quality;
  qualitySource: "auto" | "manual";
  isShortGame: boolean;
}

export type Quality = "good" | "ok" | "bad";

export type ClubCategory =
  | "driver"
  | "wood"
  | "hybrid"
  | "iron"
  | "wedge"
  | "putter"
  | "other";

export type HandicapBand = "scratch" | "hcp10" | "hcp20plus";

/** Metrics the dominant-variable search considers. */
export type DominantMetric =
  | "clubFace"
  | "clubPath"
  | "faceToPath"
  | "attackAngle"
  | "smashFactor"
  | "clubSpeed";

export interface ParseResult {
  shots: Shot[];
  sessionDate: string | null;
  /** Distinct dates found in the file; more than one means it spans sessions. */
  dates: string[];
  warnings: string[];
  /** Headers in the file we did not recognise. Informational only. */
  unmappedHeaders: string[];
  /** Required headers we could not find. Non-empty means the upload fails. */
  missingHeaders: string[];
  units: { distance: "yards" | "metres"; speed: "mph" | "kph" };
}

export interface ClubStats {
  clubName: string;
  clubCategory: ClubCategory;
  isShortGame: boolean;
  n: number;

  avgCarry: number | null;
  avgTotal: number | null;
  avgClubSpeed: number | null;
  avgBallSpeed: number | null;
  avgSmash: number | null;
  avgPath: number | null;
  avgFace: number | null;
  avgFaceToPath: number | null;
  avgAttackAngle: number | null;
  avgDeviation: number | null;
  avgAbsDeviation: number | null;
  carryStdev: number | null;
  carryMin: number | null;
  carryMax: number | null;

  goodN: number;
  badN: number;
  /** Mean carry of good shots minus mean carry of bad shots. */
  goodBadCarryGap: number | null;

  dominant: DominantResult | null;
}

export interface DominantResult {
  metric: DominantMetric;
  label: string;
  goodMean: number;
  badMean: number;
  /** Cohen's d. Sign follows goodMean - badMean. */
  effect: number;
  unit: string;
}

export type DeltaSense = "better" | "worse" | "flat";

export interface MetricDelta {
  metric: string;
  label: string;
  unit: string;
  previous: number;
  current: number;
  delta: number;
  /** Ranking score for picking which deltas are worth showing. */
  magnitude: number;
  /** Whether the movement is an improvement, given the metric's direction. */
  sense: DeltaSense;
}

export interface ClubComparison {
  clubName: string;
  deltas: MetricDelta[];
}

export interface BenchmarkPill {
  label: string;
  isUser: boolean;
  sortOrder: number;
}

export interface BenchmarkRow {
  club_category: string;
  handicap_band: string;
  metric: string;
  min_value: number | null;
  max_value: number | null;
  label: string;
  sort_order: number;
}

export interface Tip {
  kind: "good" | "warn" | "info";
  title: string;
  body: string;
}

export interface SessionAnalysis {
  version: 1;
  generatedAt: string;
  sessionDate: string;
  shotCount: number;
  clubCount: number;
  goodShotRate: number;
  clubsHittingWell: number;
  handicapEstimate: { low: number; high: number; band: HandicapBand } | null;
  handicapIsUserSet: boolean;

  previous: {
    sessionId: string;
    name: string;
    sessionDate: string;
    shotCount: number;
    goodShotRate: number;
    clubsHittingWell: number;
  } | null;

  clubs: ClubStatsWithBenchmarks[];
  comparisons: ClubComparison[];
  improvements: Tip[];
  faults: Tip[];
  cues: Tip[];
}

export interface ClubStatsWithBenchmarks extends ClubStats {
  smashPills: BenchmarkPill[];
  /** Headline badge shown next to the club name on the analysis card. */
  badge: { text: string; tone: "good" | "warn" | "bad" | "info" } | null;
  bars: { label: string; pct: number; color: string; note: string }[];
}
