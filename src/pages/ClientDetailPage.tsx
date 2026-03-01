import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ClientFormSlideOver from '@/components/clients/ClientFormSlideOver';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Mail, Phone, MapPin, Pencil, MoreHorizontal, Archive, UserPlus,
  FileDown, Scale, Briefcase, FileCheck, Receipt, ArrowLeft,
  Users, FileText, Plus, X, Loader2, Calendar, RefreshCw, MessageSquare,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import EntityDocumentsTab from '@/components/documents/EntityDocumentsTab';
import ClientBillingTab from '@/components/clients/ClientBillingTab';
import ClientMessagesTab from '@/components/clients/ClientMessagesTab';
import ClientPortalActivityCard from '@/components/clients/ClientPortalActivityCard';

const CLIENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#F0FDF4', text: '#22C55E' },
  inactive: { bg: '#F1F5F9', text: '#64748B' },
  archived: { bg: '#F3F4F6', text: '#9CA3AF' },
  prospect: { bg: '#EFF6FF', text: '#3B82F6' },
};

interface ClientFull {
  id: string;
  client_type: string;
  first_name: string | null; last_name: string | null;
  first_name_ar: string | null; last_name_ar: string | null;
  company_name: string | null; company_name_ar: string | null;
  company_type: string | null; company_registration_number: string | null;
  industry: string | null;
  email: string | null; phone: string | null;
  secondary_phone: string | null; whatsapp_number: string | null;
  address: string | null; address_ar: string | null;
  city: string | null; governorate: string;
  national_id_number: string | null; date_of_birth: string | null;
  gender: string | null; nationality: string | null;
  tax_id: string | null; source: string | null;
  tags: string[] | null; notes: string | null;
  status: string; profile_image_url: string | null;
  created_at: string; created_by: string | null;
  payment_terms_days: number | null;
  preferred_currency: string | null;
}

interface ContactPerson {
  id: string;
  first_name: string; last_name: string;
  first_name_ar: string | null; last_name_ar: string | null;
  email: string | null; phone: string | null;
  job_title: string | null; department: string | null;
  is_primary: boolean;
}

interface Activity {
  id: string;
  activity_type: string;
  title: string; title_ar: string | null;
  description: string | null;
  created_at: string;
  actor_id: string | null;
}

interface CaseRow {
  id: string;
  case_number: string;
  title: string;
  title_ar: string | null;
  case_type: string;
  status: string;
  priority: string;
  created_at: string;
}

interface ErrandRow {
  id: string;
  errand_number: string;
  title: string;
  title_ar: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  total_steps: number;
  completed_steps: number;
  created_at: string;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();

