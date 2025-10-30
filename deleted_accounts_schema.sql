-- Create deleted_accounts table to track permanently deleted users
-- This prevents deleted accounts from logging in again

CREATE TABLE IF NOT EXISTS public.deleted_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletion_reason TEXT DEFAULT 'user_requested',
    original_user_data JSONB, -- Store original user data for audit purposes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on deleted_accounts table
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

-- Only service role can access deleted_accounts
CREATE POLICY "Service role can manage deleted accounts" ON public.deleted_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_user_id ON public.deleted_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON public.deleted_accounts(email);

-- Function to check if an account is deleted
CREATE OR REPLACE FUNCTION is_account_deleted(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.deleted_accounts 
        WHERE email = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user_id is deleted
CREATE OR REPLACE FUNCTION is_user_deleted(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.deleted_accounts 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
