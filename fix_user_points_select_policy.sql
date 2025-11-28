-- Fix user_points SELECT policy to ensure browse page loads quickly
-- This ensures the public can read user_points for displaying badges/points on notes

-- Ensure the public read policy exists (allows anyone to read user_points)
DROP POLICY IF EXISTS user_points_public_read ON public.user_points;
CREATE POLICY user_points_public_read
ON public.user_points
FOR SELECT
USING (true);

-- Verify RLS is enabled
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

