# Supabase Setup Guide for StudyShare

This guide will help you connect your StudyShare application to Supabase for real-time database functionality.

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `studyshare-notes`
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to your users
6. Click "Create new project"
7. Wait for the project to be set up (2-3 minutes)

## 🗄️ Step 2: Set Up Database Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of `supabase-schema.sql`
5. Click "Run" to execute the SQL commands
6. Verify that the tables were created successfully

## 🔑 Step 3: Get API Keys

1. In your Supabase dashboard, go to "Settings" → "API"
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

## ⚙️ Step 4: Configure Your Application

1. Open `index.html` in your code editor
2. Find the Supabase configuration section (around line 264)
3. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## 🔐 Step 5: Configure Authentication

1. In your Supabase dashboard, go to "Authentication" → "Settings"
2. Under "Site URL", add your domain (or `http://localhost:3000` for local development)
3. Under "Redirect URLs", add your domain
4. Enable "Email" provider if you want email authentication
5. Optionally configure email templates

## 🛡️ Step 6: Set Up Row Level Security (Already Done)

The SQL schema automatically sets up Row Level Security (RLS) policies to ensure:
- Users can only see their own notes
- Users can only share notes they own
- Shared notes are properly secured

## 🧪 Step 7: Test the Integration

1. Open your `index.html` file in a web browser
2. Try creating a new account
3. Create a note
4. Share the note
5. Check your Supabase dashboard to see the data

## 📊 Step 8: Monitor Your Data

1. Go to "Table Editor" in your Supabase dashboard
2. You should see two tables:
   - `notes` - Contains all user notes
   - `shared_notes` - Tracks shared note relationships

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid API key" error**
   - Double-check your SUPABASE_URL and SUPABASE_ANON_KEY
   - Make sure there are no extra spaces or quotes

2. **"Permission denied" error**
   - Check that RLS policies are properly set up
   - Verify the user is authenticated

3. **"Table doesn't exist" error**
   - Make sure you ran the SQL schema setup
   - Check the table names match exactly

4. **CORS errors**
   - Add your domain to the allowed origins in Supabase settings
   - Check the Site URL configuration

### Debug Mode:

Add this to your browser console to see detailed logs:
```javascript
localStorage.setItem('supabase.debug', 'true');
```

## 🚀 Advanced Features

### Real-time Subscriptions (Optional)

To enable real-time updates when notes are shared:

```javascript
// Subscribe to note changes
const subscription = supabase
  .channel('notes')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'shared_notes' },
    (payload) => {
      console.log('New shared note:', payload);
      // Refresh shared notes list
      studyShare.loadSharedNotes();
    }
  )
  .subscribe();
```

### Email Notifications (Optional)

Set up email templates in Supabase for:
- Welcome emails
- Note sharing notifications
- Password reset emails

## 📱 Production Deployment

When deploying to production:

1. Update the Site URL in Supabase settings
2. Add your production domain to allowed origins
3. Consider setting up custom SMTP for emails
4. Monitor usage in the Supabase dashboard

## 🔒 Security Best Practices

1. **Never expose your service role key** in client-side code
2. **Use RLS policies** to secure your data
3. **Validate all inputs** on both client and server
4. **Regularly review** your RLS policies
5. **Monitor** your database for unusual activity

## 📞 Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

---

Your StudyShare application is now connected to Supabase! 🎉
