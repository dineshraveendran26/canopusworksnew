# 🚀 MCP (Model Context Protocol) Setup Guide

## What is MCP?

MCP (Model Context Protocol) allows AI assistants to interact with external tools and services through standardized interfaces. This setup provides your AI assistant with:

- **🌐 Browser Automation** - Control Chrome browser, navigate websites, take screenshots
- **🗄️ Supabase Integration** - Direct database access, user management, real-time monitoring
- **📁 Filesystem Access** - Read/write files, manage project structure

## 🎯 Installed MCP Servers

### 1. Browser Automation Server
- **Package**: `@agent-infra/mcp-server-browser`
- **Capabilities**: 
  - Navigate to URLs
  - Take screenshots
  - Fill forms
  - Click elements
  - Extract page content
  - Browser automation workflows

### 2. Supabase Integration Server
- **Package**: `@supabase/mcp-server-supabase`
- **Capabilities**:
  - Query database tables
  - Manage users and permissions
  - Monitor real-time data
  - Execute SQL commands
  - Manage authentication

### 3. Filesystem Access Server
- **Package**: `@modelcontextprotocol/server-filesystem`
- **Capabilities**:
  - Read/write project files
  - Navigate directory structure
  - Manage code files
  - Create and modify documents

## 🚀 Quick Start

### 1. Run Setup Script
```bash
./setup-mcp.sh
```

### 2. Test Individual Servers
```bash
# Test browser server
npx @agent-infra/mcp-server-browser --help

# Test Supabase server
npx @supabase/mcp-server-supabase --help

# Test filesystem server
npx @modelcontextprotocol/server-filesystem --help
```

## ⚙️ Configuration

The MCP configuration is stored in `.mcp-config.json`:

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["@agent-infra/mcp-server-browser"],
      "env": {
        "BROWSER_TYPE": "chrome",
        "HEADLESS": "false"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_ANON_KEY": "${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
      }
    }
  }
}
```

## 🔧 Usage Examples

### Browser Automation
```bash
# Navigate to a website
npx @agent-infra/mcp-server-browser navigate --url "https://example.com"

# Take a screenshot
npx @agent-infra/mcp-server-browser screenshot --output "screenshot.png"
```

### Supabase Operations
```bash
# Query users table
npx @supabase/mcp-server-supabase query --sql "SELECT * FROM users LIMIT 5"

# Check real-time subscriptions
npx @supabase/mcp-server-supabase realtime --table "tasks"
```

### Filesystem Operations
```bash
# List project files
npx @modelcontextprotocol/server-filesystem list --path "."

# Read a file
npx @modelcontextprotocol/server-filesystem read --path "package.json"
```

## 🎨 Integration with AI Assistants

To use these MCP servers with your AI assistant:

1. **Point your AI assistant** to the `.mcp-config.json` file
2. **Configure environment variables** in your AI assistant settings
3. **Test basic operations** before complex workflows

## 🔒 Security Considerations

- **Browser automation** runs in non-headless mode by default
- **Supabase access** uses your existing environment variables
- **Filesystem access** is limited to your project directory
- **Environment variables** are loaded from your `.env.local` file

## 🐛 Troubleshooting

### Common Issues

**Browser server won't start:**
- Ensure Chrome/Chromium is installed
- Check if Chrome is running (close all instances)
- Verify no sandbox restrictions

**Supabase connection fails:**
- Check your `.env.local` file
- Verify Supabase project is active
- Ensure API keys are correct

**Filesystem access denied:**
- Check file permissions
- Verify working directory
- Ensure path is within project bounds

### Getting Help

1. Check server help: `npx [package-name] --help`
2. Review server logs for error messages
3. Verify environment variables are set correctly
4. Test with simple operations first

## 🚀 Next Steps

1. **Test basic operations** with each server
2. **Integrate with your AI assistant** using the config file
3. **Explore advanced features** like browser automation workflows
4. **Customize configuration** for your specific needs

## 📚 Resources

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [Browser Automation Examples](https://github.com/agent-infra/mcp-server-browser)
- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [Filesystem MCP Server](https://github.com/modelcontextprotocol/server-filesystem) 