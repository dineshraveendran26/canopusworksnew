-- Add missing department column to users table
-- Migration: 028_add_missing_department_column.sql

-- Add department column to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add full_name column if it doesn't exist (for backward compatibility)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Update full_name to combine first_name and last_name if full_name is null
UPDATE public.users 
SET full_name = CONCAT(first_name, ' ', last_name) 
WHERE full_name IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;

-- Add initials column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initials VARCHAR(10);

-- Update initials based on full_name or first_name
UPDATE public.users 
SET initials = UPPER(LEFT(COALESCE(full_name, first_name), 1)) 
WHERE initials IS NULL AND (full_name IS NOT NULL OR first_name IS NOT NULL);

-- Add join_date column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;

-- Add status column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add avatar_url column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add location column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Make sure all required columns have default values
ALTER TABLE public.users ALTER COLUMN department SET DEFAULT 'General';
ALTER TABLE public.users ALTER COLUMN full_name SET DEFAULT 'Unknown User';
ALTER TABLE public.users ALTER COLUMN initials SET DEFAULT 'U'; 