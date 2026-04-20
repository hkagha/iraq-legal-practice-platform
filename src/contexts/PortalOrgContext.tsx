import { createContext, useContext, ReactNode } from 'react';

interface PortalOrgContextValue {
  currentOrgId: string | null;
  availableOrgs: Array<{ id: string; name: string }>;
  setCurrentOrgId: (id: string | null) => void;
  loading: boolean;
}

const PortalOrgContext = createContext<PortalOrgContextValue>({
  currentOrgId: null,
  availableOrgs: [],
  setCurrentOrgId: () => {},
  loading: false,
});

export const usePortalOrg = () => useContext(PortalOrgContext);

export function PortalOrgProvider({ children }: { children: ReactNode }) {
  return (
    <PortalOrgContext.Provider value={{
      currentOrgId: null,
      availableOrgs: [],
      setCurrentOrgId: () => {},
      loading: false,
    }}>
      {children}
    </PortalOrgContext.Provider>
  );
}
