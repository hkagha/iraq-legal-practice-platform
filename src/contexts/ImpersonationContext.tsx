import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/lib/adminAudit';

interface ImpersonationState {
  isImpersonating: boolean;
  originalAdminId: string | null;
  /** The super admin's REAL organization_id, captured before swap so we can restore on exit. */
  originalOrgId: string | null;
  impersonatedOrgId: string | null;
  impersonatedOrgName: string | null;
  impersonatedUserId: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (orgId: string, orgName: string, targetUserId: string) => Promise<{ error?: string }>;
  endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'qanuni_impersonation';
const EMPTY: ImpersonationState = {
  isImpersonating: false,
  originalAdminId: null,
  originalOrgId: null,
  impersonatedOrgId: null,
  impersonatedOrgName: null,
  impersonatedUserId: null,
};

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshIdentity } = useAuth();

  const [state, setState] = useState<ImpersonationState>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return EMPTY;
  });

  const persist = (s: ImpersonationState) => {
    if (s.isImpersonating) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(STORAGE_KEY);
    setState(s);
  };

  const startImpersonation = useCallback(
    async (orgId: string, orgName: string, targetUserId: string) => {
      if (!user || !profile) return { error: 'Not authenticated' };
      if (profile.role !== 'super_admin') {
        return { error: 'Only platform super admins can impersonate' };
      }

      const realOrgId = profile.organization_id ?? null;

      // Swap the admin's profile.organization_id to the target org so RLS-scoped
      // org queries (which all read get_user_org_id(auth.uid())) see that org's data.
      const { error: swapErr } = await supabase
        .from('profiles')
        .update({ organization_id: orgId } as any)
        .eq('id', user.id);
      if (swapErr) return { error: swapErr.message };

      const newState: ImpersonationState = {
        isImpersonating: true,
        originalAdminId: user.id,
        originalOrgId: realOrgId,
        impersonatedOrgId: orgId,
        impersonatedOrgName: orgName,
        impersonatedUserId: targetUserId,
      };
      persist(newState);

      // Audit
      await logAdminAction(user.id, 'impersonate_start', 'organization', orgId, orgName);

      // Refresh identity so AuthContext picks up the new organization_id immediately.
      await refreshIdentity();

      return {};
    },
    [user, profile, refreshIdentity],
  );

  const endImpersonation = useCallback(async () => {
    const snapshot = state;
    let shouldClear = !snapshot.isImpersonating;

    if (snapshot.isImpersonating && snapshot.originalAdminId) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ organization_id: snapshot.originalOrgId } as any)
          .eq('id', snapshot.originalAdminId);

        if (error) throw error;

        await logAdminAction(
          snapshot.originalAdminId,
          'impersonate_end',
          'organization',
          snapshot.impersonatedOrgId,
          snapshot.impersonatedOrgName || '',
        );
        shouldClear = true;
      } catch (e) {
        console.error('[Impersonation] Failed to restore original org_id:', e);
      }
      await refreshIdentity();
    }

    if (shouldClear) persist(EMPTY);
  }, [state, refreshIdentity]);

  return (
    <ImpersonationContext.Provider value={{ ...state, startImpersonation, endImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be within ImpersonationProvider');
  return ctx;
}
