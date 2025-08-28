-- Migration: 032_remove_unused_fields.sql
-- Remove unused fields from tasks table that are not utilized by the frontend

-- Remove unused production-specific fields
ALTER TABLE public.tasks DROP COLUMN IF EXISTS machine_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS batch_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS quality_score;

-- Remove unused time tracking fields (not implemented in UI)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS estimated_hours;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS actual_hours;

-- Remove unused assigned_to field (replaced by task_assignments table)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assigned_to;

-- Update the schema to reflect the cleaned structure
-- The tasks table now only contains fields that are actively used:
-- - id, title, description, priority, status
-- - start_date, due_date, department
-- - document_links (for attachments)
-- - created_by, created_at, updated_at, completed_at

-- Verify the cleaned schema
DO $$
BEGIN
    RAISE NOTICE 'Tasks table schema after cleanup:';
    RAISE NOTICE 'Columns: %', (
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND table_schema = 'public'
    );
END $$; 