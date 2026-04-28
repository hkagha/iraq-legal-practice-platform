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
}

interface PortalOrgContextValue {
  /** All firms this client is linked to. */
  linkedOrgs: OrgRef[];
  /** Currently active firm. Null while still loading or if user has no links. */
  activeOrg: OrgRef | null;
  hasMultipleOrgs: boolean;
  loading: boolean;
  /** Switch to a specific firm (persisted to portal_users.last_selected_org_id). */
  switchOrg: (orgId: string) => Promise<void>;
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

    const orgs: OrgRef[] = (data || []).map((row: any) => ({
      id: row.organizations?.id || row.organization_id,
      name: row.organizations?.name || '',
      name_ar: row.organizations?.name_ar || null,
      logo_url: row.organizations?.logo_url || null,
      person_id: row.person_id,
    })).filter((o: OrgRef) => o.id);

    setLinkedOrgs(orgs);

    // Decide which org to activate:
    // 1. session-stored choice (qanuni_portal_active_org) for the current tab
    // 2. the only org if user has just one
    // 3. null → multi-firm portal users must choose on /portal/select
    //
    // We intentionally do not auto-select portal_users.last_selected_org_id here:
    // multi-firm clients should see the picker at the start of a fresh session.
    const sessionPick = sessionStorage.getItem('qanuni_portal_active_org');
    let chosen: string | null = null;
    if (sessionPick && orgs.some(o => o.id === sessionPick)) {
      chosen = sessionPick;
    } else if (orgs.length === 1) {
      chosen = orgs[0].id;
    }
    setActiveOrgId(chosen);
    setLoading(false);
  }, [user, portalUser]);

  useEffect(() => {
    if (!identityResolved) return;
    reloadLinks();
  }, [identityResolved, reloadLinks]);

  const switchOrg = useCallback(
    async (orgId: string) => {
      if (!portalUser) return;
      setIsSwitching(true);
      try {
        sessionStorage.setItem('qanuni_portal_active_org', orgId);
        setActiveOrgId(orgId);
        // Persist server-side so the next login defaults to this org
        await supabase
          .from('portal_users')
          .update({ last_selected_org_id: orgId })
          .eq('id', portalUser.id);
      } finally {
        // Brief delay lets dependent queries refetch in the new org context
        setTimeout(() => setIsSwitching(false), 100);
      }
    },
    [portalUser],
  );

  const activeOrg = linkedOrgs.find(o => o.id === activeOrgId) || null;
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
