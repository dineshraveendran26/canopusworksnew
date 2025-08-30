-- Migration: Add performance indexes for comments table
-- These indexes will significantly improve comment loading performance

-- Index for task comments ordered by creation time
CREATE INDEX IF NOT EXISTS idx_comments_task_id_created 
ON comments(task_id, created_at DESC) 
WHERE task_id IS NOT NULL;

-- Index for subtask comments ordered by creation time  
CREATE INDEX IF NOT EXISTS idx_comments_subtask_id_created 
ON comments(subtask_id, created_at DESC) 
WHERE subtask_id IS NOT NULL;

-- Index for author lookups
CREATE INDEX IF NOT EXISTS idx_comments_author_id 
ON comments(author_id);

-- Composite index for user-specific comment queries
CREATE INDEX IF NOT EXISTS idx_comments_author_created 
ON comments(author_id, created_at DESC); 