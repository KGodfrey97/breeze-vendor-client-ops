-- Create appeal_letters table to store generated letters
CREATE TABLE IF NOT EXISTS public.appeal_letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  letter_content TEXT NOT NULL,
  generated_by UUID REFERENCES public.profiles(id) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  letter_type TEXT DEFAULT 'appeal_letter',
  status TEXT CHECK (status IN ('draft', 'final', 'sent')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add letter_generated status to claims table
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS letter_status TEXT CHECK (letter_status IN ('not_generated', 'generated', 'sent')) DEFAULT 'not_generated';

-- Enable Row Level Security
ALTER TABLE public.appeal_letters ENABLE ROW LEVEL SECURITY;

-- Create policies for appeal_letters
CREATE POLICY "Users can view letters for accessible claims" ON public.appeal_letters
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.claims 
    WHERE id = appeal_letters.claim_id 
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

CREATE POLICY "Users can create letters for accessible claims" ON public.appeal_letters
FOR INSERT WITH CHECK (
  generated_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.claims 
    WHERE id = appeal_letters.claim_id 
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

CREATE POLICY "Users can update own letters" ON public.appeal_letters
FOR UPDATE USING (
  generated_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_appeal_letters_updated_at
  BEFORE UPDATE ON public.appeal_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
