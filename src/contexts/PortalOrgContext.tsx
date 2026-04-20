import { createContext, useContext, ReactNode } from 'react';

interface OrgRef {
  id: string;
  name: string;
  organization_id?: string;
  organization_name?: string;
  organization_name_ar?: string | null;
  organization_logo_url?: string | null;
}

interface PortalOrgContextValue {
  currentOrgId: string | null;
  availableOrgs: OrgRef[];
  setCurrentOrgId: (id: string | null) => void;
  loading: boolean;
  linkedOrgs: OrgRef[];
  activeOrg: OrgRef | null;
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
