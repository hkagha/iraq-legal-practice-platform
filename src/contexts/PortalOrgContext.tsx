import { createContext, useContext, ReactNode } from 'react';

interface PortalOrgContextValue {
  currentOrgId: string | null;
  availableOrgs: Array<{ id: string; name: string }>;
  setCurrentOrgId: (id: string | null) => void;
  loading: boolean;
  linkedOrgs: Array<{ id: string; name: string }>;
  activeOrg: { id: string; name: string } | null;
  hasMultipleOrgs: boolean;
  switchOrg: (id: string) => void;
  isSwitching: boolean;
}

const defaultValue: PortalOrgContextValue = {
  currentOrgId: null,
  availableOrgs: [],
  setCurrentOrgId: () => {},
  loading: false,
  linkedOrgs: [],
  activeOrg: null,
  hasMultipleOrgs: false,
  switchOrg: () => {},
  isSwitching: false,
};

const PortalOrgContext = createContext<PortalOrgContextValue>(defaultValue);

export const usePortalOrg = () => useContext(PortalOrgContext);

export function PortalOrgProvider({ children }: { children: ReactNode }) {
  return (
    <PortalOrgContext.Provider value={defaultValue}>
      {children}
    </PortalOrgContext.Provider>
  );
}
