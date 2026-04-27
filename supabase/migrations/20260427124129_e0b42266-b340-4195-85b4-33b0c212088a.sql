
DO $mig$
DECLARE
  v_org_baghdad uuid := '5c701e19-3d92-4939-9bcf-686dd862856d';
  v_admin uuid;
  v_inserted_steps int := 0;
  v_inserted_payments int := 0;
  v_inserted_tasks int := 0;
BEGIN
  SELECT ref_id INTO v_admin FROM public._seed_staging_baghdad WHERE kind='staff' AND idx=1;

  -- 11) errand_steps: 2-4 per errand
  WITH errs AS (
    SELECT id AS errand_id, organization_id,
           (2 + (abs(hashtext(id::text)) % 3))::int AS n_steps,
           row_number() OVER (ORDER BY created_at) AS rn
    FROM public.errands WHERE organization_id = v_org_baghdad
  ),
  step_specs AS (
    SELECT e.errand_id, e.organization_id, e.rn, gs AS step_order,
           CASE gs
             WHEN 1 THEN 'Prepare required documents'
             WHEN 2 THEN 'Submit application at office'
             WHEN 3 THEN 'Follow up with clerk'
             WHEN 4 THEN 'Collect stamped receipt'
           END AS title,
           CASE gs
             WHEN 1 THEN 'تحضير المستندات المطلوبة'
             WHEN 2 THEN 'تقديم الطلب في الدائرة'
             WHEN 3 THEN 'متابعة مع الموظف المختص'
             WHEN 4 THEN 'استلام الإيصال المختوم'
           END AS title_ar,
           CASE WHEN (e.rn % 3) = 0 AND gs <= (e.n_steps - 1) THEN 'completed'
                WHEN (e.rn % 3) = 1 AND gs = 1 THEN 'completed'
                ELSE 'pending' END AS status
    FROM errs e, generate_series(1, e.n_steps) gs
  )
  INSERT INTO public.errand_steps (errand_id, organization_id, step_order, title, title_ar, status, completed_at)
  SELECT errand_id, organization_id, step_order, title, title_ar, status,
         CASE WHEN status='completed' THEN now() - (interval '1 day' * (5 + step_order)) ELSE NULL END
  FROM step_specs;
  GET DIAGNOSTICS v_inserted_steps = ROW_COUNT;

  -- Sync errands.completed_steps / total_steps
  UPDATE public.errands e
  SET total_steps = s.tot, completed_steps = s.done
  FROM (
    SELECT errand_id, COUNT(*) tot, COUNT(*) FILTER (WHERE status='completed') done
    FROM public.errand_steps GROUP BY errand_id
  ) s WHERE e.id = s.errand_id;

  -- 12) Add 5 more tasks
  WITH staff_arr AS (SELECT array_agg(ref_id) a FROM public._seed_staging_baghdad WHERE kind='staff'),
       case_arr AS (SELECT array_agg(ref_id) a FROM public._seed_staging_baghdad WHERE kind='case')
  INSERT INTO public.tasks (organization_id, title, title_ar, description, task_type, case_id, assigned_to, assigned_by, status, priority, due_date, created_by)
  SELECT v_org_baghdad,
         'Follow-up task #' || gs,
         'مهمة متابعة رقم ' || gs,
         'Auto-seeded supplemental task',
         'general',
         (SELECT a FROM case_arr)[1 + (gs % 60)],
         (SELECT a FROM staff_arr)[1 + (gs % 11)],
         v_admin,
         (ARRAY['todo','in_progress','in_review','completed'])[1 + (gs % 4)],
         (ARRAY['low','medium','high','urgent'])[1 + (gs % 4)],
         CURRENT_DATE + ((gs * 3) || ' days')::interval,
         v_admin
  FROM generate_series(1,5) gs;
  GET DIAGNOSTICS v_inserted_tasks = ROW_COUNT;

  -- 13) payments: 8 full + 7 partial against first 15 invoices
  WITH inv AS (
    SELECT id, organization_id, total_amount, currency,
           row_number() OVER (ORDER BY created_at) AS rn
    FROM public.invoices WHERE organization_id = v_org_baghdad
  ),
  pay_plan AS (
    SELECT id, organization_id, currency, total_amount AS amount, 'full'::text AS kind, rn
    FROM inv WHERE rn BETWEEN 1 AND 8
    UNION ALL
    SELECT id, organization_id, currency, ROUND(total_amount * 0.4, 0) AS amount, 'partial'::text, rn
    FROM inv WHERE rn BETWEEN 9 AND 15
  )
  INSERT INTO public.payments (organization_id, invoice_id, amount, currency, payment_date, payment_method, reference, notes, created_by)
  SELECT organization_id, id, amount, currency,
         CURRENT_DATE - ((rn * 2) || ' days')::interval,
         (ARRAY['bank_transfer','cash','cheque','card'])[1 + (rn % 4)],
         'PAY-' || lpad(rn::text, 5, '0'),
         CASE kind WHEN 'full' THEN 'Full settlement' ELSE 'Partial payment' END,
         v_admin
  FROM pay_plan;
  GET DIAGNOSTICS v_inserted_payments = ROW_COUNT;

  RAISE NOTICE 'Inserted: errand_steps=%, tasks=%, payments=%',
               v_inserted_steps, v_inserted_tasks, v_inserted_payments;
END
$mig$;
