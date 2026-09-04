-- ============================================================================
-- JobTrack — 0005_documents
-- ----------------------------------------------------------------------------
-- Adds the Resumes & Cover Letters Hub that replaces the /documents
-- placeholder:
--
--     public.documents              a resume, cover letter or portfolio link
--     public.application_documents  which documents are attached to which
--                                   application
--     storage bucket career-documents  the files themselves, private
--
-- Migrations 0001-0004 are frozen and untouched. This migration only adds new
-- objects; no existing column, policy, index, trigger or row is altered.
--
-- Re-running is safe: CREATE TABLE / INDEX IF NOT EXISTS, constraints guarded
-- against pg_constraint, DROP POLICY IF EXISTS before each CREATE POLICY, and
-- the bucket insert is ON CONFLICT DO NOTHING.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DOCUMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL CHECK (length(trim(name)) > 0),
    doc_type      TEXT NOT NULL DEFAULT 'resume'
                  CHECK (doc_type IN ('resume', 'cover_letter', 'portfolio_link')),
    -- Path inside the career-documents bucket. NULL for a portfolio_link,
    -- which has no file.
    storage_path  TEXT,
    -- Used only by portfolio_link.
    external_url  TEXT,
    is_default    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.documents.storage_path IS
    'Path inside the private career-documents bucket, always {user_id}/{uuid}.{ext}. NULL for a portfolio_link.';
COMMENT ON COLUMN public.documents.external_url IS
    'The link itself, for doc_type = portfolio_link. NULL for uploaded files.';
COMMENT ON COLUMN public.documents.is_default IS
    'Offered automatically when creating an application. At most one per doc_type per user — see idx_documents_one_default_per_type.';

-- A row must carry exactly the payload its type implies. Without this a
-- portfolio_link could be stored with no URL, or a resume with no file, and
-- every consumer would need to re-check what the type already promised.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'documents_payload_matches_type_check'
          AND conrelid = 'public.documents'::regclass
    ) THEN
        ALTER TABLE public.documents
            ADD CONSTRAINT documents_payload_matches_type_check
            CHECK (
                (doc_type = 'portfolio_link'
                     AND external_url IS NOT NULL
                     AND length(trim(external_url)) > 0
                     AND storage_path IS NULL)
                OR
                (doc_type IN ('resume', 'cover_letter')
                     AND storage_path IS NOT NULL
                     AND length(trim(storage_path)) > 0
                     AND external_url IS NULL)
            );
    END IF;
END $$;

-- Needed so application_documents can reference (id, user_id) as a composite
-- foreign key. No new restriction: id is already unique via the primary key.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'documents_id_user_id_key'
          AND conrelid = 'public.documents'::regclass
    ) THEN
        ALTER TABLE public.documents
            ADD CONSTRAINT documents_id_user_id_key UNIQUE (id, user_id);
    END IF;
END $$;

-- The user's own library, newest first — the /documents screen's only query.
CREATE INDEX IF NOT EXISTS idx_documents_user_created
    ON public.documents (user_id, created_at DESC);

-- "Default resume", "default cover letter". Partial and UNIQUE, so the
-- database itself guarantees at most one default per type per user rather than
-- trusting the client to clear the previous one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_one_default_per_type
    ON public.documents (user_id, doc_type)
    WHERE is_default;

