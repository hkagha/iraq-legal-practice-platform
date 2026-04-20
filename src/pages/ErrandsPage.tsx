import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Search, Archive } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import SkeletonLoader from '@/components/SkeletonLoader';
import { PartyChip } from '@/components/parties/PartyChip';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';
import BulkActionBar from '@/components/BulkActionBar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const STATUSES = ['all', 'new', 'in_progress', 'awaiting_documents', 'submitted_to_government', 'under_review_by_government', 'additional_requirements', 'approved', 'rejected', 'completed', 'cancelled'] as const;
type StatusFilter = typeof STATUSES[number];

interface ErrandRow {
  id: string;
  errand_number: string;
  title: string;
  title_ar: string | null;
  errand_type: string;
  status: string;
  priority: string;
  due_date: string | null;
  total_steps: number;
  completed_steps: number;
  party_type: string | null;
  person: { first_name: string; first_name_ar: string | null; last_name: string | null; last_name_ar: string | null } | null;
  entity: { company_name: string; company_name_ar: string | null } | null;
}

export default function ErrandsPage() {
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
    queryKey: ['errands', profile?.organization_id, search, statusFilter],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      let q = supabase
        .from('errands')
        .select('id, errand_number, title, title_ar, errand_type, status, priority, due_date, total_steps, completed_steps, party_type, person:persons(first_name, first_name_ar, last_name, last_name_ar), entity:entities(company_name, company_name_ar)')
        .eq('organization_id', profile!.organization_id!)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (search) {
        const s = `%${search}%`;
        q = q.or(`title.ilike.${s},title_ar.ilike.${s},errand_number.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ErrandRow[];
    },
  });

  const counts = useMemo(() => {
    const all = data ?? [];
    const c: Record<string, number> = { all: all.length };
    for (const s of STATUSES) if (s !== 'all') c[s] = all.filter((r) => r.status === s).length;
    return c;
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Errands"
        titleAr="المعاملات"
        subtitle="Government and administrative processes."
        subtitleAr="المعاملات الحكومية والإدارية."
        actionLabel="New Errand"
        actionLabelAr="معاملة جديدة"
        onAction={() => navigate('/errands/new')}
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث بعنوان أو رقم المعاملة…' : 'Search by title or errand number…'}
            className="ps-9 h-10"
          />
        </div>
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
            {s === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : s.replace(/_/g, ' ')}
            {(counts[s] ?? 0) > 0 && <span className="text-[10px] opacity-70">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonLoader key={i} className="h-20 w-full" />)}</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            icon={ClipboardList}
            title="No errands yet"
            titleAr="لا توجد معاملات بعد"
            actionLabel="New Errand"
            actionLabelAr="معاملة جديدة"
            onAction={() => navigate('/errands/new')}
          />
        </div>
      ) : (
        <div className="rounded-card border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {data!.map((e) => {
              const title = lang === 'ar' && e.title_ar ? e.title_ar : e.title;
              const partyName = e.party_type === 'person'
                ? resolvePersonName(e.person as any, lang)
                : e.party_type === 'entity'
                  ? resolveEntityName(e.entity as any, lang)
                  : '';
              const pct = e.total_steps > 0 ? Math.round((e.completed_steps / e.total_steps) * 100) : 0;
              return (
                <Link key={e.id} to={`/errands/${e.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-muted-foreground">{e.errand_number}</span>
                      <StatusBadge status={e.status} type="errand" size="sm" />
                    </div>
                    <p className="text-body-md font-medium text-foreground truncate">{title}</p>
                    {partyName && (
                      <div className="mt-1.5">
                        <PartyChip partyType={e.party_type as 'person' | 'entity'} displayName={partyName} size="sm" />
                      </div>
                    )}
                  </div>
                  {e.total_steps > 0 && (
                    <div className="hidden md:flex flex-col items-end shrink-0 w-32">
                      <span className="text-body-sm text-muted-foreground">{e.completed_steps}/{e.total_steps}</span>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
