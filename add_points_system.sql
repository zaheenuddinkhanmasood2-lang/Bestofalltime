-- SharedStudy Gamification & Points System
-- This migration introduces the points ledger, badge levels, tipping, download tracking,
-- and supporting audit infrastructure.

-- Badge definitions (ordered by min_points ascending)
CREATE TABLE IF NOT EXISTS public.badge_levels (
    id TEXT PRIMARY KEY,
    min_points INT NOT NULL CHECK (min_points >= 0),
    display_name TEXT NOT NULL,
    color TEXT DEFAULT '#a855f7',
    icon TEXT DEFAULT 'fa-medal'
);

INSERT INTO public.badge_levels (id, min_points, display_name, color, icon) VALUES
    ('bronze', 0, 'Bronze', '#cd7f32', 'fa-medal'),
    ('silver', 500, 'Silver', '#c0c0c0', 'fa-medal'),
    ('gold', 1500, 'Gold', '#facc15', 'fa-trophy'),
    ('legendary', 4000, 'Legendary', '#f97316', 'fa-crown')
ON CONFLICT (id) DO UPDATE
SET min_points = EXCLUDED.min_points,
    display_name = EXCLUDED.display_name,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- Aggregated user points + daily counters
CREATE TABLE IF NOT EXISTS public.user_points (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points INT NOT NULL DEFAULT 0,
    upload_points INT NOT NULL DEFAULT 0,
    download_points INT NOT NULL DEFAULT 0,
    tip_points INT NOT NULL DEFAULT 0,
    badge TEXT NOT NULL DEFAULT 'bronze',
    daily_download_tip_points INT NOT NULL DEFAULT 0,
    daily_counter_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_tip_given_points INT NOT NULL DEFAULT 0,
    tip_counter_date DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.points_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    actor_id UUID REFERENCES public.profiles(id),
    note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
    points INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.note_download_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    downloader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tip_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tipper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INT NOT NULL CHECK (points IN (5, 10)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tipper_id, note_id)
);

