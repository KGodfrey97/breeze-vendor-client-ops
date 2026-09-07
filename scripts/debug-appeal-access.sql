-- Debug script to check claim access and RLS policies
-- Run this to understand the data and access patterns

-- Check if the specific claim exists
SELECT 
  id,
  user_id,
  patient_first_name,
  patient_last_name,
  claim_id,
  created_at
FROM public.claims 
WHERE id = '5bf39f7f-7bbe-465b-b986-8f99b872882e';

-- Check all claims for the current user (if any)
SELECT 
  id,
  user_id,
  patient_first_name,
  patient_last_name,
  claim_id,
  created_at
FROM public.claims 
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any users in profiles table
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- Check RLS policies on claims table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'claims';

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'claims';
