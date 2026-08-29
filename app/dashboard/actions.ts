"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clubStatsToJson, shotToJson } from "@/lib/db/mappers";
import {
  getBenchmarks, getHandicap, getPreviousSession, getSession, getSessionShots,
} from "@/lib/db/queries";
import { autoTagShots, buildAnalysis, computeClubStats } from "@/lib/analysis";
import type { Quality, Shot } from "@/lib/analysis/types";

export interface SaveState {
  error?: string;
}

/**
 * Persists one parsed session: shots, per-club stats and the computed
 * analysis, in a single transaction (see the save_session function in
 * supabase/migrations/0002_save_session.sql).
 *
 * The shots arrive from the browser already parsed, so they are re-tagged and
 * re-analysed here rather than trusting any derived values sent by the client.
 */
export async function saveSession(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const name = String(formData.get("name") ?? "").trim();
  const sessionDate = String(formData.get("sessionDate") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "") || null;
  const raw = String(formData.get("shots") ?? "");

  if (!name) return { error: "Give the session a name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return { error: "Pick a valid session date." };

  let parsed: Shot[];
  try {
    parsed = JSON.parse(raw) as Shot[];
  } catch {
    return { error: "Could not read the parsed shots. Try the upload again." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "That file had no usable shots in it." };
  }

  const [benchmarks, userHandicap, previous] = await Promise.all([
    getBenchmarks(),
    getHandicap(),
    getPreviousSession(sessionDate),
  ]);

  const shots = autoTagShots(parsed, benchmarks);
  const clubStats = computeClubStats(shots);

  const analysis = buildAnalysis({
    shots, sessionDate, benchmarks, userHandicap, previous,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_session", {
    p_name: name,
    p_session_date: sessionDate,
    p_file_name: fileName,
    p_shots: shots.map(shotToJson),
    p_club_stats: clubStats.map(clubStatsToJson),
    p_analysis: analysis,
  });

  if (error) return { error: `Could not save the session: ${error.message}` };

  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${data as string}`);
}

/**
 * Re-tags one shot by hand and recomputes everything downstream, so the
 * dominant variable, comparisons and cues all reflect the correction.
 */
export async function setShotQuality(
  sessionId: string,
  shotId: string,
  quality: Quality,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("shots")
    .update({ quality, quality_source: "manual" })
    .eq("id", shotId)
    .eq("session_id", sessionId);
  if (error) throw new Error(`Could not update that shot: ${error.message}`);

  await recomputeSession(sessionId);
  revalidatePath(`/dashboard/sessions/${sessionId}`);
  revalidatePath("/dashboard");
}

/** Rebuilds club stats and the analysis payload from the stored shots. */
export async function recomputeSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");

  const [stored, benchmarks, userHandicap, previous] = await Promise.all([
    getSessionShots(sessionId),
    getBenchmarks(),
    getHandicap(),
    getPreviousSession(session.session_date, sessionId),
  ]);

  const shots = autoTagShots(stored, benchmarks);
  const clubStats = computeClubStats(shots);

  const analysis = buildAnalysis({
    shots,
    sessionDate: session.session_date,
    benchmarks,
    userHandicap,
    previous,
  });

  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_session_analysis", {
    p_session_id: sessionId,
    p_club_stats: clubStats.map(clubStatsToJson),
    p_analysis: analysis,
  });
  if (error) throw new Error(`Could not recompute the session: ${error.message}`);
}

export async function deleteSession(formData: FormData): Promise<void> {
  const id = String(formData.get("sessionId") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw new Error(`Could not delete that session: ${error.message}`);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
