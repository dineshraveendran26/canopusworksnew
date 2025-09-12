-- Migration: 033_cleanup_subtasks_table.sql
-- Remove unused fields from subtasks table that are not utilized by the frontend

-- Remove unused time tracking fields (not implemented in UI)
ALTER TABLE public.subtasks DROP COLUMN IF EXISTS estimated_hours;
ALTER TABLE public.subtasks DROP COLUMN IF EXISTS actual_hours;

-- Remove unused date fields (not implemented in UI)
ALTER TABLE public.subtasks DROP COLUMN IF EXISTS start_date;
ALTER TABLE public.subtasks DROP COLUMN IF EXISTS end_date;

-- The subtasks table now only contains fields that are actively used:
-- - id, task_id, title, description, completed, order_index
-- - document_links (for attachments)
-- - completed_at, created_at, updated_at

-- Verify the cleaned schema
DO $$
BEGIN
    RAISE NOTICE 'Subtasks table schema after cleanup:';
    RAISE NOTICE 'Columns: %', (
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        FROM information_schema.columns 
        WHERE table_name = 'subtasks' 
        AND table_schema = 'public'
    );
END $$; 