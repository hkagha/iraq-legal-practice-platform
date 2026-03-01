import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Database, Building, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const TABLE_GROUPS = {
  core: ['organizations', 'profiles'],
  crm: ['clients', 'client_contacts', 'client_user_links'],
  cases: ['cases', 'case_hearings', 'case_notes', 'case_team_members', 'case_activities'],
  errands: ['errands', 'errand_steps', 'errand_notes', 'errand_documents', 'errand_activities'],
  documents: ['documents', 'document_templates', 'document_activities'],
  billing: ['time_entries', 'billing_rates', 'invoices', 'invoice_line_items', 'payments'],
  tasks: ['tasks', 'task_comments', 'calendar_events'],
  communication: ['notifications', 'notification_preferences', 'client_messages'],
  system: ['ai_usage_log', 'saved_reports', 'email_queue'],
};

const ALL_TABLES = Object.values(TABLE_GROUPS).flat();

const TABLE_LABELS: Record<string, { en: string; ar: string }> = {
  organizations: { en: 'Organizations', ar: 'المؤسسات' },
  profiles: { en: 'Users', ar: 'المستخدمون' },
  clients: { en: 'Clients', ar: 'العملاء' },
  client_contacts: { en: 'Client Contacts', ar: 'جهات اتصال العملاء' },
  client_user_links: { en: 'Client Links', ar: 'روابط العملاء' },
  cases: { en: 'Cases', ar: 'القضايا' },
  case_hearings: { en: 'Case Hearings', ar: 'جلسات القضايا' },
  case_notes: { en: 'Case Notes', ar: 'ملاحظات القضايا' },
  case_team_members: { en: 'Case Team', ar: 'فرق القضايا' },
  case_activities: { en: 'Case Activities', ar: 'أنشطة القضايا' },
  errands: { en: 'Errands', ar: 'المعاملات' },
  errand_steps: { en: 'Errand Steps', ar: 'خطوات المعاملات' },
  errand_notes: { en: 'Errand Notes', ar: 'ملاحظات المعاملات' },
  errand_documents: { en: 'Errand Docs', ar: 'مستندات المعاملات' },
  errand_activities: { en: 'Errand Activities', ar: 'أنشطة المعاملات' },
  documents: { en: 'Documents', ar: 'المستندات' },
  document_templates: { en: 'Doc Templates', ar: 'قوالب المستندات' },
  document_activities: { en: 'Doc Activities', ar: 'أنشطة المستندات' },
  time_entries: { en: 'Time Entries', ar: 'سجلات الوقت' },
  billing_rates: { en: 'Billing Rates', ar: 'أسعار الفوترة' },
  invoices: { en: 'Invoices', ar: 'الفواتير' },
  invoice_line_items: { en: 'Invoice Items', ar: 'بنود الفواتير' },
  payments: { en: 'Payments', ar: 'المدفوعات' },
  tasks: { en: 'Tasks', ar: 'المهام' },
  task_comments: { en: 'Task Comments', ar: 'تعليقات المهام' },
  calendar_events: { en: 'Calendar Events', ar: 'أحداث التقويم' },
  notifications: { en: 'Notifications', ar: 'الإشعارات' },
  notification_preferences: { en: 'Notification Prefs', ar: 'تفضيلات الإشعارات' },
  client_messages: { en: 'Client Messages', ar: 'رسائل العملاء' },
  ai_usage_log: { en: 'AI Usage', ar: 'استخدام الذكاء الاصطناعي' },
  saved_reports: { en: 'Saved Reports', ar: 'التقارير المحفوظة' },
  email_queue: { en: 'Email Queue', ar: 'قائمة البريد' },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, scope: string, orgId: string | null, includesStorage: boolean, tables: string[] | null, expiryDays: number) => void;
}

