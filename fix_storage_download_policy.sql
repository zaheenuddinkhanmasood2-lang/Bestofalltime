-- Fix: Add missing SELECT policy for file downloads in STORAGE_BUCKET
-- This policy allows authenticated users to read/download actual file content
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/dbpmgzgeevgotfxsldjh/sql

-- Drop existing policy if it exists (in case we're updating)
DROP POLICY IF EXISTS "Allow authenticated users to download files from STORAGE_BUCKET" ON storage.objects;

-- Create the SELECT policy for file content downloads
-- This policy allows authenticated users to read/download files from STORAGE_BUCKET
CREATE POLICY "Allow authenticated users to download files from STORAGE_BUCKET" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'STORAGE_BUCKET' 
  AND auth.role() = 'authenticated'
);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname = 'Allow authenticated users to download files from STORAGE_BUCKET';

-- Note: This policy is required for createSignedUrl() to work properly
-- The existing "uploaders select metadata" policy only allows reading metadata,
-- not the actual file content needed for downloads

