-- Fix past_papers RLS policy to ensure page loads quickly
-- This ensures the public can read active past papers without authentication

-- Drop conflicting policies first
DROP POLICY IF EXISTS "past_papers_select_active" ON public.past_papers;
DROP POLICY IF EXISTS "Public can view active past papers" ON public.past_papers;
DROP POLICY IF EXISTS "Users can view their own past papers" ON public.past_papers;

-- Create a simple, fast policy for public read of active past papers
DROP POLICY IF EXISTS "public read active past papers" ON public.past_papers;
CREATE POLICY "public read active past papers" ON public.past_papers
    FOR SELECT 
    USING (is_active = true);

-- Allow users to read their own past papers (even if not active)
DROP POLICY IF EXISTS "users read own past papers" ON public.past_papers;
CREATE POLICY "users read own past papers" ON public.past_papers
    FOR SELECT 
    USING (auth.uid() = uploader_id);

-- Ensure RLS is enabled
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;

-- Create index for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_past_papers_is_active_created_at ON public.past_papers(is_active, created_at DESC);

