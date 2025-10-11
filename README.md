# Supabase MCP Integration & Schema Sync

This repository provides automated schema synchronization between your Supabase database and Cursor IDE via MCP (Model Context Protocol), with GitHub Actions for continuous integration.

## 🚀 Quick Start

### 1. Cursor MCP Setup

1. **Open Cursor Settings**
   - Go to `File` → `Preferences` → `Settings`
   - Search for "MCP" or navigate to `Features` → `MCP Servers`

2. **Add MCP Server**
   ```json
   {
     "name": "supabase-mcp",
     "command": "npx",
     "args": [
       "@supabase/mcp-server",
       "--url",
       "https://your-project-id.supabase.co",
       "--service-role-key",
       "${SUPABASE_SERVICE_ROLE_KEY}"
     ],
     "env": {
       "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
     }
   }
   ```

3. **Test Connection**
   - Restart Cursor
   - Open Command Palette (`Cmd/Ctrl + Shift + P`)
   - Type "MCP" and select "MCP: Test Connection"

### 2. GitHub Secrets Setup

Add these secrets to your GitHub repository:

1. Go to your repo → `Settings` → `Secrets and variables` → `Actions`
2. Add these repository secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_PROJECT_ID` | Your Supabase project ID | `abcdefghijklmnop` |
| `SUPABASE_DB_URL` | Database connection URL | `postgres://user:pass@host:port/dbname` |

### 3. Environment Variables

Set these in your local environment:

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
export SUPABASE_PROJECT_ID="your-project-id-here"
export SUPABASE_DB_URL="postgres://user:pass@host:port/dbname"
export SUPABASE_URL="https://your-project-id.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key-here"
```

## 📁 Project Structure

```
.
├── .github/
│   └── workflows/
│       └── supabase-sync.yml      # GitHub Actions workflow
├── scripts/
│   ├── sync_pull.sh               # Pull schema from Supabase
│   └── sync_push.sh               # Apply migrations to Supabase
├── supabase/
│   └── migrations/                # Generated migration files
├── CURSOR_MCP_SETUP.md           # Cursor MCP configuration
├── TEST.md                       # Test procedures
└── SECURITY.md                   # Security checklist
```

## 🔧 Usage

### Manual Schema Sync

```bash
# Pull latest schema from Supabase
./scripts/sync_pull.sh

# Test migrations (dry run)
./scripts/sync_push.sh --dry-run

# Apply migrations to Supabase
./scripts/sync_push.sh --force

# Apply specific migration
./scripts/sync_push.sh --migration 20240101120000_sync.sql
```

### Cursor MCP Commands

Once configured, use these commands in Cursor:

```
@supabase-mcp list tables
@supabase-mcp describe table profiles
@supabase-mcp execute query "SELECT COUNT(*) FROM notes"
@supabase-mcp get schema
```

### GitHub Actions

The workflow automatically:
- **On Push**: Applies migrations to Supabase
- **On Schedule**: Pulls schema changes and creates PRs
- **On PR**: Runs security scans and dry-run tests

## 🧪 Testing

See [TEST.md](./TEST.md) for comprehensive testing procedures.

### Quick Test

```bash
# 1. Test Cursor MCP connection
# Open Cursor and try: @supabase-mcp list tables

# 2. Test schema pull
./scripts/sync_pull.sh

# 3. Test dry run
./scripts/sync_push.sh --dry-run

# 4. Verify database connection
supabase status
```

## 🔒 Security

See [SECURITY.md](./SECURITY.md) for security best practices.

### Key Security Features

- ✅ Service role key stored in GitHub Secrets
- ✅ Dry-run mode for all migrations
- ✅ Automatic backups before changes
- ✅ Git commit tracking for all changes
- ✅ Security scanning in CI/CD

## 🚨 Troubleshooting

### Common Issues

1. **"MCP server not found"**
   - Check Supabase CLI installation: `npm install -g supabase`
   - Verify service role key is correct

2. **"Authentication failed"**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - Check project ID matches your Supabase project

3. **"Migration failed"**
   - Check database connection: `supabase status`
   - Review migration files for syntax errors
   - Use `--dry-run` to test first

### Debug Commands

```bash
# Check Supabase connection
supabase status

# Test database connection
supabase db ping

# View migration history
ls -la supabase/migrations/

# Check logs
tail -f sync.log
```

## 📚 Advanced Usage

### Custom Migration Scripts

Create custom migration scripts in `supabase/migrations/`:

```sql
-- 20240101120000_custom_migration.sql
-- Custom migration description

-- Your SQL here
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
```

### Environment-Specific Configurations

Use different configurations for different environments:

```bash
# Development
export SUPABASE_PROJECT_ID="dev-project-id"

# Production
export SUPABASE_PROJECT_ID="prod-project-id"
```

### Backup and Restore

```bash
# Create backup
supabase db dump --file backup.sql

# Restore from backup
supabase db reset --file backup.sql
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Supabase Docs](https://supabase.com/docs)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Community**: [Supabase Discord](https://discord.supabase.com)

---

**⚠️ Important**: Always test migrations in a development environment before applying to production!