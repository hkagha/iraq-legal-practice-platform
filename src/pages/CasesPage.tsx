import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  Scale, Briefcase, AlertTriangle, MoreHorizontal, Pencil, Eye, Archive,
  List, Columns3, Calendar,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';

const CASE_STATUS_ORDER = ['intake','active','pending_hearing','pending_judgment','on_hold','won','lost','settled','closed'] as const;

const CASE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  civil: { bg: '#EFF6FF', text: '#3B82F6' },
  criminal: { bg: '#FEF2F2', text: '#EF4444' },
  commercial: { bg: '#F5F3FF', text: '#8B5CF6' },
  personal_status: { bg: '#FFF8E1', text: '#C9A84C' },
  labor: { bg: '#ECFEFF', text: '#06B6D4' },
  administrative: { bg: '#F1F5F9', text: '#64748B' },
  real_estate: { bg: '#F0FDF4', text: '#22C55E' },
  family: { bg: '#FDF2F8', text: '#EC4899' },
  corporate: { bg: '#F5F3FF', text: '#7C3AED' },
  contract: { bg: '#FFFBEB', text: '#F59E0B' },
  intellectual_property: { bg: '#ECFEFF', text: '#0891B2' },
  tax: { bg: '#FEF2F2', text: '#DC2626' },
  customs: { bg: '#FFF7ED', text: '#EA580C' },
  other: { bg: '#F3F4F6', text: '#6B7280' },
};

const KANBAN_COLUMN_COLORS: Record<string, string> = {
  intake: '#3B82F6',
  active: '#22C55E',
  pending_hearing: '#F59E0B',
  pending_judgment: '#8B5CF6',
  on_hold: '#64748B',
  won: '#C9A84C',
  lost: '#EF4444',
  settled: '#06B6D4',
  closed: '#6B7280',
};

interface CaseRow {
  id: string;
  case_number: string;
  title: string;
  title_ar: string | null;
  case_type: string;
  court_type: string | null;
  court_name: string | null;
  court_name_ar: string | null;
  status: string;
  priority: string;
  created_at: string;
  client_id: string;
  // joined
  client_name?: string;
  client_name_ar?: string;
  next_hearing_date?: string | null;
}

