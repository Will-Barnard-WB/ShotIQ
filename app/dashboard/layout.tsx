import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Nav showSectionLinks={false} />
        <main className="app-shell">
          <div className="empty-state">
            <div className="empty-title">Supabase is not configured yet</div>
            <div className="empty-body">
              Copy <code>.env.local.example</code> to <code>.env.local</code> and fill in{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> from your Supabase project&apos;s API
              settings, then restart the dev server. Run the SQL in{" "}
              <code>supabase/migrations/</code> and <code>supabase/seed/</code> against the project
              first.
            </div>
          </div>
        </main>
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <>
      <Nav showSectionLinks={false} />
      {children}
    </>
  );
}
