-- Insert sample claims data
-- This assumes you have at least one user in the profiles table

-- Get the first user ID from profiles table
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Get the first user ID
  SELECT id INTO first_user_id FROM profiles LIMIT 1;
  
  -- Only proceed if we have a user
  IF first_user_id IS NOT NULL THEN
    -- Insert sample claims
    INSERT INTO public.claims (
      id,
      user_id,
      patient_first_name,
      patient_last_name,
      patient_id,
      patient_dob,
      patient_ssn,
      insurance_provider,
      insurance_plan,
      policy_number,
      group_number,
      claim_id,
      original_claim_amount,
      service_date,
      denial_date,
      denial_reason,
      procedure_code,
      diagnosis_code,
      provider_name,
      provider_id,
      facility_name,
      claim_type,
      claim_reason,
      claim_description,
      priority,
      status,
      created_at,
      updated_at
    ) VALUES
    -- Claim 1: Approved
    (
      gen_random_uuid(),
      first_user_id,
      'John',
      'Smith',
      'PT-10045',
      '1975-05-15',
      '123-45-6789',
      'Blue Cross Blue Shield',
      'PPO Premium',
      'BCBS12345678',
      'GRP001',
      'CL-2023-4567',
      1250.00,
      '2023-05-01',
      '2023-05-15',
      'Service deemed not medically necessary',
      '99213',
      'M79.3',
      'Dr. Sarah Johnson',
      'DR-5678',
      'General Hospital',
      'Medical Necessity',
      'The procedure was medically necessary based on patient history',
      'Patient has a documented history of chronic pain that requires this specific treatment. Previous conservative treatments have failed to provide relief.',
      'normal',
      'approved',
      NOW() - INTERVAL '30 days',
      NOW() - INTERVAL '15 days'
    ),
    -- Claim 2: Pending
    (
      gen_random_uuid(),
      first_user_id,
      'Maria',
      'Garcia',
      'PT-10046',
      '1982-08-23',
      '234-56-7890',
      'Aetna',
      'HMO Basic',
      'AET87654321',
      'GRP002',
      'CL-2023-4568',
      3450.00,
      '2023-05-10',
      '2023-05-25',
      'Coding error identified',
      '99214',
      'J45.901',
      'Dr. Robert Chen',
      'DR-5679',
      'City Medical Center',
      'Coding Error',
      'The procedure was correctly coded according to guidelines',
      'The procedure was coded correctly according to current CPT guidelines. Documentation supports the level of service billed.',
      'high',
      'pending',
      NOW() - INTERVAL '20 days',
      NOW() - INTERVAL '20 days'
    ),
    -- Claim 3: Denied
    (
      gen_random_uuid(),
      first_user_id,
      'David',
      'Wilson',
      'PT-10047',
      '1968-11-30',
      '345-67-8901',
      'Cigna',
      'PPO Standard',
      'CIG56789012',
      'GRP003',
      'CL-2023-4569',
      780.00,
      '2023-05-15',
      '2023-05-30',
      'Service not covered under current plan',
      '90791',
      'F41.9',
      'Dr. Emily Taylor',
      'DR-5680',
      'Behavioral Health Center',
      'Coverage Issue',
      'The service is covered under the patient''s plan',
      'According to the patient''s benefit summary, mental health services are covered with a $20 copay. The denial appears to be in error.',
      'normal',
      'denied',
      NOW() - INTERVAL '15 days',
      NOW() - INTERVAL '5 days'
    ),
    -- Claim 4: Approved
    (
      gen_random_uuid(),
      first_user_id,
      'Lisa',
      'Johnson',
      'PT-10048',
      '1990-03-12',
      '456-78-9012',
      'United Healthcare',
      'PPO Plus',
      'UHC45678901',
      'GRP004',
      'CL-2023-4570',
      2100.00,
      '2023-05-20',
      '2023-06-05',
      'Prior authorization not obtained',
      '29881',
      'M23.3',
      'Dr. Michael Brown',
      'DR-5681',
      'Orthopedic Specialists',
      'Prior Authorization',
      'Prior authorization was obtained before the procedure',
      'Prior authorization was obtained on 5/15/2023, reference number AUTH123456. A copy of the authorization is attached.',
      'urgent',
      'approved',
      NOW() - INTERVAL '10 days',
      NOW() - INTERVAL '2 days'
    ),
    -- Claim 5: Under Review
    (
      gen_random_uuid(),
      first_user_id,
      'Robert',
      'Davis',
      'PT-10049',
      '1972-07-08',
      '567-89-0123',
      'Humana',
      'Medicare Advantage',
      'HUM34567890',
      'GRP005',
      'CL-2023-4571',
      950.00,
      '2023-05-25',
      '2023-06-10',
      'Provider not in network',
      '73721',
      'M51.36',
      'Dr. Jennifer Lee',
      'DR-5682',
      'Advanced Imaging Center',
      'Network Issue',
      'Provider was in-network at time of service',
      'Dr. Jennifer Lee was listed as an in-network provider in the directory provided to the patient at the time of service. A screenshot of the directory is attached.',
      'high',
      'under_review',
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '1 day'
    );
    
    -- Add timeline events for each claim
    -- Claim 1 timeline
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_submitted', 
      'Claim submitted to insurance', 
      user_id, 
      created_at - INTERVAL '5 days'
    FROM public.claims WHERE patient_last_name = 'Smith' AND claim_id = 'CL-2023-4567';
    
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_denied', 
      'Claim denied by insurance', 
      user_id, 
      created_at - INTERVAL '3 days'
    FROM public.claims WHERE patient_last_name = 'Smith' AND claim_id = 'CL-2023-4567';
    
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_submitted', 
      'Claim submitted with additional documentation', 
      user_id, 
      created_at
    FROM public.claims WHERE patient_last_name = 'Smith' AND claim_id = 'CL-2023-4567';
    
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_approved', 
      'Claim approved by insurance', 
      user_id, 
      updated_at
    FROM public.claims WHERE patient_last_name = 'Smith' AND claim_id = 'CL-2023-4567';
    
    -- Add notes for each claim
    -- Claim 1 notes
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Submitted claim with additional documentation from specialist', 
      user_id, 
      created_at
    FROM public.claims WHERE patient_last_name = 'Smith' AND claim_id = 'CL-2023-4567';
    
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Called insurance to confirm receipt of claim', 
      user_id, 
      created_at + INTERVAL '2 days'
    FROM public.claims WHERE patient_last_name = 'Smith' AND claim_id = 'CL-2023-4567';
    
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Claim approved, payment expected within 30 days', 
      user_id, 
      updated_at
    FROM public.claims WHERE patient_last_name = 'Smith' AND claim_id = 'CL-2023-4567';
    
    RAISE NOTICE 'Successfully inserted sample claims data for user %', first_user_id;
  ELSE
    RAISE NOTICE 'No users found in profiles table. Please create a user first.';
  END IF;
END $$;