export default function CasesPage() {
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeView, setActiveView] = useState('table');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('cases')
        .select('id,case_number,title,title_ar,case_type,court_type,court_name,court_name_ar,status,priority,created_at,client_id,clients(first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type)', { count: 'exact' });

      if (search) {
        query = query.or(`title.ilike.%${search}%,title_ar.ilike.%${search}%,case_number.ilike.%${search}%,court_case_number.ilike.%${search}%`);
      }
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (typeFilter !== 'all') query = query.eq('case_type', typeFilter);
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
        return { ...row, clients: undefined, client_name: clientName, client_name_ar: clientNameAr } as CaseRow;
      });

      setCases(mapped);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter, priorityFilter, sortKey, sortDir, page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const [totalRes, activeRes, urgentRes] = await Promise.all([
        supabase.from('cases').select('id', { count: 'exact', head: true }),
        supabase.from('cases').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('cases').select('id', { count: 'exact', head: true }).eq('priority', 'urgent'),
      ]);
      setTotalCount(totalRes.count || 0);
      setActiveCount(activeRes.count || 0);
      setUrgentCount(urgentRes.count || 0);
    } catch {}
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, priorityFilter]);

  const getCaseTitle = (c: CaseRow) => language === 'ar' && c.title_ar ? c.title_ar : c.title;
  const getClientName = (c: CaseRow) => language === 'ar' && c.client_name_ar ? c.client_name_ar : c.client_name || '';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return language === 'ar' ? format(d, 'dd MMMM yyyy', { locale: arLocale }) : format(d, 'MMM dd, yyyy');
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filters = useMemo(() => [
    {
      key: 'status', label: 'Status', labelAr: 'الحالة',
      options: CASE_STATUS_ORDER.map(s => ({ value: s, label: t(`cases.statuses.${s}`), labelAr: t(`cases.statuses.${s}`) })),
    },
    {
      key: 'type', label: 'Case Type', labelAr: 'نوع القضية',
      options: Object.keys(CASE_TYPE_COLORS).map(k => ({ value: k, label: t(`cases.caseTypes.${k}`), labelAr: t(`cases.caseTypes.${k}`) })),
    },
    {
      key: 'priority', label: 'Priority', labelAr: 'الأولوية',
      options: ['low','medium','high','urgent'].map(p => ({ value: p, label: t(`priority.${p}`), labelAr: t(`priority.${p}`) })),
    },
  ], [t]);

  const activeFilters: Record<string, string> = { status: statusFilter, type: typeFilter, priority: priorityFilter };
  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setStatusFilter(value);
    if (key === 'type') setTypeFilter(value);
    if (key === 'priority') setPriorityFilter(value);
  };
  const clearAll = () => { setStatusFilter('all'); setTypeFilter('all'); setPriorityFilter('all'); setSearch(''); };

  const columns = [
    {
      key: 'case_number', label: 'Case #', labelAr: 'رقم القضية', sortable: true, width: '12%',
      render: (row: CaseRow) => <span className="font-mono text-body-sm text-muted-foreground">{row.case_number}</span>,
    },
    {
      key: 'title', label: 'Title', labelAr: 'العنوان', sortable: true, width: '22%',
      render: (row: CaseRow) => (
        <div className="min-w-0">
          <div className="text-body-md font-medium text-foreground truncate">{getCaseTitle(row)}</div>
          <div className="text-body-sm text-muted-foreground truncate">{getClientName(row)}</div>
        </div>
      ),
    },
    {
      key: 'case_type', label: 'Type', labelAr: 'النوع', sortable: true, width: '10%',
      render: (row: CaseRow) => {
        const c = CASE_TYPE_COLORS[row.case_type] || CASE_TYPE_COLORS.other;
        return (
          <span className="inline-flex items-center text-[11px] font-medium rounded-badge px-2 py-0.5" style={{ backgroundColor: c.bg, color: c.text }}>
            {t(`cases.caseTypes.${row.case_type}`)}
          </span>
        );
      },
    },
    {
      key: 'court_type', label: 'Court', labelAr: 'المحكمة', width: '12%',
      render: (row: CaseRow) => {
        if (!row.court_type) return <span className="text-muted-foreground">—</span>;
        return <span className="text-body-sm">{t(`cases.courtTypes.${row.court_type}`)}</span>;
      },
    },
    {
      key: 'status', label: 'Status', labelAr: 'الحالة', sortable: true, width: '10%',
      render: (row: CaseRow) => <StatusBadge status={row.status} type="case" />,
    },
    {
      key: 'priority', label: 'Priority', labelAr: 'الأولوية', sortable: true, width: '8%',
      render: (row: CaseRow) => <StatusBadge status={row.priority} type="priority" size="sm" />,
    },
    {
      key: 'next_hearing', label: 'Next Hearing', labelAr: 'الجلسة القادمة', width: '12%',
      render: (row: CaseRow) => {
        if (!row.next_hearing_date) return <span className="text-body-sm text-muted-foreground">—</span>;
        const d = new Date(row.next_hearing_date);
        const isOverdue = d < new Date();
        return <span className={cn('text-body-sm', isOverdue ? 'text-destructive font-medium' : 'text-foreground')}>{formatDate(row.next_hearing_date)}</span>;
      },
    },
    {
      key: 'team', label: 'Team', labelAr: 'الفريق', width: '8%',
      render: () => (
        <div className="flex -space-x-1.5 rtl:space-x-reverse">
          <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">—</div>
        </div>
      ),
    },
    {
      key: 'actions', label: '', labelAr: '', width: '6%',
      render: (row: CaseRow) => (
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/cases/${row.id}`)}>
                <Eye size={14} className="me-2" /> {t('clients.viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem><Pencil size={14} className="me-2" /> {t('common.edit')}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive"><Archive size={14} className="me-2" /> {t('clients.archive')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const viewOptions = [
    { key: 'table', icon: List, label: 'Table' },
    { key: 'kanban', icon: Columns3, label: 'Kanban' },
  ];

  // Kanban data
  const kanbanColumns = useMemo(() => {
    return CASE_STATUS_ORDER.map(status => ({
      status,
      label: t(`cases.statuses.${status}`),
      color: KANBAN_COLUMN_COLORS[status],
      cards: cases.filter(c => c.status === status),
    }));
  }, [cases, t]);

  return (
    <div>
      <PageHeader
        title={t('cases.title')}
        titleAr={t('cases.title')}
        subtitle={t('cases.subtitle')}
        subtitleAr={t('cases.subtitle')}
        actionLabel={t('cases.addCase')}
        actionLabelAr={t('cases.addCase')}
        onAction={() => navigate('/cases/new')}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Cases', labelAr: 'القضايا' },
        ]}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { icon: Scale, color: '#3B82F6', bg: '#EFF6FF', label: t('cases.totalCases'), value: totalCount },
          { icon: Briefcase, color: '#22C55E', bg: '#F0FDF4', label: t('cases.activeCases'), value: activeCount },
          { icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', label: t('cases.urgentCases'), value: urgentCount },
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
        searchPlaceholder={t('cases.search.placeholder')}
        searchPlaceholderAr={t('cases.search.placeholder')}
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
          data={cases}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/cases/${row.id}`)}
          sortConfig={{ key: sortKey, direction: sortDir }}
          onSort={handleSort}
          pagination={{
            page, pageSize, total: totalCount,
            onPageChange: setPage,
            onPageSizeChange: (s) => { setPageSize(s); setPage(1); },
          }}
          emptyState={{
            icon: Scale,
            title: t('cases.empty.title'), titleAr: t('cases.empty.title'),
            subtitle: t('cases.empty.subtitle'), subtitleAr: t('cases.empty.subtitle'),
            actionLabel: t('cases.empty.action'), actionLabelAr: t('cases.empty.action'),
            onAction: () => navigate('/cases/new'),
          }}
        />
      ) : (
        /* KANBAN VIEW */
        isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {CASE_STATUS_ORDER.map(s => (
              <div key={s} className="min-w-[280px] w-[280px] flex-shrink-0">
                <Skeleton className="h-8 w-full mb-3 rounded-lg" />
                {[1,2].map(i => <Skeleton key={i} className="h-28 w-full mb-2 rounded-lg" />)}
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-card rounded-card border border-border overflow-hidden">
            <EmptyState
              icon={Scale}
              title={t('cases.empty.title')} titleAr={t('cases.empty.title')}
              subtitle={t('cases.empty.subtitle')} subtitleAr={t('cases.empty.subtitle')}
              actionLabel={t('cases.empty.action')} actionLabelAr={t('cases.empty.action')}
              onAction={() => navigate('/cases/new')}
              size="lg"
            />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map(col => (
              <div key={col.status} className="min-w-[280px] w-[280px] flex-shrink-0">
                {/* Column header */}
                <div className="rounded-lg bg-muted/50 border border-border overflow-hidden mb-2">
                  <div className="h-[3px]" style={{ backgroundColor: col.color }} />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-body-sm font-semibold text-foreground">{col.label}</span>
                    <span className="text-body-sm bg-muted text-muted-foreground rounded-badge px-2 py-0.5 min-w-[24px] text-center">{col.cards.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {col.cards.length === 0 && (
                    <div className="text-body-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                      {t('cases.kanban.noCards')}
                    </div>
                  )}
                  {col.cards.map(card => {
                    const typeColor = CASE_TYPE_COLORS[card.case_type] || CASE_TYPE_COLORS.other;
                    return (
                      <div
                        key={card.id}
                        onClick={() => navigate(`/cases/${card.id}`)}
                        className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-border/80 transition-all duration-200"
                      >
                        <div className="text-[11px] font-mono text-muted-foreground mb-1">{card.case_number}</div>
                        <div className="text-body-md font-medium text-foreground truncate mb-1">{getCaseTitle(card)}</div>
                        <div className="text-body-sm text-muted-foreground truncate mb-2">{getClientName(card)}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={card.priority} type="priority" size="sm" />
                          {card.next_hearing_date && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Calendar size={11} /> {format(new Date(card.next_hearing_date), 'MMM dd')}
                            </span>
                          )}
                        </div>
                        <div className="flex -space-x-1.5 rtl:space-x-reverse mt-2">
                          <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-medium text-muted-foreground">—</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
