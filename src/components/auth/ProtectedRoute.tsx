import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Allowed staff roles. If omitted, any authenticated staff or portal user is allowed. */
  allowedRoles?: string[];
}

/**
 * Route guard with two-tier identity:
 *  - "Staff" identity = a row in `profiles` (role determines access).
 *  - "Portal" identity = a row in `portal_users` (no profile row).
 *
 * Behaviour:
 *  - Unauthenticated → bounced to the appropriate login window for the area.
 *  - Portal user requesting any non-/portal route → bounced to /portal/dashboard.
 *  - Staff user requesting /portal → bounced to /dashboard.
 *  - allowedRoles, when supplied, applies only to staff (profile.role).
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, portalUser, isLoading, identityResolved } = useAuth();
  const { isImpersonating } = useImpersonation();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading || (user && !identityResolved)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <span className="text-display-sm text-primary font-bold">Qanuni</span>
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-body-md text-muted-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  if (!user) {
    const path = location.pathname;
    let loginPath = '/login/staff';
    if (path.startsWith('/portal')) loginPath = '/portal/login';
    else if (path.startsWith('/admin')) loginPath = '/admin/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // PORTAL USER: only allowed inside /portal/*
  if (portalUser) {
    if (!location.pathname.startsWith('/portal')) {
      return <Navigate to="/portal/dashboard" replace />;
    }
    return <>{children}</>;
  }

  // STAFF USER (has profile row)
  if (profile) {
    // Staff cannot use the portal area.
    if (location.pathname.startsWith('/portal')) {
      return <Navigate to="/dashboard" replace />;
    }
    // Role gating, when provided.
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      // While impersonating, a platform admin should be allowed into firm-staff routes.
      if (isImpersonating && (profile.role === 'super_admin' || profile.role === 'sales_admin')) {
        return <>{children}</>;
      }
      // Sensible fallback per role.
      if (profile.role === 'super_admin' || profile.role === 'sales_admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  // Authenticated but no identity in either table — orphan account.
  // Bounce to staff login (will show error and sign out).
  return <Navigate to="/login/staff" replace />;
}
