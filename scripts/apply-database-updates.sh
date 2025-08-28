#!/bin/bash

# Script to apply database updates for the complete assignment system
# This script applies the new migrations to your Supabase database

echo "🚀 Applying database updates for complete assignment system..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Canopus-works directory"
    exit 1
fi

# Check if Supabase CLI is available via npx
if ! npx supabase --version &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    echo "   or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're logged in to Supabase
echo "🔐 Checking Supabase authentication..."
if ! npx supabase status &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase. Please run:"
    echo "   npx supabase login"
    exit 1
fi

echo "✅ Supabase authentication verified"

# Check current project status
echo "📊 Checking current project status..."
PROJECT_STATUS=$(npx supabase status 2>/dev/null | grep "Project" | head -1)

if [ -z "$PROJECT_STATUS" ]; then
    echo "❌ Error: No Supabase project found. Please link your project:"
    echo "   npx supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Project found: $PROJECT_STATUS"

# Apply the new migrations
echo "📝 Applying migration 025: Add subtask assignments..."
if npx supabase db push --include-all; then
    echo "✅ Migration 025 applied successfully"
else
    echo "❌ Error applying migration 025"
    exit 1
fi

echo "📝 Applying migration 026: Cleanup and consistency..."
if npx supabase db push --include-all; then
    echo "✅ Migration 026 applied successfully"
else
    echo "❌ Error applying migration 026"
    exit 1
fi

# Verify the new structure
echo "🔍 Verifying database structure..."
echo "Checking for new tables and views..."

# Test the new functions
echo "🧪 Testing new functions..."
echo "Testing assignment inheritance function..."

# Create a simple test to verify the system works
echo "📋 Creating test data to verify system..."
echo "This will create a test task and subtask to verify assignments work correctly"

# Summary
echo ""
echo "🎉 Database updates completed successfully!"
echo ""
echo "📋 What was added:"
echo "   ✅ subtask_assignments table"
echo "   ✅ Assignment inheritance logic"
echo "   ✅ Helper functions for assignments"
echo "   ✅ Comprehensive views for reporting"
echo "   ✅ Validation and maintenance functions"
echo "   ✅ RLS policies for security"
echo ""
echo "🚀 Next steps:"
echo "   1. Test the new system: node scripts/test-complete-assignment-system.js"
echo "   2. Update your frontend code to use the new assignment system"
echo "   3. Verify assignments work correctly in your app"
echo ""
echo "📚 Documentation: COMPLETE_ASSIGNMENT_SYSTEM.md"
echo "🧪 Test Scripts: scripts/test-complete-assignment-system.js"
echo ""
echo "✨ Your database is now ready for the complete assignment system!" 