-- Utility function to detect the single admin account via email claim
CREATE OR REPLACE FUNCTION public.is_designated_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN auth.jwt()->>'email' = 'nazimuddinkhanmasood@gmail.com';
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_points_record(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF target_user IS NULL THEN
        RETURN;
    END IF;
    INSERT INTO public.user_points (user_id)
    VALUES (target_user)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_download_tip_counter(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.user_points
    SET daily_download_tip_points = 0,
        daily_counter_date = CURRENT_DATE
    WHERE user_id = target_user
      AND daily_counter_date <> CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_tip_given_counter(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.user_points
    SET daily_tip_given_points = 0,
        tip_counter_date = CURRENT_DATE
    WHERE user_id = target_user
      AND tip_counter_date <> CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_event(
    event_type TEXT,
    target_user UUID,
    actor UUID,
    note UUID,
    pts INT,
    meta JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.points_audit_log (event_type, user_id, actor_id, note_id, points, metadata)
    VALUES (event_type, target_user, actor, note, pts, COALESCE(meta, '{}'::JSONB));
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_user_badge(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    total_pts INT;
    new_badge TEXT;
    current_badge TEXT;
BEGIN
    IF target_user IS NULL THEN
        RETURN;
    END IF;

    SELECT total_points, badge INTO total_pts, current_badge
    FROM public.user_points
    WHERE user_id = target_user;

    IF total_pts IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO new_badge
    FROM public.badge_levels
    WHERE total_pts >= min_points
    ORDER BY min_points DESC
    LIMIT 1;

    IF new_badge IS NULL OR new_badge = current_badge THEN
        RETURN;
    END IF;

    UPDATE public.user_points
    SET badge = new_badge,
        updated_at = NOW()
    WHERE user_id = target_user;

    PERFORM public.log_audit_event('badge_upgrade', target_user, target_user, NULL, 0,
        jsonb_build_object('badge', new_badge, 'points', total_pts));
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_note_upload_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    award INT := 10;
BEGIN
    PERFORM public.ensure_user_points_record(NEW.user_id);

    UPDATE public.user_points
    SET total_points = total_points + award,
        upload_points = upload_points + award,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    PERFORM public.log_audit_event('upload_award', NEW.user_id, NEW.user_id, NEW.id, award,
        jsonb_build_object('source', 'note_upload'));

    PERFORM public.refresh_user_badge(NEW.user_id);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_download_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    award INT := 1;
    current_total INT;
    total_recent INT;
BEGIN
    IF NEW.uploader_id IS NULL THEN
        SELECT user_id INTO NEW.uploader_id FROM public.notes WHERE id = NEW.note_id;
    END IF;

    PERFORM public.ensure_user_points_record(NEW.uploader_id);
    PERFORM public.reset_download_tip_counter(NEW.uploader_id);

    SELECT daily_download_tip_points INTO current_total
    FROM public.user_points
    WHERE user_id = NEW.uploader_id
    FOR UPDATE;

    IF current_total >= 200 THEN
        NEW.points_awarded = 0;
        PERFORM public.log_audit_event('flag_uploader_daily_cap', NEW.uploader_id, NEW.downloader_id, NEW.note_id, 0,
            jsonb_build_object('reason', 'Uploader daily cap reached'));
        RETURN NEW;
    END IF;

    IF current_total + award > 200 THEN
        award := 200 - current_total;
    END IF;

    IF award < 0 THEN
        award := 0;
    END IF;

    UPDATE public.user_points
    SET total_points = total_points + award,
        download_points = download_points + award,
        daily_download_tip_points = daily_download_tip_points + award,
        updated_at = NOW()
    WHERE user_id = NEW.uploader_id;

    NEW.points_awarded = award;

    IF award > 0 THEN
        PERFORM public.log_audit_event('download_award', NEW.uploader_id, NEW.downloader_id, NEW.note_id, award,
            jsonb_build_object('source', 'note_download'));
        PERFORM public.refresh_user_badge(NEW.uploader_id);
    END IF;

    SELECT COUNT(*) INTO total_recent
    FROM public.note_download_events
    WHERE note_id = NEW.note_id
      AND downloader_id = NEW.downloader_id
      AND created_at >= NOW() - INTERVAL '10 minutes';

    total_recent := total_recent + 1;
    IF total_recent >= 5 THEN
        PERFORM public.log_audit_event('suspicious_download_burst', NEW.downloader_id, NEW.downloader_id, NEW.note_id, 0,
            jsonb_build_object('recent_attempts', total_recent));
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_tip_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    award INT := NEW.points;
    tipper_daily INT;
    uploader_daily INT;
BEGIN
    IF NEW.tipper_id = NEW.uploader_id THEN
        RAISE EXCEPTION 'You cannot tip your own note.';
    END IF;

    PERFORM public.ensure_user_points_record(NEW.tipper_id);
    PERFORM public.ensure_user_points_record(NEW.uploader_id);

    PERFORM public.reset_tip_given_counter(NEW.tipper_id);
    PERFORM public.reset_download_tip_counter(NEW.uploader_id);

    SELECT daily_tip_given_points INTO tipper_daily
    FROM public.user_points
    WHERE user_id = NEW.tipper_id
    FOR UPDATE;

    IF tipper_daily + award > 50 THEN
        PERFORM public.log_audit_event('tip_limit_blocked', NEW.tipper_id, NEW.tipper_id, NEW.note_id, 0,
            jsonb_build_object('attempted_points', award));
        RAISE EXCEPTION 'You have reached today''s 50 point tipping limit.';
    END IF;

    UPDATE public.user_points
    SET daily_tip_given_points = daily_tip_given_points + award,
        tip_counter_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = NEW.tipper_id;

    SELECT daily_download_tip_points INTO uploader_daily
    FROM public.user_points
    WHERE user_id = NEW.uploader_id
    FOR UPDATE;

    IF uploader_daily + award > 200 THEN
        PERFORM public.log_audit_event('tip_blocked_uploader_cap', NEW.uploader_id, NEW.tipper_id, NEW.note_id, 0,
            jsonb_build_object('attempted_points', award));
        RAISE EXCEPTION 'Uploader reached the 200 point daily earnings cap.';
    END IF;

    UPDATE public.user_points
    SET total_points = total_points + award,
        tip_points = tip_points + award,
        daily_download_tip_points = daily_download_tip_points + award,
        daily_counter_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = NEW.uploader_id;

    PERFORM public.log_audit_event('tip_award', NEW.uploader_id, NEW.tipper_id, NEW.note_id, award,
        jsonb_build_object('tipper', NEW.tipper_id));
    PERFORM public.log_audit_event('tip_given', NEW.tipper_id, NEW.tipper_id, NEW.note_id, award,
        jsonb_build_object('uploader', NEW.uploader_id));
    PERFORM public.refresh_user_badge(NEW.uploader_id);

    RETURN NEW;
END;
$$;

-- Trigger wiring
DROP TRIGGER IF EXISTS trg_note_upload_points ON public.notes;
CREATE TRIGGER trg_note_upload_points
AFTER INSERT ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.handle_note_upload_points();

DROP TRIGGER IF EXISTS trg_download_event_points ON public.note_download_events;
CREATE TRIGGER trg_download_event_points
BEFORE INSERT ON public.note_download_events
FOR EACH ROW EXECUTE FUNCTION public.handle_download_event();

DROP TRIGGER IF EXISTS trg_tip_transaction_points ON public.tip_transactions;
CREATE TRIGGER trg_tip_transaction_points
BEFORE INSERT ON public.tip_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_tip_transaction();

-- Simple updated_at trigger for user_points
CREATE OR REPLACE FUNCTION public.touch_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_user_points ON public.user_points;
CREATE TRIGGER trg_touch_user_points
BEFORE UPDATE ON public.user_points
FOR EACH ROW EXECUTE FUNCTION public.touch_user_points();

-- Row Level Security policies
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_download_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_points_public_read ON public.user_points;
CREATE POLICY user_points_public_read
ON public.user_points
FOR SELECT
USING (true);

DROP POLICY IF EXISTS badge_levels_public_read ON public.badge_levels;
CREATE POLICY badge_levels_public_read
ON public.badge_levels
FOR SELECT
USING (true);

DROP POLICY IF EXISTS tip_transactions_insert ON public.tip_transactions;
CREATE POLICY tip_transactions_insert
ON public.tip_transactions
FOR INSERT
WITH CHECK (auth.uid() = tipper_id);

DROP POLICY IF EXISTS tip_transactions_self_select ON public.tip_transactions;
CREATE POLICY tip_transactions_self_select
ON public.tip_transactions
FOR SELECT
USING (auth.uid() = tipper_id OR auth.uid() = uploader_id OR public.is_designated_admin());

DROP POLICY IF EXISTS download_events_insert ON public.note_download_events;
CREATE POLICY download_events_insert
ON public.note_download_events
FOR INSERT
WITH CHECK (auth.uid() = downloader_id);

DROP POLICY IF EXISTS download_events_admin_read ON public.note_download_events;
CREATE POLICY download_events_admin_read
ON public.note_download_events
FOR SELECT
USING (public.is_designated_admin());

DROP POLICY IF EXISTS audit_log_admin_read ON public.points_audit_log;
CREATE POLICY audit_log_admin_read
ON public.points_audit_log
FOR SELECT
USING (public.is_designated_admin());

DROP POLICY IF EXISTS audit_log_insert ON public.points_audit_log;
CREATE POLICY audit_log_insert
ON public.points_audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.points_audit_log FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.points_audit_log IS 'Tracks uploads, downloads, tips, badge changes, and suspicious activity.';
COMMENT ON TABLE public.user_points IS 'Aggregated point totals and daily limit counters for each user.';
COMMENT ON TABLE public.note_download_events IS 'Every logged download. Used for awarding points and abuse detection.';
COMMENT ON TABLE public.tip_transactions IS 'Single-tip records (+5 or +10) with enforcement of per-day limits.';

