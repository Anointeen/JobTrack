# JobTrack — Production Readiness Checklist

Status as of the Phase 4 validation pass. Every **DONE** item below was actually
executed and observed, not assumed.

Legend: **DONE** · **REQUIRES MANUAL ACTION** · **RECOMMENDED BEFORE PUBLIC LAUNCH** · **FUTURE WORK**

---

## 1. Environment variables

- **DONE** — `.env` present locally, git-ignored, and untracked.
- **DONE** — Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are defined.
- **DONE** — The key's JWT `role` claim is `anon`. No `service_role` key exists
  anywhere in source, config, CI or the built bundle.
- **DONE** — A production build with either variable missing throws at startup
  rather than silently falling back to the insecure demo mode.
- **REQUIRES MANUAL ACTION** — Set both variables on the hosting platform **at
  build time**. Vite inlines `VITE_*` values into the client bundle, so setting
  them only at runtime has no effect.

## 2. Supabase configuration

- **DONE** — Project `hblwkaotuuybrdnygphv` (eu-west-1) linked and reachable.
- **DONE** — Row Level Security verified live against the running project.
- **REQUIRES MANUAL ACTION** — Decide whether this project is the production
  project or whether a separate prod project should be created. It currently
  holds one real account plus whatever test accounts remain (see §12).

## 3. Email confirmation

- **Current state: DISABLED.** Confirmed empirically — signup returns a session
  immediately.
- **RECOMMENDED BEFORE PUBLIC LAUNCH** — Enable *Authentication → Providers →
  Email → Confirm email*.
- **Before enabling, fix this UX issue:** with confirmation on, signup returns no
  session and the app throws `"Account created. Please check your email to
  confirm your address, then log in."` into the modal's **red error banner**. It
  is accurate but reads as a failure. It should become a success state.
- **RECOMMENDED** — Configure custom SMTP. The shared Supabase SMTP is rate
  limited (a Phase 1 run hit `email rate limit exceeded`) and is not intended for
  production traffic.

## 4. Password recovery

- **DONE** — `resetPasswordForEmail` is called with an explicit `redirectTo`.
- **DONE** — The app detects `PASSWORD_RECOVERY`, seeds the state from the URL
  fragment so the dashboard never flashes first, and shows a dedicated
  Set New Password screen that outranks both the auth gate and onboarding.
- **DONE** — The underlying password-change mechanism (`updateUser`) was verified
  live: the password changed, the new password logged in, the old one stopped
  working.
- **NOT TESTED (BLOCKED)** — The end-to-end emailed-link round trip. Two blockers:
  no mailbox is reachable from the test environment, and Supabase rejected the
  throwaway test domain at the reset endpoint (`Email address … is invalid`)
  even though signup accepted it.
- **REQUIRES MANUAL ACTION** — Perform one manual recovery with a real mailbox
  before launch.

## 5. Redirect URLs

- **REQUIRES MANUAL ACTION** — Add the deployed origin to *Authentication → URL
  Configuration → Redirect URLs*, and set *Site URL* to the same origin.
  The app requests `window.location.origin + window.location.pathname`, so the
  exact value to allow is your deployed origin, e.g. `https://your-domain/`.
  Without it, recovery links bounce to the project default.
- **Note** — Supabase's allow-list cannot be read via the CLI (`supabase config`
  only supports `push`), so this could not be verified programmatically.

## 6. Database migrations

- **DONE** — `0001_baseline.sql` and `0002_application_metadata.sql` are both
  applied and synchronised (`local 0001/0002 = remote 0001/0002`).
- **DONE** — Neither migration has been modified since it was introduced.
- **REQUIRES MANUAL ACTION** — Re-run `supabase db push` against any new project.

## 7. RLS verification

Verified **live**, using two throwaway accounts and the anon key only. No
`service_role` was used and no policy was weakened to make a test pass:

- **DONE** — User B cannot read A's applications, profile or status history.
- **DONE** — User B cannot update, delete or take ownership of A's application.
- **DONE** — User B cannot insert status history against A's application (42501).
- **DONE** — User A cannot reassign their own application to B (42501).
- **DONE** — User A cannot forge history against another user's application.
- **DONE** — Status history is immutable: UPDATE and DELETE both affect 0 rows.
- **DONE** — A's record was unchanged after every attempt.

