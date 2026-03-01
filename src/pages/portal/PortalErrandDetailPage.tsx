import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Check, Circle, Clock, Download, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function PortalErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { activeClientId } = usePortalOrg();
  const navigate = useNavigate();

  const [errand, setErrand] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('steps');

  useEffect(() => {
    if (!id || !profile?.id) return;
    loadErrand();
  }, [id, profile?.id]);

  const loadErrand = async () => {
    setLoading(true);
    const query = supabase
      .from('errands')
      .select('*')
      .eq('id', id!)
      .eq('is_visible_to_client', true);
    if (activeClientId) query.eq('client_id', activeClientId);
    const { data: e } = await query.maybeSingle();

    if (!e) { setLoading(false); navigate('/portal/errands'); return; }
    setErrand(e);

    const [stepsRes, docsRes] = await Promise.all([
      supabase.from('errand_steps').select('*').eq('errand_id', id!).order('step_number', { ascending: true }),
      supabase.from('errand_documents').select('*').eq('errand_id', id!).eq('is_visible_to_client', true).order('created_at', { ascending: false }),
    ]);

    setSteps(stepsRes.data || []);
    setDocuments(docsRes.data || []);
    setLoading(false);
  };

  const formatDate = (d: string) => {
    try {
      return language === 'ar' ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale }) : format(new Date(d), 'MMM dd, yyyy');
    } catch { return d; }
  };

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from('errand-documents').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  if (!errand) return null;

  const progress = errand.total_steps > 0 ? Math.round((errand.completed_steps / errand.total_steps) * 100) : 0;

  const stepIcon = (status: string) => {
    if (status === 'completed') return <Check className="h-4 w-4 text-green-600" />;
    if (status === 'in_progress') return <Clock className="h-4 w-4 text-accent" />;
    if (status === 'skipped') return <XCircle className="h-4 w-4 text-muted-foreground" />;
    return <Circle className="h-4 w-4 text-muted-foreground/40" />;
  };

  return (
    <div className="space-y-6">
      <Link to="/portal/errands" className="inline-flex items-center gap-1 text-body-sm text-accent hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t('portal.myErrands')}
      </Link>

      {/* Header */}
      <div>
        <p className="text-body-sm text-muted-foreground font-mono">{errand.errand_number}</p>
        <h1 className="text-display-lg font-bold text-foreground mt-1">
          {language === 'ar' && errand.title_ar ? errand.title_ar : errand.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <StatusBadge status={errand.status} type="errand" />
          <span className="text-body-sm bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
            {t(`errands.categories.${errand.category}`)}
          </span>
        </div>
        <div className="mt-4 max-w-md">
          <div className="flex justify-between text-body-sm mb-1">
            <span className="text-muted-foreground">{t('portal.errands.progress')}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-0">
          {[
            { key: 'steps', label: t('portal.errands.steps') },
            { key: 'documents', label: t('portal.myDocuments') },
            { key: 'details', label: language === 'en' ? 'Details' : 'التفاصيل' },
          ].map(tab => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={cn(
                'rounded-none border-b-2 border-transparent px-5 py-3 text-body-md font-medium text-muted-foreground',
                'data-[state=active]:border-accent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent',
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="steps" className="mt-6">
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'in_progress';
              return (
                <div key={step.id} className="flex gap-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0',
                      isCompleted ? 'border-green-500 bg-green-50' :
                      isCurrent ? 'border-accent bg-accent/10 animate-pulse' :
                      'border-border bg-secondary'
                    )}>
                      {stepIcon(step.status)}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={cn('w-0.5 flex-1 min-h-[40px]', isCompleted ? 'bg-green-300' : 'bg-border')} />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-6 flex-1">
                    <p className={cn('text-body-md font-medium', isCompleted ? 'text-green-700' : isCurrent ? 'text-accent' : 'text-muted-foreground')}>
                      {step.step_number}. {language === 'ar' && step.title_ar ? step.title_ar : step.title}
                    </p>
                    {step.description && (
                      <p className="text-body-sm text-muted-foreground mt-1">
                        {language === 'ar' && step.description_ar ? step.description_ar : step.description}
                      </p>
                    )}
                    {isCompleted && step.completed_at && (
                      <p className="text-body-sm text-green-600 mt-1">✓ {formatDate(step.completed_at)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {documents.length === 0 ? (
            <p className="text-body-md text-muted-foreground py-8 text-center">{t('portal.documents.noDocuments')}</p>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium text-foreground truncate">
                      {language === 'ar' && doc.file_name_ar ? doc.file_name_ar : doc.file_name}
                    </p>
                    <p className="text-body-sm text-muted-foreground">{formatDate(doc.created_at)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4 me-1" /> {t('portal.documents.download')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-5 max-w-lg">
            {[
              [language === 'en' ? 'Category' : 'الفئة', t(`errands.categories.${errand.category}`)],
              [language === 'en' ? 'Government Entity' : 'الجهة الحكومية', language === 'ar' && errand.government_entity_ar ? errand.government_entity_ar : errand.government_entity],
              [language === 'en' ? 'Reference Number' : 'الرقم المرجعي', errand.reference_number],
              [language === 'en' ? 'Start Date' : 'تاريخ البدء', errand.start_date ? formatDate(errand.start_date) : null],
              [t('portal.errands.dueDate'), errand.due_date ? formatDate(errand.due_date) : null],
              [language === 'en' ? 'Completed' : 'تاريخ الإكمال', errand.completed_date ? formatDate(errand.completed_date) : null],
              [language === 'en' ? 'Government Fees' : 'الرسوم الحكومية', errand.government_fees ? `${errand.government_fees.toLocaleString()} ${errand.government_fees_currency}` : null],
              [language === 'en' ? 'Service Fee' : 'رسوم الخدمة', errand.service_fee ? `${errand.service_fee.toLocaleString()} ${errand.service_fee_currency}` : null],
            ].filter(([, val]) => val).map(([label, value]) => (
              <div key={String(label)} className="flex justify-between py-2.5 border-b border-border/50 last:border-0">
                <span className="text-body-sm text-muted-foreground">{label}</span>
                <span className="text-body-md text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
