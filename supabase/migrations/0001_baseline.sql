-- ============================================================================
-- JobTrack — 0001_baseline
-- ----------------------------------------------------------------------------
-- Production-ready baseline for the JobTrack career management platform.
--
-- This supersedes the root-level `supabase_schema.sql`, which is retained only
-- for historical reference and MUST NOT be executed. This migration corrects
-- the structural and security defects identified in the baseline audit:
--
--   1. `profiles` had both `id` and `user_id` referencing auth.users, which
--      allowed a user to squat another user's profile primary key. Collapsed
--      to a single authoritative `id` column.
--   2. `profiles.onboarding_completed` was missing even though the client
--      reads it, which would trap every user in the onboarding modal forever.
--   3. All UPDATE policies lacked WITH CHECK, letting a user reassign a row's
--      `user_id` and push data into another user's account.
--   4. The status-history INSERT policy never verified that the referenced
--      application belonged to the caller.
--   5. No CHECK constraints — the database accepted any status or job type.
--   6. No indexes on the user_id columns every RLS policy filters by.
--   7. Profile creation depended on a client-side insert that cannot succeed
--      when email confirmation is enabled (no session exists yet).
--
-- Design notes:
--   * This is the baseline for a FRESH database. Constraints are declared
--     inline on CREATE TABLE. Any subsequent change belongs in a new numbered
--     migration, never as an edit to this file.
--   * Re-running is safe: tables/indexes use IF NOT EXISTS, policies are
--     dropped before creation, functions use CREATE OR REPLACE.
--   * Policies are scoped `TO authenticated`. Anonymous access is revoked
--     outright in addition to being denied by RLS.
--   * `auth.uid()` is wrapped as `(SELECT auth.uid())` so Postgres evaluates
--     it once per query as an InitPlan rather than once per row.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES
--    `id` IS the authenticated user's UUID. There is no second owner column,
--    so profile ownership cannot be forged or transferred.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name            TEXT NOT NULL DEFAULT '',
    professional_title   TEXT,
    location             TEXT,
    phone                TEXT,
    linkedin_url         TEXT,
    avatar_url           TEXT,
    theme_preference     TEXT NOT NULL DEFAULT 'system'
                         CHECK (theme_preference IN ('light', 'dark', 'system')),
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.profiles IS
    'User profile data. `id` is the auth.users UUID — it is the sole ownership key.';
COMMENT ON COLUMN public.profiles.onboarding_completed IS
    'FALSE until the user finishes the onboarding modal. Set server-side on signup.';

-- ----------------------------------------------------------------------------
-- 2. APPLICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name     TEXT NOT NULL CHECK (length(trim(company_name)) > 0),
    job_title        TEXT NOT NULL CHECK (length(trim(job_title)) > 0),
    location         TEXT,
    job_type         TEXT DEFAULT 'Full-time'
                     CHECK (job_type IS NULL OR job_type IN (
                         'Full-time', 'Part-time', 'Contract', 'Internship',
                         'Graduate Program', 'Temporary', 'Freelance', 'Other'
                     )),
    job_posting_url  TEXT,
    salary_min       NUMERIC CHECK (salary_min IS NULL OR salary_min >= 0),
    salary_max       NUMERIC CHECK (salary_max IS NULL OR salary_max >= 0),
    status           TEXT NOT NULL DEFAULT 'Applied'
                     CHECK (status IN (
                         'Saved', 'Applied', 'Assessment', 'Interview',
                         'Offer', 'Rejected', 'Withdrawn'
                     )),
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline         DATE,
    recruiter_name   TEXT,
    recruiter_email  TEXT,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only enforced when both bounds are supplied.
    CONSTRAINT applications_salary_range_check
        CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min),

    -- A deadline that predates the application makes no sense. NULL is allowed.
    CONSTRAINT applications_deadline_after_application_date_check
        CHECK (deadline IS NULL OR deadline >= application_date)
);

COMMENT ON TABLE public.applications IS
    'Job applications. Owned exclusively by user_id; enforced by RLS on all four verbs.';

-- ----------------------------------------------------------------------------
-- 3. APPLICATION_STATUS_HISTORY
--    Append-only audit trail. No UPDATE or DELETE policy exists, so RLS denies
--    both by default — history cannot be rewritten after the fact.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_status_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    previous_status TEXT CHECK (previous_status IS NULL OR previous_status IN (
                        'Saved', 'Applied', 'Assessment', 'Interview',
                        'Offer', 'Rejected', 'Withdrawn'
                    )),
    new_status      TEXT NOT NULL CHECK (new_status IN (
                        'Saved', 'Applied', 'Assessment', 'Interview',
                        'Offer', 'Rejected', 'Withdrawn'
                    )),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.application_status_history IS
    'Immutable append-only status transition log. No UPDATE/DELETE policies by design.';

-- ----------------------------------------------------------------------------
-- 4. NOTIFICATION_PREFERENCES
--    UNIQUE(user_id) is the conflict target the client upserts against.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    deadline_reminders  BOOLEAN NOT NULL DEFAULT TRUE,
    interview_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    follow_up_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON CONSTRAINT notification_preferences_user_id_key ON public.notification_preferences IS
    'Conflict target for the client-side upsert (onConflict: user_id). Do not drop.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences   ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES --------------------------------------------------------------
