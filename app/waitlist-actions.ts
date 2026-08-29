"use server";

import { createClient } from "@/lib/supabase/server";

export interface WaitlistState {
  ok?: boolean;
  error?: string;
}

/**
 * Anon inserts are allowed on the waitlist table and selects are not, so a
 * duplicate email surfaces as a unique-violation rather than something we can
 * check first. Treat it as success -- they are on the list either way.
 */
export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({ email });

  if (error && error.code !== "23505") {
    return { error: "Could not save that just now. Try again in a moment." };
  }
  return { ok: true };
}
