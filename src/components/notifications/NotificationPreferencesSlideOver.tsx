import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SlideOver } from '@/components/ui/SlideOver';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  {
    group: 'Tasks',
    groupAr: 'المهام',
    types: ['task_assigned', 'task_due_today', 'task_due_tomorrow', 'task_overdue', 'task_completed', 'task_comment', 'task_mentioned'],
  },
  {
    group: 'Cases',
    groupAr: 'القضايا',
    types: ['case_assigned', 'case_status_changed', 'case_hearing_tomorrow', 'case_hearing_today', 'case_note_added', 'case_mentioned', 'case_deadline_approaching'],
  },
  {
    group: 'Errands',
    groupAr: 'المعاملات',
    types: ['errand_assigned', 'errand_status_changed', 'errand_step_completed', 'errand_overdue', 'errand_mentioned'],
  },
  {
    group: 'Billing',
    groupAr: 'الفوترة',
    types: ['invoice_created', 'invoice_overdue', 'payment_received'],
  },
  {
    group: 'Documents',
    groupAr: 'المستندات',
    types: ['document_shared', 'document_uploaded'],
  },
  {
    group: 'Calendar',
    groupAr: 'التقويم',
    types: ['event_reminder', 'event_invitation'],
  },
  {
    group: 'Mentions',
    groupAr: 'الإشارات',
    types: ['mention'],
  },
];

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  task_assigned: { en: 'Task Assigned', ar: 'تم إسناد مهمة' },
  task_due_today: { en: 'Task Due Today', ar: 'مهمة مستحقة اليوم' },
  task_due_tomorrow: { en: 'Task Due Tomorrow', ar: 'مهمة مستحقة غداً' },
  task_overdue: { en: 'Task Overdue', ar: 'مهمة متأخرة' },
  task_completed: { en: 'Task Completed', ar: 'تم إكمال مهمة' },
  task_comment: { en: 'Task Comment', ar: 'تعليق على مهمة' },
  task_mentioned: { en: 'Mentioned in Task', ar: 'تم ذكرك في مهمة' },
  case_assigned: { en: 'Case Assigned', ar: 'تم تعيينك في قضية' },
  case_status_changed: { en: 'Case Status Changed', ar: 'تغيرت حالة القضية' },
  case_hearing_tomorrow: { en: 'Hearing Tomorrow', ar: 'جلسة غداً' },
  case_hearing_today: { en: 'Hearing Today', ar: 'جلسة اليوم' },
  case_note_added: { en: 'Case Note Added', ar: 'ملاحظة قضية جديدة' },
  case_mentioned: { en: 'Mentioned in Case', ar: 'تم ذكرك في قضية' },
  case_deadline_approaching: { en: 'Deadline Approaching', ar: 'اقتراب موعد نهائي' },
  errand_assigned: { en: 'Errand Assigned', ar: 'تم إسناد معاملة' },
  errand_status_changed: { en: 'Errand Status Changed', ar: 'تغيرت حالة المعاملة' },
  errand_step_completed: { en: 'Step Completed', ar: 'تم إكمال خطوة' },
  errand_overdue: { en: 'Errand Overdue', ar: 'معاملة متأخرة' },
  errand_mentioned: { en: 'Mentioned in Errand', ar: 'تم ذكرك في معاملة' },
  invoice_created: { en: 'Invoice Created', ar: 'تم إنشاء فاتورة' },
  invoice_overdue: { en: 'Invoice Overdue', ar: 'فاتورة متأخرة' },
  payment_received: { en: 'Payment Received', ar: 'تم استلام دفعة' },
  document_shared: { en: 'Document Shared', ar: 'تم مشاركة مستند' },
  document_uploaded: { en: 'Document Uploaded', ar: 'تم رفع مستند' },
  event_reminder: { en: 'Event Reminder', ar: 'تذكير بحدث' },
  event_invitation: { en: 'Event Invitation', ar: 'دعوة لحدث' },
  mention: { en: 'You were mentioned', ar: 'تم ذكرك' },
};

