-- Fix the email_verified unique constraint issue
-- This constraint is causing user creation to fail

-- Drop the problematic unique constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_verified_key;

-- Verify the constraint is removed
-- SELECT conname, contype 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.users'::regclass 
-- AND contype = 'u'; 