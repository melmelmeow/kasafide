-- 017_profiles_roles.sql
-- Aligns role types and public.profiles table with the 4 standard application roles:
-- 'buyer', 'seller', 'admin', 'super_admin' (plus legacy compatibility with 'superadmin' / 'super_duper_admin')
-- Ensures auto-creation trigger on auth.users handles new registrations safely,
-- and configures strict Row Level Security (RLS) preventing self-escalation of roles.

-- 1. Ensure user_role enum supports 'super_admin' if enum exists
DO $$
DECLARE
  enum_schema text;
BEGIN
  SELECT n.nspname INTO enum_schema
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname = 'user_role' AND t.typtype = 'e'
  LIMIT 1;

  IF enum_schema IS NOT NULL THEN
    -- Add super_admin if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin'
    ) THEN
      EXECUTE format('ALTER TYPE %I.user_role ADD VALUE %L', enum_schema, 'super_admin');
    END IF;
  END IF;
END $$;

-- 2. Ensure profiles table and columns exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar(255),
  full_name varchar(255) DEFAULT '',
  first_name varchar(100),
  last_name varchar(100),
  phone_number varchar(50) DEFAULT '',
  role varchar(50) DEFAULT 'buyer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure all required columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email varchar(255),
  ADD COLUMN IF NOT EXISTS full_name varchar(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_name varchar(100),
  ADD COLUMN IF NOT EXISTS last_name varchar(100),
  ADD COLUMN IF NOT EXISTS phone_number varchar(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS role varchar(50) DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Security helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'superadmin', 'super_duper_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'superadmin', 'super_duper_admin')
  );
$$;

-- 4. Automatic profile creation trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role text;
  req_role text;
  meta_first text;
  meta_last text;
  meta_full text;
BEGIN
  req_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'));
  -- Security Rule: Public signup may ONLY set 'buyer' or 'seller'. Never trust client for admin / super_admin!
  IF req_role = 'seller' THEN
    assigned_role := 'seller';
  ELSE
    assigned_role := 'buyer';
  END IF;

  meta_first := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  meta_last := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  meta_full := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  IF meta_full = '' AND (meta_first <> '' OR meta_last <> '') THEN
    meta_full := TRIM(CONCAT(meta_first, ' ', meta_last));
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone_number,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    meta_full,
    meta_first,
    meta_last,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'phone', ''),
    assigned_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Prevent users from modifying their own role via trigger (Defense in Depth)
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- If invoked by an authenticated client session
  IF auth.uid() IS NOT NULL THEN
    IF NEW.role::text IS DISTINCT FROM OLD.role::text AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Access denied: only super_admin can modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 6. Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies if any
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read buyer and seller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins update all profiles" ON public.profiles;

-- RLS: A user can select their own row
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- RLS: Admin can read buyer and seller profiles
CREATE POLICY "Admins can read buyer and seller profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_admin() AND role::text IN ('buyer', 'seller')
  );

-- RLS: Super admin can read all profiles
CREATE POLICY "Super admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

-- RLS: Users can update their own row (role protected by trigger)
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS: Super admin can update all profiles, including role
CREATE POLICY "Super admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
