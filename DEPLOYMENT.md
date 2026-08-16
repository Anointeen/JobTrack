# Deploying JobTrack

JobTrack is a static single-page app. `npm run build` emits `dist/`, which is
plain HTML, CSS and JS. There is no server component and no server-side
rendering.

This document covers four separate concerns. They are configured in different
places and are easy to confuse:

| Concern | Configured where |
| --- | --- |
| 1. Repository configuration | In this repo (already done) |
| 2. Environment variables | Your hosting provider's build settings |
| 3. Hosting-provider configuration | Your hosting provider |
| 4. Supabase configuration | Supabase Dashboard |

For the full pre-launch task list, including every manual step and its current
status, see **`PRODUCTION_CHECKLIST.md`**. That file is the single source of
truth for release readiness; this file explains only *how* to deploy.

---

## 1. Repository configuration — already done

Nothing to change here. For reference:

- `npm run build` runs `tsc` then `vite build`, so a type error fails the build.
- `public/_redirects` is copied to `dist/_redirects` automatically.
- `.github/workflows/ci.yml` runs typecheck, tests and build on push and pull
  request. It needs no Supabase secrets.
- Routes are code-split; `dist/assets/` contains the entry chunk plus one chunk
  per protected screen.

## 2. Environment variables

Set these in your host's **build** settings. Vite inlines `VITE_`-prefixed
values into the client bundle at build time, so setting them only at runtime has
no effect — the built files would still contain empty strings.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The project's **anon** / publishable key |

The anon key is public by design: it identifies the browser client, and Row
Level Security is what actually protects the data.

> **Never** set the `service_role` key, or any other server-only secret, as a
> `VITE_` variable. Vite would inline it into the public bundle and it would
> bypass RLS entirely. No other `VITE_` variables are used by this application.

A production build with either variable missing throws at startup rather than
silently falling back to the development-only demo mode. That is deliberate: a
misconfigured deployment fails loudly instead of serving insecure auth.

## 3. Hosting-provider configuration

### SPA history fallback — required

The app uses the History API. Paths such as `/dashboard`, `/applications`,
`/applications/:id`, `/profile` and `/settings` exist only in the client. A
direct visit or a refresh asks the host for that path, and unless the host is
told to serve `index.html` for unknown paths, the user gets a 404.

This is the most common way to break an otherwise working SPA deployment.

**Already configured:** `public/_redirects` ships to `dist/_redirects` and
covers **Netlify** and **Cloudflare Pages**. No further action on those hosts.

**Not configured.** The deployment target has not been chosen, so no other host
config is committed. Add whichever matches your host:

**Vercel** — `vercel.json` in the project root:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**nginx:**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Apache** — `.htaccess` in the served directory:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**Caddy:**

```
try_files {path} /index.html
```

**GitHub Pages** has no rewrite support. The usual workaround is to copy
`dist/index.html` to `dist/404.html` after building. Serving from a subpath also
requires Vite's `base` option, which is not currently configured.

**Amazon S3 + CloudFront** — set both the index and error documents to
`index.html`, and map 403/404 responses to `/index.html` with a 200 status.

### Verifying the fallback

After deploying, open `/applications` directly in a fresh tab — not by clicking
through from `/`. If it renders, the fallback works. If the host returns a 404,
it does not.

## 4. Supabase configuration

Two things are needed, and they live in different parts of the dashboard:

- **Authentication → URL Configuration** — Site URL and Redirect URLs. Without
  the deployed origin listed here, password-recovery links will not return to
  your app.
- **Authentication → Emails / SMTP** — email confirmation and custom SMTP.

Exact values and steps are in **`PRODUCTION_CHECKLIST.md` §4–§6**. They are not
duplicated here so the two documents cannot drift apart.

### Database migrations

Schema lives in `supabase/migrations/` and is applied with the Supabase CLI:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

Migrations are additive and re-runnable. `0001_baseline.sql` and
`0002_application_metadata.sql` are both applied to the currently linked
project. Run `supabase migration list --linked` to confirm local and remote
agree before deploying.
