#!/bin/bash

# Navigate to the correct directory
cd "$(dirname "$0")"

echo "🚀 Starting Canopus Works App..."
echo "📍 Directory: $(pwd)"
echo "📦 Package.json found: $(ls package.json 2>/dev/null && echo "✅" || echo "❌")"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the Canopus-works directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    pnpm install
fi

# Start the development server
echo "🔥 Starting development server..."
pnpm dev
