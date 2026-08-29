# ShotIQ

Turns Garmin Approach R10 launch monitor exports into per-club coaching insights,
and compares every session against your own history.

Next.js (App Router) · TypeScript · Supabase (Postgres + Auth + RLS)

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then:

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
**Project Settings → API Keys**, using the **publishable** key
(`sb_publishable_...`). Never the secret key — it bypasses row level security,
and anything named `NEXT_PUBLIC_` is shipped to the browser.

Run the SQL, in order, in the Supabase SQL editor:

1. `supabase/migrations/0001_init.sql` — tables, row level security, signup trigger
2. `supabase/migrations/0002_save_session.sql` — the transactional save/recompute functions
3. `supabase/seed/benchmarks.sql` — handicap benchmark reference rows

(Or `supabase db push` if you use the CLI.)

### 2. Auth settings

**Authentication → URL Configuration**: Site URL `http://localhost:3000`, and add
`http://localhost:3000/auth/callback` to Redirect URLs.

**Authentication → Email Templates → Confirm signup.** Note that Supabase gates
template editing behind custom SMTP on the free tier, so this step needs SMTP
configured first (see below). Replace the link with:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

This matters. The default template uses a PKCE `code`, which can only be
redeemed by the browser that started the signup — it stores a code-verifier
cookie. People open email links in their mail client's in-app browser, which
does not have that cookie, and confirmation fails with "PKCE code verifier not
found in storage". `{{ .TokenHash }}` carries no client-side state and works
from any browser or device.

Do the same on the **Reset password** template with `type=recovery`.

`/auth/callback` accepts both forms, so an unmodified template still works when
the link is opened in the original browser.

Email/password is the only sign-in method. To skip confirmation entirely while
developing, turn **Confirm email** off under Authentication → Sign In / Providers.
`signUp` already handles both cases: with confirmation off Supabase returns a
session immediately and the user is redirected straight in, so no code changes
are needed either way.

**Custom SMTP** is required before real users sign up — the built-in sender is
rate-limited to a handful of emails per hour, and it is what unlocks the
template editor above. Authentication → Emails → Set up SMTP; Resend works with
host `smtp.resend.com`, port `465`, username `resend`, and an API key as the
password.

### 3. Run

```bash
npm install
npm run dev
```

The marketing page renders without Supabase configured; the dashboard tells you
what is missing until you add credentials.

## Layout

| Path | What it is |
|---|---|
| `app/page.tsx` | Landing page — a port of `design/shotiq.html` |
| `app/dashboard/` | Session list + trends, upload, session analysis |
| `lib/analysis/` | The analysis engine: pure functions, no I/O |
| `lib/db/` | Supabase queries and row mappers |
| `supabase/` | Migrations and seed data |
| `design/shotiq.html` | The original design, kept as the visual reference |
| `fixtures/` | Deterministic R10 CSVs used by the tests |

### The analysis engine

`lib/analysis/` is deliberately free of I/O so it can be unit tested and
recomputed at any time from stored shots.

- `parseR10.ts` — R10 CSV → shots. Header aliases, unit conversion, and a loud
  failure (naming the column) when a required header is missing.
- `tag.ts` — auto-tags good/ok/bad *within each club*, from smash factor and
  dispersion. Manual overrides are preserved.
- `dominant.ts` — finds the swing input that best separates good shots from bad,
  ranked by Cohen's *d*. Outcome metrics are excluded, since they are what
  defines the split.
- `compare.ts` — session-over-session deltas, each with a direction and a sense.
- `insights.ts` — the rule table behind the improvements, faults and swing cues.
- `benchmarks.ts` — handicap band pills and the ball-data handicap estimate.

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm test           # analysis engine tests
npm run typecheck  # tsc --noEmit
node fixtures/generate.mjs   # regenerate test fixtures (deterministic)
```
