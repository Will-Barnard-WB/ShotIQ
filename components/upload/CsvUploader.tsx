"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { parseR10Csv, splitByDate } from "@/lib/analysis/parseR10";
import { autoTagShots } from "@/lib/analysis/tag";
import { computeClubStats } from "@/lib/analysis/stats";
import { saveSession, type SaveState } from "@/app/dashboard/actions";
import type { BenchmarkRow, ParseResult, Shot } from "@/lib/analysis/types";

interface Bucket {
  date: string | null;
  shots: Shot[];
}

function SaveButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : `Save ${count} shots`}
    </button>
  );
}

const cell = (v: number | null, dp = 1) => (v === null ? "—" : v.toFixed(dp));

export default function CsvUploader({
  suggestedName,
  benchmarks,
}: {
  suggestedName: string;
  /** The same rows the server tags with, so the preview matches what is saved. */
  benchmarks: BenchmarkRow[];
}) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [active, setActive] = useState(0);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, formAction] = useActionState<SaveState, FormData>(saveSession, {});

  async function handleFile(file: File) {
    setReadError(null);
    if (!/\.csv$/i.test(file.name)) {
      setReadError("That is not a .csv file. Export the session from the Garmin Golf app.");
      return;
    }
    const text = await file.text();
    const parsed = parseR10Csv(text);
    setFileName(file.name);
    setResult(parsed);
    setActive(0);
    setBuckets(
      parsed.shots.length > 0
        ? splitByDate(parsed.shots).map((b) => ({
            date: b.date,
            shots: autoTagShots(b.shots, benchmarks),
          }))
        : [],
    );
  }

  const bucket = buckets[active];
  const clubStats = useMemo(
    () => (bucket ? computeClubStats(bucket.shots) : []),
    [bucket],
  );

  if (!result || result.missingHeaders.length > 0 || buckets.length === 0) {
    return (
      <>
        {readError && <div className="form-error">{readError}</div>}

        {result && result.missingHeaders.length > 0 && (
          <div className="form-error">
            <strong>This file is missing columns ShotIQ needs:</strong>{" "}
            {result.missingHeaders.join(", ")}.
            {result.unmappedHeaders.length > 0 && (
              <>
                {" "}
                Unrecognised columns in the file: {result.unmappedHeaders.join(", ")}.
              </>
            )}
          </div>
        )}
        {result && result.missingHeaders.length === 0 && buckets.length === 0 && (
          <div className="form-error">No usable shots in that file.</div>
        )}

        <div
          className={dragging ? "dropzone dragging" : "dropzone"}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
        >
          <div className="dropzone-icon">📁</div>
          <div className="dropzone-title">Drop your Garmin R10 session CSV here</div>
          <div className="dropzone-body">
            Garmin Golf app → your session → Export. Or click to choose a file.
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      </>
    );
  }

  const good = bucket.shots.filter((s) => s.quality === "good").length;
  const bad = bucket.shots.filter((s) => s.quality === "bad").length;

  return (
    <>
      {state.error && <div className="form-error">{state.error}</div>}

      {result.warnings.length > 0 && (
        <div className="warn-box">
          <strong>Worth knowing about this file:</strong>
          <ul>
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {buckets.length > 1 && (
        <div className="subnav">
          {buckets.map((b, i) => (
            <a
              key={b.date ?? i}
              href="#"
              className={i === active ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                setActive(i);
              }}
            >
              {b.date ?? "Undated"} ({b.shots.length})
            </a>
          ))}
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="shots" value={JSON.stringify(bucket.shots)} />
        <input type="hidden" name="fileName" value={fileName} />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <label className="field" style={{ flex: "2 1 260px", marginBottom: 0 }}>
            <span className="field-label">Session name</span>
            <input
              className="field-input"
              name="name"
              defaultValue={suggestedName}
              key={suggestedName}
              required
            />
          </label>
          <label className="field" style={{ flex: "1 1 160px", marginBottom: 0 }}>
            <span className="field-label">Session date</span>
            <input
              className="field-input"
              type="date"
              name="sessionDate"
              defaultValue={bucket.date ?? new Date().toISOString().slice(0, 10)}
              key={bucket.date ?? "undated"}
              required
            />
          </label>
        </div>

        <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: "0.75rem" }}>
          {bucket.shots.length} shots · {clubStats.length} clubs ·{" "}
          <span className="q-good">{good} good</span> / <span className="q-bad">{bad} bad</span>{" "}
          auto-tagged. You can re-tag individual shots after saving.
        </p>

        <div className="preview-table-wrap" style={{ marginBottom: "1.25rem" }}>
          <table className="preview">
            <thead>
              <tr>
                <th>Club</th>
                <th>Shots</th>
                <th>Avg carry</th>
                <th>Smash</th>
                <th>Path</th>
                <th>Face</th>
                <th>Deviation</th>
                <th>Good/Bad</th>
              </tr>
            </thead>
            <tbody>
              {clubStats.map((c) => (
                <tr key={c.clubName}>
                  <td>
                    {c.clubName}
                    {c.isShortGame ? " (chip)" : ""}
                  </td>
                  <td>{c.n}</td>
                  <td>{cell(c.avgCarry, 0)}</td>
                  <td>{cell(c.avgSmash, 2)}</td>
                  <td>{cell(c.avgPath)}</td>
                  <td>{cell(c.avgFace)}</td>
                  <td>{cell(c.avgDeviation)}</td>
                  <td>
                    <span className="q-good">{c.goodN}</span> /{" "}
                    <span className="q-bad">{c.badN}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <SaveButton count={bucket.shots.length} />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setResult(null);
              setBuckets([]);
              setFileName("");
            }}
          >
            Choose a different file
          </button>
        </div>
      </form>
    </>
  );
}
