-- Fix Notes Schema Migration Script
-- Run this in your Supabase SQL Editor to add missing columns and update existing data

-- Add missing columns to notes table if they don't exist
DO $$
BEGIN
    -- Add filename column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'filename') THEN
        ALTER TABLE public.notes ADD COLUMN filename TEXT;
    END IF;
    
    -- Add file_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'file_url') THEN
        ALTER TABLE public.notes ADD COLUMN file_url TEXT;
    END IF;
    
    -- Add subject column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'subject') THEN
        ALTER TABLE public.notes ADD COLUMN subject TEXT;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'description') THEN
        ALTER TABLE public.notes ADD COLUMN description TEXT;
    END IF;
    
    -- Add uploader_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'uploader_email') THEN
        ALTER TABLE public.notes ADD COLUMN uploader_email TEXT;
    END IF;
    
    -- Add file_size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'file_size') THEN
        ALTER TABLE public.notes ADD COLUMN file_size BIGINT;
    END IF;
    
    -- Add is_approved column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'is_approved') THEN
        ALTER TABLE public.notes ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add download_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'download_count') THEN
        ALTER TABLE public.notes ADD COLUMN download_count INT DEFAULT 0;
    END IF;
    
    -- Add thumbnail_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notes' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.notes ADD COLUMN thumbnail_url TEXT;
    END IF;
END $$;

-- Update existing notes to populate missing fields and make them approved for display
UPDATE public.notes 
SET 
    subject = COALESCE(subject, title),
    description = COALESCE(description, content),
    filename = COALESCE(filename, CONCAT(title, '.txt')),
    uploader_email = COALESCE(uploader_email, 'user@example.com'),
    is_approved = COALESCE(is_approved, true),
    file_size = COALESCE(file_size, 1024) -- Default file size if null
WHERE 
    subject IS NULL 
    OR description IS NULL 
    OR filename IS NULL 
    OR uploader_email IS NULL 
    OR is_approved IS NULL
    OR file_size IS NULL;

-- Update RLS policies to include is_approved column
DROP POLICY IF EXISTS "public read approved notes" ON public.notes;
CREATE POLICY "public read approved notes" ON public.notes
    FOR SELECT USING (is_approved = true);

-- Create index for better performance on is_approved queries
CREATE INDEX IF NOT EXISTS idx_notes_is_approved ON public.notes(is_approved);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notes' 
ORDER BY ordinal_position;
