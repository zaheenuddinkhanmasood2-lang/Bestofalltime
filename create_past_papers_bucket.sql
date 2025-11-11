-- Create past-papers bucket and policies for StudyShare
-- Run this in your Supabase SQL Editor

-- Create past-papers bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'past-papers',
    'past-papers',
    false, -- Private bucket
    52428800, -- 50MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read (typically via signed URLs)
DROP POLICY IF EXISTS "past_papers_read_public" ON storage.objects;
CREATE POLICY "past_papers_read_public" ON storage.objects
FOR SELECT USING (bucket_id = 'past-papers');

-- Allow authorized, authenticated users to upload to past-papers
DROP POLICY IF EXISTS "past_papers_upload_authorized" ON storage.objects;
CREATE POLICY "past_papers_upload_authorized" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'past-papers'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM authorized_uploaders au
        WHERE au.user_id = auth.uid() AND au.is_active = true
    )
);

-- Allow uploaders to update their own files (based on path prefix user_id/..)
DROP POLICY IF EXISTS "past_papers_update_own" ON storage.objects;
CREATE POLICY "past_papers_update_own" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'past-papers'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow uploaders to delete their own files
DROP POLICY IF EXISTS "past_papers_delete_own" ON storage.objects;
CREATE POLICY "past_papers_delete_own" ON storage.objects
FOR DELETE USING (
    bucket_id = 'past-papers'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Optional: grant base privileges
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- ========================================
-- PAST_PAPERS TABLE SCHEMA
-- ========================================

-- Create past_papers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.past_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    course_code TEXT,
    paper_code TEXT, -- Legacy field, kept for backward compatibility
    semester SMALLINT CHECK (semester >= 1 AND semester <= 8),
    paper_type TEXT CHECK (paper_type IN ('Midterm', 'Final', 'Assignment', 'Quiz')),
    exam_type TEXT, -- Legacy field, kept for backward compatibility
    year INTEGER CHECK (year >= 2000 AND year <= 2099),
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_size BIGINT,
    file_format TEXT CHECK (file_format IN ('PDF', 'PNG', 'JPG', 'JPEG')),
    thumbnail_url TEXT,
    popularity BIGINT DEFAULT 0,
    uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploader_email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to existing table (safe for tables that already exist)
ALTER TABLE IF EXISTS public.past_papers
    ADD COLUMN IF NOT EXISTS course_code TEXT,
    ADD COLUMN IF NOT EXISTS semester SMALLINT,
    ADD COLUMN IF NOT EXISTS paper_type TEXT,
    ADD COLUMN IF NOT EXISTS popularity BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS file_url TEXT,
    ADD COLUMN IF NOT EXISTS file_size BIGINT,
    ADD COLUMN IF NOT EXISTS file_format TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS uploader_id UUID,
    ADD COLUMN IF NOT EXISTS uploader_email TEXT;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Semester constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'past_papers_semester_check'
    ) THEN
        ALTER TABLE public.past_papers ADD CONSTRAINT past_papers_semester_check 
            CHECK (semester IS NULL OR (semester >= 1 AND semester <= 8));
    END IF;

    -- Paper type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'past_papers_paper_type_check'
    ) THEN
        ALTER TABLE public.past_papers ADD CONSTRAINT past_papers_paper_type_check 
            CHECK (paper_type IS NULL OR paper_type IN ('Midterm', 'Final', 'Assignment', 'Quiz'));
    END IF;

    -- Year constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'past_papers_year_check'
    ) THEN
        ALTER TABLE public.past_papers ADD CONSTRAINT past_papers_year_check 
            CHECK (year IS NULL OR (year >= 2000 AND year <= 2099));
    END IF;
END $$;

-- Performance indexes for the redesigned search
-- Partial index for active papers (most common query)
CREATE INDEX IF NOT EXISTS past_papers_is_active_idx ON public.past_papers (is_active) WHERE is_active = true;

-- Course code index (normalized for case-insensitive search)
CREATE INDEX IF NOT EXISTS past_papers_course_code_idx ON public.past_papers (upper(coalesce(course_code, paper_code)));

-- Semester index
CREATE INDEX IF NOT EXISTS past_papers_semester_idx ON public.past_papers (semester) WHERE semester IS NOT NULL;

-- Paper type index
CREATE INDEX IF NOT EXISTS past_papers_paper_type_idx ON public.past_papers (paper_type) WHERE paper_type IS NOT NULL;

-- Year index (descending for recent first)
CREATE INDEX IF NOT EXISTS past_papers_year_idx ON public.past_papers (year DESC) WHERE year IS NOT NULL;

