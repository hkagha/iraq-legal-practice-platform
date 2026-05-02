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

interface FacetSelection {
  kind: FacetKey;
  value: string;
}

export default function DocumentArchivePage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [docs, setDocs] = useState<ArchiveDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'pending' | 'processing' | 'failed'>('all');
  const [selectedFacets, setSelectedFacets] = useState<FacetSelection[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number } | null>(null);
  const [counts, setCounts] = useState({ total: 0, indexed: 0, pending: 0, failed: 0 });

  const toggleFacet = useCallback((kind: FacetKey, value: string) => {
    setSelectedFacets((prev) => {
      const idx = prev.findIndex((f) => f.kind === kind && f.value === value);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return [...prev, { kind, value }];
    });
  }, []);

  const removeFacet = useCallback((kind: FacetKey, value: string) => {
    setSelectedFacets((prev) => prev.filter((f) => !(f.kind === kind && f.value === value)));
  }, []);

  const clearFacets = useCallback(() => setSelectedFacets([]), []);

  const isFacetSelected = useCallback(
    (kind: FacetKey, value: string) => selectedFacets.some((f) => f.kind === kind && f.value === value),
    [selectedFacets],
  );

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let q = supabase
      .from('documents')
      .select('id, file_name, title, ai_doc_type, ai_summary, ai_people, ai_organizations, ai_places, ai_tags, ai_dates, ai_language, indexing_status, indexing_error, created_at, file_size_bytes, file_type')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_latest_version', true)
      .order('created_at', { ascending: false })
      .limit(500);

    if (statusFilter !== 'all') q = q.eq('indexing_status', statusFilter);

    if (search.trim()) {
      const s = search.trim();
      q = q.or(`file_name.ilike.%${s}%,title.ilike.%${s}%,ai_summary.ilike.%${s}%,ai_doc_type.ilike.%${s}%,extracted_text.ilike.%${s}%,corrected_text.ilike.%${s}%`);
    }

    // AND-combine multiple facets across kinds (multi-tag filtering)
    if (selectedFacets.length > 0) {
      // Group selections by kind
      const byKind: Record<FacetKey, string[]> = { people: [], organizations: [], places: [], tags: [] };
      for (const f of selectedFacets) byKind[f.kind].push(f.value);

      // Within a single kind, use 'contains' to require ALL selected values to be present
      // (e.g. all selected people must appear in ai_people array)
      const kindToCol: Record<FacetKey, string> = {
        people: 'ai_people',
        organizations: 'ai_organizations',
        places: 'ai_places',
        tags: 'ai_tags',
      };
      for (const kind of Object.keys(byKind) as FacetKey[]) {
        if (byKind[kind].length > 0) {
          q = q.contains(kindToCol[kind], byKind[kind]);
        }
      }
    }

    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
    } else {
      setDocs((data || []) as ArchiveDoc[]);
    }
    setLoading(false);
  }, [orgId, search, statusFilter, selectedFacets]);

  const loadCounts = useCallback(async () => {
    if (!orgId) return;
    const baseFilter = (qb: any) => qb
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_latest_version', true);
    const [total, indexed, pending, failed] = await Promise.all([
      baseFilter(supabase.from('documents').select('*', { count: 'exact', head: true })),
      baseFilter(supabase.from('documents').select('*', { count: 'exact', head: true })).eq('indexing_status', 'done'),
      baseFilter(supabase.from('documents').select('*', { count: 'exact', head: true })).in('indexing_status', ['pending', 'processing']),
      baseFilter(supabase.from('documents').select('*', { count: 'exact', head: true })).eq('indexing_status', 'failed'),
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
      .eq('is_latest_version', true)
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

  const handleBackfillAll = async () => {
    if (!orgId) return;
    if (!confirm(language === 'ar'
      ? 'سيتم تحليل وفهرسة جميع المستندات التي لم تتم فهرستها بعد. قد يستغرق ذلك بعض الوقت ويستهلك رصيد الذكاء الاصطناعي. المتابعة؟'
      : 'This will index every document that has not been analyzed yet. It may take a while and consume AI credits. Continue?')) return;

    setBackfilling(true);
    try {
      const { data, error } = await supabase.from('documents')
        .select('id')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .eq('is_latest_version', true)
        .in('indexing_status', ['pending', 'failed']);
      if (error) throw error;
      const list = data || [];
      if (!list.length) {
        toast.info(language === 'ar' ? 'كل المستندات مفهرسة بالفعل' : 'All documents are already indexed');
        return;
      }
      setBackfillProgress({ done: 0, total: list.length });
      toast.info(language === 'ar' ? `بدء فهرسة ${list.length} مستند` : `Indexing ${list.length} document(s)…`);

      // Process in parallel batches of 5 to avoid hammering the function
      const BATCH = 5;
      let done = 0;
      for (let i = 0; i < list.length; i += BATCH) {
        const slice = list.slice(i, i + BATCH);
        await Promise.all(slice.map(d => reindexDocument(d.id).catch(() => null)));
        done += slice.length;
        setBackfillProgress({ done, total: list.length });
      }
      await Promise.all([load(), loadCounts()]);
      toast.success(language === 'ar' ? `اكتملت فهرسة ${done} مستند` : `Indexed ${done} document(s)`);
    } catch (e: any) {
      toast.error(e?.message || 'Backfill failed');
    } finally {
      setBackfilling(false);
      setTimeout(() => setBackfillProgress(null), 3000);
    }
  };

  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Document Archive"
        titleAr="أرشيف المستندات الذكي"
        subtitle="AI-powered search across your entire firm archive"
        subtitleAr="بحث متقدم في كامل أرشيف المكتب باستخدام الذكاء الاصطناعي"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Documents', labelAr: 'المستندات', href: '/documents' },
          { label: 'Archive', labelAr: 'الأرشيف' },
        ]}
        actionLabel="Upload Document"
        actionLabelAr="رفع مستند"
        onAction={() => setUploadOpen(true)}
        secondaryActions={[
          {
            label: reindexing ? 'Indexing…' : 'Re-index pending',
            labelAr: reindexing ? 'جارِ الفهرسة...' : 'إعادة فهرسة المعلق',
            icon: reindexing ? RefreshCw : Sparkles,
            onClick: handleReindexPending,
          },
          {
            label: backfilling ? 'Backfilling…' : 'Backfill all',
            labelAr: backfilling ? 'جارِ التحليل...' : 'فهرسة الكل',
            icon: backfilling ? RefreshCw : Sparkles,
            onClick: handleBackfillAll,
          },
        ]}
      />

      {backfillProgress && (
        <div className="bg-accent/10 border border-accent/30 rounded-md px-4 py-3">
          <div className="flex items-center justify-between text-body-sm mb-1.5">
            <span className="font-medium text-accent inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              {language === 'ar' ? 'فهرسة الأرشيف بالذكاء الاصطناعي' : 'AI archive backfill'}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {backfillProgress.done} / {backfillProgress.total}
            </span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(backfillProgress.done / backfillProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

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

      {/* Active facet chips (multi-select) */}
      {selectedFacets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body-sm text-muted-foreground">
            {language === 'ar' ? 'تصفية حسب:' : 'Filtered by:'}
          </span>
          {selectedFacets.map((f) => (
            <Badge key={`${f.kind}:${f.value}`} variant="outline" className="gap-1.5">
              {f.kind === 'people' && <UsersIcon className="h-3 w-3" />}
              {f.kind === 'organizations' && <Building2 className="h-3 w-3" />}
              {f.kind === 'places' && <MapPin className="h-3 w-3" />}
              {f.kind === 'tags' && <Tag className="h-3 w-3" />}
              {f.value}
              <button
                onClick={() => removeFacet(f.kind, f.value)}
                className="ms-1 hover:text-destructive"
                aria-label={language === 'ar' ? 'إزالة الفلتر' : 'Remove filter'}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedFacets.length > 1 && (
            <button
              onClick={clearFacets}
              className="text-body-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {language === 'ar' ? 'مسح الكل' : 'Clear all'}
            </button>
          )}
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
            isSelected={isFacetSelected}
            onToggle={toggleFacet}
          />
          <FacetGroup
            title={language === 'ar' ? 'المؤسسات' : 'Organizations'}
            icon={Building2}
            items={facets.organizations}
            kind="organizations"
            isSelected={isFacetSelected}
            onToggle={toggleFacet}
          />
          <FacetGroup
            title={language === 'ar' ? 'الأماكن' : 'Places'}
            icon={MapPin}
            items={facets.places}
            kind="places"
            isSelected={isFacetSelected}
            onToggle={toggleFacet}
          />
          <FacetGroup
            title={language === 'ar' ? 'الوسوم' : 'Tags'}
            icon={Tag}
            items={facets.tags}
            kind="tags"
            isSelected={isFacetSelected}
            onToggle={toggleFacet}
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

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onComplete={() => { load(); loadCounts(); }}
        visibilityScopeOverride="shared_library"
        titleOverride="Upload to Smart Archive"
        titleOverrideAr="رفع إلى الأرشيف الذكي"
      />
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
  title, icon: Icon, items, kind, isSelected, onToggle,
}: {
  title: string; icon: any; items: [string, number][]; kind: FacetKey;
  isSelected: (kind: FacetKey, value: string) => boolean;
  onToggle: (kind: FacetKey, value: string) => void;
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
          const active = isSelected(kind, value);
          return (
            <button
              key={value}
              onClick={() => onToggle(kind, value)}
              className={`w-full text-start flex items-center justify-between gap-2 px-2 py-1 rounded text-body-sm transition-colors ${
                active ? 'bg-accent/15 text-accent font-medium' : 'text-foreground/80 hover:bg-secondary'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm border ${
                  active ? 'bg-accent border-accent' : 'border-border'
                }`}>
                  {active && (
                    <svg className="h-2.5 w-2.5 text-accent-foreground" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="truncate">{value}</span>
              </span>
              <span className="tabular-nums text-[11px] text-muted-foreground shrink-0">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
