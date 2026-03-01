import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { Scale, FileCheck, Receipt, Calendar, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalDashboardPage() {
  const { t, language, isRTL } = useLanguage();
  const { profile, getFullName } = useAuth();
  const { activeClientId, activeOrg } = usePortalOrg();

  const [activeCases, setActiveCases] = useState(0);
  const [activeErrands, setActiveErrands] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingHearings, setUpcomingHearings] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) return;
    loadData(activeClientId);
  }, [activeClientId]);

  const loadData = async (cid: string) => {
    setLoading(true);
    try {
      const [casesRes, errandsRes, invoicesRes] = await Promise.all([
        supabase.from('cases').select('id, title, title_ar, status, case_number, case_type', { count: 'exact' })
          .eq('client_id', cid).eq('is_visible_to_client', true)
          .in('status', ['active', 'intake', 'pending_hearing', 'pending_judgment']),
        supabase.from('errands').select('id, title, title_ar, status, errand_number', { count: 'exact' })
          .eq('client_id', cid).eq('is_visible_to_client', true)
          .in('status', ['new', 'in_progress', 'awaiting_documents', 'submitted_to_government', 'under_review_by_government']),
        supabase.from('invoices').select('id, invoice_number, total_amount, balance_due, status')
          .eq('client_id', cid).in('status', ['sent', 'viewed', 'partially_paid']),
      ]);

      setActiveCases(casesRes.count || 0);
      setActiveErrands(errandsRes.count || 0);
      setPendingInvoices(invoicesRes.data?.length || 0);
      setOutstandingBalance(
        (invoicesRes.data || []).reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0)
      );

      const caseIds = (casesRes.data || []).map((c: any) => c.id);
      if (caseIds.length > 0) {
        const { data: hearings } = await supabase
          .from('case_hearings')
          .select('id, hearing_date, hearing_time, hearing_type, case_id, court_room, status')
          .in('case_id', caseIds)
          .eq('is_visible_to_client', true)
          .gte('hearing_date', new Date().toISOString().split('T')[0])
          .order('hearing_date', { ascending: true })
          .limit(5);
        setUpcomingHearings(hearings || []);

        const { data: team } = await supabase
          .from('case_team_members')
          .select('user_id, role')
          .in('case_id', caseIds);
        if (team && team.length > 0) {
          const uniqueUserIds = [...new Set(team.map((m: any) => m.user_id))].slice(0, 5);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, first_name_ar, last_name_ar, email, phone, role, avatar_url')
            .in('id', uniqueUserIds);
          setTeamMembers(profiles || []);
        } else {
          setTeamMembers([]);
        }

        const { data: caseActs } = await supabase
          .from('case_activities')
          .select('id, title, title_ar, activity_type, created_at')
          .in('case_id', caseIds)
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentActivity(caseActs || []);
      } else {
        setUpcomingHearings([]);
        setTeamMembers([]);
        setRecentActivity([]);
      }
    } catch (err) {
      console.error('Portal dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return language === 'ar' ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale }) : format(new Date(d), 'MMM dd, yyyy');
    } catch { return d; }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="h-64 rounded-lg lg:col-span-3" />
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-display-lg font-bold text-foreground">
          {t('portal.welcome').replace('{{name}}', getFullName())}
        </h1>
        <p className="text-body-md text-muted-foreground mt-1">
          {activeOrg && (
            <span>{language === 'ar' ? activeOrg.organization_name_ar : activeOrg.organization_name} — </span>
          )}
          {language === 'en' ? "Here's an overview of your legal matters" : 'إليك نظرة عامة على شؤونك القانونية'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/portal/cases" className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Scale className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-body-sm text-muted-foreground">{t('portal.dashboard.activeCases')}</p>
              <p className="text-display-sm font-bold text-foreground">{activeCases}</p>
            </div>
          </div>
        </Link>
        <Link to="/portal/errands" className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-body-sm text-muted-foreground">{t('portal.dashboard.activeErrands')}</p>
              <p className="text-display-sm font-bold text-foreground">{activeErrands}</p>
            </div>
          </div>
        </Link>
        <Link to="/portal/invoices" className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-body-sm text-muted-foreground">{t('portal.dashboard.pendingInvoices')}</p>
              <p className="text-display-sm font-bold text-foreground">{pendingInvoices}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('portal.dashboard.recentActivity')}</h2>
            {recentActivity.length === 0 ? (
              <p className="text-body-md text-muted-foreground">{t('portal.dashboard.noActivity')}</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(act => (
                  <div key={act.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="h-2 w-2 rounded-full bg-accent mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md text-foreground truncate">
                        {language === 'ar' && act.title_ar ? act.title_ar : act.title}
                      </p>
                      <p className="text-body-sm text-muted-foreground">{formatDate(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('portal.dashboard.upcomingEvents')}</h2>
            {upcomingHearings.length === 0 ? (
              <p className="text-body-md text-muted-foreground">
                {language === 'en' ? 'No upcoming events' : 'لا توجد أحداث قادمة'}
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingHearings.map(h => (
                  <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex flex-col items-center justify-center text-accent">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-body-md font-medium text-foreground">{h.hearing_type}</p>
                      <p className="text-body-sm text-muted-foreground">{formatDate(h.hearing_date)}{h.hearing_time ? ` • ${h.hearing_time}` : ''}</p>
                    </div>
                    <StatusBadge status={h.status} type="errand" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t('portal.cases.caseTeam')}</h2>
            {teamMembers.length === 0 ? (
              <p className="text-body-md text-muted-foreground">
                {language === 'en' ? 'No team members assigned' : 'لم يتم تعيين أعضاء فريق'}
              </p>
            ) : (
              <div className="space-y-3">
                {teamMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-body-sm font-semibold">
                      {(m.first_name?.[0] || '') + (m.last_name?.[0] || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium text-foreground truncate">
                        {language === 'ar' && m.first_name_ar ? `${m.first_name_ar} ${m.last_name_ar || ''}` : `${m.first_name} ${m.last_name}`}
                      </p>
                      <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                        {m.phone && <a href={`tel:${m.phone}`} className="hover:text-accent">{m.phone}</a>}
                        {m.email && <a href={`mailto:${m.email}`} className="hover:text-accent truncate">{m.email}</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {language === 'en' ? 'Outstanding Balance' : 'الرصيد المستحق'}
            </h2>
            <p className="text-display-sm font-bold text-accent">
              {outstandingBalance.toLocaleString()} IQD
            </p>
            <Link to="/portal/invoices" className="inline-flex items-center gap-1 text-body-sm text-accent mt-2 hover:underline">
              {language === 'en' ? 'View Invoices' : 'عرض الفواتير'} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
