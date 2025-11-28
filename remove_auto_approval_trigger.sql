-- Remove auto-approval trigger for notes
-- This ensures all uploads require manual approval, even from authorized uploaders

-- Drop the trigger
DROP TRIGGER IF EXISTS trg_auto_approve_authorized_notes ON public.notes;

-- Drop the function
DROP FUNCTION IF EXISTS public.auto_approve_authorized_notes();

-- Verify removal
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'trg_auto_approve_authorized_notes';

-- Should return no rows if successfully removed

