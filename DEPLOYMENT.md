# Deploying JobTrack

JobTrack is a static single-page app: `npm run build` emits `dist/`, which is
plain HTML, CSS and JS. There is no server component.

## Environment variables

Set these at build time on the host. Vite inlines `VITE_`-prefixed values into
the client bundle, so they must be present when `npm run build` runs — setting
them only at runtime has no effect.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** / publishable key |

The anon key is public by design and is protected by Row Level Security.

**Never set the `service_role` key, or any other server-only secret, as a
`VITE_` variable.** It would be inlined into the public bundle and would bypass
RLS entirely. A production build with either variable missing fails fast at
startup rather than silently falling back to the development-only demo mode.

## SPA history fallback — required

The app uses `react-router-dom` with the History API. Paths such as
`/dashboard`, `/applications`, `/applications/:id`, `/profile` and `/settings`
exist only in the client. A direct visit or a page refresh asks the host for
that path, and unless the host is told to serve `index.html` for unknown paths
the user gets a 404.

This is the single most common way to break a working SPA deployment.

### Already configured

`public/_redirects` is copied to `dist/_redirects` at build time and covers:

- **Netlify**
- **Cloudflare Pages**

No further action is needed on those hosts.

### Not configured — add if you deploy elsewhere

The deployment target was not evident from the repository, so no other host
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
`dist/index.html` to `dist/404.html` after building. Note that GitHub Pages
serving from a subpath also requires Vite's `base` option to be set, which is
not currently configured.

**Amazon S3 + CloudFront** — set both the index and the error document to
`index.html`, and map 403/404 responses to `/index.html` with a 200 status.

### Verifying

After deploying, load `/applications` directly in a fresh tab (not by clicking
through from `/`). If it renders, the fallback is working; if you get a 404 from
the host, it is not.

## Supabase configuration

Two project settings are deployment-specific and are not in the repository:

1. **Auth → URL Configuration → Site URL / Redirect URLs** must include the
   deployed origin, or the password-recovery email link will not return to the
   app.
2. **Auth → Providers → Email → Confirm email** is currently disabled, which was
   done to allow automated verification. Re-enable it before real users sign up.

## Database migrations

Schema lives in `supabase/migrations/` and is applied with the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Migrations are additive and re-runnable. Both `0001_baseline.sql` and
`0002_application_metadata.sql` have been applied to the linked project.
