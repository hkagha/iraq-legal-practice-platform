import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  Scale, FileCheck, CheckSquare, FileText, Receipt, User,
  RefreshCw, MessageSquare, Upload, Activity,
} from 'lucide-react';

interface FeedItem {
  id: string;
  source: 'case' | 'errand' | 'client' | 'document';
  activity_type: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  actor_id: string | null;
  created_at: string;
  entity_id: string;
  entity_type: string;
}

const SOURCE_ICONS: Record<string, { icon: typeof Activity; colorClass: string }> = {
  case: { icon: Scale, colorClass: 'bg-blue-100 text-blue-600' },
  errand: { icon: FileCheck, colorClass: 'bg-purple-100 text-purple-600' },
  client: { icon: User, colorClass: 'bg-slate-100 text-slate-600' },
  document: { icon: FileText, colorClass: 'bg-emerald-100 text-emerald-600' },
  status_changed: { icon: RefreshCw, colorClass: 'bg-amber-100 text-amber-600' },
  note: { icon: MessageSquare, colorClass: 'bg-blue-100 text-blue-600' },
  upload: { icon: Upload, colorClass: 'bg-emerald-100 text-emerald-600' },
};

const SOURCE_FILTERS = ['all', 'cases', 'errands', 'clients', 'documents'] as const;

export default function ActivityFeedPage() {
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<typeof SOURCE_FILTERS[number]>('all');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchActivities = useCallback(async (reset = false) => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const from = reset ? 0 : offset;
    const orgId = profile.organization_id;

    const queries = [];
    if (sourceFilter === 'all' || sourceFilter === 'cases') {
      queries.push(
        supabase.from('case_activities').select('id,activity_type,title,title_ar,description,description_ar,actor_id,created_at,case_id')
          .eq('organization_id', orgId).order('created_at', { ascending: false }).range(from, from + 14)
          .then(r => (r.data || []).map((a: any) => ({ ...a, source: 'case' as const, entity_id: a.case_id, entity_type: 'case' })))
      );
    }
    if (sourceFilter === 'all' || sourceFilter === 'errands') {
      queries.push(
        supabase.from('errand_activities').select('id,activity_type,title,title_ar,description,description_ar,actor_id,created_at,errand_id')
          .eq('organization_id', orgId).order('created_at', { ascending: false }).range(from, from + 14)
          .then(r => (r.data || []).map((a: any) => ({ ...a, source: 'errand' as const, entity_id: a.errand_id, entity_type: 'errand' })))
      );
    }
    if (sourceFilter === 'all' || sourceFilter === 'clients') {
      queries.push(
        supabase.from('client_activities').select('id,activity_type,title,title_ar,description,description_ar,actor_id,created_at,client_id')
          .eq('organization_id', orgId).order('created_at', { ascending: false }).range(from, from + 14)
          .then(r => (r.data || []).map((a: any) => ({ ...a, source: 'client' as const, entity_id: a.client_id, entity_type: 'client' })))
      );
    }
    if (sourceFilter === 'all' || sourceFilter === 'documents') {
      queries.push(
        supabase.from('document_activities').select('id,activity_type,title,title_ar,description,actor_id,created_at,document_id')
          .eq('organization_id', orgId).order('created_at', { ascending: false }).range(from, from + 14)
          .then(r => (r.data || []).map((a: any) => ({ ...a, source: 'document' as const, entity_id: a.document_id, entity_type: 'document', title_ar: a.title_ar || null, description_ar: null })))
      );
    }

    const results = await Promise.all(queries);
    const merged = results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30);

    setItems(prev => reset ? merged : [...prev, ...merged]);
    setHasMore(merged.length >= 15);
    setLoading(false);
  }, [profile?.organization_id, sourceFilter, offset]);

  useEffect(() => { setOffset(0); fetchActivities(true); }, [profile?.organization_id, sourceFilter]);

  const loadMore = () => {
    setOffset(o => o + 30);
    fetchActivities();
  };

  const fmtRelative = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined });

  const handleEntityClick = (item: FeedItem) => {
    switch (item.entity_type) {
      case 'case': navigate(`/cases/${item.entity_id}`); break;
      case 'errand': navigate(`/errands/${item.entity_id}`); break;
      case 'client': navigate(`/clients/${item.entity_id}`); break;
      case 'document': navigate('/documents'); break;
    }
  };

  const getIcon = (item: FeedItem) => {
    if (item.activity_type.includes('status')) return SOURCE_ICONS.status_changed;
    if (item.activity_type.includes('note') || item.activity_type.includes('comment')) return SOURCE_ICONS.note;
    if (item.activity_type.includes('upload')) return SOURCE_ICONS.upload;
    return SOURCE_ICONS[item.source] || SOURCE_ICONS.case;
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <PageHeader
        title={t('collaboration.activityFeed')}
        titleAr={language === 'ar' ? 'سجل النشاط' : 'Activity Feed'}
        subtitle={t('collaboration.activityFeedSubtitle')}
        subtitleAr={language === 'ar' ? 'كل ما يحدث في مكتبك' : 'Everything happening at your firm'}
      />

      {/* Filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        {SOURCE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setSourceFilter(f)}
            className={`px-3 py-1.5 rounded-full text-body-sm transition-colors ${sourceFilter === f ? 'bg-accent text-accent-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {f === 'all' ? (language === 'ar' ? 'الكل' : 'All') :
             f === 'cases' ? (language === 'ar' ? 'القضايا' : 'Cases') :
             f === 'errands' ? (language === 'ar' ? 'المعاملات' : 'Errands') :
             f === 'clients' ? (language === 'ar' ? 'العملاء' : 'Clients') :
             (language === 'ar' ? 'المستندات' : 'Documents')}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="mt-6">
        {!loading && items.length === 0 && (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            titleAr="لا يوجد نشاط بعد"
            subtitle="Activities will appear here as your team works"
            subtitleAr="سيظهر النشاط هنا عندما يعمل فريقك"
          />
        )}
        {items.map((item, idx) => {
          const cfg = getIcon(item);
          const Icon = cfg.icon;
          return (
            <div key={`${item.source}-${item.id}`} className="flex gap-3 relative">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.colorClass}`}>
                  <Icon size={16} />
                </div>
                {idx < items.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
              </div>
              <div className="pb-5 flex-1 min-w-0">
                <p className="text-body-md text-foreground">
                  {language === 'ar' && item.title_ar ? item.title_ar : item.title}
                </p>
                {(language === 'ar' ? item.description_ar : item.description) && (
                  <p className="text-body-sm text-muted-foreground mt-0.5">
                    {language === 'ar' ? item.description_ar : item.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground">{fmtRelative(item.created_at)}</span>
                  <button
                    onClick={() => handleEntityClick(item)}
                    className="text-[11px] text-accent hover:underline"
                  >
                    {item.entity_type === 'case' ? '→ Case' : item.entity_type === 'errand' ? '→ Errand' : item.entity_type === 'client' ? '→ Client' : '→ Document'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {hasMore && items.length > 0 && (
          <div className="text-center py-4">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...') : (language === 'ar' ? 'تحميل المزيد' : 'Load More')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
