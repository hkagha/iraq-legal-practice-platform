// Shared types for the Party (Person | Entity) data model.
// A "client" is just a Party that plays role='client' on a case via case_parties.

export type PartyType = 'person' | 'entity';

export interface PersonRow {
  id: string;
  organization_id: string;
  first_name: string;
  first_name_ar: string | null;
  last_name: string | null;
  last_name_ar: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  national_id_number: string | null;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  address_ar: string | null;
  city: string | null;
  city_ar: string | null;
  governorate: string | null;
  country: string | null;
  postal_code: string | null;
  preferred_currency: string | null;
  tags: string[] | null;
  notes: string | null;
  notes_ar: string | null;
  profile_image_url: string | null;
  status: string;
  is_visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntityRow {
  id: string;
  organization_id: string;
  company_name: string;
  company_name_ar: string | null;
  company_type: string | null;
  company_registration_number: string | null;
  tax_id: string | null;
  industry: string | null;
  industry_ar: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  address_ar: string | null;
  city: string | null;
  city_ar: string | null;
  governorate: string | null;
  country: string | null;
  postal_code: string | null;
  preferred_currency: string | null;
  payment_terms_days: number | null;
  credit_limit: number | null;
  tags: string[] | null;
  notes: string | null;
  notes_ar: string | null;
  status: string;
  is_visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

export type PartyRow =
  | { partyType: 'person'; person: PersonRow; entity?: undefined }
  | { partyType: 'entity'; entity: EntityRow; person?: undefined };

/** Shape returned by the unified party selector. */
export interface PartyRef {
  partyType: PartyType;
  personId?: string | null;
  entityId?: string | null;
  /** Display name in the user's current language (best effort). */
  displayName: string;
}

export interface CasePartyRow {
  id: string;
  case_id: string;
  organization_id: string;
  party_type: PartyType;
  person_id: string | null;
  entity_id: string | null;
  represented_by_person_id: string | null;
  role: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export interface EntityRepresentativeRow {
  id: string;
  entity_id: string;
  person_id: string;
  organization_id: string;
  role: string;
  job_title: string | null;
  job_title_ar: string | null;
  department: string | null;
  is_primary: boolean;
  receives_notifications: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Common case-party roles. */
export const CASE_PARTY_ROLES = [
  'client',
  'opposing_party',
  'co_counsel',
  'witness',
  'expert',
  'third_party',
  'plaintiff',
  'defendant',
] as const;
export type CasePartyRole = (typeof CASE_PARTY_ROLES)[number];
