ALTER TABLE public.errands
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'fixed_fee',
  ADD COLUMN IF NOT EXISTS hourly_rate numeric,
  ADD COLUMN IF NOT EXISTS fixed_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS retainer_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IQD';

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.time_entries(task_id);

CREATE OR REPLACE FUNCTION public.validate_time_entry_task_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_case uuid;
  v_task_errand uuid;
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT case_id, errand_id
  INTO v_task_case, v_task_errand
  FROM public.tasks
  WHERE id = NEW.task_id;

  IF v_task_case IS NULL AND v_task_errand IS NULL THEN
    RAISE EXCEPTION 'Selected task is not linked to a case or errand';
  END IF;

  IF v_task_case IS NOT NULL AND NEW.case_id IS DISTINCT FROM v_task_case THEN
    RAISE EXCEPTION 'Selected task does not belong to the selected case';
  END IF;

  IF v_task_errand IS NOT NULL AND NEW.errand_id IS DISTINCT FROM v_task_errand THEN
    RAISE EXCEPTION 'Selected task does not belong to the selected errand';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_time_entry_task_scope ON public.time_entries;
CREATE TRIGGER trg_validate_time_entry_task_scope
  BEFORE INSERT OR UPDATE OF task_id, case_id, errand_id
  ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_time_entry_task_scope();
