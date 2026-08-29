"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary btn-block" disabled={pending}>
      {pending ? "One moment…" : label}
    </button>
  );
}

export default function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "login" | "signup";
  next: string;
  initialError?: string;
}) {
  const isLogin = mode === "login";
  const [state, formAction] = useActionState<AuthState, FormData>(
    isLogin ? signIn : signUp,
    { error: initialError },
  );

  return (
    <div className="auth-box">
      <h1 className="auth-title">{isLogin ? "Log in to ShotIQ" : "Create your account"}</h1>
      <p className="auth-sub">
        {isLogin
          ? "Pick up where your last session left off."
          : "Upload your first session and see what your data has been telling you."}
      </p>

      {state.error && <div className="form-error">{state.error}</div>}
      {state.notice && <div className="form-note">{state.notice}</div>}

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="field-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="your@email.com"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="field-input"
            type="password"
            name="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
            minLength={isLogin ? undefined : 8}
            required
          />
        </label>
        <SubmitButton label={isLogin ? "Log in" : "Create account"} />
      </form>

      <p className="auth-alt">
        {isLogin ? (
          <>
            No account yet? <Link href="/signup">Sign up</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        )}
      </p>
    </div>
  );
}
