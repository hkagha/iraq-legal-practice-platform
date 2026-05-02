ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS errand_id uuid REFERENCES public.errands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_errand
  ON public.calendar_events(errand_id);

CREATE OR REPLACE FUNCTION public.validate_calendar_event_matter_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.case_id IS NOT NULL AND NEW.errand_id IS NOT NULL THEN
    RAISE EXCEPTION 'Calendar event can be linked to either a case or an errand, not both';
  END IF;

  IF NEW.case_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = NEW.case_id
      AND c.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Linked case does not belong to the calendar event organization';
  END IF;

  IF NEW.errand_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.errands e
    WHERE e.id = NEW.errand_id
      AND e.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Linked errand does not belong to the calendar event organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_calendar_event_matter_scope ON public.calendar_events;
CREATE TRIGGER trg_validate_calendar_event_matter_scope
  BEFORE INSERT OR UPDATE OF case_id, errand_id, organization_id
  ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_calendar_event_matter_scope();
