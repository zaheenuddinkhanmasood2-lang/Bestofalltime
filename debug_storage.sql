-- Debug query to check file paths and storage setup
-- Run this in Supabase SQL Editor to see what's in your database

-- Check if notes exist and their file_urls
SELECT 
    id, 
    title, 
    file_url, 
    file_size,
    uploader_email,
    created_at
FROM notes 
WHERE is_approved = true 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if storage buckets exist
SELECT * FROM storage.buckets WHERE id IN ('STORAGE_BUCKET', 'thumbnails');

-- Check storage policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- Check if there are any files in the notes bucket
SELECT 
    name, 
    bucket_id, 
    metadata,
    created_at
FROM storage.objects 
WHERE bucket_id = 'STORAGE_BUCKET' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check ALL storage buckets and their files
SELECT 
    bucket_id,
    name, 
    metadata,
    created_at
FROM storage.objects 
ORDER BY bucket_id, created_at DESC 
LIMIT 10;

-- Check if the specific file exists anywhere
SELECT 
    bucket_id,
    name, 
    metadata,
    created_at
FROM storage.objects 
WHERE name LIKE '%f036399c-373c-4f08-b827-21f2d89e2285%'
   OR name LIKE '%2025-10-18T10-28-47-543Z%'
   OR name LIKE '%2025-10-18T10-28-47-5437%';

-- Get the complete filename for the file we found
SELECT 
    bucket_id,
    name, 
    metadata,
    created_at
FROM storage.objects 
WHERE bucket_id = 'STORAGE_BUCKET'
ORDER BY created_at DESC 
LIMIT 5;
