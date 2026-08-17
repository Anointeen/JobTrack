-- ============================================================================
-- JobTrack — 0003_salary_currency_period
-- ----------------------------------------------------------------------------
-- Adds an explicit, currency-aware salary figure to public.applications:
--
--     salary_amount    the figure itself
--     salary_currency  ISO 4217 code (USD, NGN, GBP, EUR, CAD, AUD, …)
--     salary_period    'year' or 'month'
--
-- Why this replaces the old shape
-- ------------------------------
-- 0001 stored salary as an unlabelled `salary_min`/`salary_max` pair. Nothing
-- recorded a currency or a period, and the form hard-coded "$/yr", so a Nigerian
-- monthly salary could only be entered by lying about both. Currency and period
-- are now stored rather than assumed.
--
-- 0001_baseline.sql and 0002_application_metadata.sql are frozen and untouched.
-- This migration is additive only.
--
-- Safety for existing rows
-- ------------------------
-- All three columns are nullable with no DEFAULT, so PostgreSQL adds them as a
-- catalogue-only change: no table rewrite, no lock held for the length of a
-- scan. **No UPDATE is issued and no existing value is read, changed or
-- cleared.** Every existing row keeps its `salary_min` / `salary_max` exactly as
-- it is and simply gains three NULLs.
--
-- `salary_min` and `salary_max` are deliberately NOT dropped:
--
--   * dropping them would destroy data this migration has no mandate to destroy;
--   * they remain the only record of any salary *range* that predates this
--     change, and a range cannot be represented in the new single-amount shape;
--   * keeping them makes this migration reversible without data loss.
--
-- The application therefore reads both shapes: it prefers `salary_amount` when
-- present and falls back to rendering the legacy pair unchanged when it is not.
-- A row is only converted from the old shape to the new one when the user
-- themselves saves that application (see src/lib/salary.ts).
--
-- Re-running is safe: ADD COLUMN IF NOT EXISTS, and each constraint is guarded
-- against pg_constraint.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COLUMNS
-- ----------------------------------------------------------------------------
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS salary_amount   NUMERIC,
    ADD COLUMN IF NOT EXISTS salary_currency TEXT,
    ADD COLUMN IF NOT EXISTS salary_period   TEXT;

COMMENT ON COLUMN public.applications.salary_amount IS
    'The salary figure, in the currency named by salary_currency. NULL when the '
    'user did not record a salary — salary is optional.';
COMMENT ON COLUMN public.applications.salary_currency IS
    'ISO 4217 alphabetic code, e.g. USD, NGN, GBP, EUR, CAD, AUD. XXX is the '
    'ISO code for "no currency specified" and backs the UI''s Other option. '
    'Deliberately shape-checked rather than restricted to a fixed list, so the '
    'application can offer more currencies without another migration.';
COMMENT ON COLUMN public.applications.salary_period IS
    'How often the amount is paid: year or month.';

COMMENT ON COLUMN public.applications.salary_min IS
    'DEPRECATED, retained for existing data only. Superseded by salary_amount / '
    'salary_currency / salary_period in migration 0003. Never written by the '
    'current application.';
COMMENT ON COLUMN public.applications.salary_max IS
    'DEPRECATED, retained for existing data only. Superseded by salary_amount / '
    'salary_currency / salary_period in migration 0003. Never written by the '
    'current application.';

-- ----------------------------------------------------------------------------
-- 2. CONSTRAINTS
--    ALTER TABLE ... ADD CONSTRAINT has no IF NOT EXISTS form, so each is
--    guarded by a catalogue lookup to keep the migration re-runnable.
--
--    Every one of these tolerates NULL, so they cannot fail against existing
--    rows: an existing row has NULL in all three new columns and therefore
--    satisfies all four checks trivially.
-- ----------------------------------------------------------------------------

-- Mirrors applications_salary_min_check / _max_check from 0001. A negative
-- salary is not a salary.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_salary_amount_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_salary_amount_check
            CHECK (salary_amount IS NULL OR salary_amount >= 0);
    END IF;
END $$;

-- Shape, not membership: three uppercase letters. This accepts every ISO 4217
-- alphabetic code, so offering another currency in the UI is a one-line change
-- in src/types/index.ts rather than a schema migration.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_salary_currency_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_salary_currency_check
            CHECK (salary_currency IS NULL OR salary_currency ~ '^[A-Z]{3}$');
    END IF;
END $$;

-- Mirrors the SalaryPeriod union in src/types/index.ts.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_salary_period_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_salary_period_check
            CHECK (salary_period IS NULL OR salary_period IN ('year', 'month'));
    END IF;
END $$;

-- An amount without a currency or without a period is not interpretable, and
-- silently assuming USD per year is exactly the bug this migration exists to
-- fix. The converse is allowed: currency and period may be set with no amount,
-- which is simply a user who picked a currency and then cleared the figure.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_salary_amount_is_labelled_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_salary_amount_is_labelled_check
            CHECK (
                salary_amount IS NULL
                OR (salary_currency IS NOT NULL AND salary_period IS NOT NULL)
            );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. INDEXES — none
-- ----------------------------------------------------------------------------
-- No index is added. Nothing filters, sorts or aggregates on salary: the
-- application deliberately does not compare salaries, because comparing figures
-- in different currencies without an exchange rate would produce a confidently
-- wrong ordering. An index here would earn nothing and cost write throughput on
-- every insert and update.

-- ============================================================================
-- 4. ROW LEVEL SECURITY — deliberately unchanged
-- ----------------------------------------------------------------------------
-- No policy is created, altered or dropped, for the same reason as in 0002:
-- PostgreSQL RLS is row-level, not column-level. The four policies from 0001
-- gate whole rows on (SELECT auth.uid()) = user_id, so the three columns added
-- above are covered by exactly the same ownership rule as company_name. The
-- table-level grants in 0001 carry no column list, so the new columns inherit
-- them, and REVOKE ALL ... FROM anon still covers the whole table.
--
-- Touching RLS here could only weaken a model that is already correct.
-- ============================================================================
