# Supabase MCP Integration Test Plan

This document provides comprehensive testing procedures to verify your Supabase MCP integration and schema sync pipeline.

## 🧪 Test Environment Setup

### Prerequisites
- [ ] Supabase project created and configured
- [ ] GitHub repository with secrets configured
- [ ] Cursor IDE installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Git repository initialized

### Environment Variables
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_DB_URL="postgres://user:pass@host:port/dbname"
export SUPABASE_URL="https://your-project-id.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

## 🔍 Test Suite 1: Cursor MCP Connection

### Test 1.1: Basic Connection
**Objective**: Verify MCP server can connect to Supabase

**Steps**:
1. Open Cursor IDE
2. Open Command Palette (`Cmd/Ctrl + Shift + P`)
3. Type "MCP" and select "MCP: Test Connection"
4. Verify connection status shows "Connected"

**Expected Result**: ✅ Connection successful

**Troubleshooting**:
- If failed: Check service role key and project ID
- Verify Supabase CLI is installed: `supabase --version`

### Test 1.2: Database Schema Access
**Objective**: Verify MCP can access database schema

**Commands to test in Cursor chat**:
```
@supabase-mcp list tables
@supabase-mcp get schema
@supabase-mcp describe table profiles
```

**Expected Result**: ✅ Returns table list and schema information

### Test 1.3: Query Execution
**Objective**: Verify MCP can execute safe queries

**Commands to test**:
```
@supabase-mcp execute query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
@supabase-mcp execute query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5"
```

**Expected Result**: ✅ Returns query results without errors

## 🔍 Test Suite 2: Schema Sync Scripts

### Test 2.1: Script Permissions
**Objective**: Verify scripts are executable

**Commands**:
```bash
chmod +x scripts/sync_pull.sh
chmod +x scripts/sync_push.sh
ls -la scripts/
```

**Expected Result**: ✅ Scripts show `-rwxr-xr-x` permissions

### Test 2.2: Schema Pull Test
**Objective**: Verify schema can be pulled from Supabase

**Commands**:
```bash
# Initialize Supabase if needed
supabase init

# Link to project
supabase link --project-ref $SUPABASE_PROJECT_ID

# Test pull
./scripts/sync_pull.sh
```

**Expected Result**: ✅ Creates migration files in `supabase/migrations/`

**Verification**:
```bash
ls -la supabase/migrations/
cat supabase/migrations/latest_schema.sql | head -20
```

### Test 2.3: Dry Run Test
**Objective**: Verify migrations can be tested without applying

**Commands**:
```bash
./scripts/sync_push.sh --dry-run
```

**Expected Result**: ✅ Shows what would be applied without making changes

### Test 2.4: Migration Application Test
**Objective**: Verify migrations can be applied safely

**Commands**:
```bash
# First, test with dry run
./scripts/sync_push.sh --dry-run

# If dry run passes, apply for real
./scripts/sync_push.sh --force
```

**Expected Result**: ✅ Migrations applied successfully

**Verification**:
```bash
supabase status
supabase db ping
```

## 🔍 Test Suite 3: Database Operations

### Test 3.1: Connection Test
**Objective**: Verify database connection works

**Commands**:
```bash
supabase status
supabase db ping
```

**Expected Result**: ✅ Database connection successful

### Test 3.2: Schema Verification
**Objective**: Verify current schema matches expectations

**SQL Queries**:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public';
```

**Expected Result**: ✅ Returns expected table structure

### Test 3.3: Data Integrity Test
**Objective**: Verify data integrity after migrations

**SQL Queries**:
```sql
-- Check row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables;

-- Check for orphaned records
SELECT COUNT(*) FROM notes n 
LEFT JOIN profiles p ON n.user_id = p.id 
WHERE p.id IS NULL;
```

**Expected Result**: ✅ No data integrity issues

## 🔍 Test Suite 4: GitHub Actions

### Test 4.1: Workflow Syntax
**Objective**: Verify GitHub Actions workflow is valid

**Commands**:
```bash
# Check workflow syntax
yamllint .github/workflows/supabase-sync.yml

# Validate with GitHub CLI (if available)
gh workflow list
```

**Expected Result**: ✅ No syntax errors

### Test 4.2: Secrets Configuration
**Objective**: Verify all required secrets are configured

**Check in GitHub**:
1. Go to repository → Settings → Secrets and variables → Actions
2. Verify these secrets exist:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_ID`
   - `SUPABASE_DB_URL`

**Expected Result**: ✅ All secrets configured

### Test 4.3: Manual Workflow Trigger
**Objective**: Test workflow execution

**Steps**:
1. Go to repository → Actions → Supabase Schema Sync
2. Click "Run workflow"
3. Select "pull" action
4. Click "Run workflow"

**Expected Result**: ✅ Workflow runs successfully

## 🔍 Test Suite 5: Security Tests

### Test 5.1: Secret Exposure Check
**Objective**: Verify secrets are not exposed in logs

