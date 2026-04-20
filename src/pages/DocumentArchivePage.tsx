import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search, Sparkles, Upload, FileText, RefreshCw, Calendar as CalendarIcon,
  Users as UsersIcon, Building2, MapPin, Tag, X,
} from 'lucide-react';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';
import DocumentDetailSlideOver from '@/components/documents/DocumentDetailSlideOver';
import { reindexDocument } from '@/lib/documentIndexing';
import { format } from 'date-fns';

interface ArchiveDoc {
  id: string;
  file_name: string;
  title: string | null;
  ai_doc_type: string | null;
  ai_summary: string | null;
  ai_people: string[] | null;
  ai_organizations: string[] | null;
  ai_places: string[] | null;
  ai_tags: string[] | null;
  ai_dates: any;
  ai_language: string | null;
  indexing_status: string;
  indexing_error: string | null;
  created_at: string;
  file_size_bytes: number;
  file_type: string;
}

type FacetKey = 'people' | 'organizations' | 'places' | 'tags';

export default function DocumentArchivePage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [docs, setDocs] = useState<ArchiveDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'pending' | 'processing' | 'failed'>('all');
  const [selected, setSelected] = useState<{ kind: FacetKey; value: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [counts, setCounts] = useState({ total: 0, indexed: 0, pending: 0, failed: 0 });

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let q = supabase
      .from('documents')
      .select('id, file_name, title, ai_doc_type, ai_summary, ai_people, ai_organizations, ai_places, ai_tags, ai_dates, ai_language, indexing_status, indexing_error, created_at, file_size_bytes, file_type')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(500);

    if (statusFilter !== 'all') q = q.eq('indexing_status', statusFilter);

    if (search.trim()) {
      const s = search.trim();
      q = q.or(`file_name.ilike.%${s}%,title.ilike.%${s}%,ai_summary.ilike.%${s}%,ai_doc_type.ilike.%${s}%,extracted_text.ilike.%${s}%`);
    }

    if (selected) {
      const col = selected.kind === 'people' ? 'ai_people'
        : selected.kind === 'organizations' ? 'ai_organizations'
        : selected.kind === 'places' ? 'ai_places' : 'ai_tags';
      q = q.contains(col, [selected.value]);
    }

    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
    } else {
      setDocs((data || []) as ArchiveDoc[]);
    }
    setLoading(false);
  }, [orgId, search, statusFilter, selected]);

  const loadCounts = useCallback(async () => {
    if (!orgId) return;
    const base = supabase.from('documents').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'active');
    const [total, indexed, pending, failed] = await Promise.all([
      base,
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active').eq('indexing_status', 'done'),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active').in('indexing_status', ['pending', 'processing']),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active').eq('indexing_status', 'failed'),
    ]);
    setCounts({
      total: total.count || 0,
      indexed: indexed.count || 0,
      pending: pending.count || 0,
      failed: failed.count || 0,
    });
  }, [orgId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  // Realtime: refresh when indexing finishes
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`docs-archive-${orgId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'documents', filter: `organization_id=eq.${orgId}` }, () => {
        load(); loadCounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, load, loadCounts]);

  // Build facets from currently loaded docs
  const facets = useMemo(() => {
    const tally = (arr: (string[] | null | undefined)[]) => {
      const map = new Map<string, number>();
      for (const list of arr) {
        if (!list) continue;
        for (const v of list) {
          if (!v) continue;
          map.set(v, (map.get(v) || 0) + 1);
        }
      }
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 25);
    };
    return {
      people: tally(docs.map(d => d.ai_people)),
      organizations: tally(docs.map(d => d.ai_organizations)),
      places: tally(docs.map(d => d.ai_places)),
      tags: tally(docs.map(d => d.ai_tags)),
    };
  }, [docs]);

  const handleReindexPending = async () => {
    if (!orgId) return;
    setReindexing(true);
    const { data } = await supabase.from('documents')
      .select('id').eq('organization_id', orgId).eq('status', 'active')
      .in('indexing_status', ['pending', 'failed']).limit(20);
    const list = data || [];
    if (!list.length) {
      toast.info(language === 'ar' ? 'لا توجد مستندات بحاجة إلى الفهرسة' : 'Nothing to re-index');
      setReindexing(false);
      return;
    }
    toast.info(language === 'ar' ? `بدء فهرسة ${list.length} مستند` : `Indexing ${list.length} document(s)…`);
    // Fire all in parallel; the function is idempotent
    await Promise.all(list.map(d => reindexDocument(d.id).catch(() => null)));
    await Promise.all([load(), loadCounts()]);
    toast.success(language === 'ar' ? 'اكتملت الفهرسة' : 'Indexing complete');
    setReindexing(false);
  };

  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === 'ar' ? 'أرشيف المستندات الذكي' : 'Smart Document Archive'}
        subtitle={language === 'ar'
          ? 'بحث متقدم في كامل أرشيف المكتب باستخدام الذكاء الاصطناعي'
          : 'AI-powered search across your entire firm archive'}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Documents', labelAr: 'المستندات', href: '/documents' },
          { label: 'Archive', labelAr: 'الأرشيف' },
        ]}
        primaryAction={{
          label: language === 'ar' ? 'رفع مستند' : 'Upload Document',
          icon: Upload,
          onClick: () => setUploadOpen(true),
        }}
        secondaryActions={[{
          label: reindexing
            ? (language === 'ar' ? 'جارِ الفهرسة...' : 'Indexing…')
            : (language === 'ar' ? 'إعادة فهرسة المعلق' : 'Re-index pending'),
          icon: reindexing ? RefreshCw : Sparkles,
          onClick: handleReindexPending,
          disabled: reindexing,
        }]}
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill label={language === 'ar' ? 'إجمالي المستندات' : 'Total documents'} value={counts.total} />
        <StatPill label={language === 'ar' ? 'مفهرس' : 'Indexed'} value={counts.indexed} accent />
        <StatPill label={language === 'ar' ? 'قيد الفهرسة' : 'Pending'} value={counts.pending} />
        <StatPill label={language === 'ar' ? 'فشل' : 'Failed'} value={counts.failed} danger={counts.failed > 0} />
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ar'
              ? 'ابحث بالاسم أو الشخص أو المؤسسة أو الموضوع...'
              : 'Search by name, person, organization, topic…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-11 rounded-md border border-input bg-background px-3 text-body-sm"
        >
          <option value="all">{language === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
          <option value="done">{language === 'ar' ? 'مفهرس' : 'Indexed'}</option>
          <option value="pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
          <option value="processing">{language === 'ar' ? 'قيد المعالجة' : 'Processing'}</option>
          <option value="failed">{language === 'ar' ? 'فشل' : 'Failed'}</option>
        </select>
      </div>

      {/* Active facet chip */}
      {selected && (
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-muted-foreground">
            {language === 'ar' ? 'تصفية حسب:' : 'Filtered by:'}
          </span>
          <Badge variant="outline" className="gap-1.5">
            {selected.kind === 'people' && <UsersIcon className="h-3 w-3" />}
            {selected.kind === 'organizations' && <Building2 className="h-3 w-3" />}
            {selected.kind === 'places' && <MapPin className="h-3 w-3" />}
            {selected.kind === 'tags' && <Tag className="h-3 w-3" />}
            {selected.value}
            <button onClick={() => setSelected(null)} className="ms-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Facets sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <FacetGroup
            title={language === 'ar' ? 'الأشخاص' : 'People'}
            icon={UsersIcon}
            items={facets.people}
            kind="people"
            selected={selected}
            onSelect={setSelected}
          />
          <FacetGroup
            title={language === 'ar' ? 'المؤسسات' : 'Organizations'}
            icon={Building2}
            items={facets.organizations}
            kind="organizations"
            selected={selected}
            onSelect={setSelected}
          />
          <FacetGroup
            title={language === 'ar' ? 'الأماكن' : 'Places'}
            icon={MapPin}
            items={facets.places}
            kind="places"
            selected={selected}
            onSelect={setSelected}
          />
          <FacetGroup
            title={language === 'ar' ? 'الوسوم' : 'Tags'}
            icon={Tag}
            items={facets.tags}
            kind="tags"
            selected={selected}
            onSelect={setSelected}
          />
        </aside>

        {/* Results */}
        <main>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-md" />)}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={language === 'ar' ? 'لا توجد مستندات' : 'No documents yet'}
              titleAr={language === 'ar' ? 'لا توجد مستندات' : 'No documents yet'}
            />
          ) : (
            <div className="space-y-3">
              {docs.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDetailId(d.id)}
                  className="w-full text-start bg-card border border-border rounded-md p-4 hover:border-accent hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-[17px] text-foreground truncate">
                          {d.title || d.file_name}
                        </h3>
                        {d.ai_doc_type && (
                          <Badge variant="outline" className="text-[11px]">{d.ai_doc_type}</Badge>
                        )}
                        <IndexingBadge status={d.indexing_status} />
                      </div>
                      {d.ai_summary && (
                        <p className="text-body-sm text-muted-foreground mt-1.5 line-clamp-2">{d.ai_summary}</p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      <div>{format(new Date(d.created_at), 'MMM dd, yyyy')}</div>
                      <div>{fmtSize(d.file_size_bytes)} • {d.file_type?.toUpperCase()}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(d.ai_people || []).slice(0, 4).map(p => (
                      <ChipMini key={`p-${p}`} icon={UsersIcon} label={p} />
                    ))}
                    {(d.ai_organizations || []).slice(0, 3).map(o => (
                      <ChipMini key={`o-${o}`} icon={Building2} label={o} />
                    ))}
                    {(d.ai_places || []).slice(0, 2).map(pl => (
                      <ChipMini key={`pl-${pl}`} icon={MapPin} label={pl} />
                    ))}
                    {(d.ai_tags || []).slice(0, 5).map(tg => (
                      <ChipMini key={`t-${tg}`} icon={Tag} label={tg} muted />
                    ))}
                  </div>

                  {Array.isArray(d.ai_dates) && d.ai_dates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/60">
                      {d.ai_dates.slice(0, 4).map((dt: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          <span className="font-medium">{dt.type || 'date'}:</span>
                          <span className="tabular-nums">{dt.date}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      <DocumentUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={() => { load(); loadCounts(); }} />
      <DocumentDetailSlideOver
        documentId={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        onRefresh={() => { load(); loadCounts(); }}
      />
    </div>
  );
}

function StatPill({ label, value, accent, danger }: { label: string; value: number; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`bg-card border ${danger ? 'border-destructive/40' : accent ? 'border-accent/40' : 'border-border'} rounded-md px-4 py-3`}>
      <div className="text-[11px] eyebrow text-muted-foreground">{label}</div>
      <div className={`font-display text-[24px] tabular-nums mt-0.5 ${danger ? 'text-destructive' : accent ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

function IndexingBadge({ status }: { status: string }) {
  if (status === 'done') return null;
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending AI', cls: 'border-muted-foreground/30 text-muted-foreground' },
    processing: { label: 'Indexing…', cls: 'border-accent/40 text-accent' },
    failed: { label: 'Index failed', cls: 'border-destructive/40 text-destructive' },
    skipped: { label: 'Not indexed', cls: 'border-muted-foreground/30 text-muted-foreground' },
  };
  const m = map[status];
  if (!m) return null;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}

function ChipMini({ icon: Icon, label, muted }: { icon: any; label: string; muted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${muted ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'} rounded px-1.5 py-0.5`}>
      <Icon className="h-2.5 w-2.5" />
      <span className="truncate max-w-[160px]">{label}</span>
    </span>
  );
}

function FacetGroup({
  title, icon: Icon, items, kind, selected, onSelect,
}: {
  title: string; icon: any; items: [string, number][]; kind: FacetKey;
  selected: { kind: FacetKey; value: string } | null;
  onSelect: (s: { kind: FacetKey; value: string } | null) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="eyebrow text-muted-foreground">{title}</h4>
      </div>
      <div className="space-y-1">
        {items.map(([value, count]) => {
          const active = selected?.kind === kind && selected.value === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(active ? null : { kind, value })}
              className={`w-full text-start flex items-center justify-between gap-2 px-2 py-1 rounded text-body-sm transition-colors ${
                active ? 'bg-accent/15 text-accent font-medium' : 'text-foreground/80 hover:bg-secondary'
              }`}
            >
              <span className="truncate">{value}</span>
              <span className="tabular-nums text-[11px] text-muted-foreground shrink-0">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
