import type { PersonRow, EntityRow, PartyRef, PartyType } from '@/types/parties';

/** Resolve a Person's display name in the chosen language, with safe fallbacks. */
export function resolvePersonName(person: PersonRow | null | undefined, lang: 'en' | 'ar'): string {
  if (!person) return '';
  if (lang === 'ar') {
    const fn = person.first_name_ar || person.first_name;
    const ln = person.last_name_ar || person.last_name || '';
    return `${fn} ${ln}`.trim();
  }
  return `${person.first_name} ${person.last_name || ''}`.trim();
}

/** Resolve an Entity's display name. */
export function resolveEntityName(entity: EntityRow | null | undefined, lang: 'en' | 'ar'): string {
  if (!entity) return '';
  if (lang === 'ar') return entity.company_name_ar || entity.company_name;
  return entity.company_name;
}

/** Generic resolver that handles either a Person or an Entity given party_type. */
export function resolvePartyName(
  party: { party_type?: PartyType | string | null; person?: PersonRow | null; entity?: EntityRow | null } | null | undefined,
  lang: 'en' | 'ar',
): string {
  if (!party) return '';
  if (party.party_type === 'person') return resolvePersonName(party.person ?? null, lang);
  if (party.party_type === 'entity') return resolveEntityName(party.entity ?? null, lang);
  return '';
}

/** Initials for an avatar (2 chars max). */
export function partyInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Build a PartyRef from a person row. */
export function personToPartyRef(p: PersonRow, lang: 'en' | 'ar'): PartyRef {
  return { partyType: 'person', personId: p.id, entityId: null, displayName: resolvePersonName(p, lang) };
}

/** Build a PartyRef from an entity row. */
export function entityToPartyRef(e: EntityRow, lang: 'en' | 'ar'): PartyRef {
  return { partyType: 'entity', personId: null, entityId: e.id, displayName: resolveEntityName(e, lang) };
}

/** Type guard. */
export function isPerson(partyType: string | null | undefined): partyType is 'person' {
  return partyType === 'person';
}
export function isEntity(partyType: string | null | undefined): partyType is 'entity' {
  return partyType === 'entity';
}
