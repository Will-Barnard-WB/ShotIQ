"use client";

import { useState, useTransition } from "react";
import { setShotQuality } from "@/app/dashboard/actions";
import type { Quality, Shot } from "@/lib/analysis/types";

type Row = Shot & { id: string };

const ORDER: Quality[] = ["good", "ok", "bad"];

const cell = (v: number | null, dp = 1) => (v === null ? "—" : v.toFixed(dp));

/**
 * Per-shot good / ok / bad override. Changing one re-tags that shot and
 * recomputes the whole session, so the dominant variable and cues stay honest.
 */
export default function ShotTable({ sessionId, shots }: { sessionId: string; shots: Row[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, Quality>>({});

  const change = (shotId: string, quality: Quality) => {
    setError(null);
    setOptimistic((o) => ({ ...o, [shotId]: quality }));
    startTransition(async () => {
      try {
        await setShotQuality(sessionId, shotId, quality);
      } catch {
        setOptimistic((o) => {
          const next = { ...o };
          delete next[shotId];
          return next;
        });
        setError("Could not save that change. Try again.");
      }
    });
  };

  if (!open) {
    return (
      <button className="btn-ghost" style={{ fontSize: 13, padding: "9px 18px" }} onClick={() => setOpen(true)}>
        Review and re-tag the {shots.length} shots →
      </button>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: "0.75rem" }}>
        Shots are tagged automatically from smash factor and dispersion, within each club.
        Override any of them and the analysis is recomputed.
        {pending && <span style={{ color: "var(--green)" }}> Saving…</span>}
      </p>
      {error && <div className="form-error">{error}</div>}

      <div className="preview-table-wrap">
        <table className="preview">
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th>Carry</th>
              <th>Smash</th>
              <th>Path</th>
              <th>Face</th>
              <th>Dev</th>
              <th>Tag</th>
            </tr>
          </thead>
          <tbody>
            {shots.map((s) => {
              const q = optimistic[s.id] ?? s.quality;
              return (
                <tr key={s.id}>
                  <td>{s.shotIndex + 1}</td>
                  <td>{s.clubName}</td>
                  <td>{cell(s.carryDistance, 0)}</td>
                  <td>{cell(s.smashFactor, 2)}</td>
                  <td>{cell(s.clubPath)}</td>
                  <td>{cell(s.clubFace)}</td>
                  <td>{cell(s.carryDeviationDistance)}</td>
                  <td>
                    <span className="q-toggle">
                      {ORDER.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={q === option ? `on-${option}` : ""}
                          aria-pressed={q === option}
                          onClick={() => change(s.id, option)}
                        >
                          {option}
                        </button>
                      ))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        className="btn-ghost"
        style={{ fontSize: 13, padding: "9px 18px", marginTop: "1rem" }}
        onClick={() => setOpen(false)}
      >
        Hide shots
      </button>
    </div>
  );
}