export default function NotificationPreferencesSlideOver({ open, onClose }: Props) {
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const [prefs, setPrefs] = useState<Record<string, any>>({});
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open || !profile?.id) return;
    setLoading(true);
    supabase.from('notification_preferences').select('*').eq('user_id', profile.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs(data.preferences as Record<string, any> || {});
          setEmailEnabled(data.email_enabled ?? true);
          setWhatsappEnabled(data.whatsapp_enabled ?? false);
          setQuietHoursEnabled(data.quiet_hours_enabled ?? false);
          setQuietStart(data.quiet_hours_start || '22:00');
          setQuietEnd(data.quiet_hours_end || '07:00');
        }
        setLoading(false);
      });
  }, [open, profile?.id]);

  const save = useCallback((newPrefs: Record<string, any>, extras?: Record<string, any>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!profile?.id) return;
      await supabase.from('notification_preferences').update({
        preferences: newPrefs,
        email_enabled: extras?.emailEnabled ?? emailEnabled,
        whatsapp_enabled: extras?.whatsappEnabled ?? whatsappEnabled,
        quiet_hours_enabled: extras?.quietHoursEnabled ?? quietHoursEnabled,
        quiet_hours_start: extras?.quietStart ?? quietStart,
        quiet_hours_end: extras?.quietEnd ?? quietEnd,
        ...extras,
      } as any).eq('user_id', profile.id);
      toast({ title: language === 'ar' ? 'تم الحفظ' : 'Saved', duration: 1500 });
    }, 500);
  }, [profile?.id, emailEnabled, whatsappEnabled, quietHoursEnabled, quietStart, quietEnd, language]);

  const togglePref = (type: string, channel: 'in_app' | 'email' | 'whatsapp') => {
    const updated = { ...prefs };
    if (!updated[type]) updated[type] = { in_app: true, email: false, whatsapp: false };
    updated[type] = { ...updated[type], [channel]: !updated[type][channel] };
    setPrefs(updated);
    save(updated);
  };

  const getPref = (type: string, channel: 'in_app' | 'email' | 'whatsapp'): boolean => {
    return prefs[type]?.[channel] ?? (channel === 'in_app');
  };

  const resetDefaults = async () => {
    if (!profile?.id) return;
    const defaultPrefs: Record<string, any> = {};
    CATEGORIES.forEach(cat => cat.types.forEach(type => {
      defaultPrefs[type] = { in_app: true, email: false, whatsapp: false };
    }));
    setPrefs(defaultPrefs);
    setEmailEnabled(true);
    setWhatsappEnabled(false);
    setQuietHoursEnabled(false);
    setQuietStart('22:00');
    setQuietEnd('07:00');
    save(defaultPrefs, { email_enabled: true, whatsapp_enabled: false, quiet_hours_enabled: false, quiet_hours_start: '22:00', quiet_hours_end: '07:00' });
  };

  return (
    <SlideOver isOpen={open} onClose={onClose} title={t('notifications.preferences')} titleAr={language === 'ar' ? 'تفضيلات الإشعارات' : 'Notification Preferences'} width="lg">
      {loading ? (
        <div className="p-6 text-center text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Global toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-md font-medium">{t('notifications.settings.emailEnabled')}</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={v => { setEmailEnabled(v); save(prefs, { email_enabled: v }); }} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-md font-medium">{t('notifications.settings.whatsappEnabled')}</p>
              </div>
              <Switch checked={whatsappEnabled} onCheckedChange={v => { setWhatsappEnabled(v); save(prefs, { whatsapp_enabled: v }); }} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-md font-medium">{t('notifications.settings.quietHours')}</p>
                  <p className="text-body-sm text-muted-foreground">{t('notifications.settings.quietHoursDesc')}</p>
                </div>
                <Switch checked={quietHoursEnabled} onCheckedChange={v => { setQuietHoursEnabled(v); save(prefs, { quiet_hours_enabled: v }); }} />
              </div>
              {quietHoursEnabled && (
                <div className="flex gap-3 items-center ps-4">
                  <span className="text-body-sm text-muted-foreground">{t('notifications.settings.from')}</span>
                  <Input type="time" value={quietStart} onChange={e => { setQuietStart(e.target.value); save(prefs, { quiet_hours_start: e.target.value }); }} className="w-28" />
                  <span className="text-body-sm text-muted-foreground">{t('notifications.settings.to')}</span>
                  <Input type="time" value={quietEnd} onChange={e => { setQuietEnd(e.target.value); save(prefs, { quiet_hours_end: e.target.value }); }} className="w-28" />
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Per-category */}
          <div className="space-y-6">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 text-[11px] font-semibold text-muted-foreground uppercase">
              <span />
              <span className="text-center">{t('notifications.channels.inApp')}</span>
              <span className="text-center">{t('notifications.channels.email')}</span>
              <span className="text-center">{t('notifications.channels.whatsapp')}</span>
            </div>

            {CATEGORIES.map(cat => (
              <div key={cat.group}>
                <h4 className="text-heading-sm font-semibold text-foreground border-b pb-2 mb-2">
                  {language === 'ar' ? cat.groupAr : cat.group}
                </h4>
                {cat.types.map(type => (
                  <div key={type} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 py-1.5 items-center">
                    <span className="text-body-sm text-foreground">
                      {language === 'ar' ? TYPE_LABELS[type]?.ar : TYPE_LABELS[type]?.en}
                    </span>
                    <div className="flex justify-center">
                      <Checkbox checked={getPref(type, 'in_app')} onCheckedChange={() => togglePref(type, 'in_app')} />
                    </div>
                    <div className="flex justify-center">
                      <Checkbox checked={getPref(type, 'email')} onCheckedChange={() => togglePref(type, 'email')} disabled={!emailEnabled} />
                    </div>
                    <div className="flex justify-center">
                      <Checkbox checked={getPref(type, 'whatsapp')} onCheckedChange={() => togglePref(type, 'whatsapp')} disabled={!whatsappEnabled} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <button onClick={resetDefaults} className="text-body-sm text-accent hover:underline">
              {language === 'ar' ? 'إعادة التعيين للافتراضي' : 'Reset to defaults'}
            </button>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
