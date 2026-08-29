import type { CSSProperties } from "react";

/** Session 1 ghost dots (faded), exactly as positioned in the original design. */
const GHOSTS = [
  [140, 140], [175, 160], [200, 155], [230, 148], [255, 170],
  [280, 163], [310, 145], [340, 158], [370, 152],
];

/** Session 2 shots. Good ones first, then bad, matching the original order
 *  so the staggered reveal runs in the same sequence. */
const GOOD = [
  [220, 80], [270, 72], [310, 68], [345, 75], [380, 63], [415, 70], [450, 58],
];
const BAD = [
  [190, 155], [240, 148], [285, 160], [330, 142], [360, 152],
];

const TICKS_X = [
  [60, "72"], [180, "76"], [300, "80"], [420, "84"], [540, "88"],
] as const;
const TICKS_Y = [
  [54, "145"], [111, "130"], [169, "115"],
] as const;

const MONO = "JetBrains Mono, monospace";

export default function ScatterHero() {
  return (
    <div className="scatter-wrap">
      <div className="scatter-topbar">
        <span className="scatter-title">
          7 Iron · Shot dispersion · Session 2 vs Session 1
        </span>
        <div className="scatter-legend">
          <span>
            <span className="leg-dot" style={{ background: "#4ADE80" }} />
            Good shots
          </span>
          <span>
            <span className="leg-dot" style={{ background: "#F87171" }} />
            Bad shots
          </span>
          <span>
            <span className="leg-dot" style={{ background: "#94A3B8", opacity: 0.5 }} />
            Session 1
          </span>
        </div>
      </div>

      <svg className="scatter" viewBox="0 0 620 238" xmlns="http://www.w3.org/2000/svg">
        {/* Grid */}
        {[60, 180, 300, 420, 540].map((x) => (
          <line key={`v${x}`} x1={x} y1={20} x2={x} y2={188} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {[50, 107, 165].map((y) => (
          <line key={`h${y}`} x1={40} y1={y} x2={580} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}

        {/* Axis ticks */}
        {TICKS_X.map(([x, label]) => (
          <text key={label} x={x} y={202} textAnchor="middle" fill="#64748B" fontSize={9} fontFamily={MONO}>
            {label}
          </text>
        ))}
        {TICKS_Y.map(([y, label]) => (
          <text key={label} x={38} y={y} textAnchor="end" fill="#64748B" fontSize={9} fontFamily={MONO}>
            {label}
          </text>
        ))}

        <text x={300} y={228} textAnchor="middle" fill="#64748B" fontSize={10} fontFamily={MONO}>
          Club speed (mph)
        </text>
        <text
          x={14} y={107} textAnchor="middle" fill="#64748B" fontSize={10}
          fontFamily={MONO} transform="rotate(-90,14,107)"
        >
          Carry (yds)
        </text>

        {GHOSTS.map(([cx, cy]) => (
          <circle key={`g${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="#94A3B8" opacity={0.25} />
        ))}

        {[...GOOD.map((p) => ({ p, fill: "#4ADE80" })), ...BAD.map((p) => ({ p, fill: "#F87171" }))].map(
          ({ p: [cx, cy], fill }, i) => (
            <circle
              key={`s${cx}-${cy}`}
              className="shot-dot"
              cx={cx}
              cy={cy}
              r={6}
              fill={fill}
              style={{ "--i": i } as CSSProperties}
            />
          ),
        )}

        <line
          id="trendline"
          x1={220} y1={80} x2={450} y2={58}
          stroke="#4ADE80" strokeWidth={1.5} strokeDasharray="4 3"
        />
      </svg>

      <div className="scatter-insight">
        → Face angle is the dominant variable: good shots avg −2.8°, bad shots avg −9.4°. Fix face
        first, not path.
      </div>
    </div>
  );
}
