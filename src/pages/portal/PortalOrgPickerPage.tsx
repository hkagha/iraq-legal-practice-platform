import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Loader2, LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { Button } from '@/components/ui/button';

/**
 * Shown after a portal user signs in when they are linked to more than one
 * law firm. Lets the client pick which firm's portal they want to enter.
 *
 * When the client has only one linked firm, this screen auto-redirects to the
 * dashboard. When the client has zero linked firms, it shows an explanatory
 * message and a sign-out button.
 */
export default function PortalOrgPickerPage() {
  const { language, setLanguage } = useLanguage();
  const { signOut, portalUser } = useAuth();
  const { linkedOrgs, activeOrg, loading, switchOrg, isSwitching } = usePortalOrg();
  const navigate = useNavigate();
  const isAR = language === 'ar';

  // If only one org → auto-pick and forward
  useEffect(() => {
    if (loading) return;
    if (linkedOrgs.length === 1 && !activeOrg) {
      switchOrg(linkedOrgs[0].id).then(() => navigate('/portal/dashboard', { replace: true }));
    }
  }, [loading, linkedOrgs, activeOrg, switchOrg, navigate]);

  // If org already chosen, jump straight to dashboard
  useEffect(() => {
    if (!loading && activeOrg) {
      navigate('/portal/dashboard', { replace: true });
    }
  }, [loading, activeOrg, navigate]);

  const handlePick = async (orgId: string) => {
    await switchOrg(orgId);
    navigate('/portal/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary/50">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // No linked organisations — show helpful message rather than dumping at /portal
  if (linkedOrgs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary/50 px-4">
        <div className="w-full max-w-[480px] bg-card border border-border rounded-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-muted mb-4">
            <Building2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-heading-lg text-foreground">
            {isAR ? 'لا توجد مؤسسات مرتبطة' : 'No linked law firms'}
          </h1>
          <p className="text-body-md text-muted-foreground mt-3">
            {isAR
              ? 'حسابك ليس مرتبطاً بأي مكتب محاماة بعد. تواصل مع مكتبك المحاماة لتفعيل وصولك إلى البوابة.'
              : 'Your account is not yet linked to any law firm. Please contact your law firm to enable your portal access.'}
          </p>
          <Button onClick={signOut} variant="outline" className="mt-6">
            <LogOut className="h-4 w-4 me-2" />
            {isAR ? 'تسجيل الخروج' : 'Sign out'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur">
        <div className="text-display-sm text-primary font-bold">Qanuni</div>
        <div className="flex items-center gap-3 text-body-md">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 pb-1 ${language === 'en' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}
          >EN</button>
          <button
            onClick={() => setLanguage('ar')}
            className={`px-2 pb-1 ${language === 'ar' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}
          >AR</button>
          <button
            onClick={signOut}
            className="text-body-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isAR ? 'خروج' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[640px]">
          <div className="text-center mb-8">
            <h1 className="text-display-sm text-foreground font-semibold">
              {isAR ? 'مرحباً' : 'Welcome'}
              {portalUser?.full_name && (
                <>, <span className="text-accent">{
                  isAR && portalUser.full_name_ar ? portalUser.full_name_ar : portalUser.full_name.split(' ')[0]
                }</span></>
              )}
            </h1>
            <p className="text-body-md text-muted-foreground mt-3">
              {isAR
                ? 'أنت موكّل لدى أكثر من مكتب محاماة. اختر المكتب الذي تريد الدخول إلى بوابته.'
                : 'You are a client of more than one law firm. Choose which one you would like to access.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {linkedOrgs.map((org) => {
              const name = isAR && org.name_ar ? org.name_ar : org.name;
              const subtitle = isAR ? org.name : org.name_ar;
              return (
                <button
                  key={org.id}
                  onClick={() => handlePick(org.id)}
                  disabled={isSwitching}
                  className="group bg-card rounded-2xl border border-border hover:border-accent hover:shadow-md transition-all p-5 flex items-center gap-4 text-start disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover bg-muted shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-heading-sm text-foreground font-semibold truncate">{name}</p>
                    {subtitle && subtitle !== name && (
                      <p className="text-body-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-accent shrink-0">
                    <span className="text-body-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAR ? 'دخول' : 'Enter'}
                    </span>
                    <Check className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-body-sm text-muted-foreground mt-8">
            {isAR
              ? 'يمكنك التبديل بين المكاتب لاحقاً من قائمة الحساب.'
              : 'You can switch between firms later from the account menu.'}
          </p>
        </div>
      </main>
    </div>
  );
}
