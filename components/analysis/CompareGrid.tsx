import { formatDelta } from "@/lib/analysis/compare";
import type { ClubComparison } from "@/lib/analysis/types";

const CLASS = { better: "up", worse: "down", flat: "" } as const;

/**
 * "Session 1 vs Session 2, common clubs" -- the two most-changed metrics for
 * each of the three clubs that moved most.
 */
export default function CompareGrid({ comparisons }: { comparisons: ClubComparison[] }) {
  const shown = comparisons.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <div className="comp-grid">
      {shown.map((c) => {
        const deltas = c.deltas.slice(0, 2);
        return (
          <div className="comp-card" key={c.clubName}>
            <div className="comp-club">{c.clubName}</div>
            {deltas.map((d, i) => (
              <div key={d.metric}>
                <div className="comp-metric" style={i > 0 ? { marginTop: 6 } : undefined}>
                  {d.label}
                </div>
                <div
                  className={`comp-change ${CLASS[d.sense]}`}
                  style={i > 0 ? { fontSize: 14 } : undefined}
                >
                  {formatDelta(d)} {d.sense === "better" ? "↑" : d.sense === "worse" ? "↓" : "→"}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
