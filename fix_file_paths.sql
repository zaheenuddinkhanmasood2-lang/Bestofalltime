-- Fix file paths in database to match actual storage filenames
-- Run this in Supabase SQL Editor

-- First, let's see what we have in the database
SELECT 
    id, 
    title, 
    file_url, 
    filename,
    created_at
FROM notes 
WHERE is_approved = true 
ORDER BY created_at DESC 
LIMIT 5;

-- Update the file_url to match the actual storage filename
-- Replace the full UUID with the truncated version that actually exists in storage
UPDATE notes 
SET file_url = 'b84796c5-a244-463d-a600-1a8c6df3bc85/2025-10-18T10-28-47-543Z-f03639'
WHERE file_url = 'b84796c5-a244-463d-a600-1a8c6df3bc85/2025-10-18T10-28-47-543Z-f036399c-373c-4f08-b827-21f2d89e2285.pdf';

-- Check if there are other similar truncated files that need fixing
SELECT 
    id, 
    title, 
    file_url, 
    filename,
    created_at
FROM notes 
WHERE file_url LIKE '%f036399c-373c-4f08-b827-21f2d89e2285%'
   OR file_url LIKE '%2025-10-18T10-28-47-543Z%';

-- Verify the update worked
SELECT 
    id, 
    title, 
    file_url, 
    filename,
    created_at
FROM notes 
WHERE file_url = 'b84796c5-a244-463d-a600-1a8c6df3bc85/2025-10-18T10-28-47-543Z-f03639';
