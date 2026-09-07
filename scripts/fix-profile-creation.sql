-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create an improved function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
  user_org TEXT;
BEGIN
  -- Extract metadata with fallbacks
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  user_org := NEW.raw_user_meta_data->>'organization';

  -- Validate role
  IF user_role NOT IN ('admin', 'provider', 'staff') THEN
    user_role := 'staff';
  END IF;

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, organization, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_role,
      user_org,
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error (in a real app, you'd want proper logging)
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Don't fail the signup, just log the error
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create a function to manually create profiles if needed
CREATE OR REPLACE FUNCTION public.create_profile_if_missing(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;
  
  IF profile_exists THEN
    RETURN TRUE;
  END IF;

  -- Get user data
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role, organization, created_at, updated_at)
  VALUES (
    user_record.id,
    user_record.email,
    COALESCE(user_record.raw_user_meta_data->>'full_name', split_part(user_record.email, '@', 1)),
    COALESCE(user_record.raw_user_meta_data->>'role', 'staff'),
    user_record.raw_user_meta_data->>'organization',
    NOW(),
    NOW()
  );

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
