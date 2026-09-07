-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'provider', 'staff')) DEFAULT 'staff',
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  patient_dob DATE,
  patient_ssn TEXT,
  insurance_provider TEXT NOT NULL,
  insurance_plan TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  group_number TEXT,
  claim_id TEXT NOT NULL,
  original_claim_amount DECIMAL(10,2) NOT NULL,
  service_date DATE NOT NULL,
  denial_date DATE NOT NULL,
  denial_reason TEXT NOT NULL,
  procedure_code TEXT NOT NULL,
  diagnosis_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  facility_name TEXT,
  claim_type TEXT NOT NULL,
  claim_reason TEXT NOT NULL,
  claim_description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('urgent', 'high', 'normal', 'low')) DEFAULT 'normal',
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'under_review')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claim_documents table
CREATE TABLE IF NOT EXISTS public.claim_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claim_notes table
CREATE TABLE IF NOT EXISTS public.claim_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claim_timeline table
CREATE TABLE IF NOT EXISTS public.claim_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_timeline ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for claims
CREATE POLICY "Users can view claims from their organization" ON public.claims
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR organization = (
        SELECT organization FROM public.profiles WHERE id = claims.user_id
      ))
    )
  );

CREATE POLICY "Users can create claims" ON public.claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claims" ON public.claims
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create policies for claim_documents
CREATE POLICY "Users can view documents for accessible claims" ON public.claim_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.claims 
      WHERE id = claim_documents.claim_id 
      AND (
        user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND (role = 'admin' OR organization = (
            SELECT organization FROM public.profiles WHERE id = claims.user_id
          ))
        )
      )
    )
  );

CREATE POLICY "Users can upload documents for accessible claims" ON public.claim_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.claims 
      WHERE id = claim_documents.claim_id 
      AND (
        user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND (role = 'admin' OR organization = (
            SELECT organization FROM public.profiles WHERE id = claims.user_id
          ))
        )
      )
    )
  );

-- Create policies for claim_notes
CREATE POLICY "Users can view notes for accessible claims" ON public.claim_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.claims 
      WHERE id = claim_notes.claim_id 
      AND (
        user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND (role = 'admin' OR organization = (
            SELECT organization FROM public.profiles WHERE id = claims.user_id
          ))
        )
      )
    )
  );

CREATE POLICY "Users can create notes for accessible claims" ON public.claim_notes
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.claims 
      WHERE id = claim_notes.claim_id 
      AND (
        user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND (role = 'admin' OR organization = (
            SELECT organization FROM public.profiles WHERE id = claims.user_id
          ))
        )
      )
    )
  );

-- Create policies for claim_timeline
CREATE POLICY "Users can view timeline for accessible claims" ON public.claim_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.claims 
      WHERE id = claim_timeline.claim_id 
      AND (
        user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND (role = 'admin' OR organization = (
            SELECT organization FROM public.profiles WHERE id = claims.user_id
          ))
        )
      )
    )
  );

CREATE POLICY "System can create timeline events" ON public.claim_timeline
  FOR INSERT WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, organization)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NEW.raw_user_meta_data->>'organization'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