export default function CreateBackupModal({ isOpen, onClose, onSubmit }: Props) {
  const { language } = useLanguage();
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState(`Full System Backup - ${today}`);
  const [scope, setScope] = useState<'system' | 'organization'>('system');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [includesStorage, setIncludesStorage] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([...ALL_TABLES]);
  const [expiryDays, setExpiryDays] = useState('30');
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      supabase.from('organizations').select('id, name').order('name').then(({ data }) => {
        setOrgs((data || []) as { id: string; name: string }[]);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (scope === 'system') {
      setName(`Full System Backup - ${today}`);
      setOrgId(null);
    }
  }, [scope, today]);

  const toggleTable = (t: string) => {
    setSelectedTables(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const allSelected = selectedTables.length === ALL_TABLES.length;

  const handleSubmit = async () => {
    setSubmitting(true);
    const tables = allSelected ? null : selectedTables;
    await onSubmit(name, scope, orgId, includesStorage, tables, parseInt(expiryDays));
    setSubmitting(false);
  };

  const GROUP_LABELS: Record<string, { en: string; ar: string }> = {
    core: { en: 'Core', ar: 'أساسي' },
    crm: { en: 'CRM', ar: 'العملاء' },
    cases: { en: 'Cases', ar: 'القضايا' },
    errands: { en: 'Errands', ar: 'المعاملات' },
    documents: { en: 'Documents', ar: 'المستندات' },
    billing: { en: 'Billing', ar: 'الفوترة' },
    tasks: { en: 'Tasks & Calendar', ar: 'المهام والتقويم' },
    communication: { en: 'Communication', ar: 'التواصل' },
    system: { en: 'System', ar: 'النظام' },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database size={20} />
            {language === 'ar' ? 'إنشاء نسخة احتياطية' : 'Create Backup'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{language === 'ar' ? 'اسم النسخة الاحتياطية' : 'Backup Name'} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'النطاق' : 'Scope'} *</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'system' as const, icon: Database, label: language === 'ar' ? 'النظام بالكامل' : 'Entire System', desc: language === 'ar' ? 'نسخ جميع المؤسسات والبيانات' : 'Back up all organizations' },
                { val: 'organization' as const, icon: Building, label: language === 'ar' ? 'مؤسسة واحدة' : 'Single Organization', desc: language === 'ar' ? 'نسخ بيانات مؤسسة محددة' : 'Back up one organization' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setScope(opt.val)}
                  className={`p-4 rounded-lg border-2 text-start transition-colors ${scope === opt.val ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
                >
                  <opt.icon size={20} className="text-accent mb-2" />
                  <p className="text-body-md font-medium text-foreground">{opt.label}</p>
                  <p className="text-body-sm text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
            {scope === 'organization' && (
              <Select value={orgId || ''} onValueChange={v => { setOrgId(v); const org = orgs.find(o => o.id === v); if (org) setName(`Org Backup: ${org.name} - ${today}`); }}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المؤسسة' : 'Select organization'} /></SelectTrigger>
                <SelectContent>
                  {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Includes */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ماذا يتضمن' : 'What to Include'}</Label>
            <div className="flex items-center gap-2">
              <Checkbox checked disabled id="db" />
              <label htmlFor="db" className="text-body-md">{language === 'ar' ? 'سجلات قاعدة البيانات' : 'Database Records'}</label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={includesStorage} onCheckedChange={v => setIncludesStorage(!!v)} id="storage" />
              <div>
                <label htmlFor="storage" className="text-body-md">{language === 'ar' ? 'ملفات التخزين' : 'Storage Files'}</label>
                <p className="text-body-sm text-muted-foreground">
                  {language === 'ar' ? 'تصدير ملفات التخزين ينشئ قائمة بجميع الملفات' : 'Creates a manifest of all storage files'}
                </p>
              </div>
            </div>
          </div>

          {/* Advanced: Select Tables */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-body-md text-accent hover:underline">
              <ChevronDown size={16} className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              {language === 'ar' ? 'متقدم: اختر الجداول' : 'Advanced: Select Tables'}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedTables(allSelected ? [] : [...ALL_TABLES])}>
                {allSelected ? (language === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect All') : (language === 'ar' ? 'تحديد الكل' : 'Select All')}
              </Button>
              {Object.entries(TABLE_GROUPS).map(([group, tables]) => (
                <div key={group}>
                  <p className="text-body-sm font-medium text-muted-foreground mb-1">{GROUP_LABELS[group]?.[language === 'ar' ? 'ar' : 'en'] || group}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {tables.map(t => (
                      <div key={t} className="flex items-center gap-2">
                        <Checkbox checked={selectedTables.includes(t)} onCheckedChange={() => toggleTable(t)} id={t} />
                        <label htmlFor={t} className="text-body-sm">{TABLE_LABELS[t]?.[language === 'ar' ? 'ar' : 'en'] || t}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Expiry */}
          <div className="space-y-1.5">
            <Label>{language === 'ar' ? 'الاحتفاظ بالنسخة لمدة' : 'Keep backup for'}</Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{language === 'ar' ? '30 يوم' : '30 days'}</SelectItem>
                <SelectItem value="60">{language === 'ar' ? '60 يوم' : '60 days'}</SelectItem>
                <SelectItem value="90">{language === 'ar' ? '90 يوم' : '90 days'}</SelectItem>
                <SelectItem value="365">{language === 'ar' ? 'سنة واحدة' : '1 year'}</SelectItem>
                <SelectItem value="36500">{language === 'ar' ? 'بدون انتهاء' : 'Never'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {submitting && <Loader2 size={16} className="animate-spin me-2" />}
            {language === 'ar' ? 'بدء النسخ الاحتياطي' : 'Start Backup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
