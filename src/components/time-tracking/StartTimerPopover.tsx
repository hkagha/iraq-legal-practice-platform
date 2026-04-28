import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/contexts/TimerContext';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { Label } from '@/components/ui/label';
import { PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function StartTimerPopover() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { activeTimer, startTimer } = useTimer();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [caseId, setCaseId] = useState('');
  const [errandId, setErrandId] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open || !profile?.organization_id) return;
    const load = async () => {
      const [c, e] = await Promise.all([
        supabase.from('cases').select('id, case_number, title').eq('organization_id', profile.organization_id!).not('status', 'in', '("closed","archived")').order('case_number', { ascending: false }).limit(50),
        supabase.from('errands').select('id, errand_number, title').eq('organization_id', profile.organization_id!).not('status', 'in', '("completed","cancelled")').order('errand_number', { ascending: false }).limit(50),
      ]);
      setCases(c.data || []);
      setErrands(e.data || []);
    };
    load();
  }, [open, profile?.organization_id]);

  const handleStart = async () => {
    if (activeTimer) {
      toast.error(t('You already have a timer running. Stop it first.', 'لديك مؤقت يعمل بالفعل. أوقفه أولاً.'));
      return;
    }
    setStarting(true);
    const result = await startTimer({
      description: description || t('Timer', 'مؤقت'),
      case_id: caseId || undefined,
      errand_id: errandId || undefined,
    }).finally(() => setStarting(false));
    if (!result.ok) return;

    toast.success(t('Timer started', 'بدأ المؤقت'));
    setOpen(false);
    setDescription('');
    setCaseId('');
    setErrandId('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <PlayCircle size={16} />
          {t('Start Timer', 'بدء المؤقت')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div>
            <Label className="text-body-sm">{t('Description (optional)', 'الوصف (اختياري)')}</Label>
            <FormInput
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('What are you working on?', 'ما الذي تعمل عليه؟')}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-body-sm">{t('Case', 'القضية')}</Label>
            <FormSearchSelect
              value={caseId}
              onChange={setCaseId}
              options={cases.map(c => ({ value: c.id, label: `${c.case_number} — ${c.title}` }))}
              placeholder={t('None', 'بدون')}
            />
          </div>
          <div>
            <Label className="text-body-sm">{t('Errand', 'المعاملة')}</Label>
            <FormSearchSelect
              value={errandId}
              onChange={setErrandId}
              options={errands.map(e => ({ value: e.id, label: `${e.errand_number} — ${e.title}` }))}
              placeholder={t('None', 'بدون')}
            />
          </div>
          <Button onClick={handleStart} disabled={starting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <PlayCircle size={16} className="me-1" />
            {starting ? t('Starting...', 'جاري البدء...') : t('Start', 'بدء')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