**Commands**:
```bash
# Check for exposed secrets in files
grep -r "sk-" . --exclude-dir=.git
grep -r "eyJ" . --exclude-dir=.git
grep -r "postgres://" . --exclude-dir=.git
```

**Expected Result**: ✅ No secrets found in code

### Test 5.2: File Permissions
**Objective**: Verify proper file permissions

**Commands**:
```bash
# Check script permissions
ls -la scripts/

# Check config file permissions
ls -la supabase/config.toml
```

**Expected Result**: ✅ Scripts executable, config files not world-readable

### Test 5.3: Database Access Control
**Objective**: Verify database access is properly restricted

**SQL Queries**:
```sql
-- Check current user
SELECT current_user, session_user;

-- Check available schemas
SELECT schema_name FROM information_schema.schemata;

-- Check table permissions
SELECT table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE grantee = current_user;
```

**Expected Result**: ✅ Limited access to public schema only

## 🔍 Test Suite 6: Rollback Tests

### Test 6.1: Migration Rollback
**Objective**: Verify migrations can be rolled back

**Steps**:
1. Create a test migration
2. Apply the migration
3. Create a rollback migration
4. Apply the rollback

**Commands**:
```bash
# Create test migration
echo "CREATE TABLE test_rollback (id SERIAL PRIMARY KEY);" > supabase/migrations/$(date +%Y%m%d%H%M%S)_test_rollback.sql

# Apply migration
./scripts/sync_push.sh --force

# Create rollback
echo "DROP TABLE test_rollback;" > supabase/migrations/$(date +%Y%m%d%H%M%S)_rollback_test.sql

# Apply rollback
./scripts/sync_push.sh --force
```

**Expected Result**: ✅ Table created and then dropped successfully

### Test 6.2: Backup and Restore
**Objective**: Verify backup and restore functionality

**Commands**:
```bash
# Create backup
supabase db dump --file test_backup.sql

# Verify backup exists
ls -la test_backup.sql

# Test restore (in test environment)
# supabase db reset --file test_backup.sql
```

**Expected Result**: ✅ Backup created successfully

## 📊 Test Results Template

Copy this template to track your test results:

```markdown
# Test Results - [Date]

## Environment
- Supabase Project ID: [PROJECT_ID]
- Cursor Version: [VERSION]
- Supabase CLI Version: [VERSION]

## Test Results

| Test Suite | Test Case | Status | Notes |
|------------|-----------|--------|-------|
| MCP Connection | Basic Connection | ✅/❌ | |
| MCP Connection | Schema Access | ✅/❌ | |
| MCP Connection | Query Execution | ✅/❌ | |
| Schema Sync | Script Permissions | ✅/❌ | |
| Schema Sync | Schema Pull | ✅/❌ | |
| Schema Sync | Dry Run | ✅/❌ | |
| Schema Sync | Migration Apply | ✅/❌ | |
| Database Ops | Connection | ✅/❌ | |
| Database Ops | Schema Verification | ✅/❌ | |
| Database Ops | Data Integrity | ✅/❌ | |
| GitHub Actions | Workflow Syntax | ✅/❌ | |
| GitHub Actions | Secrets Config | ✅/❌ | |
| GitHub Actions | Manual Trigger | ✅/❌ | |
| Security | Secret Exposure | ✅/❌ | |
| Security | File Permissions | ✅/❌ | |
| Security | DB Access Control | ✅/❌ | |
| Rollback | Migration Rollback | ✅/❌ | |
| Rollback | Backup/Restore | ✅/❌ | |

## Issues Found
[List any issues encountered]

## Recommendations
[List any recommendations for improvement]
```

## 🚨 Emergency Procedures

### If Tests Fail

1. **MCP Connection Issues**:
   ```bash
   # Check Supabase CLI
   supabase --version
   
   # Test direct connection
   supabase status
   ```

2. **Schema Sync Issues**:
   ```bash
   # Check logs
   tail -f sync.log
   
   # Dry run first
   ./scripts/sync_push.sh --dry-run
   ```

3. **Database Issues**:
   ```bash
   # Check connection
   supabase db ping
   
   # Check status
   supabase status
   ```

4. **GitHub Actions Issues**:
   - Check repository secrets
   - Review workflow logs
   - Verify file permissions

### Rollback Procedures

1. **Immediate Rollback**:
   ```bash
   # Stop any running processes
   pkill -f supabase
   
   # Restore from backup
   supabase db reset --file backup.sql
   ```

2. **Git Rollback**:
   ```bash
   # Revert to previous commit
   git revert HEAD
   
   # Push changes
   git push origin main
   ```

## ✅ Success Criteria

All tests must pass for the integration to be considered successful:

- [ ] MCP connection established
- [ ] Schema sync working in both directions
- [ ] GitHub Actions running successfully
- [ ] Security checks passing
- [ ] Rollback procedures tested and working

---

**Note**: Run these tests in a development environment first before testing in production!
