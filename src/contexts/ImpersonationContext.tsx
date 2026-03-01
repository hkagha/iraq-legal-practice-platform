import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface ImpersonationState {
  isImpersonating: boolean;
  originalAdminId: string | null;
  impersonatedOrgId: string | null;
  impersonatedOrgName: string | null;
  impersonatedUserId: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (orgId: string, orgName: string, userId: string, adminId: string) => void;
  endImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const EMPTY: ImpersonationState = { isImpersonating: false, originalAdminId: null, impersonatedOrgId: null, impersonatedOrgName: null, impersonatedUserId: null };

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(() => {
    try {
      const saved = sessionStorage.getItem('qanuni_impersonation');
      if (saved) return JSON.parse(saved);
    } catch {}
    return EMPTY;
  });

  const startImpersonation = (orgId: string, orgName: string, userId: string, adminId: string) => {
    const newState: ImpersonationState = { isImpersonating: true, originalAdminId: adminId, impersonatedOrgId: orgId, impersonatedOrgName: orgName, impersonatedUserId: userId };
    sessionStorage.setItem('qanuni_impersonation', JSON.stringify(newState));
    setState(newState);
  };

  const endImpersonation = () => {
    sessionStorage.removeItem('qanuni_impersonation');
    setState(EMPTY);
  };

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
