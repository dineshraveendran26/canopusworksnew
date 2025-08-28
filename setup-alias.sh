#!/bin/bash

# This script sets up a permanent alias for starting Canopus Works

echo "🚀 Setting up permanent alias for Canopus Works..."

# Get the absolute path to the project
PROJECT_PATH="$(cd "$(dirname "$0")" && pwd)"

# Create the alias command
echo "alias canopus='cd \"$PROJECT_PATH\" && pnpm dev'" >> ~/.zshrc

# Also create a build alias
echo "alias canopus-build='cd \"$PROJECT_PATH\" && pnpm build'" >> ~/.zshrc

# Reload shell configuration
source ~/.zshrc

echo "✅ Aliases created successfully!"
echo ""
echo "🎯 Now you can use these commands from ANYWHERE:"
echo "   canopus        → Start the development server"
echo "   canopus-build  → Build the application"
echo ""
echo "🔄 Please restart your terminal or run: source ~/.zshrc"
echo ""
echo "📍 Project path: $PROJECT_PATH"