## 8. Deployment configuration

- **DONE** — `public/_redirects` ships to `dist/`, covering Netlify and
  Cloudflare Pages.
- **DONE** — All nine routes plus unknown paths resolve through the SPA fallback
  in `vite preview`.
- **REQUIRES MANUAL ACTION** — Any other host needs its own rewrite rule. See
  `DEPLOYMENT.md` for Vercel, nginx, Apache, Caddy, GitHub Pages and
  S3/CloudFront.
- **REQUIRES MANUAL ACTION** — The deployment target is still undecided; no host
  has been provisioned and **nothing has been deployed**.

## 9. CI

- **DONE** — `.github/workflows/ci.yml` runs `npm ci`, `tsc --noEmit`, the test
  suite and the production build on Node 20, on push and pull request.
- **DONE** — CI requires no Supabase secrets.
- **REQUIRES MANUAL ACTION** — CI has never executed: there is no git remote.
  Push the branch to a repository to exercise it.

## 10. Browser QA

- **DONE** — Real Chrome, production build, 13 pages × 5 widths (375/430/768/
  1024/1440) × light and dark, with populated data.
- **DONE** — Zero horizontal overflow anywhere. Tag wrapping, long company names,
  the mobile drawer, modals and the scrollable table were all verified.
- **DONE** — Zero axe-core WCAG 2.1 A/AA violations across landing, dashboard,
  applications, detail, profile and settings, in both themes.
- **FUTURE WORK** — No cross-browser testing (Firefox/Safari) and no real-device
  testing were performed.

## 11. Backup and recovery

- **REQUIRES MANUAL ACTION** — Confirm the Supabase plan's backup policy. Free
  tier retention is limited and **point-in-time recovery is not included**.
- **RECOMMENDED BEFORE PUBLIC LAUNCH** — Decide a restore procedure and test it
  once. `supabase db dump` requires Docker, which was unavailable here.
- **FUTURE WORK** — No user-facing data export exists, so a user cannot retrieve
  their own data if the account is lost.

## 12. Account deletion limitations

- **DONE** — The UI states plainly that sign-in credentials are **not** removed.
- **DONE** — Deleting removes the profile, all applications, their status history
  (via cascade) and notification preferences.
- **FUTURE WORK** — Deleting the `auth.users` record needs the Admin API and
  therefore a Supabase Edge Function holding a `service_role` key server-side.
  Until then, a "deleted" user can sign in again to an empty account.
- **REQUIRES MANUAL ACTION** — Delete the throwaway QA accounts listed in the
  Phase 4 report from *Authentication → Users*.
- **RECOMMENDED BEFORE PUBLIC LAUNCH** — If operating in the EU/UK, confirm this
  deletion behaviour meets your GDPR erasure obligations.

## 13. Known limitations

- **react-router-dom advisories (moderate, production dependency).** Two open
  redirect issues. The only fix is a **major v6 → v7 upgrade**, which was not
  applied because it is not low-risk. Exploitability here is low: no route target
  is built from untrusted input. Decide before launch.
- ~3 kB of dev-only demo fixtures remain in the production bundle. They are
  unreachable (`isDemoMode` folds to `false`; guards throw) and contain no
  credentials or real data, but they are dead weight.
- No cross-browser or real-device QA.
- No error-reporting service; the error boundary logs to the console only.
- No rate limiting or abuse protection beyond Supabase defaults.
- No pagination — every application loads at once. Fine at MVP scale.
- Client-side filtering only; the metadata indexes are not yet exercised.
- Email confirmation is currently off (see §3).

## 14. Final release approval

**Not approved for public launch yet.** The application itself is in good shape:
migrations synced, RLS verified live, 213 automated tests green, zero WCAG A/AA
violations, no overflow at any tested width, and a clean production build.

Outstanding before a public launch:

1. Decide on the react-router advisory (§13).
2. Enable email confirmation and fix the signup-message UX (§3).
3. Configure custom SMTP (§3).
4. Add the deployed origin to Supabase redirect URLs (§5).
5. Choose and provision a host; add its rewrite rule (§8).
6. Verify the password-recovery round trip with a real mailbox (§4).
7. Confirm the backup/restore policy (§11).
8. Remove the throwaway QA accounts (§12).

Nothing has been deployed. No production launch has occurred.
