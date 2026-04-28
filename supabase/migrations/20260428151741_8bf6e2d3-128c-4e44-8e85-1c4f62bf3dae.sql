-- Complete the seeded test dataset that Phase 1 left unfinished.
-- Idempotent: it only tops up missing sample rows for the two known test orgs.

DO $$
DECLARE
  v_baghdad_org uuid;
  v_erbil_org uuid;
  v_admin uuid;
  v_erbil_admin uuid;
  v_person_count int;
  v_entity_count int;
  v_case_count int;
  v_errand_count int;
  v_task_count int;
  v_invoice_count int;
  v_governorates text[] := ARRAY['Baghdad','Basra','Nineveh','Erbil','Najaf','Karbala','Dhi Qar','Diyala','Anbar','Kirkuk'];
  v_first_names text[] := ARRAY['Hussein','Yousif','Hassan','Rana','Mohammed','Ahmed','Sara','Ali','Layla','Omar','Zainab','Karim'];
  v_last_names text[] := ARRAY['Al-Tamimi','Al-Hashimi','Al-Rubaie','Al-Janabi','Al-Maliki','Al-Mosawi','Al-Khafaji','Al-Dulaimi','Al-Karbalai','Al-Najjar'];
BEGIN
  SELECT id INTO v_baghdad_org FROM public.organizations WHERE name = 'Baghdad Test Legal' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_erbil_org FROM public.organizations WHERE name = 'Erbil Test Legal' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_admin FROM public.profiles WHERE email = 'yousif.alnajjar@baghdadtest.qanuni' LIMIT 1;
  SELECT id INTO v_erbil_admin FROM public.profiles WHERE email = 'admin@erbiltest.qanuni' LIMIT 1;

  IF v_baghdad_org IS NULL OR v_admin IS NULL THEN
    RAISE NOTICE 'Skipping test dataset completion: Baghdad test org or admin is missing.';
    RETURN;
  END IF;

  SELECT count(*) INTO v_person_count FROM public.persons
  WHERE organization_id = v_baghdad_org AND tags @> ARRAY['seed:phase2'];

  IF v_person_count < 70 THEN
    INSERT INTO public.persons (
      organization_id, first_name, last_name, email, phone, address, city,
      governorate, country, tags, status, is_visible_to_client, created_by
    )
    SELECT
      v_baghdad_org,
      v_first_names[1 + ((gs - 1) % array_length(v_first_names, 1))],
      v_last_names[1 + ((gs - 1) % array_length(v_last_names, 1))],
      'baghdad.client' || gs || '@seed.qanuni',
      '+964770' || lpad(gs::text, 7, '0'),
      'District ' || (1 + (gs % 12)) || ', Baghdad',
      'Baghdad',
      v_governorates[1 + ((gs - 1) % array_length(v_governorates, 1))],
      'IQ', ARRAY['seed:phase2'], 'active', true, v_admin
    FROM generate_series(1, 70) gs
    WHERE NOT EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.organization_id = v_baghdad_org
        AND p.email = 'baghdad.client' || gs || '@seed.qanuni'
    );
  END IF;

  IF v_erbil_org IS NOT NULL AND v_erbil_admin IS NOT NULL THEN
    INSERT INTO public.persons (
      organization_id, first_name, last_name, email, phone, address, city,
      governorate, country, tags, status, is_visible_to_client, created_by
    )
    SELECT
      v_erbil_org,
      v_first_names[1 + ((gs - 1) % array_length(v_first_names, 1))],
      v_last_names[1 + ((gs + 2) % array_length(v_last_names, 1))],
      'erbil.client' || gs || '@seed.qanuni',
      '+964750' || lpad(gs::text, 7, '0'),
      'District ' || (1 + (gs % 8)) || ', Erbil',
      'Erbil', 'Erbil', 'IQ', ARRAY['seed:phase2'], 'active', true, v_erbil_admin
    FROM generate_series(1, 10) gs
    WHERE NOT EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.organization_id = v_erbil_org
        AND p.email = 'erbil.client' || gs || '@seed.qanuni'
    );
  END IF;

  SELECT count(*) INTO v_entity_count FROM public.entities
  WHERE organization_id = v_baghdad_org AND tags @> ARRAY['seed:phase2'];

  IF v_entity_count < 30 THEN
    INSERT INTO public.entities (
      organization_id, company_name, company_type, company_registration_number,
      industry, email, phone, address, city, governorate, country, tags,
      status, is_visible_to_client, created_by
    )
    SELECT
      v_baghdad_org,
      'Seed Company ' || gs || ' LLC',
      (ARRAY['llc','partnership','joint_stock','ministry','ngo'])[1 + (gs % 5)],
      'CR-BGD-' || lpad(gs::text, 5, '0'),
      (ARRAY['Construction','Trade','Real Estate','Logistics','Technology'])[1 + (gs % 5)],
      'company' || gs || '@seed.qanuni',
      '+964780' || lpad(gs::text, 7, '0'),
      'Commercial Street ' || gs || ', Baghdad',
      'Baghdad', 'Baghdad', 'IQ', ARRAY['seed:phase2'], 'active', true, v_admin
    FROM generate_series(1, 30) gs
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.organization_id = v_baghdad_org
        AND e.company_registration_number = 'CR-BGD-' || lpad(gs::text, 5, '0')
    );
  END IF;

  INSERT INTO public.entity_representatives (
    organization_id, entity_id, person_id, role, job_title, is_primary, receives_notifications
  )
  SELECT v_baghdad_org, e.id, p.id, 'authorized_rep', 'Managing Partner', true, true
  FROM (
    SELECT id, row_number() OVER (ORDER BY company_registration_number)::int rn
    FROM public.entities
    WHERE organization_id = v_baghdad_org AND tags @> ARRAY['seed:phase2']
  ) e
  JOIN (
    SELECT id, row_number() OVER (ORDER BY email)::int rn
    FROM public.persons
    WHERE organization_id = v_baghdad_org AND tags @> ARRAY['seed:phase2']
  ) p ON p.rn = e.rn
  WHERE e.rn <= 12
  ON CONFLICT (entity_id, person_id, role) DO NOTHING;

  INSERT INTO public.portal_user_links (portal_user_id, organization_id, person_id, is_active)
  SELECT pu.id, v_baghdad_org, p.id, true
  FROM public.portal_users pu
  JOIN LATERAL (
    SELECT id FROM public.persons
    WHERE organization_id = v_baghdad_org AND tags @> ARRAY['seed:phase2']
    ORDER BY (regexp_replace(email, '[^0-9]', '', 'g'))::int
    OFFSET ((regexp_replace(pu.email, '[^0-9]', '', 'g'))::int - 1)
    LIMIT 1
  ) p ON true
  WHERE pu.email ~ '^client([1-9]|1[0-5])@portaltest\.qanuni$'
  ON CONFLICT (portal_user_id, organization_id, person_id) DO NOTHING;

  IF v_erbil_org IS NOT NULL THEN
    INSERT INTO public.portal_user_links (portal_user_id, organization_id, person_id, is_active)
    SELECT pu.id, v_erbil_org, p.id, true
    FROM public.portal_users pu
    JOIN LATERAL (
      SELECT id FROM public.persons
      WHERE organization_id = v_erbil_org AND tags @> ARRAY['seed:phase2']
      ORDER BY (regexp_replace(email, '[^0-9]', '', 'g'))::int
      OFFSET ((regexp_replace(pu.email, '[^0-9]', '', 'g'))::int - 1)
      LIMIT 1
    ) p ON true
    WHERE pu.email IN ('client1@portaltest.qanuni', 'client2@portaltest.qanuni', 'client3@portaltest.qanuni')
    ON CONFLICT (portal_user_id, organization_id, person_id) DO NOTHING;
  END IF;

  SELECT count(*) INTO v_case_count FROM public.cases
  WHERE organization_id = v_baghdad_org AND description = 'Auto-seeded Phase 2 test matter';

  IF v_case_count < 60 THEN
    WITH person_rows AS (
      SELECT id, (row_number() OVER (ORDER BY email))::int rn
      FROM public.persons
      WHERE organization_id = v_baghdad_org AND tags @> ARRAY['seed:phase2']
      LIMIT 70
    ),
    inserted_cases AS (
      INSERT INTO public.cases (
        organization_id, case_number, title, description, case_type, status,
        priority, court_type, court_name, court_location, court_case_number,
        filing_date, estimated_value, estimated_value_currency,
        is_visible_to_client, created_by
      )
      SELECT
        v_baghdad_org, '',
        'Seed Matter #' || gs,
        'Auto-seeded Phase 2 test matter',
        (ARRAY['civil','commercial','criminal','labor','real_estate','family'])[1 + (gs % 6)],
        (ARRAY['intake','active','pending','on_hold','closed'])[1 + (gs % 5)],
        (ARRAY['low','normal','high','urgent'])[1 + (gs % 4)],
        (ARRAY['civil','commercial','criminal','appeal','cassation'])[1 + (gs % 5)],
        (ARRAY['Baghdad Court of First Instance','Karkh Civil Court','Rusafa Commercial Court','Federal Cassation Court'])[1 + (gs % 4)],
        'Baghdad',
        'BGD/' || (2025 + (gs % 2)) || '/' || lpad(gs::text, 4, '0'),
        CURRENT_DATE - (gs * 3),
        1000000 + (gs * 250000),
        'IQD',
        gs <= 45,
        v_admin
      FROM generate_series(1, 60) gs
      RETURNING id
    ),
    numbered_cases AS (
      SELECT id, (row_number() OVER (ORDER BY id))::int rn
      FROM inserted_cases
    )
    INSERT INTO public.case_parties (
      organization_id, case_id, party_type, person_id, role, is_primary
    )
    SELECT v_baghdad_org, c.id, 'person', p.id, 'client', true
    FROM numbered_cases c
    JOIN person_rows p ON p.rn = 1 + ((c.rn - 1) % 70);
  END IF;

  INSERT INTO public.case_hearings (
    organization_id, case_id, hearing_date, hearing_time, hearing_type,
    status, court_room, notes
  )
  SELECT v_baghdad_org, c.id, CURRENT_DATE + ((c.rn % 30)::int),
         ('09:00'::time + (((c.rn % 5)::int) || ' hours')::interval),
         (ARRAY['first_hearing','evidence','pleading','judgment'])[1 + ((c.rn % 4)::int)],
         'scheduled',
         'Room ' || (1 + ((c.rn % 12)::int)),
         'Auto-seeded hearing'
  FROM (
    SELECT id, (row_number() OVER (ORDER BY created_at))::int rn
    FROM public.cases
    WHERE organization_id = v_baghdad_org
      AND description = 'Auto-seeded Phase 2 test matter'
    LIMIT 24
  ) c
  WHERE NOT EXISTS (SELECT 1 FROM public.case_hearings h WHERE h.case_id = c.id);

  SELECT count(*) INTO v_errand_count FROM public.errands
  WHERE organization_id = v_baghdad_org AND description = 'Auto-seeded Phase 2 errand';

  IF v_errand_count < 20 THEN
    WITH case_rows AS (
      SELECT id, (row_number() OVER (ORDER BY created_at))::int rn
      FROM public.cases
      WHERE organization_id = v_baghdad_org
        AND description = 'Auto-seeded Phase 2 test matter'
      LIMIT 60
    ),
    party_rows AS (
      SELECT cp.case_id, cp.person_id
      FROM public.case_parties cp
      WHERE cp.organization_id = v_baghdad_org
        AND cp.role = 'client' AND cp.is_primary = true
    )
    INSERT INTO public.errands (
      organization_id, errand_number, title, description, errand_type, status,
      priority, party_type, person_id, case_id, assigned_to, due_date,
      is_visible_to_client, created_by
    )
    SELECT
      v_baghdad_org, '',
      'Seed Errand #' || gs,
      'Auto-seeded Phase 2 errand',
      (ARRAY['court_filing','document_collection','notary','registry','other'])[1 + (gs % 5)],
      (ARRAY['pending','in_progress','waiting','completed'])[1 + (gs % 4)],
      (ARRAY['low','normal','high'])[1 + (gs % 3)],
      'person', pr.person_id, cr.id, s.id,
      CURRENT_DATE + (gs * 2),
      gs <= 15, v_admin
    FROM generate_series(1, 20) gs
    JOIN case_rows cr ON cr.rn = gs
    JOIN party_rows pr ON pr.case_id = cr.id
    JOIN LATERAL (
      SELECT id FROM public.profiles
      WHERE organization_id = v_baghdad_org
        AND role IN ('lawyer','paralegal','secretary','accountant')
      ORDER BY email
      OFFSET (gs % 10)
      LIMIT 1
    ) s ON true;
  END IF;

  INSERT INTO public.errand_steps (organization_id, errand_id, step_order, title, status, completed_at, completed_by)
  SELECT e.organization_id, e.id, gs,
         (ARRAY['Prepare documents','Submit filing','Follow up','Collect result'])[gs],
         CASE WHEN gs < 3 AND e.status IN ('in_progress','waiting','completed') THEN 'completed' ELSE 'pending' END,
         CASE WHEN gs < 3 AND e.status IN ('in_progress','waiting','completed') THEN now() - interval '2 days' ELSE NULL END,
         CASE WHEN gs < 3 AND e.status IN ('in_progress','waiting','completed') THEN e.assigned_to ELSE NULL END
  FROM public.errands e
  CROSS JOIN generate_series(1, 4) gs
  WHERE e.organization_id = v_baghdad_org
    AND e.description = 'Auto-seeded Phase 2 errand'
    AND NOT EXISTS (SELECT 1 FROM public.errand_steps es WHERE es.errand_id = e.id);

  UPDATE public.errands e
  SET total_steps = s.total_steps,
      completed_steps = s.completed_steps
  FROM (
    SELECT errand_id,
           count(*)::int AS total_steps,
           count(*) FILTER (WHERE status = 'completed')::int AS completed_steps
    FROM public.errand_steps
    GROUP BY errand_id
  ) s
  WHERE e.id = s.errand_id
    AND e.organization_id = v_baghdad_org
    AND e.description = 'Auto-seeded Phase 2 errand';

  SELECT count(*) INTO v_task_count FROM public.tasks
  WHERE organization_id = v_baghdad_org AND description = 'Auto-seeded Phase 2 task';

  IF v_task_count < 30 THEN
    WITH case_rows AS (
      SELECT id, (row_number() OVER (ORDER BY created_at))::int rn
      FROM public.cases
      WHERE organization_id = v_baghdad_org
        AND description = 'Auto-seeded Phase 2 test matter'
      LIMIT 60
    )
    INSERT INTO public.tasks (
      organization_id, title, description, task_type, case_id, assigned_to,
      assigned_by, status, priority, due_date, estimated_minutes, created_by
    )
    SELECT
      v_baghdad_org,
      'Seed Task #' || gs,
      'Auto-seeded Phase 2 task',
      (ARRAY['general','case','deadline','review'])[1 + (gs % 4)],
      cr.id, s.id, v_admin,
      (ARRAY['todo','in_progress','in_review','completed'])[1 + (gs % 4)],
      (ARRAY['low','medium','high','urgent'])[1 + (gs % 4)],
      CURRENT_DATE + (gs - 10),
      30 + (gs * 5), v_admin
    FROM generate_series(1, 30) gs
    JOIN case_rows cr ON cr.rn = 1 + ((gs - 1) % 60)
    JOIN LATERAL (
      SELECT id FROM public.profiles
      WHERE organization_id = v_baghdad_org
        AND role IN ('lawyer','paralegal','secretary','accountant')
      ORDER BY email
      OFFSET (gs % 10)
      LIMIT 1
    ) s ON true;
  END IF;

  SELECT count(*) INTO v_invoice_count FROM public.invoices
  WHERE organization_id = v_baghdad_org AND notes = 'Auto-seeded Phase 2 invoice';

  IF v_invoice_count < 25 THEN
    WITH case_rows AS (
      SELECT id, (row_number() OVER (ORDER BY created_at))::int rn
      FROM public.cases
      WHERE organization_id = v_baghdad_org
        AND description = 'Auto-seeded Phase 2 test matter'
      LIMIT 60
    ),
    party_rows AS (
      SELECT cp.case_id, cp.person_id
      FROM public.case_parties cp
      WHERE cp.organization_id = v_baghdad_org
        AND cp.role = 'client' AND cp.is_primary = true
    ),
    inserted_invoices AS (
      INSERT INTO public.invoices (
        organization_id, invoice_number, party_type, person_id, case_id, status,
        issue_date, due_date, currency, subtotal, tax_amount, discount_amount,
        total_amount, amount_paid, notes, created_by
      )
      SELECT
        v_baghdad_org, '', 'person', pr.person_id, cr.id,
        (ARRAY['draft','sent','viewed','partially_paid','paid','overdue'])[1 + (gs % 6)],
        CURRENT_DATE - (gs * 4),
        CURRENT_DATE + (30 - gs),
        'IQD',
        500000 + (gs * 100000), 0, 0,
        500000 + (gs * 100000),
        CASE WHEN gs % 6 = 4 THEN 500000 + (gs * 100000)
             WHEN gs % 6 = 3 THEN round((500000 + (gs * 100000)) * 0.4)
             ELSE 0 END,
        'Auto-seeded Phase 2 invoice', v_admin
      FROM generate_series(1, 25) gs
      JOIN case_rows cr ON cr.rn = gs
      JOIN party_rows pr ON pr.case_id = cr.id
      RETURNING id, organization_id, subtotal
    )
    INSERT INTO public.invoice_line_items (
      invoice_id, organization_id, description, line_type, quantity, unit_price, sort_order
    )
    SELECT id, organization_id, 'Legal services retainer', 'service', 1, subtotal, 1
    FROM inserted_invoices;
  END IF;

  INSERT INTO public.payments (organization_id, invoice_id, amount, currency, payment_date, payment_method, reference, notes, created_by)
  SELECT i.organization_id, i.id, i.amount_paid, i.currency, CURRENT_DATE - interval '3 days',
         'bank_transfer', 'SEED-PAY-' || right(i.id::text, 8), 'Auto-seeded payment', v_admin
  FROM public.invoices i
  WHERE i.organization_id = v_baghdad_org
    AND i.notes = 'Auto-seeded Phase 2 invoice'
    AND i.amount_paid > 0
    AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id);

  UPDATE public.portal_users pu
  SET last_selected_org_id = v_baghdad_org
  WHERE pu.email ~ '^client([1-9]|1[0-5])@portaltest\.qanuni$'
    AND pu.last_selected_org_id IS NULL;

  RAISE NOTICE 'Completed Phase 2 test dataset for Baghdad Test Legal.';
END $$;