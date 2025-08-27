# Supabase MCP Server Setup Guide

## Overview

This guide explains how to set up the **official** Supabase MCP (Model Context Protocol) server for the AEIOU project. This enables Cursor, Claude, and other AI assistants to interact directly with your Supabase database for schema management, data queries, and debugging.

## Prerequisites

- Node.js installed on your machine
- Cursor IDE (or compatible MCP client)
- Active Supabase project

## Setup Steps

### 1. Generate Personal Access Token (PAT)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Settings** → **Personal Access Tokens**
3. Click **Generate New Token**
4. Give it a descriptive name: `"AEIOU MCP Server"`
5. Copy the token immediately (you won't see it again)

### 2. Configure MCP Server

The official configuration is already set up in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=umwliedtynxywavrhacy",
        "--features=database,docs,debug,development"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_PERSONAL_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

### 3. Update Your Credentials

**Replace the placeholder** in `.cursor/mcp.json`:
- Change `YOUR_PERSONAL_ACCESS_TOKEN_HERE` to your actual PAT

### 4. Restart Cursor

After updating the configuration:
1. Close Cursor completely
2. Reopen Cursor
3. The Supabase MCP server should appear in your MCP connections

## Configuration Details

### Project Scoping
- **Project Reference**: `umwliedtynxywavrhacy` (your AEIOU project)
- **Read-Only Mode**: Enabled by default for safety
- **Features Enabled**: `database`, `docs`, `debug`, `development`

### Security Features
- `--read-only`: Prevents accidental database modifications
- `--project-ref`: Scopes access to only your AEIOU project
- `--features`: Limits available tools to essential ones

### Available Tools

With this configuration, you'll have access to:

#### Database Tools
- `list_tables`: View all tables in your database
- `execute_sql`: Run read-only SQL queries
- `apply_migration`: Apply schema changes (when read-only is disabled)

#### Documentation Tools
- `search_docs`: Search Supabase documentation for help

#### Debug Tools
- `get_logs`: View project logs for debugging
- `get_advisors`: Check for security/performance issues

#### Development Tools
- `get_project_url`: Get your project's API URL
- `get_anon_key`: Get anonymous API key for client apps
- `generate_typescript_types`: Generate TypeScript types from schema

## Usage Examples

### Query Your Database
```
"Show me all articles in the database"
```

### Generate TypeScript Types
```
"Generate TypeScript types for all my database tables"
```

### Check Database Schema
```
"List all tables and their columns"
```

### Debug Issues
```
"Check for any database performance issues"
```

## Enabling Write Mode (When Needed)

To enable database writes (for schema changes):

1. Remove `--read-only` from the args in `.cursor/mcp.json`
2. Restart Cursor
3. **Remember to re-enable read-only after making changes**

## Security Best Practices

1. **Keep PAT Secret**: Never commit your Personal Access Token to git
2. **Use Read-Only by Default**: Only enable writes when necessary
3. **Project Scoping**: Always use `--project-ref` to limit access
4. **Feature Limiting**: Only enable feature groups you need

## Troubleshooting

### MCP Server Not Appearing
- Verify your PAT is correct and not expired
- Check that Node.js is installed and accessible
- Restart Cursor completely

### Permission Errors
- Ensure your PAT has sufficient permissions
- Verify the project reference is correct

### Connection Issues
- Check your internet connection
- Verify Supabase project is active and accessible

## Links

- [Official Supabase MCP Documentation](https://github.com/supabase-community/supabase-mcp)
- [MCP Client Setup Guide](https://supabase.com/blog/mcp-server)
- [Supabase Dashboard](https://supabase.com/dashboard)

---

**Note**: This replaces the previous unofficial MCP server setup. The official server provides better security, reliability, and feature support.
