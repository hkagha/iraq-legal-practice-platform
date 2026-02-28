import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <span className="text-display-sm text-primary font-bold">Qanuni</span>
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-body-md text-muted-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile) {
    // Redirect clients to portal
    if (profile.role === 'client' && !location.pathname.startsWith('/portal')) {
      return <Navigate to="/portal/dashboard" replace />;
    }
    // Check allowed roles
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
