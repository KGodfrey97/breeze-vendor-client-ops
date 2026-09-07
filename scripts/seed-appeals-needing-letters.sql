-- Insert additional claims that need letters to be generated
-- This will add claims with letter_status = 'not_generated'

DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Get the first user ID from profiles table
  SELECT id INTO first_user_id FROM profiles LIMIT 1;
  
  -- Only proceed if we have a user
  IF first_user_id IS NOT NULL THEN
    -- Insert claims that need letters generated
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
      letter_status,
      created_at,
      updated_at
    ) VALUES
    -- Claim 1: Medical Necessity - Needs Letter
    (
      gen_random_uuid(),
      first_user_id,
      'Sarah',
      'Thompson',
      'PT-10050',
      '1985-12-03',
      '678-90-1234',
      'Blue Cross Blue Shield',
      'PPO Premium',
      'BCBS98765432',
      'GRP006',
      'CL-2024-1001',
      2850.00,
      '2024-01-15',
      '2024-01-30',
      'Procedure deemed experimental and not medically necessary according to current guidelines',
      '27447',
      'M25.561',
      'Dr. Amanda Rodriguez',
      'DR-5683',
      'Orthopedic Surgery Center',
      'Medical Necessity',
      'The arthroscopic procedure is medically necessary for this patient''s condition',
      'Patient has failed conservative treatment including physical therapy for 6 months and anti-inflammatory medications. MRI shows significant cartilage damage that requires surgical intervention. The procedure is standard of care for this condition and is covered under the patient''s plan.',
      'high',
      'pending',
      'not_generated',
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days'
    ),
    -- Claim 2: Prior Authorization - Needs Letter
    (
      gen_random_uuid(),
      first_user_id,
      'Michael',
      'Chen',
      'PT-10051',
      '1978-09-14',
      '789-01-2345',
      'Aetna',
      'HMO Plus',
      'AET11223344',
      'GRP007',
      'CL-2024-1002',
      4200.00,
      '2024-01-20',
      '2024-02-05',
      'Prior authorization was not obtained before the procedure was performed',
      '43239',
      'K57.32',
      'Dr. James Park',
      'DR-5684',
      'Gastroenterology Associates',
      'Prior Authorization',
      'Prior authorization was obtained but may not have been properly documented',
      'Prior authorization was requested and approved on January 18, 2024, two days before the procedure. The authorization number is PA-2024-0156. The procedure was medically necessary due to the patient''s recurring diverticulitis episodes that failed to respond to medical management.',
      'urgent',
      'pending',
      'not_generated',
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days'
    ),
    -- Claim 3: Coding Error - Needs Letter
    (
      gen_random_uuid(),
      first_user_id,
      'Jennifer',
      'Martinez',
      'PT-10052',
      '1992-06-28',
      '890-12-3456',
      'Cigna',
      'PPO Standard',
      'CIG55667788',
      'GRP008',
      'CL-2024-1003',
      1650.00,
      '2024-01-25',
      '2024-02-10',
      'Incorrect procedure code submitted - code does not match the procedure performed',
      '99214',
      'Z00.00',
      'Dr. Lisa Wang',
      'DR-5685',
      'Family Medicine Clinic',
      'Coding Error',
      'The procedure code is correct according to current CPT guidelines',
      'The procedure code 99214 is appropriate for this level 4 office visit. The patient presented with multiple complex medical issues requiring comprehensive evaluation and management. Documentation supports the level of service billed according to 2024 E/M guidelines.',
      'normal',
      'pending',
      'not_generated',
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '7 days'
    ),
    -- Claim 4: Coverage Issue - Needs Letter
    (
      gen_random_uuid(),
      first_user_id,
      'Robert',
      'Anderson',
      'PT-10053',
      '1965-03-17',
      '901-23-4567',
      'United Healthcare',
      'Medicare Advantage',
      'UHC77889900',
      'GRP009',
      'CL-2024-1004',
      3100.00,
      '2024-02-01',
      '2024-02-15',
      'Service not covered under current benefit plan - considered cosmetic',
      '15823',
      'L02.91',
      'Dr. Kevin Brown',
      'DR-5686',
      'Dermatology Specialists',
      'Coverage Issue',
      'The procedure is medically necessary, not cosmetic',
      'The lesion removal was medically necessary due to suspicious characteristics noted on examination. Pathology confirmed atypical cells requiring complete excision. This was not a cosmetic procedure but a medically necessary intervention to prevent potential malignancy.',
      'high',
      'pending',
      'not_generated',
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    ),
    -- Claim 5: Network Issue - Needs Letter
    (
      gen_random_uuid(),
      first_user_id,
      'Patricia',
      'Williams',
      'PT-10054',
      '1988-11-09',
      '012-34-5678',
      'Humana',
      'PPO Choice',
      'HUM22334455',
      'GRP010',
      'CL-2024-1005',
      890.00,
      '2024-02-05',
      '2024-02-20',
      'Provider not in network at time of service - out-of-network rates applied',
      '80053',
      'Z01.411',
      'Dr. Maria Gonzalez',
      'DR-5687',
      'LabCorp Diagnostics',
      'Network Issue',
      'Provider was in-network at time of service',
      'Dr. Maria Gonzalez and LabCorp Diagnostics were listed as in-network providers in the directory provided to the patient at the time of service. The patient verified network status before scheduling the appointment. Screenshots of the provider directory from the date of service are available as supporting documentation.',
      'normal',
      'pending',
      'not_generated',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    ),
    -- Claim 6: Billing Error - Needs Letter
    (
      gen_random_uuid(),
      first_user_id,
      'Thomas',
      'Johnson',
      'PT-10055',
      '1973-08-22',
      '123-45-6789',
      'Blue Cross Blue Shield',
      'HMO Basic',
      'BCBS33445566',
      'GRP011',
      'CL-2024-1006',
      2200.00,
      '2024-02-08',
      '2024-02-22',
      'Duplicate billing detected - service already paid under different claim',
      '93306',
      'I25.10',
      'Dr. Richard Davis',
      'DR-5688',
      'Cardiology Center',
      'Billing Error',
      'This is not a duplicate billing - services were provided on different dates',
      'The echocardiogram services were provided on two separate dates for different clinical indications. The first study on January 15th was for routine follow-up, while the February 8th study was ordered due to new symptoms of chest pain and shortness of breath. These are distinct services with different medical justifications.',
      'normal',
      'pending',
      'not_generated',
      NOW() - INTERVAL '4 days',
      NOW() - INTERVAL '4 days'
    );
    
    -- Add timeline events for the new claims
    -- Claim 1 timeline
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_submitted', 
      'Claim submitted to insurance', 
      user_id, 
      created_at - INTERVAL '2 days'
    FROM public.claims WHERE patient_last_name = 'Thompson' AND claim_id = 'CL-2024-1001';
    
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_denied', 
      'Claim denied by insurance', 
      user_id, 
      created_at - INTERVAL '1 day'
    FROM public.claims WHERE patient_last_name = 'Thompson' AND claim_id = 'CL-2024-1001';
    
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_submitted', 
      'Claim created and ready for letter generation', 
      user_id, 
      created_at
    FROM public.claims WHERE patient_last_name = 'Thompson' AND claim_id = 'CL-2024-1001';
    
    -- Claim 2 timeline
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_submitted', 
      'Claim submitted to insurance', 
      user_id, 
      created_at - INTERVAL '1 day'
    FROM public.claims WHERE patient_last_name = 'Chen' AND claim_id = 'CL-2024-1002';
    
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_denied', 
      'Claim denied - prior authorization issue', 
      user_id, 
      created_at
    FROM public.claims WHERE patient_last_name = 'Chen' AND claim_id = 'CL-2024-1002';
    
    -- Claim 3 timeline
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_submitted', 
      'Claim submitted to insurance', 
      user_id, 
      created_at - INTERVAL '3 days'
    FROM public.claims WHERE patient_last_name = 'Martinez' AND claim_id = 'CL-2024-1003';
    
    INSERT INTO public.claim_timeline (claim_id, event_type, event_description, created_by, created_at)
    SELECT 
      id, 
      'claim_denied', 
      'Claim denied - coding error identified', 
      user_id, 
      created_at - INTERVAL '1 day'
    FROM public.claims WHERE patient_last_name = 'Martinez' AND claim_id = 'CL-2024-1003';
    
    -- Add notes for claims needing letters
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Claim created - letter generation needed to proceed with formal claim process', 
      user_id, 
      created_at
    FROM public.claims WHERE patient_last_name = 'Thompson' AND claim_id = 'CL-2024-1001';
    
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Urgent: Prior authorization documentation needs to be included in appeal letter', 
      user_id, 
      created_at + INTERVAL '1 hour'
    FROM public.claims WHERE patient_last_name = 'Chen' AND claim_id = 'CL-2024-1002';
    
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Reviewed documentation - coding is correct per 2024 guidelines', 
      user_id, 
      created_at + INTERVAL '2 hours'
    FROM public.claims WHERE patient_last_name = 'Martinez' AND claim_id = 'CL-2024-1003';
    
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Pathology report confirms medical necessity - not cosmetic procedure', 
      user_id, 
      created_at + INTERVAL '30 minutes'
    FROM public.claims WHERE patient_last_name = 'Anderson' AND claim_id = 'CL-2024-1004';
    
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Provider directory screenshots saved as evidence of in-network status', 
      user_id, 
      created_at + INTERVAL '45 minutes'
    FROM public.claims WHERE patient_last_name = 'Williams' AND claim_id = 'CL-2024-1005';
    
    INSERT INTO public.claim_notes (claim_id, note, created_by, created_at)
    SELECT 
      id, 
      'Verified: Two separate services on different dates with different indications', 
      user_id, 
      created_at + INTERVAL '1 hour'
    FROM public.claims WHERE patient_last_name = 'Johnson' AND claim_id = 'CL-2024-1006';
    
    RAISE NOTICE 'Successfully inserted 6 new claims needing letter generation for user %', first_user_id;
  ELSE
    RAISE NOTICE 'No users found in profiles table. Please create a user first.';
  END IF;
END $$;
