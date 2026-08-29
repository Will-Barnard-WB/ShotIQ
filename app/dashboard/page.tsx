import Link from "next/link";
import Trends from "@/components/trends/Trends";
import { listSessions, getTrendPoints } from "@/lib/db/queries";
import { longDate } from "@/components/analysis/format";

export default async function DashboardPage() {
  const [sessions, points] = await Promise.all([listSessions(), getTrendPoints()]);

  if (sessions.length === 0) {
    return (
      <main className="app-shell">
        <div className="page-head">
          <div>
            <div className="page-title">Your sessions</div>
            <div className="page-sub">Every upload adds to your profile.</div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-title">No sessions yet</div>
          <div className="empty-body">
            Export a CSV from the Garmin Golf app after your next practice session and upload it.
            ShotIQ will analyse it on its own; from the second session on, it also compares against
            your history.
          </div>
          <Link href="/dashboard/upload" className="btn-primary">
            Upload your first session
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell app-shell-wide">
      <div className="page-head">
        <div>
          <div className="page-title">Your sessions</div>
          <div className="page-sub">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
            {sessions.reduce((a, s) => a + s.shot_count, 0)} shots analysed
          </div>
        </div>
        <Link href="/dashboard/upload" className="nav-cta">
          Upload a session
        </Link>
      </div>

      <div className="session-list">
        {sessions.map((s) => (
          <Link key={s.id} href={`/dashboard/sessions/${s.id}`} className="session-row">
            <div>
              <div className="session-row-name">{s.name}</div>
              <div className="session-row-meta">
                {longDate(s.session_date)} · {s.shot_count} shots
                {s.analysis ? ` · ${s.analysis.clubCount} clubs` : ""}
              </div>
            </div>
            <div className="session-row-stat">
              <div className="session-row-val">
                {s.analysis ? `${Math.round(s.analysis.goodShotRate * 100)}%` : "—"}
              </div>
              <div className="session-row-lbl">good shots</div>
            </div>
          </Link>
        ))}
      </div>

      {points.length > 0 && (
        <>
          <div className="page-head" style={{ marginTop: "3rem", marginBottom: "1rem" }}>
            <div>
              <div className="page-title" style={{ fontSize: "1.4rem" }}>
                Trends by club
              </div>
              <div className="page-sub">
                How each club has moved across every session you have uploaded.
              </div>
            </div>
          </div>
          <Trends points={points} />
        </>
      )}
    </main>
  );
}
