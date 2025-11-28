-- Add rejection_reason column to notes table if it doesn't exist
-- This allows admins to provide feedback when rejecting notes

DO $$
BEGIN
    -- Add rejection_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.notes 
        ADD COLUMN rejection_reason TEXT;
        
        COMMENT ON COLUMN public.notes.rejection_reason IS 'Reason provided by admin when rejecting a note';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notes' AND column_name = 'rejection_reason';

