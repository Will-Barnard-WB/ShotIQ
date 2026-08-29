import type { Tip } from "@/lib/analysis/types";

const TONE = { good: "good-tip", warn: "warn-tip", info: "info-tip" } as const;

export default function TipCard({ tip }: { tip: Tip }) {
  return (
    <div className={`tip-card ${TONE[tip.kind]}`}>
      <div className="tip-title">{tip.title}</div>
      <div className="tip-body">{tip.body}</div>
    </div>
  );
}
