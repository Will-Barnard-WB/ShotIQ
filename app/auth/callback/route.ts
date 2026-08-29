import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes an email confirmation or password-reset link.
 *
 * Two flows land here, and both are supported on purpose:
 *
 *  - `token_hash` + `type`  → verifyOtp. Carries no client-side state, so it
 *    works no matter which browser or device opens the link. This is what
 *    email links should use: people click them in a mail client, which often
 *    opens its own in-app browser.
 *  - `code` → exchangeCodeForSession (PKCE). Needs the code-verifier cookie
 *    set by the browser that began the flow, so it only works in that same
 *    browser. Fine for in-app redirects, fragile for email.
 *
 * See README for the email template that produces the token_hash form.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  // Supabase reports expired or already-used links this way.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return fail(providerError);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // The verifier lives in a cookie belonging to the browser that started
      // the flow, so say that plainly instead of surfacing the raw error.
      const missingVerifier = /code verifier/i.test(error.message);
      return fail(
        missingVerifier
          ? "That link has to be opened in the same browser you signed up in. " +
            "Open it there, or log in with your email and password."
          : error.message,
      );
    }
  } else {
    return fail("That sign-in link was missing its token. Request a new one.");
  }

  // Behind a proxy the forwarded host is the real origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `https://${forwardedHost}`;

  return NextResponse.redirect(`${base}${next}`);
}
