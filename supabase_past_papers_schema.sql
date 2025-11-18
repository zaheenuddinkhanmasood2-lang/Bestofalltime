-- Past Papers Table Schema for SharedStudy
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create past_papers table
CREATE TABLE IF NOT EXISTS past_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL,
    year INTEGER NOT NULL,
    paper_code TEXT,
    exam_type TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Ensure new columns exist even if table already created previously
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'past_papers' 
          AND column_name = 'uploader_id'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN uploader_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'past_papers' 
          AND column_name = 'uploader_email'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN uploader_email TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'past_papers' 
          AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN thumbnail_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'past_papers' 
          AND column_name = 'download_count'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN download_count INT DEFAULT 0;
    END IF;
END
$$;

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at on row updates
DROP TRIGGER IF EXISTS update_past_papers_updated_at ON past_papers;
CREATE TRIGGER update_past_papers_updated_at
    BEFORE UPDATE ON past_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_past_papers_subject ON past_papers(subject);
CREATE INDEX IF NOT EXISTS idx_past_papers_year ON past_papers(year);
CREATE INDEX IF NOT EXISTS idx_past_papers_paper_code ON past_papers(paper_code);
CREATE INDEX IF NOT EXISTS idx_past_papers_exam_type ON past_papers(exam_type);
CREATE INDEX IF NOT EXISTS idx_past_papers_is_active ON past_papers(is_active);
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_year ON past_papers(subject, year);
CREATE INDEX IF NOT EXISTS idx_past_papers_created_at ON past_papers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_past_papers_uploader_id ON past_papers(uploader_id);

-- Enable Row Level Security (RLS)
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can read active papers)
DROP POLICY IF EXISTS "Public can view active past papers" ON past_papers;
CREATE POLICY "Public can view active past papers"
    ON past_papers
    FOR SELECT
    USING (is_active = true);

-- Notes-like policies for ownership and CRUD
-- Users can view their own past papers (even if not active)
DROP POLICY IF EXISTS "Users can view their own past papers" ON past_papers;
CREATE POLICY "Users can view their own past papers"
    ON past_papers
    FOR SELECT
    TO authenticated
    USING (uploader_id = auth.uid());

-- Users can insert their own past papers
DROP POLICY IF EXISTS "Users can insert their own past papers" ON past_papers;
CREATE POLICY "Users can insert their own past papers"
    ON past_papers
    FOR INSERT
    TO authenticated
    WITH CHECK (uploader_id = auth.uid());

-- Users can update their own past papers
DROP POLICY IF EXISTS "Users can update their own past papers" ON past_papers;
CREATE POLICY "Users can update their own past papers"
    ON past_papers
    FOR UPDATE
    TO authenticated
    USING (uploader_id = auth.uid())
    WITH CHECK (uploader_id = auth.uid());

-- Users can delete their own past papers
DROP POLICY IF EXISTS "Users can delete their own past papers" ON past_papers;
CREATE POLICY "Users can delete their own past papers"
    ON past_papers
    FOR DELETE
    TO authenticated
    USING (uploader_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE past_papers IS 'Stores past exam papers with metadata';
COMMENT ON COLUMN past_papers.subject IS 'Subject name (e.g., Mathematics, Physics)';
COMMENT ON COLUMN past_papers.year IS 'Year of the exam paper';
COMMENT ON COLUMN past_papers.paper_code IS 'Paper code identifier (e.g., 9709, 0580)';
COMMENT ON COLUMN past_papers.exam_type IS 'Type of exam (e.g., Past Paper, Mock Exam, Practice Test)';
COMMENT ON COLUMN past_papers.file_url IS 'URL to the PDF file (Supabase Storage or external)';
COMMENT ON COLUMN past_papers.file_name IS 'Original filename of the PDF';
COMMENT ON COLUMN past_papers.file_size IS 'File size in bytes';
COMMENT ON COLUMN past_papers.uploader_id IS 'User who uploaded the paper';
COMMENT ON COLUMN past_papers.uploader_email IS 'Uploader email for reference';
COMMENT ON COLUMN past_papers.thumbnail_url IS 'Optional thumbnail image path/url';
COMMENT ON COLUMN past_papers.download_count IS 'Number of times downloaded or opened';
COMMENT ON COLUMN past_papers.is_active IS 'Whether the paper is active and visible to users';




