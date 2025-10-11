# 🚨 Authentication Troubleshooting Guide

## Quick Fix Checklist

### ✅ **Step 1: Check Your Credentials**
```javascript
// Open browser console (F12) and run:
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY);

// Should show your actual values, not "YOUR_SUPABASE_URL"
```

### ✅ **Step 2: Verify Supabase Project**
1. Go to https://supabase.com/dashboard
2. Check if your project is **active** (not paused)
3. Go to Settings → API
4. Verify your URL and anon key match what's in your HTML

### ✅ **Step 3: Test Database Connection**
```javascript
// In browser console:
supabase.from('profiles').select('count').then(console.log);
```

## 🔍 Common Error Messages & Solutions

### Error: "Invalid API key"
**Cause**: Wrong or missing anon key
**Solution**:
1. Go to Supabase Dashboard → Settings → API
2. Copy the **anon public** key (starts with `eyJ`)
3. Update your HTML file with the correct key

### Error: "CORS error"
**Cause**: Domain not allowed in Supabase settings
**Solution**:
1. Go to Supabase Dashboard → Settings → API
2. Add your domain to **Site URL**: `http://localhost:3000` (or your domain)
3. Add your domain to **Redirect URLs**: `http://localhost:3000/**`

### Error: "Table doesn't exist"
**Cause**: Database schema not set up
**Solution**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase_schema.sql`
3. Paste and run the SQL

### Error: "Email not confirmed"
**Cause**: Email confirmation required
**Solution**:
1. Check your email for confirmation link
2. Or disable email confirmation in Supabase settings

### Error: "User already registered"
**Cause**: Account already exists
**Solution**:
1. Try logging in instead of registering
2. Or use a different email address

## 🧪 Step-by-Step Testing

### Test 1: Basic Connection
```javascript
// Open browser console and run:
supabase.auth.getSession().then(console.log);
```

### Test 2: Registration
```javascript
supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
}).then(console.log);
```

### Test 3: Login
```javascript
supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
}).then(console.log);
```

### Test 4: Database Access
```javascript
supabase.from('profiles').select('*').then(console.log);
```

## 🔧 Manual Fix Steps

### Fix 1: Update Credentials
1. Open `index.html` in a text editor
2. Find lines 516-517:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
3. Replace with your actual values:
   ```javascript
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'your-actual-anon-key';
   ```

### Fix 2: Set Up Database
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire `supabase_schema.sql` file
4. Paste and click "Run"

### Fix 3: Configure CORS
1. Go to Supabase Dashboard → Settings → API
2. Set **Site URL** to your domain
3. Add **Redirect URLs** with your domain

## 🚀 Quick Test Page

Use the `test-auth.html` file to test your setup:

1. Open `test-auth.html` in your browser
2. Enter your Supabase credentials
3. Click "Test Connection"
4. Try registering and logging in
5. Check the console output for any errors

## 📱 Browser-Specific Issues

### Chrome/Edge
- Check if popup blockers are enabled
- Disable ad blockers temporarily
- Clear browser cache

### Firefox
- Check if tracking protection is blocking requests
- Disable enhanced tracking protection for your site

### Safari
- Check if cross-site tracking prevention is enabled
- Disable "Prevent cross-site tracking"

## 🔍 Debug Commands

### Check Supabase Status
```bash
# If you have Supabase CLI installed
supabase status
```

### Check Network Requests
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try to register/login
4. Look for failed requests (red entries)
5. Check the response for error messages

### Check Console Logs
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages in red
4. Check the stack trace for more details

## 🆘 Still Not Working?

### Check These:
1. **Internet Connection**: Make sure you're online
2. **Supabase Status**: Check if Supabase is down
3. **Browser Console**: Look for specific error messages
4. **Network Tab**: Check if requests are being made
5. **Credentials**: Double-check your URL and key

### Get Help:
1. **Check the console logs** for specific error messages
2. **Take a screenshot** of any error messages
3. **Check Supabase status**: https://status.supabase.com
4. **Join Supabase Discord**: https://discord.supabase.com

## 📋 Success Checklist

- [ ] Supabase credentials configured correctly
- [ ] Database schema created successfully
- [ ] CORS settings configured
- [ ] Email confirmation disabled (or working)
- [ ] Browser console shows no errors
- [ ] Registration works
- [ ] Login works
- [ ] Database queries work

---

**💡 Tip**: Start with the `test-auth.html` page to isolate the authentication issues before testing your main application!
