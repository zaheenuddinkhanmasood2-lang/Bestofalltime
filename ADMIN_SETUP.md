# Admin Approval Interface Setup Guide

## Overview
This admin interface allows you to review, approve, and reject notes uploaded by users. All uploads now require manual approval, even from authorized uploaders.

## Setup Steps

### 1. Remove Auto-Approval Trigger
Run the SQL file to remove the auto-approval trigger:
```sql
-- Execute: remove_auto_approval_trigger.sql
```
This ensures all uploads require manual approval.

### 2. Add Rejection Reason Column (Optional but Recommended)
Run the SQL file to add the rejection_reason column:
```sql
-- Execute: add_rejection_reason_column.sql
```
This allows you to provide feedback when rejecting notes.

### 3. Access the Admin Interface
Navigate to: `admin-approval.html`

**Note:** Currently, any user in the `authorized_uploaders` table can access the admin panel. For production, you should:
- Create a separate `admins` table
- Add an `is_admin` column to `authorized_uploaders`
- Update the `checkAdminStatus()` function in `admin-approval.js`

## Features

### Pending Notes Tab
- View all notes waiting for approval
- See uploader information, file details, and upload date
- Approve or reject notes with one click
- View full note details in a modal

### Approved Notes Tab
- View all approved notes
- See which notes are live on the site

### Rejected Notes Tab
- View rejected notes (after adding rejection_reason column)
- See rejection reasons

## How to Use

1. **Review Notes**: Click on any note card to view full details
2. **Approve**: Click the "Approve" button to make the note public
3. **Reject**: Click the "Reject" button and optionally provide a reason
4. **View File**: Click "View File" to download and review the actual note file

## Security Considerations

### Current Implementation
- Only users in `authorized_uploaders` table can access admin panel
- This is a basic implementation for demo purposes

### Recommended for Production
1. Create a separate admin role/table
2. Add role-based access control (RBAC)
3. Log all admin actions (approve/reject)
4. Add email notifications when notes are approved/rejected
5. Add bulk approval/rejection features
6. Add filters (by subject, date, uploader, etc.)

## Database Changes Made

1. **upload.js**: Changed `is_approved` to always be `false` on upload
2. **remove_auto_approval_trigger.sql**: Removes automatic approval for authorized uploaders
3. **add_rejection_reason_column.sql**: Adds optional rejection reason field

## Testing

1. Upload a note as an authorized uploader
2. Check that it appears in "Pending" tab (not auto-approved)
3. Approve the note
4. Verify it appears in "Approved" tab and is visible on browse page
5. Test rejection functionality

## Future Enhancements

- [ ] Separate admin role system
- [ ] Email notifications
- [ ] Bulk operations
- [ ] Advanced filtering
- [ ] Activity log
- [ ] Statistics dashboard
- [ ] Auto-rejection rules (e.g., file size, content scanning)

