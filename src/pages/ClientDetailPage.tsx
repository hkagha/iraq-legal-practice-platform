import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { format, formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, MapPin, Pencil, MoreHorizontal, Archive, UserPlus,
  FileDown, Scale, Briefcase, FileCheck, Receipt, ArrowLeft,
  Users, FileText, Plus, X, Loader2,
} from 'lucide-react';

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

      // Fetch contacts if company
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

  const fetchActivities = useCallback(async (page = 1, filter = 'all') => {
    if (!id) return;
    const pageSize = 20;
    let query = supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filter !== 'all') {
      query = query.ilike('activity_type', `${filter}%`);
    }

    const { data } = await query;
    const items = (data || []) as unknown as Activity[];
    if (page === 1) {
      setActivities(items);
    } else {
      setActivities(prev => [...prev, ...items]);
    }
    setHasMoreActivities(items.length === pageSize);
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);
  useEffect(() => { fetchActivities(1, activityFilter); }, [fetchActivities, activityFilter]);

  const getClientName = (c: ClientFull) => {
    if (c.client_type === 'company') {
      return language === 'ar' && c.company_name_ar ? c.company_name_ar : c.company_name || '';
    }
    if (language === 'ar' && c.first_name_ar && c.last_name_ar) {
      return `${c.first_name_ar} ${c.last_name_ar}`;
    }
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
      // Log activity
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

  // --- NOT FOUND ---
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

  // --- LOADING ---
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
      note_added: { icon: FileText, color: '#8B5CF6' },
      note_updated: { icon: FileText, color: '#8B5CF6' },
      contact_added: { icon: Users, color: '#06B6D4' },
      contact_removed: { icon: Users, color: '#EF4444' },
    };
    const config = iconMap[type] || { icon: FileText, color: '#64748B' };
    const Icon = config.icon;
    return <Icon size={14} style={{ color: config.color }} />;
  };

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
              {client.whatsapp_number && (
                <span className="flex items-center gap-1 text-[#25D366]">
                  <Phone size={14} /> {client.whatsapp_number}
                </span>
              )}
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
              <DropdownMenuItem><UserPlus size={14} className="me-2" /> {t('clients.detail.inviteToPortal')}</DropdownMenuItem>
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
            { key: 'cases', label: t('clients.tabs.cases'), count: '0' },
            { key: 'errands', label: t('clients.tabs.errands'), count: '0' },
            { key: 'documents', label: t('clients.tabs.documents'), count: '0' },
            { key: 'billing', label: t('clients.tabs.billing'), count: '0 IQD' },
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
            {/* Left column */}
            <div className="lg:col-span-3 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Scale, color: '#3B82F6', bg: '#EFF6FF', label: t('clients.overview.totalCases'), value: '0' },
                  { icon: Briefcase, color: '#22C55E', bg: '#F0FDF4', label: t('clients.overview.activeCases'), value: '0' },
                  { icon: FileCheck, color: '#8B5CF6', bg: '#F5F3FF', label: t('clients.overview.totalErrands'), value: '0' },
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
                </div>
                <p className="text-body-sm text-muted-foreground italic">{t('clients.detail.noCasesYet')}</p>
              </div>

              {/* Recent Activity */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-3">{t('clients.detail.recentActivity')}</h3>
                {activities.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground italic">{t('clients.detail.noActivityYet')}</p>
                ) : (
                  <div className="space-y-0">
                    {activities.slice(0, 5).map((a, i) => (
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
              {/* Client Details Card */}
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

              {/* Tags Card */}
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

              {/* Notes Card */}
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

              {/* Contact Persons (company only) */}
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

              {/* Outstanding Balance */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-heading-sm font-semibold text-foreground mb-2">{t('clients.detail.outstandingBalance')}</h3>
                <div className="text-display-sm font-bold text-[#22C55E]">
                  {language === 'ar' ? '٠ د.ع' : '0 IQD'}
                </div>
                <button className="text-body-sm text-accent hover:underline mt-1" onClick={() => setActiveTab('billing')}>
                  {t('clients.detail.viewInvoices')}
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* CASES TAB */}
        <TabsContent value="cases" className="mt-6">
          <EmptyState
            icon={Scale}
            title={t('clients.detail.noCasesYet')} titleAr={t('clients.detail.noCasesYet')}
            actionLabel={t('clients.detail.createCase')} actionLabelAr={t('clients.detail.createCase')}
            onAction={() => {}}
          />
        </TabsContent>

        {/* ERRANDS TAB */}
        <TabsContent value="errands" className="mt-6">
          <EmptyState
            icon={FileCheck}
            title={t('clients.detail.noErrandsYet')} titleAr={t('clients.detail.noErrandsYet')}
            actionLabel={t('clients.detail.createErrand')} actionLabelAr={t('clients.detail.createErrand')}
            onAction={() => {}}
          />
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-6">
          <EmptyState
            icon={FileText}
            title={t('clients.detail.noDocumentsYet')} titleAr={t('clients.detail.noDocumentsYet')}
            actionLabel={t('clients.detail.uploadDocument')} actionLabelAr={t('clients.detail.uploadDocument')}
            onAction={() => {}}
          />
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="mt-6">
          <EmptyState
            icon={Receipt}
            title={t('clients.detail.noInvoicesYet')} titleAr={t('clients.detail.noInvoicesYet')}
            actionLabel={t('clients.detail.createInvoice')} actionLabelAr={t('clients.detail.createInvoice')}
            onAction={() => {}}
          />
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
        onSaved={() => { fetchClient(); fetchActivities(1, activityFilter); }}
        editClientId={client.id}
      />
    </div>
  );
}
