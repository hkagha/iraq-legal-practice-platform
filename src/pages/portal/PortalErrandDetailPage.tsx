import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, CheckCircle2, Circle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PortalErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language, isRTL } = useLanguage();
  const isEN = language === 'en';

  const { data: errand, isLoading } = useQuery({
    queryKey: ['portal-errand', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('errands')
        .select('*, errand_steps(*)')
        .eq('id', id!)
        .eq('is_visible_to_client', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!errand) {
    return (
      <div className="max-w-[1100px] mx-auto p-6">
        <EmptyState
          icon={Briefcase}
          title="Errand not found"
          titleAr="لم يتم العثور على المعاملة"
          subtitle="This errand does not exist or is not shared with you."
          subtitleAr="هذه المعاملة غير موجودة أو غير متاحة لك."
        />
      </div>
    );
  }

  const steps = (errand.errand_steps ?? []).sort((a: any, b: any) => a.step_order - b.step_order);
  const total = errand.total_steps ?? steps.length;
  const done = errand.completed_steps ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-[1000px] mx-auto p-4 md:p-6 space-y-5">
      <Link
        to="/portal/errands"
        className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
        {isEN ? 'Back to errands' : 'العودة إلى المعاملات'}
      </Link>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-mono text-body-sm text-muted-foreground">{errand.errand_number}</p>
            <h1 className="text-heading-lg font-bold text-primary mt-1">
              {isEN ? errand.title : (errand.title_ar || errand.title)}
            </h1>
          </div>
          <StatusBadge status={errand.status} type="errand" />
        </div>
        {errand.description && (
          <p className="text-body-sm text-muted-foreground mb-4">
            {isEN ? errand.description : (errand.description_ar || errand.description)}
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-body-sm">
          {errand.due_date && (
            <div>
              <p className="text-muted-foreground">{isEN ? 'Due date' : 'تاريخ الاستحقاق'}</p>
              <p className="font-medium">{errand.due_date}</p>
            </div>
          )}
          {errand.errand_type && (
            <div>
              <p className="text-muted-foreground">{isEN ? 'Type' : 'النوع'}</p>
              <p className="font-medium">{errand.errand_type}</p>
            </div>
          )}
          {errand.priority && (
            <div>
              <p className="text-muted-foreground">{isEN ? 'Priority' : 'الأولوية'}</p>
              <StatusBadge status={errand.priority} type="priority" size="sm" />
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-body-sm mb-1">
              <span className="text-muted-foreground">{isEN ? 'Progress' : 'التقدم'}</span>
              <span className="font-medium">{done}/{total} ({pct}%)</span>
            </div>
            <Progress value={pct} />
          </div>
        )}
      </Card>

      {steps.length > 0 && (
        <Card className="p-6">
          <h2 className="text-heading-md font-semibold text-primary mb-4">
            {isEN ? 'Steps' : 'الخطوات'}
          </h2>
          <div className="space-y-3">
            {steps.map((s: any) => {
              const isDone = s.status === 'completed';
              const isInProgress = s.status === 'in_progress';
              return (
                <div key={s.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isInProgress ? (
                      <Clock className="h-5 w-5 text-warning" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-body-md font-medium ${isDone ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                      {isEN ? s.title : (s.title_ar || s.title)}
                    </p>
                    {s.description && (
                      <p className="text-body-sm text-muted-foreground mt-1">
                        {isEN ? s.description : (s.description_ar || s.description)}
                      </p>
                    )}
                    {s.completed_at && (
                      <p className="text-body-xs text-muted-foreground mt-1">
                        {isEN ? 'Completed' : 'اكتملت'}: {new Date(s.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
