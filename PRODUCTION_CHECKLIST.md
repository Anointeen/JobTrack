# JobTrack — Production Readiness Checklist

State after Phase 4B (release blocker resolution). Every **DONE** item was
actually executed and observed, not assumed.

Replace every `YOUR-PRODUCTION-DOMAIN` and `YOUR-PROJECT-REF` placeholder with
real values before launch.

**Categories**

| Category | Meaning |
| --- | --- |
| **DONE** | Complete and verified. Nothing further required. |
| **REQUIRES MANUAL ACTION** | Code is ready; a human must configure something external. |
| **RELEASE DECISION** | Needs an explicit judgement call from the project owner. |
| **RECOMMENDED BEFORE PUBLIC LAUNCH** | Not strictly blocking, but should be done. |
| **FUTURE WORK** | Deliberately deferred to a later phase. |

---

## 1. Environment variables

- **DONE** — `.env` is git-ignored and untracked; no secret is committed.
- **DONE** — Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used. The
  key's JWT `role` claim is `anon`. No `service_role` appears anywhere in
  source, config, CI or the built bundle.
- **DONE** — A production build missing either variable throws at startup rather
  than silently falling back to demo mode.
- **REQUIRES MANUAL ACTION** — Set both variables in the hosting provider's
  **build** settings (not runtime — Vite inlines them at build time):

  ```
  VITE_SUPABASE_URL      = https://YOUR-PROJECT-REF.supabase.co
  VITE_SUPABASE_ANON_KEY = <the project's anon / publishable key>
  ```

## 2. Supabase project

- **DONE** — Project `hblwkaotuuybrdnygphv` (eu-west-1) linked and reachable.
- **RELEASE DECISION** — Decide whether this project *is* production, or whether
  a separate production project should be created. It currently holds one real
  account plus leftover QA auth records (§12).

## 3. Database migrations

- **DONE** — `0001_baseline.sql` and `0002_application_metadata.sql` are applied
  and synchronised (`local 0001/0002 = remote 0001/0002`).
- **DONE** — Neither migration has been modified since it was introduced.
- **REQUIRES MANUAL ACTION** — If you deploy against a different project:

  ```bash
  supabase link --project-ref YOUR-PROJECT-REF
  supabase db push
  supabase migration list --linked   # confirm local and remote agree
  ```

## 4. Supabase URL configuration

> **Dashboard → Authentication → URL Configuration**
> This section is *only* about URLs. Email/SMTP settings are in §5.

- **REQUIRES MANUAL ACTION — Site URL.** Set to your deployed origin, with no
  trailing path:

  ```
  https://YOUR-PRODUCTION-DOMAIN
  ```

- **REQUIRES MANUAL ACTION — Redirect URLs.** Add every origin the app is served
  from. The app requests `window.location.origin + window.location.pathname` as
  its recovery redirect, so the deployed origin must be listed:

  ```
  https://YOUR-PRODUCTION-DOMAIN
  https://YOUR-PRODUCTION-DOMAIN/
  ```

  Add these too if you use them:

  ```
  http://localhost:3000/          # local dev server
  https://*.YOUR-PREVIEW-HOST     # deploy previews, if your host makes them
  ```

  Without the deployed origin listed, Supabase falls back to the Site URL and
  password-recovery links will not return to the app.

- **Note** — This cannot be verified programmatically: the Supabase CLI's
  `config` command only supports `push`, not read. It must be checked by eye in
  the dashboard.

## 5. Email confirmation and SMTP

> **Dashboard → Authentication → Providers → Email** (confirmation)
> **Dashboard → Authentication → Emails → SMTP Settings** (delivery)

- **Current state: email confirmation is DISABLED.** Confirmed empirically —
  sign-up returns a session immediately.
- **DONE (code)** — The application now handles both cases correctly. Sign-up
  returns a typed outcome, and "confirmation required" renders a **success**
  screen naming the address and the next steps. It is no longer shown in the red
  error banner. Covered by 13 tests.
