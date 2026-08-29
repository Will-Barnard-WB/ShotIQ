import type {
  ClubCategory, ClubStats, DominantMetric, DominantResult, Quality, Shot,
} from "@/lib/analysis/types";

/** Row shape of public.session_club_stats. */
export interface ClubStatsRow {
  club_name: string;
  club_category: string;
  is_short_game: boolean;
  session_date: string;
  n: number;
  avg_carry: number | null;
  avg_total: number | null;
  avg_club_speed: number | null;
  avg_ball_speed: number | null;
  avg_smash: number | null;
  avg_path: number | null;
  avg_face: number | null;
  avg_face_to_path: number | null;
  avg_attack_angle: number | null;
  avg_deviation: number | null;
  avg_abs_deviation: number | null;
  carry_stdev: number | null;
  carry_min: number | null;
  carry_max: number | null;
  good_n: number;
  bad_n: number;
  good_bad_carry_gap: number | null;
  dominant_metric: string | null;
  dominant_good_mean: number | null;
  dominant_bad_mean: number | null;
  dominant_effect: number | null;
}

const DOMINANT_LABELS: Record<DominantMetric, { label: string; unit: string }> = {
  clubFace: { label: "Club face", unit: "°" },
  clubPath: { label: "Club path", unit: "°" },
  faceToPath: { label: "Face to path", unit: "°" },
  attackAngle: { label: "Attack angle", unit: "°" },
  smashFactor: { label: "Smash factor", unit: "" },
  clubSpeed: { label: "Club speed", unit: " mph" },
};

/** Postgres numerics come back as strings over PostgREST in some configs. */
const n = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : null;
};

function dominantFromRow(r: ClubStatsRow): DominantResult | null {
  const metric = r.dominant_metric as DominantMetric | null;
  const meta = metric ? DOMINANT_LABELS[metric] : undefined;
  const goodMean = n(r.dominant_good_mean);
  const badMean = n(r.dominant_bad_mean);
  const effect = n(r.dominant_effect);
  if (!metric || !meta || goodMean === null || badMean === null || effect === null) return null;
  return { metric, label: meta.label, goodMean, badMean, effect, unit: meta.unit };
}

export function clubStatsFromRow(r: ClubStatsRow): ClubStats {

  return {
    clubName: r.club_name,
    clubCategory: r.club_category as ClubCategory,
    isShortGame: r.is_short_game,
    n: r.n,
    avgCarry: n(r.avg_carry),
    avgTotal: n(r.avg_total),
    avgClubSpeed: n(r.avg_club_speed),
    avgBallSpeed: n(r.avg_ball_speed),
    avgSmash: n(r.avg_smash),
    avgPath: n(r.avg_path),
    avgFace: n(r.avg_face),
    avgFaceToPath: n(r.avg_face_to_path),
    avgAttackAngle: n(r.avg_attack_angle),
    avgDeviation: n(r.avg_deviation),
    avgAbsDeviation: n(r.avg_abs_deviation),
    carryStdev: n(r.carry_stdev),
    carryMin: n(r.carry_min),
    carryMax: n(r.carry_max),
    goodN: r.good_n,
    badN: r.bad_n,
    goodBadCarryGap: n(r.good_bad_carry_gap),
    dominant: dominantFromRow(r),
  };
}

/** Payload for the save_session / replace_session_analysis RPCs. */
export function clubStatsToJson(c: ClubStats) {
  return {
    club_name: c.clubName,
    club_category: c.clubCategory,
    is_short_game: c.isShortGame,
    n: c.n,
    avg_carry: c.avgCarry,
    avg_total: c.avgTotal,
    avg_club_speed: c.avgClubSpeed,
    avg_ball_speed: c.avgBallSpeed,
    avg_smash: c.avgSmash,
    avg_path: c.avgPath,
    avg_face: c.avgFace,
    avg_face_to_path: c.avgFaceToPath,
    avg_attack_angle: c.avgAttackAngle,
    avg_deviation: c.avgDeviation,
    avg_abs_deviation: c.avgAbsDeviation,
    carry_stdev: c.carryStdev,
    carry_min: c.carryMin,
    carry_max: c.carryMax,
    good_n: c.goodN,
    bad_n: c.badN,
    good_bad_carry_gap: c.goodBadCarryGap,
    dominant_metric: c.dominant?.metric ?? null,
    dominant_good_mean: c.dominant?.goodMean ?? null,
    dominant_bad_mean: c.dominant?.badMean ?? null,
    dominant_effect: c.dominant?.effect ?? null,
  };
}

