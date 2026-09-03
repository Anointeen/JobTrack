-- ============================================================================
-- JobTrack — 0004_calendar_events
-- ----------------------------------------------------------------------------
-- Adds public.calendar_events, backing the Interview & Deadline Calendar that
-- replaces the /calendar placeholder.
--
-- An event may stand alone (a recruiter call not yet tied to anything) or hang
-- off an application, so application_id is nullable. When it is set, the event
-- must belong to the same user as the application — enforced structurally by
-- the composite foreign key in section 2, not by trust.
--
-- Migrations 0001, 0002 and 0003 are frozen and untouched. This migration only
-- adds a new table; no existing column, policy, index, trigger or row is
-- altered or removed.
--
-- Re-running is safe: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- constraints guarded against pg_constraint, and DROP POLICY IF EXISTS before
-- each CREATE POLICY — the same shape as 0001.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id          UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL CHECK (length(trim(title)) > 0),
    event_type              TEXT NOT NULL DEFAULT 'other'
                            CHECK (event_type IN (
                                'phone_screen', 'technical_interview', 'onsite',
                                'application_deadline', 'follow_up',
                                'offer_deadline', 'other'
                            )),
    event_date              TIMESTAMPTZ NOT NULL,
    notes                   TEXT,
    reminder_minutes_before INTEGER DEFAULT 60
                            CHECK (reminder_minutes_before IS NULL
                                   OR reminder_minutes_before >= 0),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.calendar_events.application_id IS
    'The application this event concerns, or NULL for a standalone event. ON DELETE CASCADE: an event about a deleted application is meaningless.';
COMMENT ON COLUMN public.calendar_events.event_date IS
    'When the event happens. TIMESTAMPTZ rather than DATE: an interview has a time, and users travel between timezones.';
COMMENT ON COLUMN public.calendar_events.reminder_minutes_before IS
    'Minutes before event_date to surface a reminder. NULL disables the reminder for this event; 0 means remind exactly at the start.';

-- ----------------------------------------------------------------------------
-- 2. OWNERSHIP INTEGRITY
--    application_id on its own would let a user attach their event to an
--    application belonging to someone else, if they ever learned its id. RLS on
--    calendar_events would not catch it: the event's own user_id would still be
--    their own. Closing it structurally instead — the composite foreign key
--    below requires the referenced application to carry the same user_id as the
--    event, so a mismatched pair simply has nothing to reference.
--
--    The UNIQUE constraint is only what makes (id, user_id) referenceable. It
--    adds no new restriction to applications: id is already unique on its own
--    via the primary key, so any pair containing it is unique too.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'applications_id_user_id_key'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_id_user_id_key UNIQUE (id, user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'calendar_events_application_owner_fkey'
          AND conrelid = 'public.calendar_events'::regclass
    ) THEN
        ALTER TABLE public.calendar_events
            ADD CONSTRAINT calendar_events_application_owner_fkey
            FOREIGN KEY (application_id, user_id)
            REFERENCES public.applications (id, user_id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. INDEXES
--    Every policy filters on user_id, so each index leads with it — consistent
--    with the composites in 0001 and 0002.
-- ----------------------------------------------------------------------------

-- The calendar's own query: one user's events over a date range, in time order.
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date
    ON public.calendar_events (user_id, event_date);

-- "Events for this application". Partial: standalone events never match, so
-- they stay out of the index entirely.
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_application
    ON public.calendar_events (user_id, application_id)
    WHERE application_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
--    The same four-policy shape as public.applications in 0001. USING gates
--    which rows may be targeted; WITH CHECK gates what they may become —
--    without it a user could set user_id to another account's UUID and hand
--    the row over.
-- ----------------------------------------------------------------------------
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calendar events"   ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;

CREATE POLICY "Users can view their own calendar events"
    ON public.calendar_events FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own calendar events"
    ON public.calendar_events FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own calendar events"
    ON public.calendar_events FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own calendar events"
    ON public.calendar_events FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 5. TRIGGER
--    Reuses public.set_updated_at() from 0001 rather than defining a second
--    copy of the same one-line function.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. PRIVILEGES
--    Mirrors 0001. RLS already denies anonymous access because auth.uid() is
--    NULL for `anon`, so every policy evaluates false; revoking outright is
--    defence in depth.
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.calendar_events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
