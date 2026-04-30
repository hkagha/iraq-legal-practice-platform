import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Represents one of the law-firm organisations the current portal user is
 * linked to. A client can be a client of several firms; each link is one row
 * in `portal_user_links` joining the portal user (auth user) to a person row
 * inside a specific organisation.
 */
export interface OrgRef {
  /** organisations.id */
  id: string;
  /** organisations.name (English) */
  name: string;
  /** organisations.name_ar */
  name_ar: string | null;
  /** organisations.logo_url */
  logo_url: string | null;
  /** persons.id of the underlying person record in that org (for queries) */
  person_id: string;
  /** The active access capacity inside this firm. */
  context_id: string;
  context_type: 'person' | 'entity';
  context_label: string;
  context_label_ar: string | null;
  entity_id: string | null;
}

interface PortalOrgContextValue {
  /** All firm/capacity contexts this client can access. */
  linkedOrgs: OrgRef[];
  /** Currently active firm/capacity context. Null while still loading or if user has no links. */
  activeOrg: OrgRef | null;
  hasMultipleOrgs: boolean;
  loading: boolean;
  /** Switch to a specific firm/capacity context. */
  switchOrg: (contextIdOrOrgId: string) => Promise<void>;
  isSwitching: boolean;
}

const defaultValue: PortalOrgContextValue = {
  linkedOrgs: [],
  activeOrg: null,
  hasMultipleOrgs: false,
  loading: true,
  switchOrg: async () => {},
  isSwitching: false,
};

const PortalOrgContext = createContext<PortalOrgContextValue>(defaultValue);

export const usePortalOrg = () => useContext(PortalOrgContext);

export function PortalOrgProvider({ children }: { children: ReactNode }) {
  const { user, portalUser, identityResolved } = useAuth();
  const [linkedOrgs, setLinkedOrgs] = useState<OrgRef[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  /** Load all (org, person) links for the current portal user. */
  const reloadLinks = useCallback(async () => {
    if (!user || !portalUser) {
      setLinkedOrgs([]);
      setActiveOrgId(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('portal_user_links')
      .select(`
        person_id,
        organization_id,
        is_active,
        organizations:organizations!portal_user_links_organization_id_fkey (
          id, name, name_ar, logo_url
        )
      `)
      .eq('portal_user_id', portalUser.id)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load portal user links', error);
      setLinkedOrgs([]);
      setActiveOrgId(null);
      setLoading(false);
      return;
    }

    const baseLinks = (data || []).filter((row: any) => row.organizations?.id || row.organization_id);
    const baseContexts: OrgRef[] = baseLinks.map((row: any) => {
      const orgId = row.organizations?.id || row.organization_id;
      return {
        id: orgId,
        name: row.organizations?.name || '',
        name_ar: row.organizations?.name_ar || null,
        logo_url: row.organizations?.logo_url || null,
        person_id: row.person_id,
        context_id: `${orgId}:person:${row.person_id}`,
        context_type: 'person',
        context_label: 'Personal capacity',
        context_label_ar: 'الصفة الشخصية',
        entity_id: null,
      };
    });

    const personIds = [...new Set(baseLinks.map((row: any) => row.person_id).filter(Boolean))];
    let entityContexts: OrgRef[] = [];
    if (personIds.length > 0) {
      const { data: reps, error: repsError } = await supabase
        .from('entity_representatives')
        .select(`
          person_id,
          entity_id,
          organization_id,
          end_date,
          entities:entities!entity_representatives_entity_id_fkey (
            id, company_name, company_name_ar
          )
        `)
        .in('person_id', personIds)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString().slice(0, 10)}`);

      if (repsError) {
        console.error('Failed to load portal entity representative contexts', repsError);
      } else {
        entityContexts = (reps || []).flatMap((rep: any) => {
          const base = baseContexts.find((ctx) => ctx.id === rep.organization_id && ctx.person_id === rep.person_id);
          if (!base || !rep.entity_id) return [];
          return [{
            ...base,
            context_id: `${base.id}:entity:${rep.entity_id}:person:${rep.person_id}`,
            context_type: 'entity' as const,
            context_label: rep.entities?.company_name || 'Company representative',
            context_label_ar: rep.entities?.company_name_ar || null,
            entity_id: rep.entity_id,
          }];
        });
      }
    }

    const orgs = [...baseContexts, ...entityContexts];

    setLinkedOrgs(orgs);

    // Decide which org to activate:
    // 1. session-stored capacity choice for the current tab
    // 2. the only context if user has just one
    // 3. null → multi-context portal users must choose on /portal/select
    //
    // We intentionally do not auto-select portal_users.last_selected_org_id here:
    // multi-firm clients should see the picker at the start of a fresh session.
    const sessionPick = sessionStorage.getItem('qanuni_portal_active_context') || sessionStorage.getItem('qanuni_portal_active_org');
    let chosen: string | null = null;
    if (sessionPick && orgs.some(o => o.context_id === sessionPick)) {
      chosen = sessionPick;
    } else if (orgs.length === 1) {
      chosen = orgs[0].context_id;
    }
    setActiveOrgId(chosen);
    setLoading(false);
  }, [user, portalUser]);

  useEffect(() => {
    if (!identityResolved) return;
    reloadLinks();
  }, [identityResolved, reloadLinks]);

  const switchOrg = useCallback(
    async (contextIdOrOrgId: string) => {
      if (!portalUser) return;
      setIsSwitching(true);
      try {
        const selected = linkedOrgs.find((o) => o.context_id === contextIdOrOrgId)
          || linkedOrgs.find((o) => o.id === contextIdOrOrgId);
        if (!selected) return;
        sessionStorage.setItem('qanuni_portal_active_context', selected.context_id);
        sessionStorage.setItem('qanuni_portal_active_org', selected.id);
        setActiveOrgId(selected.context_id);
        // Persist server-side so the next login defaults to this org
        await supabase
          .from('portal_users')
          .update({ last_selected_org_id: selected.id })
          .eq('id', portalUser.id);
      } finally {
        // Brief delay lets dependent queries refetch in the new org context
        setTimeout(() => setIsSwitching(false), 100);
      }
    },
    [portalUser, linkedOrgs],
  );

  const activeOrg = linkedOrgs.find(o => o.context_id === activeOrgId) || null;
  const hasMultipleOrgs = linkedOrgs.length > 1;

  return (
    <PortalOrgContext.Provider
      value={{
        linkedOrgs,
        activeOrg,
        hasMultipleOrgs,
        loading,
        switchOrg,
        isSwitching,
      }}
    >
      {children}
    </PortalOrgContext.Provider>
  );
}
