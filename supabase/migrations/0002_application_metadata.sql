-- ============================================================================
-- JobTrack — 0002_application_metadata
-- ----------------------------------------------------------------------------
-- Adds persistent application metadata to public.applications:
--
--     priority        Low / Medium / High, defaulting to Medium
--     source          where the opening was found (optional)
--     tags            free-form user labels
--     follow_up_date  when to chase this application (optional)
--     follow_up_note  what to say when chasing (optional)
--
-- 0001_baseline.sql is frozen and untouched. This migration is additive only:
-- no existing column, constraint, policy, index or row is altered or removed.
--
-- Safety for existing rows
-- ------------------------
-- Both NOT NULL columns declare a DEFAULT, so PostgreSQL 11+ backfills them
-- without rewriting the table and without a lengthy ACCESS EXCLUSIVE lock:
--   * every existing application gets priority = 'Medium'
--   * every existing application gets tags     = '{}'
-- The three nullable columns default to NULL. No other column is written, so
-- all existing data is retained exactly as-is.
--
-- Re-running is safe: columns use ADD COLUMN IF NOT EXISTS, constraints are
-- guarded against pg_constraint, and indexes use CREATE INDEX IF NOT EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COLUMNS
-- ----------------------------------------------------------------------------
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS priority       TEXT NOT NULL DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS source         TEXT,
    ADD COLUMN IF NOT EXISTS tags           TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS follow_up_date DATE,
    ADD COLUMN IF NOT EXISTS follow_up_note TEXT;

COMMENT ON COLUMN public.applications.priority IS
    'How important this application is to the user: Low, Medium or High.';
COMMENT ON COLUMN public.applications.source IS
    'Where the opening was found. NULL when unspecified.';
COMMENT ON COLUMN public.applications.tags IS
    'User-defined labels. Free-form by design — not constrained to a fixed list.';
COMMENT ON COLUMN public.applications.follow_up_date IS
    'When the user intends to follow up. Must not predate application_date.';
COMMENT ON COLUMN public.applications.follow_up_note IS
    'Free-text reminder describing the intended follow-up.';

-- ----------------------------------------------------------------------------
-- 2. CONSTRAINTS
--    ALTER TABLE ... ADD CONSTRAINT has no IF NOT EXISTS form, so each is
--    guarded by a catalogue lookup to keep the migration re-runnable.
-- ----------------------------------------------------------------------------

-- Mirrors the ApplicationPriority union in src/types/index.ts.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_priority_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_priority_check
            CHECK (priority IN ('Low', 'Medium', 'High'));
    END IF;
END $$;

-- Mirrors the ApplicationSource union in src/types/index.ts. NULL is allowed:
-- source is optional.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_source_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_source_check
            CHECK (source IS NULL OR source IN (
                'LinkedIn', 'Company Website', 'Indeed', 'Job Board',
                'Referral', 'Recruiter', 'University', 'Other'
            ));
    END IF;
END $$;

-- A follow-up scheduled before the application was sent makes no sense. This
-- mirrors applications_deadline_after_application_date_check from 0001.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_follow_up_after_application_date_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_follow_up_after_application_date_check
            CHECK (follow_up_date IS NULL OR follow_up_date >= application_date);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. INDEXES
--    Every RLS policy filters on user_id, so the btree indexes lead with it —
--    consistent with the composites added in 0001.
-- ----------------------------------------------------------------------------

-- Priority filtering and per-priority counts, scoped to the owner.
CREATE INDEX IF NOT EXISTS idx_applications_user_priority
    ON public.applications (user_id, priority);

-- Upcoming follow-ups. Partial: most applications never set one, so the index
-- stays small and only covers the rows that can match.
CREATE INDEX IF NOT EXISTS idx_applications_user_follow_up
    ON public.applications (user_id, follow_up_date)
    WHERE follow_up_date IS NOT NULL;

-- Tag containment/overlap lookups (@>, &&, = ANY). GIN cannot lead with a
-- plain btree column, so this is not user-scoped; the planner combines it with
-- the user_id restriction from RLS via a bitmap AND.
CREATE INDEX IF NOT EXISTS idx_applications_tags_gin
    ON public.applications USING GIN (tags);

-- ============================================================================
-- 4. ROW LEVEL SECURITY — deliberately unchanged
-- ----------------------------------------------------------------------------
-- No policy is created, altered or dropped by this migration, because none is
-- needed:
--
--   * PostgreSQL RLS is row-level, not column-level. The four policies from
--     0001 ("Users can view/insert/update/delete their own applications") gate
--     whole rows on (SELECT auth.uid()) = user_id, so every column added above
--     is covered by exactly the same ownership rule as company_name or notes.
--     A user still cannot see, insert, modify or delete another user's row, and
--     the UPDATE policy's WITH CHECK still prevents reassigning user_id.
--
--   * The privilege grants in 0001 are table-level with no column list
--     (GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO
--     authenticated), and column privileges are implied by the table grant, so
--     the new columns inherit it. REVOKE ALL ... FROM anon likewise still
--     covers the whole table.
--
-- Adding column-level policies or grants here would only risk weakening or
-- desynchronising a model that is already correct.
-- ============================================================================
