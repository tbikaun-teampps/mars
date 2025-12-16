-- ============================================================================
-- SYNC PROFILE EMAILS
-- ============================================================================
-- This migration:
-- 1. Backfills existing profiles with emails from auth.users
-- 2. Updates the handle_new_user trigger to include email on new user creation

-- Backfill existing users' emails from auth.users
UPDATE public.profiles p
SET email = a.email
FROM auth.users a
WHERE p.id = a.id AND p.email IS NULL;

-- Update trigger to include email on new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, split_part(NEW.email, '@', 1), NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;