-- Uploader index (for user's own papers)
CREATE INDEX IF NOT EXISTS past_papers_uploader_id_idx ON public.past_papers (uploader_id) WHERE uploader_id IS NOT NULL;

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS past_papers_subject_trgm_idx ON public.past_papers USING GIN (subject gin_trgm_ops);

-- Popularity and recency indexes for ranking
CREATE INDEX IF NOT EXISTS past_papers_popularity_idx ON public.past_papers (popularity DESC) WHERE popularity > 0;
CREATE INDEX IF NOT EXISTS past_papers_created_at_idx ON public.past_papers (created_at DESC);

-- Composite indexes for common query patterns (course + semester, semester + type)
CREATE INDEX IF NOT EXISTS past_papers_course_semester_idx ON public.past_papers (course_code, semester) 
    WHERE course_code IS NOT NULL AND semester IS NOT NULL;
CREATE INDEX IF NOT EXISTS past_papers_semester_type_idx ON public.past_papers (semester, paper_type) 
    WHERE semester IS NOT NULL AND paper_type IS NOT NULL;

-- Smart search function with ranking priorities
CREATE OR REPLACE FUNCTION public.search_past_papers(
    p_query TEXT,
    p_filters JSONB DEFAULT '{}'::JSONB,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    subject TEXT,
    course_code TEXT,
    semester SMALLINT,
    paper_type TEXT,
    year INTEGER,
    popularity BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    file_url TEXT,
    file_size BIGINT,
    file_format TEXT,
    thumbnail_url TEXT,
    total_count BIGINT,
    score NUMERIC
) AS $$
DECLARE
    v_limit INTEGER := GREATEST(COALESCE(p_page_size, 20), 1);
    v_offset INTEGER := GREATEST((GREATEST(COALESCE(p_page, 1), 1) - 1) * v_limit, 0);
    v_course_codes TEXT[] := ARRAY[]::TEXT[];
    v_semesters SMALLINT[] := ARRAY[]::SMALLINT[];
    v_paper_types TEXT[] := ARRAY[]::TEXT[];
    v_subject_tokens TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF p_filters ? 'course_codes' THEN
        SELECT ARRAY_AGG(upper(regexp_replace(value, '[^a-zA-Z0-9]', '', 'g')))
        INTO v_course_codes
        FROM jsonb_array_elements_text(p_filters -> 'course_codes') AS value;
    END IF;
    v_course_codes := COALESCE(v_course_codes, ARRAY[]::TEXT[]);

    IF p_filters ? 'semesters' THEN
        SELECT ARRAY_AGG(value::SMALLINT)
        INTO v_semesters
        FROM jsonb_array_elements_text(p_filters -> 'semesters') AS value;
    END IF;
    v_semesters := COALESCE(v_semesters, ARRAY[]::SMALLINT[]);

    IF p_filters ? 'paper_types' THEN
        SELECT ARRAY_AGG(initcap(value))
        INTO v_paper_types
        FROM jsonb_array_elements_text(p_filters -> 'paper_types') AS value;
    END IF;
    v_paper_types := COALESCE(v_paper_types, ARRAY[]::TEXT[]);

    IF p_filters ? 'subjects' THEN
        SELECT ARRAY_AGG(lower(value))
        INTO v_subject_tokens
        FROM jsonb_array_elements_text(p_filters -> 'subjects') AS value;
    END IF;
    v_subject_tokens := COALESCE(v_subject_tokens, ARRAY[]::TEXT[]);

    RETURN QUERY
    WITH base AS (
        SELECT
            pp.*,
            regexp_replace(upper(coalesce(pp.course_code, pp.paper_code, '')), '[^A-Z0-9]', '', 'g') AS normalized_course_code,
            lower(coalesce(pp.paper_type, pp.exam_type, '')) AS normalized_paper_type,
            lower(coalesce(pp.subject, '')) AS normalized_subject
        FROM public.past_papers pp
        WHERE pp.is_active = TRUE
          AND (
              array_length(v_course_codes, 1) IS NULL OR array_length(v_course_codes, 1) = 0
              OR normalized_course_code = ANY(v_course_codes)
              OR EXISTS (
                  SELECT 1
                  FROM unnest(v_course_codes) AS code
                  WHERE normalized_course_code LIKE code || '%'
              )
          )
          AND (
              array_length(v_semesters, 1) IS NULL OR array_length(v_semesters, 1) = 0
              OR COALESCE(pp.semester, 0)::SMALLINT = ANY(v_semesters)
          )
          AND (
              array_length(v_paper_types, 1) IS NULL OR array_length(v_paper_types, 1) = 0
              OR normalized_paper_type = ANY(
                  SELECT lower(value) FROM unnest(v_paper_types) AS value
              )
          )
          AND (
              p_query IS NULL OR btrim(p_query) = '' OR
              (
                  normalized_subject LIKE '%' || lower(p_query) || '%'
                  OR lower(coalesce(pp.file_name, '')) LIKE '%' || lower(p_query) || '%'
                  OR lower(coalesce(pp.course_code, pp.paper_code, '')) LIKE '%' || lower(p_query) || '%'
                  OR lower(coalesce(pp.paper_type, pp.exam_type, '')) LIKE '%' || lower(p_query) || '%'
              )
          )
    ),
    scored AS (
        SELECT
            b.*,
            CASE
                WHEN array_length(v_course_codes, 1) > 0 AND b.normalized_course_code = ANY(v_course_codes) THEN 1
                ELSE 0
            END AS course_exact,
            CASE
                WHEN array_length(v_course_codes, 1) > 0 AND EXISTS (
                    SELECT 1
                    FROM unnest(v_course_codes) AS code
                    WHERE b.normalized_course_code LIKE code || '%'
                ) THEN 1
                ELSE 0
            END AS course_prefix,
            CASE
                WHEN array_length(v_semesters, 1) > 0 AND COALESCE(b.semester, 0)::SMALLINT = ANY(v_semesters) THEN 1
                ELSE 0
            END AS semester_match,
            CASE
                WHEN array_length(v_paper_types, 1) > 0 AND b.normalized_paper_type = ANY(
                    SELECT lower(value) FROM unnest(v_paper_types) AS value
                ) THEN 1
                ELSE 0
            END AS paper_type_match,
            COALESCE((
                SELECT COUNT(*)
                FROM unnest(v_subject_tokens) AS token
                WHERE b.normalized_subject LIKE '%' || token || '%'
            ), 0) AS subject_score,
            LN(COALESCE(b.popularity, 0) + 1) AS popularity_score,
            EXP(
                -LN(2) * (
                    EXTRACT(
                        EPOCH FROM (now() - COALESCE(b.created_at, now()))
                    ) / (180 * 24 * 60 * 60)
                )
            ) AS recency_score
        FROM base b
    )
    SELECT
        s.id,
        s.file_name,
        s.subject,
        COALESCE(s.course_code, s.paper_code) AS course_code,
        s.semester,
        COALESCE(s.paper_type, s.exam_type) AS paper_type,
        s.year,
        s.popularity,
        s.created_at,
        s.updated_at,
        s.file_url,
        s.file_size,
        s.file_format,
        s.thumbnail_url,
        COUNT(*) OVER () AS total_count,
        (
            s.course_exact * 1000
            + s.course_prefix * 800
            + s.semester_match * 200
            + s.paper_type_match * 100
            + s.subject_score * 50
            + s.popularity_score * 10
            + s.recency_score * 5
        ) AS score
    FROM scored s
    ORDER BY
        s.course_exact DESC,
        s.course_prefix DESC,
        s.semester_match DESC,
        s.paper_type_match DESC,
        s.subject_score DESC,
        s.popularity_score DESC,
        s.recency_score DESC,
        char_length(COALESCE(s.file_name, '')) ASC,
        COALESCE(s.year, 0) DESC,
        s.created_at DESC
    OFFSET v_offset
    LIMIT v_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- TRIGGERS AND FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_past_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS past_papers_updated_at_trigger ON public.past_papers;
CREATE TRIGGER past_papers_updated_at_trigger
    BEFORE UPDATE ON public.past_papers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_past_papers_updated_at();

-- Function to increment popularity (for tracking views/downloads)
CREATE OR REPLACE FUNCTION public.increment_paper_popularity(p_paper_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.past_papers
    SET popularity = COALESCE(popularity, 0) + 1
    WHERE id = p_paper_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active papers
DROP POLICY IF EXISTS "past_papers_select_active" ON public.past_papers;
CREATE POLICY "past_papers_select_active" ON public.past_papers
    FOR SELECT
    USING (is_active = true);

-- Policy: Authenticated users can insert their own papers
DROP POLICY IF EXISTS "past_papers_insert_own" ON public.past_papers;
CREATE POLICY "past_papers_insert_own" ON public.past_papers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = uploader_id
        AND EXISTS (
            SELECT 1 FROM authorized_uploaders au
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- Policy: Uploaders can update their own papers
DROP POLICY IF EXISTS "past_papers_update_own" ON public.past_papers;
CREATE POLICY "past_papers_update_own" ON public.past_papers
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id);

-- Policy: Uploaders can delete their own papers (soft delete by setting is_active = false)
DROP POLICY IF EXISTS "past_papers_delete_own" ON public.past_papers;
CREATE POLICY "past_papers_delete_own" ON public.past_papers
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id AND is_active = false);


