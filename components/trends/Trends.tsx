"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/db/queries";

/**
 * Small multiples, one card per club.
 *
 * Clubs are deliberately NOT plotted as series on shared axes: a 5 wood carries
 * 165 yards and a sand wedge 28, so one y-scale would flatten every club into a
 * line near its own edge. Each card is a single series with its own scale,
 * which also means no categorical palette and no legend -- the card title names
 * the series.
 */

// Nearest step of the design's --blue (#60A5FA) that sits inside the dark-mode
// lightness band for chart marks.
const MARK = "#4F92F8";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#64748B";
const UP = "#4ADE80";
const DOWN = "#F87171";

type MetricKey = "avgCarry" | "avgSmash" | "avgAbsDeviation" | "avgPath";

interface MetricSpec {
  key: MetricKey;
  label: string;
  unit: string;
  dp: number;
  /** "higher" = up is good; "lower" = closer to zero is good. */
  direction: "higher" | "lower";
  transform?: (v: number) => number;
}

const METRICS: MetricSpec[] = [
  { key: "avgCarry", label: "Carry distance", unit: " yds", dp: 0, direction: "higher" },
  { key: "avgSmash", label: "Smash factor", unit: "", dp: 2, direction: "higher" },
  { key: "avgAbsDeviation", label: "Dispersion", unit: " yds", dp: 1, direction: "lower" },
  { key: "avgPath", label: "Club path", unit: "°", dp: 1, direction: "lower", transform: Math.abs },
];

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function TrendTooltip({
  active, payload, label, spec,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string | number;
  spec: MetricSpec;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg4)",
        border: "0.5px solid var(--border2)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--t3)", fontFamily: "var(--mono)" }}>{label}</div>
      <div style={{ color: "var(--t1)", fontWeight: 500 }}>
        {payload[0].value.toFixed(spec.dp)}
        {spec.unit}
      </div>
    </div>
  );
}

export default function Trends({ points }: { points: TrendPoint[] }) {
  const [metricKey, setMetricKey] = useState<MetricKey>("avgCarry");
  const spec = METRICS.find((m) => m.key === metricKey)!;

  const clubs = useMemo(() => {
    const map = new Map<string, { date: string; value: number }[]>();
    for (const p of points) {
      const raw = p[spec.key];
      if (raw === null) continue;
      const value = spec.transform ? spec.transform(raw) : raw;
      const series = map.get(p.clubName) ?? [];
      series.push({ date: p.sessionDate, value });
      map.set(p.clubName, series);
    }
    return [...map.entries()]
      .map(([clubName, series]) => ({
        clubName,
        series: series.sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .filter((c) => c.series.length > 0)
      .sort((a, b) => b.series.length - a.series.length || a.clubName.localeCompare(b.clubName));
  }, [points, spec]);

  if (clubs.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--t2)" }}>
        No {spec.label.toLowerCase()} recorded yet.
      </p>
    );
  }

  return (
    <>
      <div className="subnav" role="group" aria-label="Trend metric">
        {METRICS.map((m) => (
          <a
            key={m.key}
            href="#"
            className={m.key === metricKey ? "active" : ""}
            aria-current={m.key === metricKey ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              setMetricKey(m.key);
            }}
          >
            {m.label}
          </a>
        ))}
      </div>

      <div className="trend-grid">
        {clubs.map(({ clubName, series }) => {
          const first = series[0].value;
          const last = series[series.length - 1].value;
          const change = last - first;
          const improved =
            spec.direction === "higher" ? change > 0 : Math.abs(last) < Math.abs(first);
          const meaningful = series.length > 1 && Math.abs(change) > 0.0001;

          return (
            <div className="trend-card" key={clubName}>
              <div className="trend-head">
                <span className="trend-title">{clubName}</span>
                {meaningful ? (
                  <span className="trend-delta" style={{ color: improved ? UP : DOWN }}>
                    {improved ? "↑" : "↓"} {change > 0 ? "+" : "−"}
                    {Math.abs(change).toFixed(spec.dp)}
                    {spec.unit}
                  </span>
                ) : (
                  <span className="trend-delta" style={{ color: "var(--t3)" }}>
                    {series.length === 1 ? "1 session" : "no change"}
                  </span>
                )}
              </div>
              <div className="trend-sub">
                {spec.label} · latest {last.toFixed(spec.dp)}
                {spec.unit} · {series.length} session{series.length === 1 ? "" : "s"}
              </div>

              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={series} margin={{ top: 6, right: 10, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    stroke={GRID}
                    tick={{ fill: AXIS, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={GRID}
                    tick={{ fill: AXIS, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    tickLine={false}
                    width={44}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }}
                    content={<TrendTooltip spec={spec} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={MARK}
                    strokeWidth={2}
                    dot={{ r: 4, fill: MARK, stroke: "var(--bg2)", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: MARK, stroke: "var(--bg2)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </>
  );
}
