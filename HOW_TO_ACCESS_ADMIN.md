# How to Access Admin Approval Interface

## Quick Access Methods

### Method 1: Direct URL (Easiest)
Simply navigate to:
```
admin-approval.html
```

**If running locally:**
- Open: `file:///C:/Users/MADINA LAPTOP/check1/check No 1/admin-approval.html`
- Or: `http://localhost/admin-approval.html` (if using a local server)

**If deployed:**
- `https://sharedstudy.vercel.app/admin-approval.html`

### Method 2: From Profile Page
1. Log in to your account
2. Go to **Profile** page (`profile.html`)
3. If you're an authorized uploader, you'll see an **"Admin Panel"** section
4. Click **"Open Admin Panel"** button

### Method 3: Direct Link in Browser
Type in your browser address bar:
```
admin-approval.html
```

## Prerequisites

### 1. You Must Be Logged In
- The admin panel requires authentication
- If not logged in, you'll be redirected to `login.html`

### 2. You Must Be an Authorized Uploader
- Your user ID must be in the `authorized_uploaders` table
- Your account must have `is_active = true`

### 3. Run SQL Migrations (First Time Only)
Before using the admin panel, run these SQL files in Supabase:

1. **Remove auto-approval trigger:**
   ```sql
   -- Execute: remove_auto_approval_trigger.sql
   ```

2. **Add rejection reason column (optional):**
   ```sql
   -- Execute: add_rejection_reason_column.sql
   ```

## How to Check if You Have Access

1. Log in to your account
2. Go to Profile page
3. Look for the **"Admin Panel"** section
4. If you see it, you have access!
5. If you don't see it, you need to be added to `authorized_uploaders` table

## Troubleshooting

### "Access denied. Admin privileges required."
**Solution:** Your user ID needs to be added to the `authorized_uploaders` table in Supabase.

**To add yourself:**
1. Go to Supabase Dashboard
2. Navigate to Table Editor → `authorized_uploaders`
3. Click "Insert" → "Insert row"
4. Add:
   - `user_id`: Your user ID (from auth.users table)
   - `user_email`: Your email
   - `is_active`: `true`
   - `permissions`: `['upload']`

### Page redirects to login.html
**Solution:** You're not logged in. Log in first, then try again.

### Page redirects to index.html
**Solution:** You don't have admin privileges. See above to add yourself to authorized_uploaders.

### No notes showing in "Pending" tab
**Possible reasons:**
1. No notes have been uploaded yet
2. All notes are already approved
3. The auto-approval trigger is still active (run `remove_auto_approval_trigger.sql`)

## Features Available

Once you access the admin panel, you can:

✅ **View Pending Notes** - All notes waiting for approval
✅ **Approve Notes** - Make notes visible to all users
✅ **Reject Notes** - Reject with optional reason
✅ **View Approved Notes** - See all approved notes
✅ **View Note Details** - Full information and file preview
✅ **Download Files** - Review actual note files before approving

## Quick Start Guide

1. **Access the page:** Navigate to `admin-approval.html`
2. **Log in:** If prompted, log in with your authorized account
3. **View pending:** Click "Pending" tab to see notes waiting approval
4. **Review:** Click on any note to view details
5. **Approve/Reject:** Use buttons to approve or reject notes
6. **Refresh:** Click refresh button to see latest notes

## Security Note

Currently, any user in `authorized_uploaders` can access the admin panel. For production use, consider:
- Creating a separate `admins` table
- Adding role-based access control
- Restricting admin access to specific users only

