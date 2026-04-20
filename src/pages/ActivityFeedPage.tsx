import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Activity, Briefcase, FileText, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Item = {
  id: string;
  source: 'case' | 'errand' | 'party' | 'document';
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  created_at: string;
  link: string;
};

const ICONS = { case: Briefcase, errand: FileText, party: Users, document: FileText };

export default function ActivityFeedPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'case' | 'errand' | 'party' | 'document'>('all');
  const orgId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['activity-feed', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Item[]> => {
      const [cases, errands, parties, docs] = await Promise.all([
        supabase.from('case_activities').select('id, title, title_ar, description, description_ar, created_at, case_id').eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(50),
        supabase.from('errand_activities').select('id, title, title_ar, description, description_ar, created_at, errand_id').eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(50),
        supabase.from('party_activities').select('id, title, title_ar, description, description_ar, created_at, person_id, entity_id, party_type').eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(50),
        supabase.from('document_activities').select('id, title, title_ar, created_at, document_id').eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(50),
      ]);
      const all: Item[] = [
        ...(cases.data ?? []).map((a: any) => ({ id: a.id, source: 'case' as const, title: a.title, title_ar: a.title_ar, description: a.description, description_ar: a.description_ar, created_at: a.created_at, link: `/cases/${a.case_id}` })),
        ...(errands.data ?? []).map((a: any) => ({ id: a.id, source: 'errand' as const, title: a.title, title_ar: a.title_ar, description: a.description, description_ar: a.description_ar, created_at: a.created_at, link: `/errands/${a.errand_id}` })),
        ...(parties.data ?? []).map((a: any) => ({ id: a.id, source: 'party' as const, title: a.title, title_ar: a.title_ar, description: a.description, description_ar: a.description_ar, created_at: a.created_at, link: a.party_type === 'entity' ? `/clients/entity/${a.entity_id}` : `/clients/person/${a.person_id}` })),
        ...(docs.data ?? []).map((a: any) => ({ id: a.id, source: 'document' as const, title: a.title, title_ar: a.title_ar, description: null, description_ar: null, created_at: a.created_at, link: `/documents` })),
      ];
      return all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });

  const filtered = (data ?? []).filter(i => filter === 'all' || i.source === filter);

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader title="Activity feed" titleAr="سجل النشاط" subtitle="All recent activity across your firm" subtitleAr="جميع الأنشطة الأخيرة في مكتبك" />

      <Tabs value={filter} onValueChange={v => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">{isEN ? 'All' : 'الكل'}</TabsTrigger>
          <TabsTrigger value="case">{isEN ? 'Cases' : 'القضايا'}</TabsTrigger>
          <TabsTrigger value="errand">{isEN ? 'Errands' : 'المعاملات'}</TabsTrigger>
          <TabsTrigger value="party">{isEN ? 'Parties' : 'الأطراف'}</TabsTrigger>
          <TabsTrigger value="document">{isEN ? 'Documents' : 'المستندات'}</TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="mt-4">
          {filtered.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Activity} title="No activity" titleAr="لا يوجد نشاط" />
            </Card>
          ) : (
            <div className="space-y-1">
              {filtered.map(item => {
                const Icon = ICONS[item.source];
                return (
                  <button
                    key={`${item.source}-${item.id}`}
                    onClick={() => navigate(item.link)}
                    className="w-full flex items-start gap-3 p-3 rounded border bg-card hover:bg-muted/50 text-start"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium text-foreground">{isEN ? item.title : (item.title_ar || item.title)}</p>
                      {(item.description || item.description_ar) && (
                        <p className="text-body-sm text-muted-foreground mt-0.5">{isEN ? item.description : (item.description_ar || item.description)}</p>
                      )}
                      <p className="text-body-xs text-muted-foreground mt-1">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
