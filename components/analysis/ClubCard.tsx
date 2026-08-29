import { effectSizeLabel } from "@/lib/analysis/dominant";

import type { ClubComparison, ClubStatsWithBenchmarks, MetricDelta } from "@/lib/analysis/types";
import { deg, num, yds } from "./format";

const BADGE = { good: "badge-good", warn: "badge-warn", bad: "badge-bad", info: "badge-info" } as const;

/** The small "↑ improved from X" note appended to a stat row. */
function DeltaNote({ delta }: { delta: MetricDelta | undefined }) {
  if (!delta || delta.sense === "flat") return null;
  const dp = delta.metric === "smash" ? 2 : delta.metric === "carry" ? 0 : 1;
  return (
    <span className={delta.sense === "better" ? "up" : "down"} style={{ fontSize: 11 }}>
      {" "}
      {delta.sense === "better" ? "↑ improved from" : "↓ from"}{" "}
      {delta.previous.toFixed(dp)}
      {delta.unit}
    </span>
  );
}

function StatRow({
  label, value, tone, delta,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  delta?: MetricDelta;
}) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className={`stat-val${tone ? ` ${tone}` : ""}`}>
        {value}
        <DeltaNote delta={delta} />
      </span>
    </div>
  );
}

export default function ClubCard({
  club,
  comparison,
}: {
  club: ClubStatsWithBenchmarks;
  comparison?: ClubComparison;
}) {
  const d = (metric: string) => comparison?.deltas.find((x) => x.metric === metric);

  return (
    <div className="card">
      <div className="club-header">
        <span className="club-name">
          {club.clubName}
          {club.isShortGame ? " (chipping)" : ""}
        </span>
        {club.badge && <span className={`badge ${BADGE[club.badge.tone]}`}>{club.badge.text}</span>}
      </div>

      {club.isShortGame ? (
        <>
          <div className="chipping-note">
            Short game shots. Full swing metrics not applicable.
          </div>
          <StatRow label="Avg carry" value={yds(club.avgCarry, 1)} delta={d("carry")} />
          <StatRow label="Deviation" value={yds(club.avgDeviation, 1)} delta={d("deviation")} />
          <StatRow
            label="Distance consistency"
            value={
              club.carryMin !== null && club.carryMax !== null
                ? `${Math.round(club.carryMin)}–${Math.round(club.carryMax)} yds range`
                : "—"
            }
            tone={
              club.carryMin !== null && club.carryMax !== null && club.avgCarry
                ? club.carryMax - club.carryMin > club.avgCarry * 0.8
                  ? "down"
                  : "up"
                : undefined
            }
          />
          <StatRow label="Shots" value={String(club.n)} />
        </>
      ) : (
        <>
          <StatRow label="Avg distance" value={yds(club.avgCarry)} delta={d("carry")} />
          <StatRow label="Smash factor" value={num(club.avgSmash)} delta={d("smash")} />
          <StatRow label="Club path" value={deg(club.avgPath)} delta={d("path")} />
          <StatRow label="Club face" value={deg(club.avgFace)} delta={d("face")} />
          {club.goodBadCarryGap !== null && club.goodN > 0 && club.badN > 0 && (
            <StatRow
              label="Good vs bad gap"
              value={
                club.dominant
                  ? `${Math.round(club.goodBadCarryGap)} yds · ${club.dominant.label.toLowerCase()} is the difference`
                  : `${Math.round(club.goodBadCarryGap)} yds`
              }
              tone={club.goodBadCarryGap >= 30 ? "down" : undefined}
            />
          )}
          {club.dominant && (
            <StatRow
              label={`${club.dominant.label}, good vs bad`}
              value={`${deg(club.dominant.goodMean)} vs ${deg(club.dominant.badMean)} (${effectSizeLabel(
                club.dominant.effect,
              )})`}
            />
          )}
        </>
      )}

      {club.bars.length > 0 && (
        <div className="bar-wrap">
          {club.bars.map((b) => (
            <div className="bar-row" key={b.label}>
              <span className="bar-label">{b.label}</span>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
              </div>
              <span className="bar-val" style={{ color: b.color }}>
                {b.note}
              </span>
            </div>
          ))}
        </div>
      )}

      {club.smashPills.length > 0 && (
        <div className="hcp-row">
          {club.smashPills.map((p) => (
            <span key={p.label} className={p.isUser ? "hcp-you" : "hcp-pill"}>
              {p.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
