-- Migration: Fix conflicting RLS policies for comments table
-- This will clean up duplicate policies and create proper ones

-- First, drop all existing conflicting policies
DROP POLICY IF EXISTS "Authenticated users can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can update comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can delete comments" ON comments;
DROP POLICY IF EXISTS "All users can view comments" ON comments;
DROP POLICY IF EXISTS "Admins and managers can create comments" ON comments;
DROP POLICY IF EXISTS "Admins and managers can update comments" ON comments;
DROP POLICY IF EXISTS "Admins and managers can delete comments" ON comments;

-- Enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create simple, working RLS policies for comments
-- All authenticated users can view all comments
CREATE POLICY "comments_select_policy" ON comments
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert comments
CREATE POLICY "comments_insert_policy" ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "comments_update_policy" ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "comments_delete_policy" ON comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT USAGE ON SEQUENCE comments_id_seq TO authenticated; 