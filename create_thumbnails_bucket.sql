-- Create thumbnails bucket and policies for StudyShare
-- Run this in your Supabase SQL Editor

-- Create thumbnails bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'thumbnails',
    'thumbnails',
    false, -- Private bucket
    2097152, -- 2MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects for thumbnails bucket
CREATE POLICY "Allow authenticated users to upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Allow users to update their own thumbnails" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow users to delete their own thumbnails" ON storage.objects
FOR DELETE USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
