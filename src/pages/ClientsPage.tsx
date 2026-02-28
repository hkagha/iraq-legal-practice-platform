import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import ClientFormSlideOver from '@/components/clients/ClientFormSlideOver';
import {
  Users, UserCheck, UserPlus, Mail, Phone, MapPin,
  MoreHorizontal, Pencil, Eye, Archive, List, LayoutGrid,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const GOVERNORATES = [
  'Baghdad', 'Basra', 'Maysan', 'Dhi Qar', 'Wasit', 'Babil', 'Karbala', 'Najaf',
  'Al-Qadisiyyah', 'Al-Muthanna', 'Diyala', 'Salah al-Din', 'Kirkuk', 'Nineveh',
  'Erbil', 'Duhok', 'Sulaymaniyah', 'Al-Anbar',
];

const CLIENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#F0FDF4', text: '#22C55E' },
  inactive: { bg: '#F1F5F9', text: '#64748B' },
  archived: { bg: '#F3F4F6', text: '#9CA3AF' },
  prospect: { bg: '#EFF6FF', text: '#3B82F6' },
};

interface Client {
  id: string;
  client_type: string;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  company_name: string | null;
  company_name_ar: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  governorate: string;
  status: string;
  created_at: string;
  profile_image_url: string | null;
}

export default function ClientsPage() {
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [newThisMonth, setNewThisMonth] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [govFilter, setGovFilter] = useState('all');
  const [activeView, setActiveView] = useState('table');

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Slide-over state
  const [formOpen, setFormOpen] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);

  // Archive dialog
  const [archiveTarget, setArchiveTarget] = useState<Client | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('clients').select('*', { count: 'exact' });

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,company_name.ilike.%${search}%,company_name_ar.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }
      if (typeFilter !== 'all') query = query.eq('client_type', typeFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (govFilter !== 'all') query = query.eq('governorate', govFilter);

      query = query.order(sortKey, { ascending: sortDir === 'asc' });
      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      setClients((data as unknown as Client[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, statusFilter, govFilter, sortKey, sortDir, page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const [totalRes, activeRes, monthRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('clients').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);
      setTotalCount(totalRes.count || 0);
      setActiveCount(activeRes.count || 0);
      setNewThisMonth(monthRes.count || 0);
    } catch {}
  }, []);

  const refreshAll = useCallback(() => {
    fetchClients();
    fetchStats();
  }, [fetchClients, fetchStats]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, govFilter]);

  const getClientName = (c: Client) => {
    if (c.client_type === 'company') {
      return language === 'ar' && c.company_name_ar ? c.company_name_ar : c.company_name || '';
    }
    if (language === 'ar' && c.first_name_ar && c.last_name_ar) {
      return `${c.first_name_ar} ${c.last_name_ar}`;
    }
    return `${c.first_name || ''} ${c.last_name || ''}`.trim();
  };

  const getInitials = (c: Client) => {
    if (c.client_type === 'company') return (c.company_name || 'C')[0].toUpperCase();
    return ((c.first_name?.[0] || '') + (c.last_name?.[0] || '')).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (language === 'ar') return format(d, 'dd MMMM yyyy', { locale: ar });
    return format(d, 'MMM dd, yyyy');
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const openAddForm = () => { setEditClientId(null); setFormOpen(true); };
  const openEditForm = (id: string) => { setEditClientId(id); setFormOpen(true); };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      const { error } = await supabase.from('clients').update({ status: 'archived' }).eq('id', archiveTarget.id);
      if (error) throw error;
      toast({ title: t('clients.messages.archived') });
      setArchiveTarget(null);
      refreshAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsArchiving(false);
    }
  };

  const filters = useMemo(() => [
    {
      key: 'type', label: 'Type', labelAr: 'النوع',
      options: [
        { value: 'individual', label: 'Individual', labelAr: 'فرد' },
        { value: 'company', label: 'Company', labelAr: 'شركة' },
      ],
    },
    {
      key: 'status', label: 'Status', labelAr: 'الحالة',
      options: [
        { value: 'active', label: 'Active', labelAr: 'نشط' },
        { value: 'inactive', label: 'Inactive', labelAr: 'غير نشط' },
        { value: 'archived', label: 'Archived', labelAr: 'مؤرشف' },
        { value: 'prospect', label: 'Prospect', labelAr: 'محتمل' },
      ],
    },
    {
      key: 'governorate', label: 'Governorate', labelAr: 'المحافظة',
      options: GOVERNORATES.map(g => ({
        value: g, label: t(`clients.governorates.${g}`), labelAr: t(`clients.governorates.${g}`),
      })),
    },
  ], [t]);

  const activeFilters: Record<string, string> = { type: typeFilter, status: statusFilter, governorate: govFilter };
  const handleFilterChange = (key: string, value: string) => {
    if (key === 'type') setTypeFilter(value);
    if (key === 'status') setStatusFilter(value);
    if (key === 'governorate') setGovFilter(value);
  };
  const clearAll = () => { setTypeFilter('all'); setStatusFilter('all'); setGovFilter('all'); setSearch(''); };

  const columns = [
    {
      key: 'name', label: 'Name', labelAr: 'الاسم', sortable: true, width: '25%',
      render: (row: Client) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-body-sm font-medium text-muted-foreground flex-shrink-0">
            {getInitials(row)}
          </div>
          <div className="min-w-0">
            <div className="text-body-md font-medium text-foreground truncate">{getClientName(row)}</div>
            {row.email && <div className="text-body-sm text-muted-foreground truncate">{row.email}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'client_type', label: 'Type', labelAr: 'النوع', sortable: true, width: '10%',
      render: (row: Client) => (
        <span className="inline-flex items-center text-xs font-medium rounded-badge px-2 py-0.5"
          style={{ backgroundColor: row.client_type === 'individual' ? '#EFF6FF' : '#F5F3FF', color: row.client_type === 'individual' ? '#3B82F6' : '#8B5CF6' }}>
          {row.client_type === 'individual' ? t('clients.individual') : t('clients.company')}
        </span>
      ),
    },
    {
      key: 'phone', label: 'Phone', labelAr: 'الهاتف', width: '15%',
      render: (row: Client) => (
        <div className="flex items-center gap-1">
          <span className="text-body-md">{row.phone || '—'}</span>
          {row.whatsapp_number && (
            <svg viewBox="0 0 24 24" fill="#25D366" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
          )}
        </div>
      ),
    },
    {
      key: 'governorate', label: 'Governorate', labelAr: 'المحافظة', sortable: true, width: '12%',
      render: (row: Client) => <span>{t(`clients.governorates.${row.governorate}`)}</span>,
    },
    {
      key: 'cases_count', label: 'Cases', labelAr: 'القضايا', sortable: false, width: '8%',
      render: () => (
        <span className="inline-flex items-center justify-center min-w-[28px] text-body-sm bg-muted rounded-badge px-2 py-0.5">0</span>
      ),
    },
    {
      key: 'status', label: 'Status', labelAr: 'الحالة', sortable: true, width: '10%',
      render: (row: Client) => {
        const colors = CLIENT_STATUS_COLORS[row.status] || CLIENT_STATUS_COLORS.active;
        return (
          <span className="inline-flex items-center text-xs font-medium rounded-badge px-2.5 py-[3px] capitalize"
            style={{ backgroundColor: colors.bg, color: colors.text }}>
            {t(`clients.statuses.${row.status}`)}
          </span>
        );
      },
    },
    {
      key: 'created_at', label: 'Created', labelAr: 'التاريخ', sortable: true, width: '12%',
      render: (row: Client) => <span className="text-body-sm text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions', label: '', labelAr: '', width: '8%',
      render: (row: Client) => (
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/clients/${row.id}`)}>
                <Eye size={14} className="me-2" /> {t('clients.viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditForm(row.id)}>
                <Pencil size={14} className="me-2" /> {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setArchiveTarget(row)}>
                <Archive size={14} className="me-2" /> {t('clients.archive')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const viewOptions = [
    { key: 'table', icon: List, label: 'Table' },
    { key: 'grid', icon: LayoutGrid, label: 'Grid' },
  ];

  return (
    <div>
      <PageHeader
        title={t('clients.title')}
        titleAr={t('clients.title')}
        subtitle={t('clients.subtitle')}
        subtitleAr={t('clients.subtitle')}
        actionLabel={t('clients.addClient')}
        actionLabelAr={t('clients.addClient')}
        onAction={openAddForm}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Clients', labelAr: 'العملاء' },
        ]}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { icon: Users, color: '#3B82F6', bg: '#EFF6FF', label: t('clients.totalClients'), value: totalCount },
          { icon: UserCheck, color: '#22C55E', bg: '#F0FDF4', label: t('clients.activeClients'), value: activeCount },
          { icon: UserPlus, color: '#C9A84C', bg: '#FFF8E1', label: t('clients.newThisMonth'), value: newThisMonth },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-card p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.bg }}>
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <div>
              <div className="text-heading-sm font-semibold text-foreground">{isLoading ? '—' : stat.value}</div>
              <div className="text-body-sm text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <FilterBar
        searchPlaceholder={t('clients.search.placeholder')}
        searchPlaceholderAr={t('clients.search.placeholder')}
        onSearchChange={setSearch}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={clearAll}
        viewOptions={viewOptions}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {activeView === 'table' ? (
        <DataTable
          columns={columns}
          data={clients}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/clients/${row.id}`)}
          sortConfig={{ key: sortKey, direction: sortDir }}
          onSort={handleSort}
          pagination={{
            page, pageSize, total: totalCount,
            onPageChange: setPage,
            onPageSizeChange: (s) => { setPageSize(s); setPage(1); },
          }}
          emptyState={{
            icon: Users,
            title: t('clients.empty.title'), titleAr: t('clients.empty.title'),
            subtitle: t('clients.empty.subtitle'), subtitleAr: t('clients.empty.subtitle'),
            actionLabel: t('clients.empty.action'), actionLabelAr: t('clients.empty.action'),
            onAction: openAddForm,
          }}
        />
      ) : (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-card p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <Skeleton className="w-16 h-5 rounded-badge" />
                </div>
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-px w-full mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-card rounded-card border border-border overflow-hidden">
            <EmptyState
              icon={Users} title={t('clients.empty.title')} titleAr={t('clients.empty.title')}
              subtitle={t('clients.empty.subtitle')} subtitleAr={t('clients.empty.subtitle')}
              actionLabel={t('clients.empty.action')} actionLabelAr={t('clients.empty.action')}
              onAction={openAddForm} size="lg"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {clients.map(c => {
              const colors = CLIENT_STATUS_COLORS[c.status] || CLIENT_STATUS_COLORS.active;
              return (
                <div key={c.id} onClick={() => navigate(`/clients/${c.id}`)}
                  className="bg-card border border-border rounded-card p-5 shadow-sm hover:shadow-md hover:border-muted-foreground/20 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-body-md font-medium text-muted-foreground">
                      {getInitials(c)}
                    </div>
                    <span className="inline-flex items-center text-xs font-medium rounded-badge px-2 py-0.5 capitalize"
                      style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {t(`clients.statuses.${c.status}`)}
                    </span>
                  </div>
                  <div className="text-heading-sm font-semibold text-foreground truncate">{getClientName(c)}</div>
                  <span className="inline-flex items-center text-[11px] font-medium rounded-badge px-1.5 py-0.5 mt-1"
                    style={{ backgroundColor: c.client_type === 'individual' ? '#EFF6FF' : '#F5F3FF', color: c.client_type === 'individual' ? '#3B82F6' : '#8B5CF6' }}>
                    {c.client_type === 'individual' ? t('clients.individual') : t('clients.company')}
                  </span>
                  <div className="border-t border-border my-3" />
                  <div className="space-y-1.5 text-body-sm text-muted-foreground">
                    {c.email && <div className="flex items-center gap-2 truncate"><Mail size={14} className="flex-shrink-0" /> <span className="truncate">{c.email}</span></div>}
                    {c.phone && <div className="flex items-center gap-2"><Phone size={14} className="flex-shrink-0" /> {c.phone}</div>}
                    <div className="flex items-center gap-2"><MapPin size={14} className="flex-shrink-0" /> {t(`clients.governorates.${c.governorate}`)}</div>
                  </div>
                  <div className="border-t border-border my-3" />
                  <div className="flex items-center justify-between text-body-sm text-muted-foreground">
                    <span>{language === 'ar' ? 'القضايا' : 'Cases'}: 0</span>
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Client Form Slide-Over */}
      <ClientFormSlideOver
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refreshAll}
        editClientId={editClientId}
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title={t('clients.messages.deleteConfirmTitle')}
        titleAr={t('clients.messages.deleteConfirmTitle')}
        message={t('clients.messages.deleteConfirmMessage')}
        messageAr={t('clients.messages.deleteConfirmMessage')}
        confirmLabel={t('clients.archive')}
        confirmLabelAr={t('clients.archive')}
        type="warning"
        isLoading={isArchiving}
      />
    </div>
  );
}
