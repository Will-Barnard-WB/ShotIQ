import type { SessionAnalysis } from "@/lib/analysis/types";
import { pct } from "./format";

/** The four tiles at the top of the analysis, each with its "vs last session" line. */
export default function MetricGrid({ a }: { a: SessionAnalysis }) {
  const prev = a.previous;
  const rateUp = prev ? a.goodShotRate > prev.goodShotRate : null;

  const handicap = a.handicapEstimate
    ? a.handicapIsUserSet
      ? String(a.handicapEstimate.low)
      : `${a.handicapEstimate.low}–${a.handicapEstimate.high}`
    : "—";

  return (
    <div className="metric-grid">
      <div className="metric-card">
        <div className="metric-label">Shots analysed</div>
        <div className="metric-val">{a.shotCount}</div>
        <div className="metric-sub">
          {prev ? `vs ${prev.shotCount} last session` : "First session"}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Good shot rate</div>
        <div className={`metric-val${rateUp === null ? "" : rateUp ? " up" : " down"}`}>
          {pct(a.goodShotRate)}
        </div>
        <div className="metric-sub">
          {prev ? `${rateUp ? "↑" : "↓"} from ${pct(prev.goodShotRate)}` : "No history yet"}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Clubs hitting well</div>
        <div className="metric-val">{a.clubsHittingWell}</div>
        <div className="metric-sub">
          {prev ? `vs ${prev.clubsHittingWell} last session` : `of ${a.clubCount} clubs`}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          {a.handicapIsUserSet ? "Your handicap" : "Estimated handicap"}
        </div>
        <div className="metric-val">{handicap}</div>
        <div className="metric-sub">
          {a.handicapIsUserSet ? "From your profile" : "Based on ball data"}
        </div>
      </div>
    </div>
  );
}
