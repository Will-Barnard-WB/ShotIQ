/**
 * Supabase credentials are supplied by the user in .env.local (see
 * .env.local.example). Until they are, the marketing pages should still
 * render and the app pages should say plainly what is missing, rather than
 * the whole site failing to boot.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
