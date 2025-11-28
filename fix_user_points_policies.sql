-- Fix RLS policies for user_points so triggers can insert/update rows

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_points_self_insert ON public.user_points;
CREATE POLICY user_points_self_insert
ON public.user_points
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_designated_admin());

DROP POLICY IF EXISTS user_points_self_update ON public.user_points;
CREATE POLICY user_points_self_update
ON public.user_points
FOR UPDATE
USING (auth.uid() = user_id OR public.is_designated_admin())
WITH CHECK (auth.uid() = user_id OR public.is_designated_admin());