- **RECOMMENDED BEFORE PUBLIC LAUNCH — Enable confirmation.**
  Providers → Email → **Confirm email** → on.
  Enabling it also gives Supabase's built-in account-enumeration protection:
  a duplicate sign-up then returns a normal success shape instead of
  "User already registered".
- **RECOMMENDED BEFORE PUBLIC LAUNCH — Configure custom SMTP.**
  The shared Supabase SMTP is rate limited and not intended for production; a
  Phase 1 run hit `email rate limit exceeded`. Set SMTP host, port, username,
  password and a sender address on a domain you control.
- **REQUIRES MANUAL ACTION** — After enabling, send one real sign-up to a real
  mailbox and confirm the email arrives and the link works.

## 6. Password recovery

- **DONE (code)** — `resetPasswordForEmail` is called with an explicit
  `redirectTo`. The app detects `PASSWORD_RECOVERY`, seeds the state from the URL
  fragment so the dashboard never flashes first, and shows a dedicated Set New
  Password screen that outranks both the auth gate and onboarding. Verified in a
  real browser after the router upgrade.
- **DONE** — The underlying password-change mechanism was verified live: the
  password changed, the new password logged in, the old one stopped working.
- **REQUIRES MANUAL ACTION — Verify the round trip end to end.** Not yet done:
  no mailbox is reachable from the development environment, and Supabase
  rejected the throwaway test domain at the reset endpoint. Steps:
  1. Complete §4 (Redirect URLs) and §5 (SMTP) first.
  2. Request a reset for a real address.
  3. Open the emailed link; confirm it lands on **Set a New Password**, not the
     dashboard.
  4. Set a new password; confirm login works with the new one and fails with the
     old one.

## 7. Production sign-up behaviour

- **DONE** — Three outcomes are distinguished: active session (modal closes),
  confirmation required (success screen), genuine failure (error banner).
- **DONE** — Duplicate sign-up is answered with neutral wording that does not
  confirm whether an address is registered.
- **DONE** — Database and infrastructure detail is filtered out of every
  user-facing message; development still receives the original text.

## 8. RLS verification

Verified **live** with two throwaway accounts using the anon key only. No
`service_role` was used and no policy was weakened to make a test pass:

- **DONE** — User B cannot read A's applications, profile or status history.
- **DONE** — User B cannot update, delete or take ownership of A's application.
- **DONE** — User B cannot insert status history against A's application (42501).
- **DONE** — User A cannot reassign their own application to B (42501).
- **DONE** — User A cannot forge history against another user's application.
- **DONE** — Status history is immutable: UPDATE and DELETE affect 0 rows.
- **DONE** — RLS policies are unchanged from Phase 1/3B.

## 9. Deployment configuration

- **DONE** — `public/_redirects` is emitted to `dist/_redirects` on every build.
- **DONE** — All routes plus unknown paths resolve through the SPA fallback,
  verified against the production build in `vite preview` and in a real browser.
- **DONE** — `DEPLOYMENT.md` separates repository, environment, hosting-provider
  and Supabase configuration, and no longer duplicates the auth steps above.
- **RELEASE DECISION** — Choose a hosting provider. None has been chosen and
  **nothing has been deployed**.
- **REQUIRES MANUAL ACTION** — If the host is not Netlify or Cloudflare Pages,
  add its rewrite rule from `DEPLOYMENT.md` §3.

## 10. CI

- **DONE** — `.github/workflows/ci.yml` runs `npm ci`, `tsc --noEmit`, the test
  suite and the production build on Node 20, on push and pull request, with no
  Supabase secrets.
- **REQUIRES MANUAL ACTION** — CI has never executed: there is no git remote.
  Push the branch to a repository to exercise it.

## 11. Browser and accessibility QA

- **DONE** — Real Chrome against the production build: 13 pages × 5 widths
  (375/430/768/1024/1440) × light and dark, with populated data. Zero horizontal
  overflow anywhere.
