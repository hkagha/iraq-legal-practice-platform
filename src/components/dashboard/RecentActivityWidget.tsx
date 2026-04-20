import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Scale, FileCheck, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface FeedItem {
  id: string;
  source: 'case' | 'errand' | 'document';
  title: string;
  title_ar?: string;
  created_at: string;
  link: string;
}

export default function RecentActivityWidget() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const orgId = profile?.organization_id;

  const { data: items, isLoading } = useQuery({
    queryKey: ['dashboard-recent-activity', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<FeedItem[]> => {
      const [caseAct, errAct, docAct] = await Promise.all([
        supabase.from('case_activities').select('id, title, title_ar, created_at, case_id')
          .eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(8),
        supabase.from('errand_activities').select('id, title, title_ar, created_at, errand_id')
          .eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(8),
        supabase.from('document_activities').select('id, title, title_ar, created_at, document_id')
          .eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(8),
      ]);
      const items: FeedItem[] = [
        ...(caseAct.data ?? []).map((a: any) => ({ id: `c-${a.id}`, source: 'case' as const, title: a.title, title_ar: a.title_ar, created_at: a.created_at, link: `/cases/${a.case_id}` })),
        ...(errAct.data ?? []).map((a: any) => ({ id: `e-${a.id}`, source: 'errand' as const, title: a.title, title_ar: a.title_ar, created_at: a.created_at, link: `/errands/${a.errand_id}` })),
        ...(docAct.data ?? []).map((a: any) => ({ id: `d-${a.id}`, source: 'document' as const, title: a.title, title_ar: a.title_ar, created_at: a.created_at, link: `/documents` })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 12);
      return items;
    },
  });

  const iconFor = (s: FeedItem['source']) => s === 'case' ? Scale : s === 'errand' ? FileCheck : FileText;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-heading-md font-semibold text-primary">{isEN ? 'Recent activity' : 'النشاط الأخير'}</h3>
        </div>
        <Link to="/activity" className="text-body-sm text-accent hover:underline">{isEN ? 'View all' : 'عرض الكل'}</Link>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />)}
        </div>
      ) : (items?.length ?? 0) === 0 ? (
        <p className="text-body-sm text-muted-foreground text-center py-6">{isEN ? 'No activity yet.' : 'لا يوجد نشاط بعد.'}</p>
      ) : (
        <div className="divide-y divide-border">
          {items!.map((it) => {
            const Icon = iconFor(it.source);
            return (
              <Link key={it.id} to={it.link} className="flex items-center gap-3 py-2.5 hover:bg-secondary/40 -mx-2 px-2 rounded transition-colors">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-medium text-foreground truncate">{isEN ? it.title : (it.title_ar || it.title)}</div>
                  <div className="text-caption text-muted-foreground capitalize">{it.source}</div>
                </div>
                <div className="text-caption text-muted-foreground tabular shrink-0">
                  {formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
