CREATE OR REPLACE VIEW public.v_parties_unified
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.organization_id,
  'person'::text AS party_type,
  trim(concat_ws(' ', p.first_name, p.last_name)) AS display_name,
  nullif(trim(concat_ws(' ', p.first_name_ar, p.last_name_ar)), '') AS display_name_ar,
  p.email,
  p.phone,
  p.status,
  p.created_at,
  p.updated_at,
  p.national_id_number,
  null::text AS company_registration_number,
  null::text AS tax_id
FROM public.persons p
UNION ALL
SELECT
  e.id,
  e.organization_id,
  'entity'::text AS party_type,
  e.company_name AS display_name,
  e.company_name_ar AS display_name_ar,
  e.email,
  e.phone,
  e.status,
  e.created_at,
  e.updated_at,
  null::text AS national_id_number,
  e.company_registration_number,
  e.tax_id
FROM public.entities e;

GRANT SELECT ON public.v_parties_unified TO authenticated;

CREATE INDEX IF NOT EXISTS idx_persons_org_status_updated
  ON public.persons (organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_entities_org_status_updated
  ON public.entities (organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_persons_org_national_id
  ON public.persons (organization_id, national_id_number)
  WHERE national_id_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entities_org_registration
  ON public.entities (organization_id, company_registration_number)
  WHERE company_registration_number IS NOT NULL;