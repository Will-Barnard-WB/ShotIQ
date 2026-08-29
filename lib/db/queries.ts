import { createClient } from "@/lib/supabase/server";
import { clubStatsFromRow, shotFromRow, type ClubStatsRow, type ShotRow } from "./mappers";
import type { BenchmarkRow, ClubStats, SessionAnalysis, Shot } from "@/lib/analysis/types";

export interface SessionRow {
  id: string;
  name: string;
  session_date: string;
  file_name: string | null;
  shot_count: number;
  analysis: SessionAnalysis | null;
  created_at: string;
}

const SESSION_COLUMNS = "id, name, session_date, file_name, shot_count, analysis, created_at";

// supabase-js infers row types by parsing these strings at the type level, so
// they have to stay single literals -- concatenating them defeats inference.
const CLUB_STATS_COLUMNS = "club_name, club_category, is_short_game, session_date, n, avg_carry, avg_total, avg_club_speed, avg_ball_speed, avg_smash, avg_path, avg_face, avg_face_to_path, avg_attack_angle, avg_deviation, avg_abs_deviation, carry_stdev, carry_min, carry_max, good_n, bad_n, good_bad_carry_gap, dominant_metric, dominant_good_mean, dominant_bad_mean, dominant_effect";

export async function getBenchmarks(): Promise<BenchmarkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("benchmarks").select("*");
  if (error) throw new Error(`Could not load benchmarks: ${error.message}`);
  return (data ?? []) as BenchmarkRow[];
}

export async function getHandicap(): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("handicap").maybeSingle();
  const h = data?.handicap;
  return h === null || h === undefined ? null : Number(h);
}

export async function listSessions(): Promise<SessionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load sessions: ${error.message}`);
  return (data ?? []) as SessionRow[];
}

export async function getSession(id: string): Promise<SessionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("sessions").select(SESSION_COLUMNS).eq("id", id).maybeSingle();
  return (data as SessionRow | null) ?? null;
}

export async function getSessionShots(sessionId: string): Promise<Shot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shots")
    .select("*")
    .eq("session_id", sessionId)
    .order("shot_index");
  if (error) throw new Error(`Could not load shots: ${error.message}`);
  return ((data ?? []) as ShotRow[]).map(shotFromRow);
}

/** Shots with their database ids, for the per-shot quality editor. */
export async function getSessionShotRows(
  sessionId: string,
): Promise<(Shot & { id: string })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shots")
    .select("*")
    .eq("session_id", sessionId)
    .order("shot_index");
  if (error) throw new Error(`Could not load shots: ${error.message}`);
  return ((data ?? []) as ShotRow[]).map((r) => ({ ...shotFromRow(r), id: r.id }));
}

export async function getClubStats(sessionId: string): Promise<ClubStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_club_stats")
    .select(CLUB_STATS_COLUMNS)
    .eq("session_id", sessionId);
  if (error) throw new Error(`Could not load club stats: ${error.message}`);
  return ((data ?? []) as ClubStatsRow[]).map(clubStatsFromRow);
}

/**
 * The session immediately before this date -- the one a new upload gets
 * compared against. Ties on date are broken by insertion order.
 */
export async function getPreviousSession(
  sessionDate: string,
  excludeId?: string,
): Promise<{ id: string; name: string; sessionDate: string; clubStats: ClubStats[] } | null> {
  const supabase = await createClient();
  let query = supabase
    .from("sessions")
    .select("id, name, session_date")
    .lte("session_date", sessionDate)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  const prev = (data ?? []).find((s) => s.id !== excludeId);
  if (!prev) return null;

  return {
    id: prev.id,
    name: prev.name,
    sessionDate: prev.session_date,
    clubStats: await getClubStats(prev.id),
  };
}

export interface TrendPoint {
  sessionId: string;
  sessionDate: string;
  clubName: string;
  clubCategory: string;
  n: number;
  avgCarry: number | null;
  avgSmash: number | null;
  avgPath: number | null;
  avgAbsDeviation: number | null;
  goodN: number;
  badN: number;
}

/** Every club-session row the user has, oldest first. Powers the trend charts. */
export async function getTrendPoints(): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_club_stats")
    .select("session_id, session_date, club_name, club_category, n, avg_carry, avg_smash, avg_path, avg_abs_deviation, good_n, bad_n")
    .order("session_date", { ascending: true });
  if (error) throw new Error(`Could not load trends: ${error.message}`);

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return (data ?? []).map((r) => ({
    sessionId: r.session_id as string,
    sessionDate: r.session_date as string,
    clubName: r.club_name as string,
    clubCategory: r.club_category as string,
    n: r.n as number,
    avgCarry: num(r.avg_carry),
    avgSmash: num(r.avg_smash),
    avgPath: num(r.avg_path),
    avgAbsDeviation: num(r.avg_abs_deviation),
    goodN: r.good_n as number,
    badN: r.bad_n as number,
  }));
}
