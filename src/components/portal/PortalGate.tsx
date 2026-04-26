import { useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalOrg } from '@/contexts/PortalOrgContext';

/**
 * Portal route guard. Sits inside the PortalOrgProvider and:
 *
 *  - while linked-orgs are loading → spinner
 *  - if the user has no chosen org yet AND has 2+ links → /portal/select
 *  - if the user has zero links → /portal/select (which renders an explanatory empty state)
 *  - otherwise → render children (the rest of the portal)
 *
 * The picker page itself is excluded so we don't redirect-loop.
 */
export default function PortalGate({ children }: { children: React.ReactNode }) {
  const { loading, linkedOrgs, activeOrg } = usePortalOrg();
  const location = useLocation();

  const onPicker = location.pathname === '/portal/select';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // No links: send to picker (which shows a helpful "no firms linked" message)
  if (linkedOrgs.length === 0 && !onPicker) {
    return <Navigate to="/portal/select" replace />;
  }

  // Multi-org with no active selection: must pick first
  if (linkedOrgs.length > 1 && !activeOrg && !onPicker) {
    return <Navigate to="/portal/select" replace />;
  }

  return <>{children}</>;
}
