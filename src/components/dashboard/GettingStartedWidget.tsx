import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  key: string;
  labelEn: string;
  labelAr: string;
  path: string;
  check: () => Promise<boolean>;
}

export default function GettingStartedWidget() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('qanuni_onboarding_dismissed') === 'true');
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const items: ChecklistItem[] = [
    {
      key: 'org',
      labelEn: 'Set up your organization',
      labelAr: 'إعداد مؤسستك',
      path: '/settings',
      check: async () => true, // Always done after signup
    },
    {
      key: 'client',
      labelEn: 'Add your first client',
      labelAr: 'إضافة أول عميل',
      path: '/clients',
      check: async () => {
        const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', profile!.organization_id!);
        return (count || 0) > 0;
      },
    },
    {
      key: 'case',
      labelEn: 'Create your first case',
      labelAr: 'إنشاء أول قضية',
      path: '/cases/new',
      check: async () => {
        const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('organization_id', profile!.organization_id!);
        return (count || 0) > 0;
      },
    },
    {
      key: 'document',
      labelEn: 'Upload a document',
      labelAr: 'رفع مستند',
      path: '/documents',
      check: async () => {
        const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', profile!.organization_id!);
        return (count || 0) > 0;
      },
    },
    {
      key: 'team',
      labelEn: 'Invite a team member',
      labelAr: 'دعوة عضو فريق',
      path: '/settings',
      check: async () => {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', profile!.organization_id!);
        return (count || 0) > 1;
      },
    },
  ];

  useEffect(() => {
    if (dismissed || !profile?.organization_id) return;
    const checkAll = async () => {
      setLoading(true);
      const results: Record<string, boolean> = {};
      await Promise.all(items.map(async (item) => {
        results[item.key] = await item.check();
      }));
      setCompleted(results);
      setLoading(false);
    };
    checkAll();
  }, [dismissed, profile?.organization_id]);

  if (dismissed || loading) return null;

  const doneCount = Object.values(completed).filter(Boolean).length;
  const allDone = doneCount === items.length;
  if (allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem('qanuni_onboarding_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 border-s-4 border-s-accent">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-heading-sm text-foreground">{t('common.gettingStarted')}</h3>
          <p className="text-body-sm text-muted-foreground">{doneCount}/{items.length} {language === 'ar' ? 'مكتملة' : 'completed'}</p>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Progress value={(doneCount / items.length) * 100} className="h-1.5 mb-4" />
      <ul className="space-y-2">
        {items.map((item) => {
          const done = completed[item.key];
          return (
            <li key={item.key}>
              <button
                onClick={() => !done && navigate(item.path)}
                disabled={done}
                className={cn(
                  'flex items-center gap-3 w-full text-start py-1.5 px-2 rounded-md transition-colors text-body-md',
                  done ? 'text-muted-foreground line-through' : 'text-foreground hover:bg-secondary cursor-pointer'
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />}
                {language === 'ar' ? item.labelAr : item.labelEn}
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={handleDismiss} className="mt-3 text-body-sm text-muted-foreground hover:text-foreground underline">
        {t('common.dismiss')}
      </button>
    </div>
  );
}
