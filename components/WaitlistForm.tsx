"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist-actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="waitlist-btn" disabled={pending}>
      {pending ? "Adding…" : "Join waitlist"}
    </button>
  );
}

export default function WaitlistForm() {
  const [state, formAction] = useActionState<WaitlistState, FormData>(joinWaitlist, {});

  return (
    <>
      {state.ok ? (
        <div className="success-msg" style={{ display: "block" }}>
          ✓ You&apos;re on the list. We&apos;ll be in touch.
        </div>
      ) : (
        <form className="waitlist-form" action={formAction}>
          <input
            className="waitlist-input"
            type="email"
            name="email"
            placeholder="your@email.com"
            aria-label="Email address"
            required
            style={state.error ? { borderColor: "rgba(248,113,113,0.5)" } : undefined}
          />
          <Submit />
        </form>
      )}
      {state.error && (
        <p className="waitlist-note" style={{ color: "#F87171" }}>
          {state.error}
        </p>
      )}
    </>
  );
}