  const [client, setClient] = useState<ClientFull | null>(null);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Cases
  const [clientCases, setClientCases] = useState<CaseRow[]>([]);
  const [totalCasesCount, setTotalCasesCount] = useState(0);
  const [activeCasesCount, setActiveCasesCount] = useState(0);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesStatusFilter, setCasesStatusFilter] = useState('all');
  const [casesTypeFilter, setCasesTypeFilter] = useState('all');

  // Errands
  const [clientErrands, setClientErrands] = useState<ErrandRow[]>([]);
  const [totalErrandsCount, setTotalErrandsCount] = useState(0);
  const [errandsLoading, setErrandsLoading] = useState(true);
  const [errandsStatusFilter, setErrandsStatusFilter] = useState('all');
  const [errandsCategoryFilter, setErrandsCategoryFilter] = useState('all');

  // Edit
  const [formOpen, setFormOpen] = useState(false);

  // Notes edit
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Activity pagination
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  // Portal invitation
  const [portalInviteOpen, setPortalInviteOpen] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setNotFound(true); setIsLoading(false); return; }
      setClient(data as unknown as ClientFull);

      if (data.client_type === 'company') {
        const { data: cc } = await supabase
          .from('client_contacts')
          .select('*')
          .eq('client_id', id)
          .order('is_primary', { ascending: false });
        setContacts((cc || []) as unknown as ContactPerson[]);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchCases = useCallback(async () => {
    if (!id || !profile?.organization_id) return;
    setCasesLoading(true);

    // Counts
    const [totalRes, activeRes] = await Promise.all([
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('client_id', id).eq('organization_id', profile.organization_id!),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('client_id', id).eq('organization_id', profile.organization_id!).in('status', ['active', 'pending_hearing', 'pending_judgment', 'intake']),
    ]);
    setTotalCasesCount(totalRes.count || 0);
    setActiveCasesCount(activeRes.count || 0);

    // List
    let query = supabase
      .from('cases')
      .select('id, case_number, title, title_ar, case_type, status, priority, created_at')
      .eq('client_id', id)
      .eq('organization_id', profile.organization_id!)
      .order('created_at', { ascending: false })
      .limit(50);

    if (casesStatusFilter !== 'all') query = query.eq('status', casesStatusFilter);
    if (casesTypeFilter !== 'all') query = query.eq('case_type', casesTypeFilter);

    const { data } = await query;
    setClientCases((data || []) as unknown as CaseRow[]);
    setCasesLoading(false);
  }, [id, profile?.organization_id, casesStatusFilter, casesTypeFilter]);

  const fetchErrands = useCallback(async () => {
    if (!id || !profile?.organization_id) return;
    setErrandsLoading(true);
    const { count } = await supabase.from('errands').select('*', { count: 'exact', head: true }).eq('client_id', id).eq('organization_id', profile.organization_id!);
    setTotalErrandsCount(count || 0);

    let query = supabase
      .from('errands')
      .select('id, errand_number, title, title_ar, category, status, priority, due_date, assigned_to, total_steps, completed_steps, created_at')
      .eq('client_id', id)
      .eq('organization_id', profile.organization_id!)
      .order('created_at', { ascending: false })
      .limit(50);
    if (errandsStatusFilter !== 'all') query = query.eq('status', errandsStatusFilter);
    if (errandsCategoryFilter !== 'all') query = query.eq('category', errandsCategoryFilter);
    const { data } = await query;
    setClientErrands((data || []) as unknown as ErrandRow[]);
    setErrandsLoading(false);
  }, [id, profile?.organization_id, errandsStatusFilter, errandsCategoryFilter]);

  const fetchActivities = useCallback(async (page = 1, filter = 'all') => {
    if (!id) return;
    const pageSize = 20;
    let query = supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filter !== 'all') query = query.ilike('activity_type', `${filter}%`);

    const { data } = await query;
    const items = (data || []) as unknown as Activity[];
    if (page === 1) setActivities(items);
    else setActivities(prev => [...prev, ...items]);
    setHasMoreActivities(items.length === pageSize);
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);
  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => { fetchErrands(); }, [fetchErrands]);
  useEffect(() => { fetchActivities(1, activityFilter); }, [fetchActivities, activityFilter]);

  const getClientName = (c: ClientFull) => {
    if (c.client_type === 'company') return language === 'ar' && c.company_name_ar ? c.company_name_ar : c.company_name || '';
    if (language === 'ar' && c.first_name_ar && c.last_name_ar) return `${c.first_name_ar} ${c.last_name_ar}`;
    return `${c.first_name || ''} ${c.last_name || ''}`.trim();
  };

  const getInitials = (c: ClientFull) => {
    if (c.client_type === 'company') return (c.company_name || 'C')[0].toUpperCase();
    return ((c.first_name?.[0] || '') + (c.last_name?.[0] || '')).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return language === 'ar' ? format(d, 'dd MMMM yyyy', { locale: arLocale }) : format(d, 'MMM dd, yyyy');
  };

  const handleSaveNotes = async () => {
    if (!client) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('clients').update({ notes: notesValue || null, updated_by: profile?.id } as any).eq('id', client.id);
      if (error) throw error;
      setClient(prev => prev ? { ...prev, notes: notesValue || null } : prev);
      setNotesDialogOpen(false);
      await supabase.from('client_activities').insert({
        organization_id: profile?.organization_id,
        client_id: client.id,
        actor_id: profile?.id,
        activity_type: 'note_updated',
        title: 'Updated client notes',
        title_ar: 'تم تحديث ملاحظات العميل',
      } as any);
      toast({ title: t('clients.messages.updated') });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingNotes(false);
    }
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Scale size={64} className="text-muted-foreground/30 mb-4" />
        <h2 className="text-display-sm font-semibold text-foreground mb-2">{t('clients.detail.notFound')}</h2>
        <p className="text-body-md text-muted-foreground mb-6 text-center max-w-md">{t('clients.detail.notFoundSubtitle')}</p>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          <ArrowLeft size={16} className="me-2" />
          {t('clients.detail.backToClients')}
        </Button>
      </div>
    );
  }

  if (isLoading || !client) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-start gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
            <Skeleton className="h-40 rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const clientName = getClientName(client);
  const statusColors = CLIENT_STATUS_COLORS[client.status] || CLIENT_STATUS_COLORS.active;

  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-border/50 last:border-0">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-body-md text-foreground text-end max-w-[60%]">{value || '—'}</span>
    </div>
  );

  const ActivityIcon = ({ type }: { type: string }) => {
    const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
      client_created: { icon: UserPlus, color: '#22C55E' },
      client_updated: { icon: Pencil, color: '#3B82F6' },
      client_archived: { icon: Archive, color: '#64748B' },
      case_created: { icon: Scale, color: '#3B82F6' },
      case_status_changed: { icon: RefreshCw, color: '#F59E0B' },
      status_changed: { icon: RefreshCw, color: '#F59E0B' },
      hearing_scheduled: { icon: Calendar, color: '#EF4444' },
      note_added: { icon: MessageSquare, color: '#8B5CF6' },
      note_updated: { icon: FileText, color: '#8B5CF6' },
      contact_added: { icon: Users, color: '#06B6D4' },
      contact_removed: { icon: Users, color: '#EF4444' },
    };
    const config = iconMap[type] || { icon: FileText, color: '#64748B' };
    const Icon = config.icon;
    return <Icon size={14} style={{ color: config.color }} />;
  };

  // Recent cases for overview
  const recentCases = clientCases.slice(0, 5);

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-body-sm text-muted-foreground mb-3">
        <Link to="/dashboard" className="text-accent hover:underline">{t('sidebar.dashboard')}</Link>
        <span>{isRTL ? ' \\ ' : ' / '}</span>
        <Link to="/clients" className="text-accent hover:underline">{t('clients.title')}</Link>
        <span>{isRTL ? ' \\ ' : ' / '}</span>
        <span className="text-foreground">{clientName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-lg font-semibold text-accent flex-shrink-0">
            {getInitials(client)}
          </div>
          <div>
            <h1 className="text-display-lg font-bold text-foreground">{clientName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center text-xs font-medium rounded-badge px-2 py-0.5"
                style={{ backgroundColor: client.client_type === 'individual' ? '#EFF6FF' : '#F5F3FF', color: client.client_type === 'individual' ? '#3B82F6' : '#8B5CF6' }}>
                {client.client_type === 'individual' ? t('clients.individual') : t('clients.company')}
              </span>
              <span className="inline-flex items-center text-xs font-medium rounded-badge px-2.5 py-[3px] capitalize"
                style={{ backgroundColor: statusColors.bg, color: statusColors.text }}>
                {t(`clients.statuses.${client.status}`)}
              </span>
              {client.company_type && (
                <span className="inline-flex items-center text-xs font-medium rounded-badge px-2 py-0.5 bg-muted text-muted-foreground">
                  {t(`clients.companyTypes.${client.company_type}`)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-body-sm text-muted-foreground">
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-foreground">
                  <Mail size={14} /> {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-foreground">
                  <Phone size={14} /> {client.phone}
                </a>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {t(`clients.governorates.${client.governorate}`)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" className="h-10" onClick={() => setFormOpen(true)}>
            <Pencil size={16} className="me-2" /> {t('common.edit')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
              <DropdownMenuItem><Archive size={14} className="me-2" /> {t('clients.archive')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPortalEmail(client.email || ''); setPortalInviteOpen(true); }}>
                <UserPlus size={14} className="me-2" /> {t('portal.enablePortalAccess')}
              </DropdownMenuItem>
              <DropdownMenuItem><FileDown size={14} className="me-2" /> {t('clients.detail.exportPdf')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-0 overflow-x-auto">
            {[
              { key: 'overview', label: t('clients.tabs.overview') },
              { key: 'cases', label: t('clients.tabs.cases'), count: String(totalCasesCount) },
              { key: 'errands', label: t('clients.tabs.errands'), count: String(totalErrandsCount) },
              { key: 'documents', label: t('clients.tabs.documents') },
              { key: 'billing', label: t('clients.tabs.billing'), count: '0 IQD' },
              { key: 'messages', label: t('sidebar.messages') },
              { key: 'activity', label: t('clients.tabs.activity') },
            ].map(tab => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={cn(
                'rounded-none border-b-2 border-transparent px-5 py-3 text-body-md font-medium text-muted-foreground',
                'data-[state=active]:border-accent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent',
                'hover:text-foreground hover:bg-muted/50',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ms-2 text-body-sm bg-muted text-muted-foreground rounded-badge px-2 py-0.5">{tab.count}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Scale, color: '#3B82F6', bg: '#EFF6FF', label: t('clients.overview.totalCases'), value: String(totalCasesCount) },
                  { icon: Briefcase, color: '#22C55E', bg: '#F0FDF4', label: t('clients.overview.activeCases'), value: String(activeCasesCount) },
                  { icon: FileCheck, color: '#8B5CF6', bg: '#F5F3FF', label: t('clients.overview.totalErrands'), value: String(totalErrandsCount) },
                  { icon: Receipt, color: '#C9A84C', bg: '#FFF8E1', label: t('clients.overview.totalBilled'), value: language === 'ar' ? '٠ د.ع' : '0 IQD' },
                ].map((s, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon size={16} style={{ color: s.color }} />
                      <span className="text-body-sm text-muted-foreground">{s.label}</span>
                    </div>
                    <div className="text-heading-sm font-semibold text-foreground">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Recent Cases */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-heading-sm font-semibold text-foreground">{t('clients.detail.recentCases')}</h3>
                  {totalCasesCount > 0 && (
                    <button className="text-body-sm text-accent hover:underline font-medium" onClick={() => setActiveTab('cases')}>
                      {t('dashboard.viewAll')}
                    </button>
                  )}
                </div>
                {recentCases.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground italic">{t('clients.detail.noCasesYet')}</p>
                ) : (
                  <div className="space-y-0">
                    {recentCases.map(c => (
                      <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded" onClick={() => navigate(`/cases/${c.id}`)}>
                        <div className="min-w-0">
                          <p className="text-body-sm text-muted-foreground font-mono">{c.case_number}</p>
                          <p className="text-body-md text-foreground truncate">{language === 'ar' && c.title_ar ? c.title_ar : c.title}</p>
                        </div>
                        <StatusBadge status={c.status} type="case" size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('clients.detail.recentActivity')}</h3>
                {activities.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground italic">{t('clients.detail.noActivityYet')}</p>
                ) : (
                  <div className="space-y-0">
                    {activities.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                        <div className="mt-0.5 w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <ActivityIcon type={a.activity_type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md text-foreground">{language === 'ar' && a.title_ar ? a.title_ar : a.title}</p>
                          <p className="text-body-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('clients.detail.clientDetails')}</h3>
                <DetailRow label={t('clients.detail.clientSince')} value={formatDate(client.created_at)} />
                {client.client_type === 'individual' && (
                  <>
                    <DetailRow label={t('clients.fields.nationalId')} value={client.national_id_number} />
                    <DetailRow label={t('clients.fields.dateOfBirth')} value={client.date_of_birth ? formatDate(client.date_of_birth) : null} />
                    <DetailRow label={t('clients.fields.gender')} value={client.gender ? t(`clients.fields.${client.gender}`) : null} />
                    <DetailRow label={t('clients.fields.nationality')} value={client.nationality} />
                  </>
                )}
                {client.client_type === 'company' && (
                  <DetailRow label={t('clients.detail.registrationNumber')} value={client.company_registration_number} />
                )}
                <DetailRow label={t('clients.fields.taxId')} value={client.tax_id} />
                <DetailRow label={t('clients.fields.source')} value={client.source ? t(`clients.sources.${client.source}`) : null} />
                <DetailRow label={t('clients.detail.paymentTerms')} value={client.payment_terms_days ? `${client.payment_terms_days} ${t('clients.detail.days')}` : null} />
                <DetailRow label={t('clients.detail.preferredCurrency')} value={client.preferred_currency} />
              </div>

              {client.tags && client.tags.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('clients.detail.tags')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map(tag => (
                      <span key={tag} className="bg-muted text-foreground text-body-sm rounded-full px-2.5 py-1">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-heading-sm font-semibold text-foreground">{t('clients.detail.internalNotes')}</h3>
                  <Button variant="outline" size="sm" onClick={() => { setNotesValue(client.notes || ''); setNotesDialogOpen(true); }}>
                    <Pencil size={14} className="me-1" /> {t('clients.detail.editNotes')}
                  </Button>
                </div>
                {client.notes ? (
                  <p className="text-body-md text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                ) : (
                  <p className="text-body-sm text-muted-foreground italic">{t('clients.detail.noNotes')}</p>
                )}
              </div>

              {client.client_type === 'company' && (
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('clients.contactPerson.title')}</h3>
                  {contacts.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground italic">{t('clients.detail.noContacts')}</p>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map(c => (
                        <div key={c.id} className="border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-body-md font-medium text-foreground">
                                {language === 'ar' && c.first_name_ar ? `${c.first_name_ar} ${c.last_name_ar || ''}` : `${c.first_name} ${c.last_name}`}
                              </span>
                              {c.is_primary && (
                                <span className="text-[11px] font-medium bg-[#F0FDF4] text-[#22C55E] rounded-badge px-1.5 py-0.5">{t('clients.contactPerson.primary')}</span>
                              )}
                            </div>
                          </div>
                          {(c.email || c.phone) && (
                            <div className="flex flex-wrap gap-3 mt-1 text-body-sm text-muted-foreground">
                              {c.email && <span>{c.email}</span>}
                              {c.phone && <span>{c.phone}</span>}
                            </div>
                          )}
                          {(c.job_title || c.department) && (
                            <div className="text-body-sm text-muted-foreground/70 mt-0.5">
                              {[c.job_title, c.department].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-2">{t('clients.detail.outstandingBalance')}</h3>
                <div className="text-display-sm font-bold text-[#22C55E]">
                  {language === 'ar' ? '٠ د.ع' : '0 IQD'}
                </div>
                <button className="text-body-sm text-accent hover:underline mt-1" onClick={() => setActiveTab('billing')}>
                  {t('clients.detail.viewInvoices')}
                </button>
              </div>

              <ClientPortalActivityCard clientId={client.id} />
            </div>
          </div>
        </TabsContent>

        {/* CASES TAB */}
        <TabsContent value="cases" className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-heading-lg font-semibold text-foreground">
              {language === 'ar' ? `قضايا ${clientName}` : `Cases for ${clientName}`}
            </h3>
            <Button onClick={() => navigate(`/cases/new?clientId=${client.id}`)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus size={16} className="me-2" /> {t('clients.detail.createCase')}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <select value={casesStatusFilter} onChange={e => setCasesStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-body-sm">
              <option value="all">{t('common.all')} {t('common.status')}</option>
              {['intake','active','pending_hearing','pending_judgment','on_hold','won','lost','settled','closed','archived'].map(s => (
                <option key={s} value={s}>{t(`cases.statuses.${s}`)}</option>
              ))}
            </select>
            <select value={casesTypeFilter} onChange={e => setCasesTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-body-sm">
              <option value="all">{t('common.all')} {t('common.type')}</option>
              {['civil','criminal','commercial','personal_status','labor','administrative','real_estate','family','corporate','contract','intellectual_property','tax','customs','other'].map(ct => (
                <option key={ct} value={ct}>{t(`cases.caseTypes.${ct}`)}</option>
              ))}
            </select>
          </div>

          {casesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : clientCases.length === 0 ? (
            <EmptyState
              icon={Scale}
              title={t('clients.detail.noCasesYet')} titleAr={t('clients.detail.noCasesYet')}
              actionLabel={t('clients.detail.createCase')} actionLabelAr={t('clients.detail.createCase')}
              onAction={() => navigate(`/cases/new?clientId=${client.id}`)}
            />
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[15%]">{t('cases.caseNumber')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[30%]">{t('cases.fields.title')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[15%]">{t('cases.fields.caseType')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[12%]">{t('common.status')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[12%]">{t('common.priority')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[16%]">{t('common.createdAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientCases.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/cases/${c.id}`)}>
                      <td className="px-4 py-3 text-body-sm font-mono text-muted-foreground">{c.case_number}</td>
                      <td className="px-4 py-3 text-body-md font-medium text-foreground">{language === 'ar' && c.title_ar ? c.title_ar : c.title}</td>
                      <td className="px-4 py-3"><span className="text-body-sm bg-muted text-muted-foreground rounded-badge px-2 py-0.5">{t(`cases.caseTypes.${c.case_type}`)}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} type="case" size="sm" /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.priority} type="priority" size="sm" /></td>
                      <td className="px-4 py-3 text-body-sm text-muted-foreground">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ERRANDS TAB */}
        <TabsContent value="errands" className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-heading-lg font-semibold text-foreground">{t('clients.tabs.errands')}</h2>
            <div className="flex items-center gap-2">
              <select value={errandsStatusFilter} onChange={e => setErrandsStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-body-sm">
                <option value="all">{t('common.all')} {t('common.status')}</option>
                {['new','in_progress','awaiting_documents','submitted_to_government','under_review_by_government','additional_requirements','approved','rejected','completed','cancelled'].map(s => (
                  <option key={s} value={s}>{t(`statuses.errand.${s}`)}</option>
                ))}
              </select>
              <button onClick={() => navigate(`/errands/new?clientId=${client.id}`)} className="inline-flex items-center gap-2 h-9 px-4 rounded-button bg-accent text-accent-foreground text-body-sm font-semibold hover:bg-accent/90 transition-colors">
                <Plus size={14} /> {t('clients.detail.createErrand')}
              </button>
            </div>
          </div>

          {errandsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : clientErrands.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title={t('clients.detail.noErrandsYet')} titleAr={t('clients.detail.noErrandsYet')}
              actionLabel={t('clients.detail.createErrand')} actionLabelAr={t('clients.detail.createErrand')}
              onAction={() => navigate(`/errands/new?clientId=${client.id}`)}
            />
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[10%]">{t('errands.errandNumber')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[25%]">{t('errands.fields.title')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[12%]">{t('common.status')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[15%]">{t('errands.progress')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[12%]">{t('errands.fields.dueDate')}</th>
                    <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[12%]">{t('common.createdAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientErrands.map(e => {
                    const pct = e.total_steps > 0 ? Math.round((e.completed_steps / e.total_steps) * 100) : 0;
                    const dueDays = e.due_date ? differenceInDays(new Date(e.due_date), new Date()) : null;
                    const dueColor = dueDays !== null && dueDays < 0 ? 'text-destructive' : dueDays !== null && dueDays <= 3 ? 'text-warning' : 'text-muted-foreground';
                    return (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/errands/${e.id}`)}>
                        <td className="px-4 py-3 text-body-sm font-mono text-muted-foreground">{e.errand_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-body-md font-medium text-foreground truncate">{language === 'ar' && e.title_ar ? e.title_ar : e.title}</p>
                          <p className="text-body-sm text-muted-foreground">{t(`errands.categories.${e.category}`)}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={e.status} type="errand" size="sm" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-body-sm text-muted-foreground whitespace-nowrap">{e.completed_steps}/{e.total_steps}</span>
                          </div>
                        </td>
                        <td className={cn('px-4 py-3 text-body-sm', dueColor)}>{e.due_date ? formatDate(e.due_date) : '—'}</td>
                        <td className="px-4 py-3 text-body-sm text-muted-foreground">{formatDate(e.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-6">
          <EntityDocumentsTab entityType="client" entityId={id!} clientInfo={client ? { id: client.id, name: clientName } : undefined} />
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="mt-6">
          <ClientBillingTab clientId={id!} clientName={clientName} />
        </TabsContent>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="mt-6">
          <ClientMessagesTab clientId={client.id} />
        </TabsContent>

        {/* ACTIVITY LOG TAB */}
        <TabsContent value="activity" className="mt-6">
          <div className="mb-4">
            <select
              value={activityFilter}
              onChange={e => { setActivityFilter(e.target.value); setActivityPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-body-sm"
            >
              <option value="all">{t('clients.detail.allActivities')}</option>
              <option value="case">{t('clients.tabs.cases')}</option>
              <option value="errand">{t('clients.tabs.errands')}</option>
              <option value="document">{t('clients.tabs.documents')}</option>
              <option value="invoice">{t('clients.tabs.billing')}</option>
              <option value="note">{t('common.notes')}</option>
            </select>
          </div>
          {activities.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-body-md text-muted-foreground">{t('clients.detail.noActivityYet')}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-5 space-y-0">
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                  <div className="relative flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ActivityIcon type={a.activity_type} />
                      <span className="text-body-md text-foreground">{language === 'ar' && a.title_ar ? a.title_ar : a.title}</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined })}
                    </p>
                  </div>
                </div>
              ))}
              {hasMoreActivities && (
                <div className="pt-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => {
                    const next = activityPage + 1;
                    setActivityPage(next);
                    fetchActivities(next, activityFilter);
                  }}>
                    {t('clients.detail.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clients.detail.editNotes')}</DialogTitle>
          </DialogHeader>
          <textarea
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            className="w-full min-h-[120px] rounded-md border border-input bg-background p-3 text-body-md resize-y"
            placeholder={t('clients.form.notesPlaceholder')}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {savingNotes && <Loader2 size={16} className="animate-spin me-2" />}
              {t('clients.detail.saveNotes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Slide-Over */}
      <ClientFormSlideOver
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { fetchClient(); fetchCases(); fetchActivities(1, activityFilter); }}
        editClientId={client.id}
      />

      {/* Portal Invitation Modal */}
      <Dialog open={portalInviteOpen} onOpenChange={setPortalInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.enablePortalAccess')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-label text-foreground block mb-1.5">{t('common.email')}</label>
              <input
                type="email"
                value={portalEmail}
                onChange={(e) => setPortalEmail(e.target.value)}
                className="w-full h-11 rounded-input border border-border bg-card px-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortalInviteOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={!portalEmail || sendingInvite}
              onClick={async () => {
                if (!portalEmail || !profile?.organization_id || !client) return;
                setSendingInvite(true);
                try {
                  const { error } = await supabase.from('invitations').insert({
                    organization_id: profile.organization_id,
                    invited_by: profile.id,
                    email: portalEmail,
                    role: 'client',
                    first_name: client.first_name || client.company_name || '',
                    last_name: client.last_name || '',
                  } as any);
                  if (error) throw error;
                  toast({ title: t('portal.portalInvitationSent') });
                  setPortalInviteOpen(false);
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message, variant: 'destructive' });
                } finally {
                  setSendingInvite(false);
                }
              }}
            >
              {sendingInvite ? <Loader2 size={16} className="me-2 animate-spin" /> : <UserPlus size={16} className="me-2" />}
              {t('portal.sendPortalInvitation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
