import { useLanguage } from '@/contexts/LanguageContext';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/button';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const TABLE_LABELS: Record<string, { en: string; ar: string }> = {
  organizations: { en: 'Organizations', ar: 'المؤسسات' },
  profiles: { en: 'Users', ar: 'المستخدمون' },
  persons: { en: 'Persons', ar: 'الأشخاص' },
  entities: { en: 'Companies', ar: 'الشركات' },
  entity_representatives: { en: 'Company Representatives', ar: 'ممثلو الشركات' },
  case_parties: { en: 'Case Parties', ar: 'أطراف القضايا' },
  portal_users: { en: 'Portal Users', ar: 'مستخدمو البوابة' },
  portal_user_links: { en: 'Portal Links', ar: 'روابط البوابة' },
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface BackupRow {
  id: string;
  backup_name: string;
  backup_type: string;
  scope: string;
  includes_storage: boolean;
  data_size_bytes: number;
  record_counts: Record<string, number>;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  data_file_path: string | null;
}

interface Props {
  backup: BackupRow;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (b: BackupRow) => void;
  onDelete: (b: BackupRow) => void;
}

export default function BackupDetailSlideOver({ backup, isOpen, onClose, onDownload, onDelete }: Props) {
  const { language } = useLanguage();
  const b = backup;
  const counts = b.record_counts || {};
  const total = Object.values(counts).reduce((a: number, v: number) => a + v, 0);

  const duration = b.completed_at && b.started_at
    ? Math.round((new Date(b.completed_at).getTime() - new Date(b.started_at).getTime()) / 1000)
    : null;

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Backup Details"
      titleAr="تفاصيل النسخة الاحتياطية"
      width="lg"
      footer={
        <>
          {b.status === 'completed' && (
            <Button onClick={() => onDownload(b)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Download size={16} className="me-2" />
              {language === 'ar' ? 'تحميل النسخة' : 'Download Backup'}
            </Button>
          )}
          <Button variant="outline" onClick={() => { onDelete(b); onClose(); }} className="text-destructive">
            <Trash2 size={16} className="me-2" />
            {language === 'ar' ? 'حذف' : 'Delete'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-heading-lg text-foreground">{b.backup_name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-body-sm ${
              b.status === 'completed' ? 'bg-success/10 text-success' :
              b.status === 'failed' ? 'bg-destructive/10 text-destructive' :
              b.status === 'in_progress' ? 'bg-info/10 text-info' :
              'bg-muted text-muted-foreground'
            }`}>
              {b.status === 'completed' ? (language === 'ar' ? 'مكتمل' : 'Completed') :
               b.status === 'failed' ? (language === 'ar' ? 'فشل' : 'Failed') :
               b.status === 'in_progress' ? (language === 'ar' ? 'قيد التنفيذ' : 'In Progress') :
               b.status}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded text-body-sm ${b.scope === 'system' ? 'bg-info/10 text-info' : 'bg-accent/10 text-accent'}`}>
              {b.scope === 'system' ? (language === 'ar' ? 'النظام' : 'System') : (language === 'ar' ? 'مؤسسة' : 'Organization')}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-2 text-body-md">
          <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'النوع' : 'Type'}</span><span className="text-foreground capitalize">{b.backup_type}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'بدأت' : 'Started'}</span><span className="text-foreground">{format(new Date(b.started_at), 'PPp')}</span></div>
          {b.completed_at && <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'اكتملت' : 'Completed'}</span><span className="text-foreground">{format(new Date(b.completed_at), 'PPp')}</span></div>}
          {duration !== null && <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'المدة' : 'Duration'}</span><span className="text-foreground">{duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'الحجم' : 'Size'}</span><span className="text-foreground">{formatBytes(b.data_size_bytes)}</span></div>
          {b.expires_at && <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'تنتهي' : 'Expires'}</span><span className="text-foreground">{formatDistanceToNow(new Date(b.expires_at), { addSuffix: true })}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">{language === 'ar' ? 'ملفات التخزين' : 'Storage Files'}</span><span className="text-foreground">{b.includes_storage ? (language === 'ar' ? 'نعم' : 'Yes') : (language === 'ar' ? 'لا' : 'No')}</span></div>
        </div>

        {/* Error */}
        {b.error_message && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
            <p className="text-body-sm text-destructive">{b.error_message}</p>
          </div>
        )}

        {/* Record Counts */}
        {Object.keys(counts).length > 0 && (
          <div>
            <h4 className="text-heading-sm text-foreground mb-3">{language === 'ar' ? 'عدد السجلات' : 'Record Counts'}</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-body-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-start p-2 font-medium text-muted-foreground">{language === 'ar' ? 'الجدول' : 'Table'}</th>
                    <th className="text-end p-2 font-medium text-muted-foreground">{language === 'ar' ? 'السجلات' : 'Records'}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(counts)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([table, count]) => (
                    <tr key={table} className="border-t">
                      <td className="p-2 text-foreground">{TABLE_LABELS[table]?.[language === 'ar' ? 'ar' : 'en'] || table}</td>
                      <td className="p-2 text-end text-foreground">{(count as number).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-medium bg-muted/30">
                    <td className="p-2 text-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</td>
                    <td className="p-2 text-end text-foreground">{total.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Restore Warning */}
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
          <p className="text-body-sm text-warning font-medium mb-1">{language === 'ar' ? 'استعادة النسخة الاحتياطية' : 'Restore from Backup'}</p>
          <p className="text-body-sm text-muted-foreground">
            {language === 'ar'
              ? 'الاستعادة التلقائية غير متاحة في هذا الإصدار. تواصل مع فريق الدعم للاستعادة الموجهة.'
              : 'Automated restore is not available in this version. Contact support for guided restoration.'}
          </p>
        </div>
      </div>
    </SlideOver>
  );
}
