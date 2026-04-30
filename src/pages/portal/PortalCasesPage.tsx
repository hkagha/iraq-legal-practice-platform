import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Scale, Search, Calendar, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';

export default function PortalCasesPage() {
  const { language, isRTL } = useLanguage();
  const { activeOrg } = usePortalOrg();
  const [search, setSearch] = useState('');
  const isEN = language === 'en';
  const orgId = activeOrg?.id || null;

  const { data: cases, isLoading } = useQuery({
    queryKey: ['portal-cases', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      // RLS filters by the portal user's party relationship to the case.
      // We additionally scope by organization_id so a multi-firm client only
      // sees the firm they currently selected.
      const { data, error } = await supabase
        .from('cases')
        .select('id, case_number, title, title_ar, status, case_type, court_name, court_name_ar, filing_date, updated_at')
        .eq('organization_id', orgId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (cases ?? []).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.case_number.toLowerCase().includes(s) ||
      c.title.toLowerCase().includes(s) ||
      (c.title_ar ?? '').toLowerCase().includes(s)
    );
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-display-sm font-bold text-primary mb-1">
          {isEN ? 'My Cases' : 'قضاياي'}
        </h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN
            ? 'Cases your firm has shared with you'
            : 'القضايا التي شاركها معك مكتبك'}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground`} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEN ? 'Search cases…' : 'ابحث في القضايا…'}
          className={isRTL ? 'pr-9' : 'pl-9'}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No cases yet"
          titleAr="لا توجد قضايا"
          subtitle="When your firm shares a case with you, it will appear here."
          subtitleAr="عندما يشارك مكتبك قضية معك، ستظهر هنا."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link key={c.id} to={`/portal/cases/${c.id}`}>
              <Card className="p-4 hover:border-accent transition-colors cursor-pointer flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Scale className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-body-xs text-muted-foreground">{c.case_number}</span>
                    <StatusBadge status={c.status} type="case" />
                  </div>
                  <h3 className="font-medium text-foreground truncate">
                    {isEN ? c.title : (c.title_ar || c.title)}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-body-xs text-muted-foreground">
                    {c.court_name && (
                      <span className="truncate">
                        {isEN ? c.court_name : (c.court_name_ar || c.court_name)}
                      </span>
                    )}
                    {c.filing_date && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.filing_date).toLocaleDateString(isEN ? 'en-GB' : 'ar-IQ')}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
