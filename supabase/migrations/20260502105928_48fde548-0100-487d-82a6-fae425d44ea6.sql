-- Add billing fields to errands
ALTER TABLE public.errands
  ADD COLUMN IF NOT EXISTS billing_type TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS fixed_fee_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS retainer_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS contingency_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS estimated_value NUMERIC,
  ADD COLUMN IF NOT EXISTS estimated_value_currency TEXT DEFAULT 'IQD';

-- Add task_id to time_entries
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS task_id UUID;

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.time_entries(task_id);

-- Validation trigger: task must belong to same case/errand as time entry
CREATE OR REPLACE FUNCTION public.validate_time_entry_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_case_id UUID;
  task_errand_id UUID;
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT case_id, errand_id INTO task_case_id, task_errand_id
  FROM public.tasks
  WHERE id = NEW.task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task % does not exist', NEW.task_id;
  END IF;

  IF NEW.case_id IS NOT NULL AND task_case_id IS DISTINCT FROM NEW.case_id THEN
    RAISE EXCEPTION 'Task does not belong to the selected case';
  END IF;

  IF NEW.errand_id IS NOT NULL AND task_errand_id IS DISTINCT FROM NEW.errand_id THEN
    RAISE EXCEPTION 'Task does not belong to the selected errand';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_time_entry_task ON public.time_entries;
CREATE TRIGGER trg_validate_time_entry_task
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_time_entry_task();