-- SharedStudy Database Schema
-- This file contains all the necessary tables for the SharedStudy application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table for organizing notes
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE public.notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    share_code TEXT UNIQUE,
    -- Additional fields for file-based notes
    filename TEXT,
    file_url TEXT,
    subject TEXT,
    description TEXT,
    uploader_email TEXT,
    file_size BIGINT,
    is_approved BOOLEAN DEFAULT FALSE,
    download_count INT DEFAULT 0,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note sharing table for tracking shared notes
CREATE TABLE public.note_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    shared_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    shared_with UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    share_code TEXT,
    permission_level TEXT DEFAULT 'read' CHECK (permission_level IN ('read', 'write')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Note versions table for version history
CREATE TABLE public.note_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table for note tagging
CREATE TABLE public.tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#10b981',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note tags junction table
CREATE TABLE public.note_tags (
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- Comments table for note collaboration
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_category_id ON public.notes(category_id);
CREATE INDEX idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX idx_notes_share_code ON public.notes(share_code);
CREATE INDEX idx_note_shares_note_id ON public.note_shares(note_id);
CREATE INDEX idx_note_shares_shared_with ON public.note_shares(shared_with);
CREATE INDEX idx_note_versions_note_id ON public.note_versions(note_id);
CREATE INDEX idx_comments_note_id ON public.comments(note_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Notes policies
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public notes" ON public.notes
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view shared notes" ON public.notes
    FOR SELECT USING (
        id IN (
            SELECT note_id FROM public.note_shares 
            WHERE shared_with = auth.uid()
        )
    );

CREATE POLICY "Users can create their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- Note shares policies
CREATE POLICY "Users can view shares for their notes" ON public.note_shares
    FOR SELECT USING (
        shared_by = auth.uid() OR shared_with = auth.uid()
    );

CREATE POLICY "Users can create shares for their notes" ON public.note_shares
    FOR INSERT WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Users can update shares for their notes" ON public.note_shares
    FOR UPDATE USING (shared_by = auth.uid());

CREATE POLICY "Users can delete shares for their notes" ON public.note_shares
    FOR DELETE USING (shared_by = auth.uid());

-- Note versions policies
CREATE POLICY "Users can view versions of their notes" ON public.note_versions
    FOR SELECT USING (
        note_id IN (SELECT id FROM public.notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create versions for their notes" ON public.note_versions
    FOR INSERT WITH CHECK (
        note_id IN (SELECT id FROM public.notes WHERE user_id = auth.uid())
    );

-- Comments policies
CREATE POLICY "Users can view comments on accessible notes" ON public.comments
    FOR SELECT USING (
        note_id IN (
            SELECT id FROM public.notes 
            WHERE user_id = auth.uid() OR is_public = true OR id IN (
                SELECT note_id FROM public.note_shares 
                WHERE shared_with = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create comments on accessible notes" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND note_id IN (
            SELECT id FROM public.notes 
            WHERE user_id = auth.uid() OR is_public = true OR id IN (
                SELECT note_id FROM public.note_shares 
                WHERE shared_with = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_notes
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_comments
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default categories
INSERT INTO public.categories (name, description, color) VALUES
('Mathematics', 'Math and statistics notes', '#ef4444'),
('Science', 'Physics, chemistry, biology notes', '#10b981'),
('Programming', 'Coding and software development notes', '#3b82f6'),
('Literature', 'Language arts and literature notes', '#8b5cf6'),
('History', 'Historical studies and social sciences', '#f59e0b'),
('General', 'General study notes', '#6b7280');

-- Update existing notes to populate missing fields and make them approved for display
UPDATE public.notes 
SET 
    subject = COALESCE(subject, title),
    description = COALESCE(description, content),
    filename = COALESCE(filename, CONCAT(title, '.txt')),
    uploader_email = COALESCE(uploader_email, 'user@example.com'),
    is_approved = true
WHERE subject IS NULL OR description IS NULL OR filename IS NULL OR uploader_email IS NULL OR is_approved IS NULL;

-- Insert default tags
INSERT INTO public.tags (name, color) VALUES
('Important', '#ef4444'),
('Review', '#f59e0b'),
('Exam', '#dc2626'),
('Assignment', '#7c3aed'),
('Lecture', '#059669'),
('Tutorial', '#0ea5e9'),
('Project', '#ea580c'),
('Reference', '#6b7280');