-- Ownership is `id` itself, so it can never be reassigned to another user:
-- changing `id` would violate the WITH CHECK clause.
DROP POLICY IF EXISTS "Users can view their own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = id);

-- Fallback only. The handle_new_user() trigger normally creates this row.
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- Required so account deletion can clear profile data.
CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = id);

-- ---- APPLICATIONS ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own applications"   ON public.applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete their own applications" ON public.applications;

CREATE POLICY "Users can view their own applications"
    ON public.applications FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own applications"
    ON public.applications FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- USING gates which rows may be targeted; WITH CHECK gates what they may
-- become. Without WITH CHECK a user could set user_id to another user's UUID
-- and transfer the row out of (or into) someone else's account.
CREATE POLICY "Users can update their own applications"
    ON public.applications FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own applications"
    ON public.applications FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ---- APPLICATION_STATUS_HISTORY -------------------------------------------
DROP POLICY IF EXISTS "Users can view status history of their applications"   ON public.application_status_history;
DROP POLICY IF EXISTS "Users can insert status history for their applications" ON public.application_status_history;

CREATE POLICY "Users can view status history of their applications"
    ON public.application_status_history FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Ownership of the *referenced application* is verified, not just user_id.
-- Previously a user could write history rows pointing at another user's
-- application simply by supplying their own user_id.
CREATE POLICY "Users can insert status history for their applications"
    ON public.application_status_history FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = user_id
        AND EXISTS (
            SELECT 1
            FROM public.applications AS a
            WHERE a.id = application_id
              AND a.user_id = (SELECT auth.uid())
        )
    );

-- Deliberately NO UPDATE or DELETE policy: RLS denies by default, which keeps
-- the audit trail immutable. Rows are removed only via ON DELETE CASCADE.

-- ---- NOTIFICATION_PREFERENCES ---------------------------------------------
DROP POLICY IF EXISTS "Users can view their notification preferences"   ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can delete their notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their notification preferences"
    ON public.notification_preferences FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their notification preferences"
    ON public.notification_preferences FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their notification preferences"
    ON public.notification_preferences FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Mirrors the profiles DELETE policy so account deletion can clear every table
-- the user owns, rather than leaving orphaned preference rows behind.
CREATE POLICY "Users can delete their notification preferences"
    ON public.notification_preferences FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- ---- updated_at maintenance ------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- Server-side profile bootstrap ----------------------------------------
-- Runs as the function owner (SECURITY DEFINER) so the rows are created before
-- the user ever holds a session. This removes the client's dependency on a
-- post-signup insert, which cannot succeed when email confirmation is enabled.
--
-- `search_path = ''` forces every identifier to be schema-qualified, closing
-- the search-path hijacking vector that SECURITY DEFINER functions are prone to.
--
-- Only the display name is copied from signup metadata. No password, token, or
-- other credential material is read or stored.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, onboarding_completed)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), ''),
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
    'Creates the profile and default notification preferences for a new auth user. '
    'SECURITY DEFINER with an empty search_path. Reads only the full_name metadata field.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INDEXES
-- ----------------------------------------------------------------------------
-- Every RLS policy filters on the owner column, so the owner is the leading
-- column of each composite. A composite index also serves queries on its
-- leading column, so standalone user_id indexes would be redundant storage and
-- write overhead — the access paths below cover all of them.
-- ============================================================================

-- Primary list query: .eq('user_id', ...).order('created_at', desc)
CREATE INDEX IF NOT EXISTS idx_applications_user_created
    ON public.applications (user_id, created_at DESC);

-- Status filtering and per-status dashboard counts. Also serves user_id alone.
CREATE INDEX IF NOT EXISTS idx_applications_user_status
    ON public.applications (user_id, status);

-- Sorting/filtering by when the application was submitted.
CREATE INDEX IF NOT EXISTS idx_applications_user_application_date
    ON public.applications (user_id, application_date DESC);

-- Upcoming-deadline lookups. Partial: most rows have no deadline.
CREATE INDEX IF NOT EXISTS idx_applications_user_deadline
    ON public.applications (user_id, deadline)
    WHERE deadline IS NOT NULL;

-- Timeline for a single application, newest first.
CREATE INDEX IF NOT EXISTS idx_ash_application_created
    ON public.application_status_history (application_id, created_at DESC);

-- All history for a user, newest first. Also serves user_id alone.
CREATE INDEX IF NOT EXISTS idx_ash_user_created
    ON public.application_status_history (user_id, created_at DESC);

-- notification_preferences(user_id) is already indexed by its UNIQUE
-- constraint; adding another index on the same column would be pure duplication.
-- profiles(id) is covered by the primary key.

-- ============================================================================
-- PRIVILEGES
-- ----------------------------------------------------------------------------
-- RLS already denies anonymous access (auth.uid() is NULL for `anon`, so every
-- policy evaluates false). Revoking table privileges outright is defence in
-- depth: JobTrack has no public-facing data.
-- ============================================================================
REVOKE ALL ON public.profiles                   FROM anon;
REVOKE ALL ON public.applications               FROM anon;
REVOKE ALL ON public.application_status_history FROM anon;
REVOKE ALL ON public.notification_preferences   FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles                   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications               TO authenticated;
GRANT SELECT, INSERT                 ON public.application_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences   TO authenticated;