export function shotToJson(s: Shot) {
  return {
    shot_index: s.shotIndex,
    hit_at: s.hitAt,
    club_name: s.clubName,
    club_type_raw: s.clubTypeRaw,
    club_category: s.clubCategory,
    club_speed: s.clubSpeed,
    attack_angle: s.attackAngle,
    club_path: s.clubPath,
    club_face: s.clubFace,
    face_to_path: s.faceToPath,
    ball_speed: s.ballSpeed,
    smash_factor: s.smashFactor,
    launch_angle: s.launchAngle,
    launch_direction: s.launchDirection,
    backspin: s.backspin,
    sidespin: s.sidespin,
    spin_rate: s.spinRate,
    spin_axis: s.spinAxis,
    apex_height: s.apexHeight,
    carry_distance: s.carryDistance,
    carry_deviation_angle: s.carryDeviationAngle,
    carry_deviation_distance: s.carryDeviationDistance,
    total_distance: s.totalDistance,
    total_deviation_angle: s.totalDeviationAngle,
    total_deviation_distance: s.totalDeviationDistance,
    quality: s.quality,
    quality_source: s.qualitySource,
    is_short_game: s.isShortGame,
  };
}

export interface ShotRow {
  id: string;
  shot_index: number;
  hit_at: string | null;
  club_name: string;
  club_type_raw: string | null;
  club_category: string;
  club_speed: number | null;
  attack_angle: number | null;
  club_path: number | null;
  club_face: number | null;
  face_to_path: number | null;
  ball_speed: number | null;
  smash_factor: number | null;
  launch_angle: number | null;
  launch_direction: number | null;
  backspin: number | null;
  sidespin: number | null;
  spin_rate: number | null;
  spin_axis: number | null;
  apex_height: number | null;
  carry_distance: number | null;
  carry_deviation_angle: number | null;
  carry_deviation_distance: number | null;
  total_distance: number | null;
  total_deviation_angle: number | null;
  total_deviation_distance: number | null;
  quality: Quality;
  quality_source: "auto" | "manual";
  is_short_game: boolean;
}

export function shotFromRow(r: ShotRow): Shot {
  return {
    shotIndex: r.shot_index,
    hitAt: r.hit_at,
    shotDate: r.hit_at ? r.hit_at.slice(0, 10) : null,
    clubName: r.club_name,
    clubTypeRaw: r.club_type_raw,
    clubCategory: r.club_category as ClubCategory,
    clubSpeed: n(r.club_speed),
    attackAngle: n(r.attack_angle),
    clubPath: n(r.club_path),
    clubFace: n(r.club_face),
    faceToPath: n(r.face_to_path),
    ballSpeed: n(r.ball_speed),
    smashFactor: n(r.smash_factor),
    launchAngle: n(r.launch_angle),
    launchDirection: n(r.launch_direction),
    backspin: n(r.backspin),
    sidespin: n(r.sidespin),
    spinRate: n(r.spin_rate),
    spinAxis: n(r.spin_axis),
    apexHeight: n(r.apex_height),
    carryDistance: n(r.carry_distance),
    carryDeviationAngle: n(r.carry_deviation_angle),
    carryDeviationDistance: n(r.carry_deviation_distance),
    totalDistance: n(r.total_distance),
    totalDeviationAngle: n(r.total_deviation_angle),
    totalDeviationDistance: n(r.total_deviation_distance),
    quality: r.quality,
    qualitySource: r.quality_source,
    isShortGame: r.is_short_game,
  };
}
