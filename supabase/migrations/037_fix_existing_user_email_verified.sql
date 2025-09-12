-- Fix the existing user's email_verified status to prevent future conflicts
-- Set the admin user's email_verified to true since they're already active

UPDATE public.users 
SET email_verified = TRUE 
WHERE email = 'dineshraveendran26@gmail.com' 
AND email_verified = FALSE;

-- Also fix the other admin user if it exists
UPDATE public.users 
SET email_verified = TRUE 
WHERE email = 'dineshraveendran26@hotmail.com' 
AND email_verified = FALSE; 