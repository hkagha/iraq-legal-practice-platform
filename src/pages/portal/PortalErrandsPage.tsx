import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FileCheck, Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';

export default function PortalErrandsPage() {
  const { language, isRTL } = useLanguage();
  const { activeOrg } = usePortalOrg();
  const [search, setSearch] = useState('');
  const isEN = language === 'en';
  const orgId = activeOrg?.id || null;

  const { data: errands, isLoading } = useQuery({
    queryKey: ['portal-errands', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('errands')
        .select('id, errand_number, title, title_ar, status, errand_type, due_date, completed_steps, total_steps, updated_at')
        .eq('organization_id', orgId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (errands ?? []).filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.errand_number.toLowerCase().includes(s) ||
      e.title.toLowerCase().includes(s) ||
      (e.title_ar ?? '').toLowerCase().includes(s)
    );
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-display-sm font-bold text-primary mb-1">{isEN ? 'My Errands' : 'معاملاتي'}</h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'Administrative tasks your firm is handling for you.' : 'المعاملات الإدارية التي يتولاها مكتبك نيابةً عنك.'}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground`} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEN ? 'Search errands…' : 'ابحث في المعاملات…'}
          className={isRTL ? 'pr-9' : 'pl-9'}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No errands yet"
          titleAr="لا توجد معاملات"
          subtitle="Your firm hasn't shared any errands with you yet."
          subtitleAr="لم يشارك مكتبك أي معاملات معك بعد."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const pct = e.total_steps > 0 ? Math.round((e.completed_steps / e.total_steps) * 100) : 0;
            return (
              <Link key={e.id} to={`/portal/errands/${e.id}`}>
                <Card className="p-4 hover:border-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <FileCheck className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-body-sm font-mono text-muted-foreground">{e.errand_number}</span>
                        <StatusBadge status={e.status} type="errand" />
                      </div>
                      <div className="text-body font-medium truncate text-foreground">
                        {isEN ? e.title : (e.title_ar || e.title)}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-xs">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-caption text-muted-foreground tabular">{e.completed_steps}/{e.total_steps} • {pct}%</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
