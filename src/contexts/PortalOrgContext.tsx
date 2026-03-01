import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientOrgLink {
  client_id: string;
  organization_id: string;
  organization_name: string;
  organization_name_ar: string;
  organization_logo_url: string | null;
}

interface PortalOrgContextType {
  linkedOrgs: ClientOrgLink[];
  activeOrg: ClientOrgLink | null;
  activeClientId: string | null;
  allClientIds: string[];
  hasMultipleOrgs: boolean;
  isLoading: boolean;
  isSwitching: boolean;
  switchOrg: (organizationId: string | null) => void;
}

const PortalOrgContext = createContext<PortalOrgContextType | undefined>(undefined);

export function PortalOrgProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [linkedOrgs, setLinkedOrgs] = useState<ClientOrgLink[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    return sessionStorage.getItem('qanuni_portal_active_org') || null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (!profile?.id || profile.role !== 'client') {
      setIsLoading(false);
      return;
    }
    loadLinkedOrgs();
  }, [profile?.id]);

  async function loadLinkedOrgs() {
    const { data: links } = await supabase
      .from('client_user_links')
      .select('client_id, organization_id')
      .eq('user_id', profile!.id);

    if (!links || links.length === 0) {
      setIsLoading(false);
      return;
    }

    // Get org details and client org_ids
    const clientIds = links.map(l => l.client_id);
    const orgIds = links.map(l => l.organization_id);

    const [clientsRes, orgsRes] = await Promise.all([
      supabase.from('clients').select('id, organization_id').in('id', clientIds),
      supabase.from('organizations').select('id, name, name_ar, logo_url').in('id', orgIds),
    ]);

    const orgsMap: Record<string, any> = {};
    (orgsRes.data || []).forEach(o => { orgsMap[o.id] = o; });

    const clientsMap: Record<string, any> = {};
    (clientsRes.data || []).forEach(c => { clientsMap[c.id] = c; });

    const result: ClientOrgLink[] = links.map(link => {
      const org = orgsMap[link.organization_id];
      return {
        client_id: link.client_id,
        organization_id: link.organization_id,
        organization_name: org?.name || 'Unknown',
        organization_name_ar: org?.name_ar || org?.name || 'Unknown',
        organization_logo_url: org?.logo_url || null,
      };
    }).filter(Boolean);

    setLinkedOrgs(result);

    if (!activeOrgId || !result.find(o => o.organization_id === activeOrgId)) {
      const defaultOrg = result[0]?.organization_id;
      if (defaultOrg) {
        setActiveOrgId(defaultOrg);
        sessionStorage.setItem('qanuni_portal_active_org', defaultOrg);
      }
    }

    setIsLoading(false);
  }

  const switchOrg = useCallback((organizationId: string | null) => {
    setIsSwitching(true);
    setActiveOrgId(organizationId);
    if (organizationId) {
      sessionStorage.setItem('qanuni_portal_active_org', organizationId);
    } else {
      sessionStorage.removeItem('qanuni_portal_active_org');
    }
    setTimeout(() => setIsSwitching(false), 100);
  }, []);

  const activeOrg = linkedOrgs.find(o => o.organization_id === activeOrgId) || null;
  const activeClientId = activeOrg?.client_id || null;
  const allClientIds = linkedOrgs.map(o => o.client_id);
  const hasMultipleOrgs = linkedOrgs.length > 1;

  return (
    <PortalOrgContext.Provider value={{
      linkedOrgs,
      activeOrg,
      activeClientId,
      allClientIds,
      hasMultipleOrgs,
      isLoading,
      isSwitching,
      switchOrg,
    }}>
      {children}
    </PortalOrgContext.Provider>
  );
}

export function usePortalOrg() {
  const ctx = useContext(PortalOrgContext);
  if (!ctx) throw new Error('usePortalOrg must be within PortalOrgProvider');
  return ctx;
}
