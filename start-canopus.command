#!/bin/bash

# Desktop shortcut for Canopus Works
# Double-click this file to start the app

echo "🚀 Starting Canopus Works..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "📍 Current directory: $(pwd)"
    echo "🔄 Please make sure this script is in the Canopus-works project folder"
    read -p "Press Enter to continue..."
    exit 1
fi

echo "✅ Found package.json in: $(pwd)"
echo "🔥 Starting development server..."

# Start the development server
pnpm dev

# Keep terminal open if there's an error
read -p "Press Enter to close..."
