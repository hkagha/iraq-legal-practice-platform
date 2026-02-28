import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  FileCheck, Loader, AlertTriangle, MoreHorizontal, Pencil, Eye,
  List, LayoutGrid, Calendar,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const ERRAND_STATUSES = [
  'new','in_progress','awaiting_documents','submitted_to_government',
  'under_review_by_government','additional_requirements','approved',
  'rejected','completed','cancelled',
] as const;

const ERRAND_CATEGORIES = [
  'company_registration','company_renewal','company_amendment',
  'tax_filing','tax_clearance',
  'business_license','business_license_renewal','import_export_license',
  'trademark_registration','brand_registration',
  'property_registration','property_transfer',
  'passport_issuance','national_id','residency_permit',
  'factory_license','hospital_license','restaurant_license',
  'construction_permit','environmental_permit',
  'vehicle_registration',
  'power_of_attorney','document_attestation',
  'court_document_processing','court_execution',
  'inheritance_processing','marriage_registration','divorce_processing',
  'other',
] as const;

interface ErrandRow {
  id: string;
  errand_number: string;
  title: string;
  title_ar: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  created_at: string;
  client_id: string;
  assigned_to: string | null;
  client_name?: string;
  client_name_ar?: string;
  assigned_name?: string;
}

export default function ErrandsPage() {
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [errands, setErrands] = useState<ErrandRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeView, setActiveView] = useState('table');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchErrands = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('errands')
        .select('id,errand_number,title,title_ar,category,status,priority,due_date,total_steps,completed_steps,progress_percentage,created_at,client_id,assigned_to,clients(first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type)', { count: 'exact' });

      if (search) {
        query = query.or(`title.ilike.%${search}%,title_ar.ilike.%${search}%,errand_number.ilike.%${search}%,reference_number.ilike.%${search}%`);
      }
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);

      query = query.order(sortKey, { ascending: sortDir === 'asc' });
      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = ((data as any[]) || []).map(row => {
        const cl = row.clients as any;
        let clientName = '';
        let clientNameAr = '';
        if (cl) {
          if (cl.client_type === 'company') {
            clientName = cl.company_name || '';
            clientNameAr = cl.company_name_ar || cl.company_name || '';
          } else {
            clientName = `${cl.first_name || ''} ${cl.last_name || ''}`.trim();
            clientNameAr = cl.first_name_ar && cl.last_name_ar ? `${cl.first_name_ar} ${cl.last_name_ar}` : clientName;
          }
        }
        return { ...row, clients: undefined, client_name: clientName, client_name_ar: clientNameAr } as ErrandRow;
      });

      setErrands(mapped);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, categoryFilter, priorityFilter, sortKey, sortDir, page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const activeStatuses = ['new','in_progress','awaiting_documents','submitted_to_government','under_review_by_government','additional_requirements'];
      const [totalRes, activeRes, overdueRes] = await Promise.all([
        supabase.from('errands').select('id', { count: 'exact', head: true }),
        supabase.from('errands').select('id', { count: 'exact', head: true }).in('status', activeStatuses),
        supabase.from('errands').select('id', { count: 'exact', head: true }).lt('due_date', today).not('status', 'in', '("completed","cancelled","approved","rejected")'),
      ]);
      setTotalCount(totalRes.count || 0);
      setActiveCount(activeRes.count || 0);
      setOverdueCount(overdueRes.count || 0);
    } catch {}
  }, []);

  useEffect(() => { fetchErrands(); }, [fetchErrands]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, priorityFilter]);

  const getTitle = (e: ErrandRow) => language === 'ar' && e.title_ar ? e.title_ar : e.title;
  const getClientName = (e: ErrandRow) => language === 'ar' && e.client_name_ar ? e.client_name_ar : e.client_name || '';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return language === 'ar' ? format(d, 'dd MMMM yyyy', { locale: arLocale }) : format(d, 'MMM dd, yyyy');
  };

  const getDueDateStatus = (dueDate: string | null, status: string) => {
    if (!dueDate || ['completed','cancelled','approved','rejected'].includes(status)) return 'normal';
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'warning';
    return 'normal';
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filters = useMemo(() => [
    {
      key: 'status', label: 'Status', labelAr: 'الحالة',
      options: ERRAND_STATUSES.map(s => ({ value: s, label: t(`statuses.errand.${s}`), labelAr: t(`statuses.errand.${s}`) })),
    },
    {
      key: 'category', label: 'Category', labelAr: 'التصنيف',
      options: ERRAND_CATEGORIES.map(c => ({ value: c, label: t(`errands.categories.${c}`), labelAr: t(`errands.categories.${c}`) })),
    },
    {
      key: 'priority', label: 'Priority', labelAr: 'الأولوية',
      options: ['low','medium','high','urgent'].map(p => ({ value: p, label: t(`priority.${p}`), labelAr: t(`priority.${p}`) })),
    },
  ], [t]);

  const activeFilters: Record<string, string> = { status: statusFilter, category: categoryFilter, priority: priorityFilter };
  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setStatusFilter(value);
    if (key === 'category') setCategoryFilter(value);
    if (key === 'priority') setPriorityFilter(value);
  };
  const clearAll = () => { setStatusFilter('all'); setCategoryFilter('all'); setPriorityFilter('all'); setSearch(''); };

  const columns = [
    {
      key: 'errand_number', label: 'Errand #', labelAr: 'رقم المعاملة', sortable: true, width: '10%',
      render: (row: ErrandRow) => <span className="font-mono text-body-sm text-muted-foreground">{row.errand_number}</span>,
    },
    {
      key: 'title', label: 'Title', labelAr: 'العنوان', sortable: true, width: '20%',
      render: (row: ErrandRow) => (
        <div className="min-w-0">
          <div className="text-body-md font-medium text-foreground truncate">{getTitle(row)}</div>
          <div className="text-body-sm text-muted-foreground truncate">{t(`errands.categories.${row.category}`)}</div>
        </div>
      ),
    },
    {
      key: 'client', label: 'Client', labelAr: 'العميل', sortable: false, width: '14%',
      render: (row: ErrandRow) => (
        <span
          className="text-body-md text-accent hover:underline cursor-pointer"
          onClick={e => { e.stopPropagation(); navigate(`/clients/${row.client_id}`); }}
        >
          {getClientName(row)}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status', labelAr: 'الحالة', sortable: true, width: '10%',
      render: (row: ErrandRow) => <StatusBadge status={row.status} type="errand" />,
    },
    {
      key: 'progress', label: 'Progress', labelAr: 'التقدم', sortable: false, width: '12%',
      render: (row: ErrandRow) => (
        <div className="flex items-center gap-2">
          <Progress value={row.progress_percentage || 0} className="h-1.5 flex-1" />
          <span className="text-body-sm text-muted-foreground whitespace-nowrap">
            {row.completed_steps}/{row.total_steps}
          </span>
        </div>
      ),
    },
    {
      key: 'due_date', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', sortable: true, width: '10%',
      render: (row: ErrandRow) => {
        const dueStat = getDueDateStatus(row.due_date, row.status);
        return (
          <div>
            <span className={cn('text-body-sm', dueStat === 'overdue' ? 'text-destructive font-medium' : dueStat === 'warning' ? 'text-warning' : 'text-foreground')}>
              {formatDate(row.due_date)}
            </span>
            {dueStat === 'overdue' && (
              <span className="block text-[10px] text-destructive font-medium">{t('dashboard.overdue')}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'priority', label: 'Priority', labelAr: 'الأولوية', sortable: true, width: '8%',
      render: (row: ErrandRow) => <StatusBadge status={row.priority} type="priority" size="sm" />,
    },
    {
      key: 'actions', label: '', labelAr: '', width: '6%',
      render: (row: ErrandRow) => (
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/errands/${row.id}`)}>
                <Eye size={14} className="me-2" /> {t('clients.viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/errands/${row.id}/edit`)}>
                <Pencil size={14} className="me-2" /> {t('common.edit')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const viewOptions = [
    { key: 'table', icon: List, label: 'Table' },
    { key: 'card', icon: LayoutGrid, label: 'Card' },
  ];

  return (
    <div>
      <PageHeader
        title={t('errands.title')}
        titleAr={t('errands.title')}
        subtitle={t('errands.subtitle')}
        subtitleAr={t('errands.subtitle')}
        actionLabel={t('errands.addErrand')}
        actionLabelAr={t('errands.addErrand')}
        onAction={() => navigate('/errands/new')}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Errands', labelAr: 'المعاملات' },
        ]}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { icon: FileCheck, color: '#8B5CF6', bg: '#F5F3FF', label: t('errands.totalErrands'), value: totalCount },
          { icon: Loader, color: 'hsl(var(--accent))', bg: 'hsl(var(--accent) / 0.1)', label: t('errands.activeErrands'), value: activeCount },
          { icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', label: t('errands.overdueErrands'), value: overdueCount },
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
        searchPlaceholder={t('errands.search.placeholder')}
        searchPlaceholderAr={t('errands.search.placeholder')}
        onSearchChange={setSearch}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={clearAll}
        viewOptions={viewOptions}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-card" />)}
        </div>
      ) : errands.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title={t('errands.empty.title')}
          titleAr={t('errands.empty.title')}
          subtitle={t('errands.empty.subtitle')}
          subtitleAr={t('errands.empty.subtitle')}
          actionLabel={t('errands.empty.action')}
          actionLabelAr={t('errands.empty.action')}
          onAction={() => navigate('/errands/new')}
        />
      ) : activeView === 'table' ? (
        <DataTable
          columns={columns}
          data={errands}
          pagination={{
            page,
            pageSize,
            total: totalCount,
            onPageChange: setPage,
            onPageSizeChange: () => {},
          }}
          sortConfig={{ key: sortKey, direction: sortDir }}
          onSort={handleSort}
          onRowClick={(row: ErrandRow) => navigate(`/errands/${row.id}`)}
        />
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {errands.map(errand => {
            const dueStat = getDueDateStatus(errand.due_date, errand.status);
            return (
              <div
                key={errand.id}
                onClick={() => navigate(`/errands/${errand.id}`)}
                className="bg-card border border-border rounded-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-body-sm text-muted-foreground">{errand.errand_number}</span>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={errand.priority} type="priority" size="sm" />
                    <StatusBadge status={errand.status} type="errand" size="sm" />
                  </div>
                </div>
                <h3 className="text-heading-sm font-semibold text-foreground line-clamp-2 mb-1">{getTitle(errand)}</h3>
                <span className="inline-flex items-center text-[11px] font-medium rounded-badge px-2 py-0.5 bg-muted text-muted-foreground mb-3">
                  {t(`errands.categories.${errand.category}`)}
                </span>
                <div className="mb-3">
                  <Progress value={errand.progress_percentage || 0} className="h-1.5" />
                  <span className="text-body-sm text-muted-foreground mt-1 block">
                    {Math.round(errand.progress_percentage || 0)}%
                  </span>
                </div>
                <div className="border-t border-border pt-3 flex items-center justify-between text-body-sm text-muted-foreground">
                  <span className="truncate">{getClientName(errand)}</span>
                  <span className={cn(
                    dueStat === 'overdue' ? 'text-destructive font-medium' : dueStat === 'warning' ? 'text-warning' : ''
                  )}>
                    {formatDate(errand.due_date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
