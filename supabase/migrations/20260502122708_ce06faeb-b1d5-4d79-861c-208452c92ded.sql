ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS errand_id uuid;

CREATE INDEX IF NOT EXISTS idx_calendar_events_errand_id
ON public.calendar_events (errand_id)
WHERE errand_id IS NOT NULL;

-- Enforce mutual exclusivity at the DB level: cannot link both case and errand
ALTER TABLE public.calendar_events
DROP CONSTRAINT IF EXISTS calendar_events_single_link_chk;

ALTER TABLE public.calendar_events
ADD CONSTRAINT calendar_events_single_link_chk
CHECK (case_id IS NULL OR errand_id IS NULL);