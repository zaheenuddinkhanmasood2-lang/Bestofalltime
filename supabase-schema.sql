-- SharedStudy Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    author UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    is_shared BOOLEAN DEFAULT false,
    share_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shared_notes table for tracking shared notes
CREATE TABLE IF NOT EXISTS shared_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_code TEXT NOT NULL,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, shared_with)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_author ON notes(author);
CREATE INDEX IF NOT EXISTS idx_notes_share_code ON notes(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_notes_shared_with ON shared_notes(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_notes_share_code ON shared_notes(share_code);

-- Enable RLS on tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes table
-- Users can only see their own notes
CREATE POLICY "Users can view their own notes" ON notes
    FOR SELECT USING (auth.uid() = author);

-- Users can insert their own notes
CREATE POLICY "Users can insert their own notes" ON notes
    FOR INSERT WITH CHECK (auth.uid() = author);

-- Users can update their own notes
CREATE POLICY "Users can update their own notes" ON notes
    FOR UPDATE USING (auth.uid() = author);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes" ON notes
    FOR DELETE USING (auth.uid() = author);

-- RLS Policies for shared_notes table
-- Users can view notes shared with them
CREATE POLICY "Users can view notes shared with them" ON shared_notes
    FOR SELECT USING (auth.uid() = shared_with);

-- Users can insert shared notes (when someone shares with them)
CREATE POLICY "Users can insert shared notes" ON shared_notes
    FOR INSERT WITH CHECK (auth.uid() = shared_with);

-- Users can delete shared notes (remove from their shared list)
CREATE POLICY "Users can delete shared notes" ON shared_notes
    FOR DELETE USING (auth.uid() = shared_with);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate share codes
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to share a note
CREATE OR REPLACE FUNCTION share_note(note_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    share_code TEXT;
BEGIN
    -- Generate a unique share code
    share_code := generate_share_code();
    
    -- Update the note with share code and mark as shared
    UPDATE notes 
    SET is_shared = true, share_code = share_code
    WHERE id = note_uuid AND author = auth.uid();
    
    RETURN share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to access a shared note
CREATE OR REPLACE FUNCTION access_shared_note(share_code_param TEXT)
RETURNS TABLE(
    note_id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if the share code exists and note is shared
    IF NOT EXISTS (
        SELECT 1 FROM notes 
        WHERE share_code = share_code_param AND is_shared = true
    ) THEN
        RAISE EXCEPTION 'Invalid or expired share code';
    END IF;
    
    -- Return note details
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.content,
        n.category,
        n.author_name,
        n.created_at,
        n.updated_at
    FROM notes n
    WHERE n.share_code = share_code_param AND n.is_shared = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add shared note to user's shared list
CREATE OR REPLACE FUNCTION add_shared_note(share_code_param TEXT)
RETURNS UUID AS $$
DECLARE
    note_uuid UUID;
    shared_note_id UUID;
BEGIN
    -- Get the note ID from share code
    SELECT id INTO note_uuid
    FROM notes 
    WHERE share_code = share_code_param AND is_shared = true;
    
    IF note_uuid IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired share code';
    END IF;
    
    -- Check if already shared with this user
    IF EXISTS (
        SELECT 1 FROM shared_notes 
        WHERE note_id = note_uuid AND shared_with = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Note already shared with this user';
    END IF;
    
    -- Add to shared notes
    INSERT INTO shared_notes (note_id, shared_with, share_code)
    VALUES (note_uuid, auth.uid(), share_code_param)
    RETURNING id INTO shared_note_id;
    
    RETURN shared_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON notes TO anon, authenticated;
GRANT ALL ON shared_notes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION share_note(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION access_shared_note(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_shared_note(TEXT) TO authenticated;
