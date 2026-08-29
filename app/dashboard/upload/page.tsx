import CsvUploader from "@/components/upload/CsvUploader";
import { getBenchmarks, listSessions } from "@/lib/db/queries";

export default async function UploadPage() {
  const [sessions, benchmarks] = await Promise.all([listSessions(), getBenchmarks()]);
  const suggestedName = `Session ${sessions.length + 1}`;

  return (
    <main className="app-shell">
      <div className="page-head">
        <div>
          <div className="page-title">Upload a session</div>
          <div className="page-sub">
            Export a CSV from the Garmin Golf app after any practice session and drop it in.
          </div>
        </div>
      </div>
      <CsvUploader suggestedName={suggestedName} benchmarks={benchmarks} />
    </main>
  );
}
