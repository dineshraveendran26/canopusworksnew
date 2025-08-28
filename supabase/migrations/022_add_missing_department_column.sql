-- Add missing department column to tasks table
-- Migration: 022_add_missing_department_column.sql

-- Check if department column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'department'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN department VARCHAR(100);
        RAISE NOTICE 'Added department column to tasks table';
    ELSE
        RAISE NOTICE 'Department column already exists in tasks table';
    END IF;
END $$;

-- Update existing tasks to have a default department if they don't have one
UPDATE public.tasks 
SET department = 'Production' 
WHERE department IS NULL;

-- Make sure the column is not null for future inserts
ALTER TABLE public.tasks ALTER COLUMN department SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN department SET DEFAULT 'Production'; 