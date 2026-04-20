import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Search, Archive, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import SkeletonLoader from '@/components/SkeletonLoader';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';
import { PartyChip } from '@/components/parties/PartyChip';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import BulkActionBar from '@/components/BulkActionBar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import SavedViewsMenu from '@/components/SavedViewsMenu';

const STATUSES = ['all', 'intake', 'active', 'pending_hearing', 'pending_judgment', 'on_hold', 'won', 'lost', 'settled', 'closed'] as const;
type StatusFilter = typeof STATUSES[number];

interface CaseRow {
  id: string;
  case_number: string;
  title: string;
  title_ar: string | null;
  status: string;
  priority: string;
  case_type: string;
  filing_date: string | null;
  updated_at: string;
  case_parties: Array<{
    id: string;
    role: string;
    is_primary: boolean;
    party_type: string;
    person: { first_name: string; first_name_ar: string | null; last_name: string | null; last_name_ar: string | null } | null;
    entity: { company_name: string; company_name_ar: string | null } | null;
  }>;
}

export default function CasesPage() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lang = language as 'en' | 'ar';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['cases', profile?.organization_id, search, statusFilter],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      let q = supabase
        .from('cases')
        .select(
          'id, case_number, title, title_ar, status, priority, case_type, filing_date, updated_at, case_parties(id, role, is_primary, party_type, person:persons(first_name, first_name_ar, last_name, last_name_ar), entity:entities(company_name, company_name_ar))',
        )
        .eq('organization_id', profile!.organization_id!)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (search) {
        const s = `%${search}%`;
        q = q.or(`title.ilike.${s},title_ar.ilike.${s},case_number.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CaseRow[];
    },
  });

  const counts = useMemo(() => {
    const all = data ?? [];
    const c: Record<string, number> = { all: all.length };
    for (const s of STATUSES) if (s !== 'all') c[s] = all.filter((r) => r.status === s).length;
    return c;
  }, [data]);

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from('cases').update({ status: newStatus }).in('id', ids);
    setBulkBusy(false);
    if (error) {
      toast({ title: lang === 'ar' ? 'فشل التحديث' : 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: lang === 'ar' ? `تم تحديث ${ids.length} قضية` : `${ids.length} cases updated` });
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ['cases'] });
  };

  return (
    <div>
      <SEO
        title={lang === 'ar' ? 'القضايا — Qanuni' : 'Cases — Qanuni'}
        description={lang === 'ar' ? 'إدارة جميع القضايا التي يتولاها مكتبك.' : 'Manage all matters your firm is handling.'}
      />
      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Select onValueChange={bulkUpdateStatus} disabled={bulkBusy}>
          <SelectTrigger className="h-9 w-[180px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
            <SelectValue placeholder={lang === 'ar' ? 'تغيير الحالة…' : 'Change status…'} />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.filter((s) => s !== 'all').map((s) => (
              <SelectItem key={s} value={s}>{lang === 'ar' ? statusLabelAr(s) : statusLabelEn(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => bulkUpdateStatus('closed')}
          disabled={bulkBusy}
          className="h-9 px-3 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded text-body-sm flex items-center gap-1.5 transition-colors"
        >
          <Archive className="h-3.5 w-3.5" />
          {lang === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </BulkActionBar>
      <PageHeader
        title="Cases"
        titleAr="القضايا"
        subtitle="All matters your firm is handling."
        subtitleAr="جميع القضايا التي يتولاها مكتبك."
        actionLabel="New Case"
        actionLabelAr="قضية جديدة"
        onAction={() => navigate('/cases/new')}
        helpKey="cases.list"
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث بعنوان أو رقم القضية…' : 'Search by title or case number…'}
            className="ps-9 h-10"
          />
        </div>
        <SavedViewsMenu
          entityType="cases"
          currentFilters={{ search, statusFilter }}
          onApply={(v) => {
            const f = v.filters as any;
            if (typeof f.search === 'string') setSearch(f.search);
            if (typeof f.statusFilter === 'string') setStatusFilter(f.statusFilter);
          }}
        />
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'h-8 px-3 rounded-input text-body-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
              statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {s === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : (lang === 'ar' ? statusLabelAr(s) : statusLabelEn(s))}
            {(counts[s] ?? 0) > 0 && <span className="text-[10px] opacity-70">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonLoader key={i} className="h-20 w-full" />)}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            icon={Briefcase}
            title="No cases yet"
            titleAr="لا توجد قضايا بعد"
            subtitle="Create your first case to get started."
            subtitleAr="أنشئ أول قضية للبدء."
            actionLabel="New Case"
            actionLabelAr="قضية جديدة"
            onAction={() => navigate('/cases/new')}
          />
        </div>
      ) : (
        <div className="rounded-card border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {data!.map((c) => {
              const title = lang === 'ar' && c.title_ar ? c.title_ar : c.title;
              const primary = c.case_parties?.find((p) => p.is_primary && p.role === 'client') || c.case_parties?.find((p) => p.role === 'client');
              const primaryName = primary
                ? primary.party_type === 'person'
                  ? resolvePersonName(primary.person as any, lang)
                  : resolveEntityName(primary.entity as any, lang)
                : '';
              return (
                <div key={c.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleOne(c.id)}
                    aria-label={lang === 'ar' ? 'تحديد القضية' : 'Select case'}
                    className="shrink-0"
                  />
                  <Link to={`/cases/${c.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono text-muted-foreground">{c.case_number}</span>
                        <StatusBadge status={c.status} type="case" size="sm" />
                        <StatusBadge status={c.priority} type="priority" size="sm" />
                      </div>
                      <p className="text-body-md font-medium text-foreground truncate">{title}</p>
                      {primaryName && (
                        <div className="mt-1.5">
                          <PartyChip partyType={primary!.party_type as 'person' | 'entity'} displayName={primaryName} size="sm" />
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabelEn(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
function statusLabelAr(s: string): string {
  const map: Record<string, string> = {
    intake: 'استقبال',
    active: 'نشطة',
    pending_hearing: 'بانتظار جلسة',
    pending_judgment: 'بانتظار حكم',
    on_hold: 'معلّقة',
    won: 'مكسوبة',
    lost: 'خاسرة',
    settled: 'مسوّاة',
    closed: 'مغلقة',
  };
  return map[s] ?? s;
}