-- ----------------------------------------------------------------------------
-- 2. APPLICATION_DOCUMENTS
-- ----------------------------------------------------------------------------
-- `user_id` is carried on the join row itself. That is a deliberate addition
-- to the obvious three-column shape, and it is what makes the ownership
-- guarantee structural rather than a matter of trust.
--
-- Without it, the only available RLS rule is "the application is mine", via a
-- subquery. A user could then attach *someone else's* document id to their own
-- application: the policy passes, because the application really is theirs,
-- and nothing anywhere checks the document's owner. RLS on the join table
-- alone is not sufficient — the same conclusion the calendar_events composite
-- key reached from the other direction.
--
-- With user_id present, two composite foreign keys close it: the application
-- must belong to this user_id, and so must the document. A cross-owner pair
-- has nothing to reference and cannot be inserted at all, whatever RLS says.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_documents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL,
    document_id    UUID NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.application_documents.user_id IS
    'Owner of both sides of the link. Present so the composite foreign keys below can prove the application and the document belong to the same person.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'application_documents_application_owner_fkey'
          AND conrelid = 'public.application_documents'::regclass
    ) THEN
        ALTER TABLE public.application_documents
            ADD CONSTRAINT application_documents_application_owner_fkey
            FOREIGN KEY (application_id, user_id)
            REFERENCES public.applications (id, user_id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'application_documents_document_owner_fkey'
          AND conrelid = 'public.application_documents'::regclass
    ) THEN
        ALTER TABLE public.application_documents
            ADD CONSTRAINT application_documents_document_owner_fkey
            FOREIGN KEY (document_id, user_id)
            REFERENCES public.documents (id, user_id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- Attaching the same document twice says nothing new and would render twice.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'application_documents_unique_pair'
          AND conrelid = 'public.application_documents'::regclass
    ) THEN
        ALTER TABLE public.application_documents
            ADD CONSTRAINT application_documents_unique_pair
            UNIQUE (application_id, document_id);
    END IF;
END $$;

-- "Which documents are on this application" — the detail view's query.
CREATE INDEX IF NOT EXISTS idx_application_documents_user_application
    ON public.application_documents (user_id, application_id);

-- "Which applications use this document" — needed when deleting a document,
-- and to warn before removing one that is in use.
CREATE INDEX IF NOT EXISTS idx_application_documents_user_document
    ON public.application_documents (user_id, document_id);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    The same four-policy shape as applications and calendar_events. USING
--    gates which rows may be targeted; WITH CHECK gates what they may become,
--    without which a user could hand a row to another account by rewriting
--    user_id.
-- ----------------------------------------------------------------------------
ALTER TABLE public.documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own documents"   ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents"
    ON public.documents FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own documents"
    ON public.documents FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own documents"
    ON public.documents FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own documents"
    ON public.documents FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own application documents"   ON public.application_documents;
DROP POLICY IF EXISTS "Users can insert their own application documents" ON public.application_documents;
DROP POLICY IF EXISTS "Users can delete their own application documents" ON public.application_documents;

-- No UPDATE policy: a link has no mutable content. Changing one would mean
-- repointing it, which is a delete and an insert, each checked on its own.
CREATE POLICY "Users can view their own application documents"
    ON public.application_documents FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own application documents"
    ON public.application_documents FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own application documents"
    ON public.application_documents FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 4. STORAGE BUCKET
--    Private. A public bucket would serve every uploaded CV to anyone holding
--    the URL, with no authentication at all — resumes carry addresses and
--    phone numbers, so the files are read through short-lived signed URLs
--    instead (see createSignedUrl in src/lib/dataService.ts).
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('career-documents', 'career-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. STORAGE POLICIES
--    storage.objects is a normal table with RLS, so ownership is expressed the
--    same way as everywhere else in this schema. The owning user is the first
--    path segment: storage.foldername('<uuid>/cv.pdf') returns {<uuid>,cv.pdf},
--    so element 1 is the folder. Comparing it to auth.uid()::text confines
--    every user to their own prefix.
--
--    `bucket_id` is checked in every policy: without it these would apply to
--    objects in other buckets too.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read their own career documents"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own career documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own career documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own career documents" ON storage.objects;

CREATE POLICY "Users can read their own career documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'career-documents'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

CREATE POLICY "Users can upload their own career documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'career-documents'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Overwriting a file in place is how a re-upload under the same path lands.
CREATE POLICY "Users can update their own career documents"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'career-documents'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
    WITH CHECK (
        bucket_id = 'career-documents'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

CREATE POLICY "Users can delete their own career documents"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'career-documents'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- ----------------------------------------------------------------------------
-- 6. PRIVILEGES
--    Mirrors 0001 and 0004. RLS already denies anonymous access because
--    auth.uid() is NULL for `anon`, so every policy evaluates false; revoking
--    outright is defence in depth.
--
--    application_documents gets no UPDATE grant, matching the absent UPDATE
--    policy above.
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.documents             FROM anon;
REVOKE ALL ON public.application_documents FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents             TO authenticated;
GRANT SELECT, INSERT,         DELETE ON public.application_documents TO authenticated;
