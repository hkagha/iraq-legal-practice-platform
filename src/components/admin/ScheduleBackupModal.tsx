import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function ScheduleBackupModal({ isOpen, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [name, setName] = useState('Weekly System Backup');
  const [scope, setScope] = useState('system');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [preferredTime, setPreferredTime] = useState('03:00');
  const [includesStorage, setIncludesStorage] = useState(false);
  const [retentionDays, setRetentionDays] = useState('30');
  const [maxBackups, setMaxBackups] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      supabase.from('organizations').select('id, name').order('name').then(({ data }) => {
        setOrgs((data || []) as { id: string; name: string }[]);
      });
    }
  }, [isOpen]);

  const dayNames = language === 'ar'
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const calcNextRun = () => {
    const now = new Date();
    const next = new Date();
    const [h, m] = preferredTime.split(':').map(Number);
    next.setHours(h, m, 0, 0);

    if (frequency === 'daily') {
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly' || frequency === 'biweekly') {
      const dow = parseInt(dayOfWeek);
      const diff = (dow - next.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + diff);
      if (frequency === 'biweekly') next.setDate(next.getDate() + 7);
    } else if (frequency === 'monthly') {
      const dom = parseInt(dayOfMonth);
      next.setDate(dom);
      if (next <= now) next.setMonth(next.getMonth() + 1);
    }
    return next.toISOString();
  };

  const handleSubmit = async () => {
    if (!user || !name) return;
    setSubmitting(true);

    const { error } = await supabase.from('backup_schedules').insert({
      name,
      scope,
      organization_id: scope === 'organization' ? orgId : null,
      includes_database: true,
      includes_storage: includesStorage,
      frequency,
      day_of_week: (frequency === 'weekly' || frequency === 'biweekly') ? parseInt(dayOfWeek) : null,
      day_of_month: frequency === 'monthly' ? parseInt(dayOfMonth) : null,
      preferred_time: preferredTime,
      retention_days: parseInt(retentionDays),
      max_backups: parseInt(maxBackups),
      next_run_at: calcNextRun(),
      created_by: user.id,
    } as any);

    setSubmitting(false);
    if (error) {
      toast({ title: language === 'ar' ? 'فشل إنشاء الجدولة' : 'Failed to create schedule', variant: 'destructive' });
    } else {
      toast({ title: language === 'ar' ? 'تم إنشاء جدولة النسخ الاحتياطي' : 'Backup schedule created' });
      onCreated();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar size={20} />
            {language === 'ar' ? 'جدولة نسخ احتياطي' : 'Schedule Backup'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{language === 'ar' ? 'اسم الجدولة' : 'Schedule Name'} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{language === 'ar' ? 'النطاق' : 'Scope'}</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{language === 'ar' ? 'النظام بالكامل' : 'Entire System'}</SelectItem>
                <SelectItem value="organization">{language === 'ar' ? 'مؤسسة واحدة' : 'Single Organization'}</SelectItem>
              </SelectContent>
            </Select>
            {scope === 'organization' && (
              <Select value={orgId || ''} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المؤسسة' : 'Select organization'} /></SelectTrigger>
                <SelectContent>
                  {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{language === 'ar' ? 'التكرار' : 'Frequency'} *</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{language === 'ar' ? 'يومياً' : 'Daily'}</SelectItem>
                  <SelectItem value="weekly">{language === 'ar' ? 'أسبوعياً' : 'Weekly'}</SelectItem>
                  <SelectItem value="biweekly">{language === 'ar' ? 'كل أسبوعين' : 'Every 2 Weeks'}</SelectItem>
                  <SelectItem value="monthly">{language === 'ar' ? 'شهرياً' : 'Monthly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{language === 'ar' ? 'الوقت المفضل' : 'Preferred Time'}</Label>
              <Input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} />
            </div>
          </div>

          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <div className="space-y-1.5">
              <Label>{language === 'ar' ? 'يوم الأسبوع' : 'Day of Week'}</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dayNames.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === 'monthly' && (
            <div className="space-y-1.5">
              <Label>{language === 'ar' ? 'يوم الشهر' : 'Day of Month'}</Label>
              <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox checked={includesStorage} onCheckedChange={v => setIncludesStorage(!!v)} id="sched-storage" />
            <label htmlFor="sched-storage" className="text-body-md">{language === 'ar' ? 'تضمين ملفات التخزين' : 'Include Storage Files'}</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{language === 'ar' ? 'مدة الاحتفاظ (أيام)' : 'Retention (days)'}</Label>
              <Select value={retentionDays} onValueChange={setRetentionDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['7', '14', '30', '60', '90'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{language === 'ar' ? 'الحد الأقصى للنسخ' : 'Max Backups'}</Label>
              <Input type="number" value={maxBackups} onChange={e => setMaxBackups(e.target.value)} min={1} max={100} />
              <p className="text-body-sm text-muted-foreground">
                {language === 'ar' ? 'تُحذف أقدم النسخ تلقائياً' : 'Oldest auto-deleted when limit reached'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {submitting && <Loader2 size={16} className="animate-spin me-2" />}
            {language === 'ar' ? 'إنشاء الجدولة' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
