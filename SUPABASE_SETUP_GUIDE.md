# StudyShare - Supabase Setup Guide

This guide will help you set up your Supabase database and connect it to your StudyShare application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Your StudyShare application files

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `studyshare` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## Step 3: Update Your Application

1. Open your `index.html` file
2. Find the Supabase configuration section (around line 516-517)
3. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## Step 4: Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase_schema.sql` file
4. Paste it into the SQL editor
5. Click "Run" to execute the SQL

This will create all the necessary tables:
- `profiles` - User profiles
- `categories` - Note categories
- `notes` - User notes
- `note_shares` - Shared notes tracking
- `note_versions` - Version history
- `tags` - Note tags
- `comments` - Note comments

## Step 5: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your domain (for local development, use `http://localhost:3000` or similar)
3. Under **Redirect URLs**, add your domain with any path (e.g., `http://localhost:3000/**`)
4. Enable **Email confirmations** if you want users to verify their email

## Step 6: Test Your Application

1. Open your `index.html` file in a web browser
2. Try to register a new account
3. Check if the registration works and if you can log in
4. Test creating, editing, and sharing notes

## Database Schema Overview

### Tables Created:

1. **profiles** - Extended user information
2. **categories** - Pre-defined note categories (Math, Science, etc.)
3. **notes** - User notes with sharing capabilities
4. **note_shares** - Tracks which notes are shared with whom
5. **note_versions** - Version history for notes
6. **tags** - Custom tags for notes
7. **note_tags** - Many-to-many relationship between notes and tags
8. **comments** - Comments on notes for collaboration

### Security Features:

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Shared notes are accessible to authorized users
- Public notes are visible to everyone

## Troubleshooting

### Common Issues:

1. **"Invalid API key" error**
   - Double-check your Supabase URL and anon key
   - Make sure there are no extra spaces or characters

2. **"CORS error"**
   - Add your domain to the allowed origins in Supabase settings
   - For local development, use `http://localhost:3000`

3. **"Table doesn't exist" error**
   - Make sure you ran the SQL schema file completely
   - Check the SQL editor for any error messages

4. **Authentication not working**
   - Check your Site URL and Redirect URLs in Supabase settings
   - Make sure email confirmations are configured properly

### Getting Help:

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
- Check the browser console for detailed error messages

## Next Steps

Once your database is set up:

1. Test all functionality thoroughly
2. Customize the categories and tags to match your needs
3. Consider adding more features like:
   - File attachments
   - Real-time collaboration
   - Advanced search
   - Note templates
   - Export functionality

## Security Notes

- Never commit your Supabase credentials to version control
- Use environment variables in production
- Regularly review your RLS policies
- Monitor your database usage in the Supabase dashboard

Your StudyShare application is now ready to use with a fully functional database backend!
