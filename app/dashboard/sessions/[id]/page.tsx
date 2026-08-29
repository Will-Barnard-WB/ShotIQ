import Link from "next/link";
import { notFound } from "next/navigation";
import MetricGrid from "@/components/analysis/MetricGrid";
import CompareGrid from "@/components/analysis/CompareGrid";
import ClubCard from "@/components/analysis/ClubCard";
import TipCard from "@/components/analysis/TipCard";
import ShotTable from "@/components/analysis/ShotTable";
import { longDate } from "@/components/analysis/format";
import { deleteSession } from "@/app/dashboard/actions";
import { getSession, getSessionShotRows } from "@/lib/db/queries";

/**
 * The session analysis. This is the screen the landing page's demo section
 * mocks up, rendered from the user's own data.
 */
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const a = session.analysis;
  const shots = await getSessionShotRows(id);

  if (!a) {
    return (
      <main className="app-shell">
        <div className="empty-state">
          <div className="empty-title">{session.name}</div>
          <div className="empty-body">
            This session has no analysis stored. Re-tag any shot to rebuild it.
          </div>
        </div>
      </main>
    );
  }

  const comparisonFor = (clubName: string) =>
    a.comparisons.find((c) => c.clubName === clubName);

  return (
    <main className="app-shell">
      <div className="page-head">
        <div>
          <div className="page-title">{session.name}</div>
          <div className="page-sub">
            {longDate(a.sessionDate)} · {a.shotCount} shots · {a.clubCount} clubs analysed
            {a.previous && ` · compared with ${a.previous.name}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/dashboard" className="nav-link-auth">
            ← All sessions
          </Link>
          <form action={deleteSession}>
            <input type="hidden" name="sessionId" value={session.id} />
            <button type="submit" className="nav-link-auth" style={{ color: "var(--red)" }}>
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="analysis-wrap" style={{ maxWidth: "none", padding: 0 }}>
        <div className="section-title">Session overview</div>
        <MetricGrid a={a} />

        {a.comparisons.length > 0 && (
          <>
            <div className="section-title">
              {a.previous?.name ?? "Previous session"} vs this session, common clubs
            </div>
            <CompareGrid comparisons={a.comparisons} />
          </>
        )}

        <hr className="divider" />
        <div className="section-title">This session, club by club</div>
        {a.clubs.map((club) => (
          <ClubCard key={club.clubName} club={club} comparison={comparisonFor(club.clubName)} />
        ))}

        {a.improvements.length > 0 && (
          <>
            <hr className="divider" />
            <div className="section-title">Key improvements since last session</div>
            {a.improvements.map((t) => (
              <TipCard key={t.title} tip={t} />
            ))}
          </>
        )}

        {a.faults.length > 0 && (
          <>
            <div className="section-title">Priority faults to fix</div>
            {a.faults.map((t) => (
              <TipCard key={t.title} tip={t} />
            ))}
          </>
        )}

        <div className="section-title">
          {a.cues.length} swing cue{a.cues.length === 1 ? "" : "s"} for next session
        </div>
        {a.cues.map((t) => (
          <TipCard key={t.title} tip={t} />
        ))}

        <hr className="divider" />
        <div className="section-title">Shots</div>
        <ShotTable sessionId={session.id} shots={shots} />

        <div className="analysis-footer">
          ShotIQ · Session analysis · {longDate(a.sessionDate)}
        </div>
      </div>
    </main>
  );
}