- **DONE** — Zero axe-core WCAG 2.1 A/AA violations across landing, dashboard,
  applications, detail, profile and settings, in both themes.
- **DONE** — 20/20 routing behaviours re-verified in a real browser after the
  react-router v7 upgrade.
- **FUTURE WORK** — No Firefox/Safari or real-device testing.

## 12. Account deletion and test data

- **DONE** — The UI states plainly that sign-in credentials are **not** removed.
- **DONE** — Deleting removes the profile, all applications, their status history
  (via cascade) and notification preferences.
- **FUTURE WORK** — Deleting the `auth.users` record needs the Admin API and so a
  Supabase Edge Function holding a `service_role` key server-side. Until then a
  "deleted" user can sign in again to an empty account.
- **REQUIRES MANUAL ACTION** — Delete the leftover QA auth records from
  **Authentication → Users**. All their *data rows* were deleted; only the auth
  records remain. They match `jobtrack.qa.*@jobtrack-qa.dev`.
- **RECOMMENDED BEFORE PUBLIC LAUNCH** — If operating in the EU/UK, confirm this
  deletion behaviour satisfies your GDPR erasure obligations.

## 13. Backup and recovery

- **REQUIRES MANUAL ACTION** — Confirm the Supabase plan's backup policy. Free
  tier retention is limited and point-in-time recovery is **not** included.
- **RECOMMENDED BEFORE PUBLIC LAUNCH** — Decide a restore procedure and test it
  once. `supabase db dump` requires Docker, unavailable in this environment.
- **FUTURE WORK** — No user-facing data export, so a user cannot retrieve their
  own data if their account is lost.

## 14. Dependencies

- **DONE** — `npm audit` reports **0 vulnerabilities**.
- **DONE** — The react-router advisories (open redirect / XSS) are resolved.
  There was no patched v6 release — 6.30.4 was already the latest v6 — so the
  fix required v7.18.2. The upgrade was assessed first: the app uses only the
  core declarative API (`BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`,
  `Navigate`, `Outlet`, `useNavigate`, `useLocation`, `useParams`,
  `useSearchParams`) with no data-router APIs, so v7 required **no code
  changes**. All 230 tests and 20 browser routing checks pass.
- **DONE** — The earlier high-severity `nanoid` advisory was build-time only
  (`vite → postcss`) and is fixed.

## 15. Known limitations (non-blocking)

- ~3 kB of dev-only demo fixtures remain in the production bundle. They are
  unreachable — `import.meta.env.DEV` is folded to `false` at build time, so the
  demo gate compiles to an unconditional throw — and contain no credentials or
  real data. Deliberately not removed: not worth the architectural risk during
  release hardening.
- No cross-browser or real-device QA.
- No error-reporting service; the error boundary logs to the console only.
- No rate limiting beyond Supabase defaults.
- No pagination — every application loads at once. Fine at MVP scale.
- Client-side filtering only; the metadata indexes are not yet exercised.
- Supabase auth settings cannot be read via CLI, so §4 must be checked by eye.

## 16. Final release approval

**Code status: CODE-READY.** All code and security blockers identified in Phase 4
are resolved:

- Sign-up email-confirmation UX fixed and tested.
- All dependency advisories resolved; `npm audit` clean.
- 230 automated tests pass; TypeScript clean; production build clean.
- Zero WCAG A/AA violations; zero horizontal overflow.
- RLS verified live; migrations synced and unmodified.

**Nothing has been deployed.** Before a public launch:

1. Choose a hosting provider and add its rewrite rule if needed (§9).
2. Set the build-time environment variables (§1).
3. Set Site URL and Redirect URLs (§4).
4. Enable email confirmation and configure custom SMTP (§5).
5. Verify the password-recovery round trip with a real mailbox (§6).
6. Confirm the backup/restore policy (§13).
7. Remove the leftover QA auth records (§12).
8. Decide whether this Supabase project is production (§2).
