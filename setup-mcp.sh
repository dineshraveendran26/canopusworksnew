#!/bin/bash

echo "🚀 Setting up MCP Servers for Canopus Works..."
echo ""

# Check if MCP servers are installed
echo "📦 Checking MCP server installations..."

if command -v npx &> /dev/null; then
    echo "✅ npx is available"
else
    echo "❌ npx not found. Please install Node.js and npm first."
    exit 1
fi

# Test browser MCP server
echo ""
echo "🌐 Testing Browser MCP Server..."
echo "Starting browser automation server..."
npx @agent-infra/mcp-server-browser --help

# Test Supabase MCP server
echo ""
echo "🗄️ Testing Supabase MCP Server..."
echo "Starting Supabase server..."
npx @supabase/mcp-server-supabase --help

# Test filesystem MCP server
echo ""
echo "📁 Testing Filesystem MCP Server..."
echo "Starting filesystem server..."
npx @modelcontextprotocol/server-filesystem --help

echo ""
echo "✅ MCP Servers setup complete!"
echo ""
echo "🎯 Available MCP Servers:"
echo "   • Browser Automation (@agent-infra/mcp-server-browser)"
echo "   • Supabase Integration (@supabase/mcp-server-supabase)"
echo "   • Filesystem Access (@modelcontextprotocol/server-filesystem)"
echo ""
echo "📋 Configuration file: .mcp-config.json"
echo "🔧 To use with your AI assistant, point it to this config file"
echo ""
echo "💡 Example usage:"
echo "   • Browser: Navigate to URLs, take screenshots, automate tasks"
echo "   • Supabase: Query database, manage users, monitor real-time data"
echo "   • Filesystem: Read/write files, manage project structure" 