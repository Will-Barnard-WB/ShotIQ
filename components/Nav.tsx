import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut } from "@/app/auth/actions";

/**
 * The site nav. Identical to the original design except the top right, which
 * is Log in / Sign up when signed out and Dashboard / Sign out when signed in.
 */
export default async function Nav({ showSectionLinks = true }: { showSectionLinks?: boolean }) {
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    user = (await supabase.auth.getUser()).data.user;
  }

  return (
    <nav>
      <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
        Shot<span>IQ</span>
      </Link>

      {showSectionLinks ? (
        <div className="nav-links">
          <a href="/#how">How it works</a>
          <a href="/#demo">Demo</a>
          <a href="/#vision">Vision</a>
        </div>
      ) : (
        <div className="nav-links">
          <Link href="/dashboard">Sessions</Link>
          <Link href="/dashboard/upload">Upload</Link>
        </div>
      )}

      <div className="nav-auth">
        {user ? (
          <>
            <Link href="/dashboard" className="nav-link-auth">
              Dashboard
            </Link>
            <form action={signOut}>
              <button type="submit" className="nav-link-auth">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link-auth">
              Log in
            </Link>
            <Link href="/signup" className="nav-cta">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
