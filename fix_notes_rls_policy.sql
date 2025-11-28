-- Fix notes RLS policy to ensure browse page loads quickly
-- This ensures the public can read approved notes without authentication

-- Drop conflicting policies first
DROP POLICY IF EXISTS "notes_select_own_or_public" ON public.notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view public notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view shared notes" ON public.notes;

-- Create a simple, fast policy for public read of approved notes
DROP POLICY IF EXISTS "public read approved notes" ON public.notes;
CREATE POLICY "public read approved notes" ON public.notes
    FOR SELECT 
    USING (is_approved = true);

-- Allow users to read their own notes (even if not approved)
DROP POLICY IF EXISTS "users read own notes" ON public.notes;
CREATE POLICY "users read own notes" ON public.notes
    FOR SELECT 
    USING (auth.uid() = user_id OR auth.uid() = uploader_id);

-- Ensure RLS is enabled
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create index for better performance on is_approved queries
CREATE INDEX IF NOT EXISTS idx_notes_is_approved_created_at ON public.notes(is_approved, created_at DESC);

