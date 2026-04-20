import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PersonRow, EntityRow } from '@/types/parties';

export interface UsePartiesOptions {
  search?: string;
  /** 'all' | 'person' | 'entity' */
  type?: 'all' | 'person' | 'entity';
  /** Status filter */
  status?: string;
  enabled?: boolean;
  limit?: number;
}

export interface UnifiedPartyRow {
  id: string;
  partyType: 'person' | 'entity';
  person?: PersonRow;
  entity?: EntityRow;
  status: string;
  createdAt: string;
}

/**
 * Returns persons + entities in the org, unified into a single sortable list.
 * No SQL UNION needed — two queries client-side, merged.
 */
export function useParties(opts: UsePartiesOptions = {}) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { search = '', type = 'all', status, enabled = true, limit = 200 } = opts;

  return useQuery({
    queryKey: ['parties', orgId, search, type, status, limit],
    enabled: !!orgId && enabled,
    queryFn: async (): Promise<UnifiedPartyRow[]> => {
      const promises: Array<Promise<unknown>> = [];

      if (type === 'all' || type === 'person') {
        let q = supabase.from('persons').select('*').eq('organization_id', orgId!).limit(limit);
        if (status) q = q.eq('status', status);
        if (search) {
          const s = `%${search}%`;
          q = q.or(
            `first_name.ilike.${s},last_name.ilike.${s},first_name_ar.ilike.${s},last_name_ar.ilike.${s},email.ilike.${s},phone.ilike.${s}`,
          );
        }
        promises.push(q.order('updated_at', { ascending: false }));
      }
      if (type === 'all' || type === 'entity') {
        let q = supabase.from('entities').select('*').eq('organization_id', orgId!).limit(limit);
        if (status) q = q.eq('status', status);
        if (search) {
          const s = `%${search}%`;
          q = q.or(`company_name.ilike.${s},company_name_ar.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
        }
        promises.push(q.order('updated_at', { ascending: false }));
      }

      const results = await Promise.all(promises);
      const merged: UnifiedPartyRow[] = [];

      let idx = 0;
      if (type === 'all' || type === 'person') {
        const r = results[idx++] as { data: PersonRow[] | null };
        for (const p of r.data || []) {
          merged.push({ id: p.id, partyType: 'person', person: p, status: p.status, createdAt: p.created_at });
        }
      }
      if (type === 'all' || type === 'entity') {
        const r = results[idx++] as { data: EntityRow[] | null };
        for (const e of r.data || []) {
          merged.push({ id: e.id, partyType: 'entity', entity: e, status: e.status, createdAt: e.created_at });
        }
      }

      // Sort newest first, regardless of source
      return merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });
}

/** Fetch a single person. */
export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: ['person', id],
    enabled: !!id,
    queryFn: async (): Promise<PersonRow | null> => {
      const { data, error } = await supabase.from('persons').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as PersonRow | null;
    },
  });
}

/** Fetch a single entity. */
export function useEntity(id: string | undefined) {
  return useQuery({
    queryKey: ['entity', id],
    enabled: !!id,
    queryFn: async (): Promise<EntityRow | null> => {
      const { data, error } = await supabase.from('entities').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as EntityRow | null;
    },
  });
}
