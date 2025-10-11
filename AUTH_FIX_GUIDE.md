# 🔧 Authentication Fix Guide

Your sign up and log in are not working because the Supabase credentials are not configured. Here's how to fix it:

## 🚨 **Step 1: Get Your Supabase Credentials**

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Create a New Project** (if you don't have one)
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - **Name**: `studyshare` (or any name)
     - **Database Password**: Create a strong password (save this!)
     - **Region**: Choose closest to your location
   - Click "Create new project"
   - Wait for project to be created (2-3 minutes)

3. **Get Your Credentials**
   - Go to **Settings** → **API**
   - Copy these values:
     - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
     - **anon public key** (starts with `eyJ...`)

## 🔧 **Step 2: Update Your HTML File**

1. **Open your `index.html` file**
2. **Find lines 516-517** (around line 516):
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```

3. **Replace with your actual credentials**:
   ```javascript
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'your-actual-anon-key-here';
   ```

## 🗄️ **Step 3: Set Up Your Database**

1. **In your Supabase Dashboard**
   - Go to **SQL Editor**
   - Click "New Query"

2. **Copy the entire contents** of your `supabase_schema.sql` file
3. **Paste it into the SQL Editor**
4. **Click "Run"** to execute the SQL

This will create all the necessary tables for your StudyShare app.

## 🧪 **Step 4: Test Your Authentication**

1. **Open your `index.html` file in a web browser**
2. **Open Developer Tools** (F12)
3. **Go to Console tab**
4. **Try to register a new account**
5. **Check the console for any error messages**

## 🔍 **Step 5: Debug Common Issues**

### Issue 1: "Invalid API key"
- **Solution**: Double-check your SupABASE_ANON_KEY
- **Check**: Make sure there are no extra spaces or characters

### Issue 2: "CORS error"
- **Solution**: Add your domain to Supabase settings
- **Steps**:
  1. Go to Supabase Dashboard → Settings → API
  2. Add your domain to "Site URL" (e.g., `http://localhost:3000`)
  3. Add your domain to "Redirect URLs" (e.g., `http://localhost:3000/**`)

### Issue 3: "Table doesn't exist"
- **Solution**: Make sure you ran the SQL schema file
- **Check**: Go to Supabase Dashboard → Table Editor
- **Verify**: You should see tables like `profiles`, `notes`, `categories`

### Issue 4: "Email not confirmed"
- **Solution**: Check your email for confirmation link
- **Or**: Disable email confirmation in Supabase settings

## 🚀 **Quick Test Commands**

After fixing the credentials, test these in your browser console:

```javascript
// Test 1: Check if Supabase is connected
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key:', SUPABASE_ANON_KEY);

// Test 2: Test connection
supabase.from('profiles').select('count').then(console.log);

// Test 3: Try registration
supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
}).then(console.log);
```

## 📱 **Step 6: Test the Full Flow**

1. **Open your StudyShare app**
2. **Click "Sign Up"**
3. **Fill in the registration form**
4. **Submit the form**
5. **Check for success/error messages**
6. **Try logging in with the same credentials**

## 🆘 **Still Not Working?**

If you're still having issues:

1. **Check the browser console** for error messages
2. **Verify your Supabase project is active** (not paused)
3. **Make sure you copied the credentials correctly**
4. **Check if your internet connection is working**

## 📞 **Need Help?**

- **Supabase Documentation**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Check the console logs** for specific error messages

---

**⚠️ Important**: Make sure to replace the placeholder values with your actual Supabase credentials!
