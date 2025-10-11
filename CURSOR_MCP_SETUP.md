# Cursor MCP Setup for Supabase Integration

## Prerequisites
- Cursor IDE installed
- Supabase project with service role key
- MCP server running (see setup below)

## Cursor MCP Server Configuration

### Step 1: Open Cursor Settings
1. Open Cursor IDE
2. Go to `File` → `Preferences` → `Settings` (or `Cmd/Ctrl + ,`)
3. Search for "MCP" or navigate to `Features` → `MCP Servers`

### Step 2: Add MCP Server
Click "Add Server" and configure with these exact values:

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

### Alternative: Direct MCP Endpoint Configuration
If using a hosted MCP server:

```json
{
  "name": "supabase-mcp",
  "url": "https://your-mcp-server.com/api/mcp",
  "headers": {
    "Authorization": "Bearer your-mcp-token-here"
  }
}
```

### Step 3: Environment Variables
Add these to your system environment or Cursor's environment:

```bash
SUPABASE_DB_URL=postgres://user:pass@host:port/dbname
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Test Connection
1. Restart Cursor
2. Open Command Palette (`Cmd/Ctrl + Shift + P`)
3. Type "MCP" and select "MCP: Test Connection"
4. Verify you can see your Supabase tables

## Verification Commands

After setup, test these commands in Cursor's chat:

```
@supabase-mcp list tables
@supabase-mcp describe table profiles
@supabase-mcp execute query "SELECT COUNT(*) FROM notes"
```

## Troubleshooting

### Common Issues:
1. **"MCP server not found"** - Check the command path and ensure @supabase/mcp-server is installed
2. **"Authentication failed"** - Verify your service role key is correct
3. **"Connection timeout"** - Check your Supabase URL and network connectivity

### Debug Steps:
1. Check Cursor's developer console for MCP errors
2. Test Supabase connection manually: `supabase status`
3. Verify environment variables are loaded correctly
