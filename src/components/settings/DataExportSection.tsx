import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Users, Scale, FileCheck, Clock, Receipt, Database, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function downloadCSV(data: any[], filename: string) {
  if (!data.length) {
    toast({ title: 'No data to export', variant: 'destructive' });
    return;
  }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const ALL_TABLES = [
  'persons', 'entities', 'entity_representatives',
  'cases', 'case_parties', 'case_team_members', 'case_hearings', 'case_notes', 'case_activities',
  'errands', 'errand_team_members', 'errand_steps', 'errand_notes', 'errand_activities',
  'documents', 'document_comments', 'document_activities',
  'time_entries', 'billing_rates', 'invoices', 'invoice_line_items', 'payments',
  'trust_accounts', 'trust_transactions',
  'tasks', 'task_comments', 'calendar_events', 'portal_user_links', 'client_messages',
  'conflict_checks', 'ai_usage_log',
];

export default function DataExportSection() {
  const { organization, user } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);

  useEffect(() => {
    if (organization?.id) {
      supabase
        .from('system_backups')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => setBackups(data || []));
    }
  }, [organization?.id]);

  const auditExport = async (details: Record<string, any>) => {
    if (!organization?.id || !user?.id) return;
    await supabase.from('firm_audit_log' as any).insert({
      organization_id: organization.id,
      actor_id: user.id,
      event_type: 'export',
      target_table: details.table_name || 'system_backups',
      target_id: details.backup_id || null,
      target_name: details.filename || details.backup_name || null,
      details,
    });
  };

  const exportTable = async (table: string, filename: string) => {
    if (!organization?.id) return;
    setLoading(table);
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('organization_id', organization.id)
        .limit(10000);
      if (error) throw error;
      downloadCSV(data || [], filename);
      await auditExport({ table_name: table, filename, format: 'csv', row_count: (data || []).length });
      toast({ title: language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully' });
    } catch {
      toast({ title: language === 'ar' ? 'فشل التصدير' : 'Export failed', variant: 'destructive' });
    }
    setLoading(null);
  };

  const createFullBackup = async () => {
    if (!organization?.id || !user) return;
    setBackupLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const backupName = `${organization.id} Backup - ${new Date().toISOString().split('T')[0]}`;

      const { data: backup, error: insertErr } = await supabase
        .from('system_backups')
        .insert({
          backup_name: backupName,
          backup_type: 'manual',
          scope: 'organization',
          organization_id: organization.id,
          includes_database: true,
          includes_storage: false,
          status: 'in_progress',
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (insertErr || !backup) throw insertErr;

      const results: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};

      for (const t of ALL_TABLES) {
        const { data, error } = await supabase.from(t as any).select('*').eq('organization_id', organization.id).limit(10000);
        if (!error && data) { results[t] = data; recordCounts[t] = data.length; }
      }

      const jsonStr = JSON.stringify({
        backup_meta: { id: (backup as any).id, name: backupName, scope: 'organization', created_at: new Date().toISOString() },
        data: results,
        record_counts: recordCounts,
      });

      const filePath = `backups/${(backup as any).id}/backup-${Date.now()}.json`;
      await supabase.storage.from('system-backups').upload(filePath, new Blob([jsonStr], { type: 'application/json' }));

      await supabase.from('system_backups').update({
        status: 'completed', completed_at: new Date().toISOString(),
        data_file_path: filePath, data_size_bytes: jsonStr.length, record_counts: recordCounts,
      } as any).eq('id', (backup as any).id);

      await auditExport({
        backup_id: (backup as any).id,
        backup_name: backupName,
        format: 'json',
        includes_database: true,
        includes_storage: false,
        record_counts: recordCounts,
      });

      toast({ title: language === 'ar' ? 'اكتمل النسخ الاحتياطي!' : 'Backup completed!' });
      // Refresh
      const { data: refreshed } = await supabase.from('system_backups').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(10);
      setBackups(refreshed || []);
    } catch {
      toast({ title: language === 'ar' ? 'فشل النسخ الاحتياطي' : 'Backup failed', variant: 'destructive' });
    }
    setBackupLoading(false);
  };

  const handleDownload = async (b: any) => {
    if (!b.data_file_path) return;
    const { data } = await supabase.storage.from('system-backups').createSignedUrl(b.data_file_path, 3600);
    if (data?.signedUrl) {
      await auditExport({
        backup_id: b.id,
        backup_name: b.backup_name,
        format: 'json',
        action: 'download_backup',
      });
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `qanuni-backup-${new Date(b.created_at).toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  const exports = [
    { key: 'persons', icon: Users, label: language === 'ar' ? 'تصدير الأشخاص (CSV)' : 'Export Persons (CSV)', file: 'persons.csv' },
    { key: 'entities', icon: Users, label: language === 'ar' ? 'تصدير الشركات والجهات (CSV)' : 'Export Entities (CSV)', file: 'entities.csv' },
    { key: 'cases', icon: Scale, label: language === 'ar' ? 'تصدير القضايا (CSV)' : 'Export Cases (CSV)', file: 'cases.csv' },
    { key: 'errands', icon: FileCheck, label: language === 'ar' ? 'تصدير المعاملات (CSV)' : 'Export Errands (CSV)', file: 'errands.csv' },
    { key: 'time_entries', icon: Clock, label: language === 'ar' ? 'تصدير سجلات الوقت (CSV)' : 'Export Time Entries (CSV)', file: 'time_entries.csv' },
    { key: 'invoices', icon: Receipt, label: language === 'ar' ? 'تصدير الفواتير (CSV)' : 'Export Invoices (CSV)', file: 'invoices.csv' },
  ];

  return (
    <div className="space-y-8">
      {/* Quick CSV Export */}
      <div>
        <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'تصدير سريع' : 'Quick Export'}</h2>
        <p className="text-body-md text-muted-foreground mt-1">
          {language === 'ar' ? 'حمّل بيانات محددة بتنسيق CSV' : 'Download specific data as CSV files'}
        </p>
        <div className="space-y-3 mt-4">
          {exports.map(exp => {
            const Icon = exp.icon;
            return (
              <Button
                key={exp.key}
                variant="outline"
                className="w-full justify-start h-12 text-body-md"
                disabled={loading !== null}
                onClick={() => exportTable(exp.key, exp.file)}
              >
                <Icon size={16} className="me-2.5 text-muted-foreground" />
                {exp.label}
                <Download size={14} className="ms-auto text-muted-foreground" />
                {loading === exp.key && <span className="ms-2 text-body-sm text-muted-foreground">{language === 'ar' ? 'جاري...' : 'Exporting...'}</span>}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Full Backup */}
      <div>
        <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'نسخة احتياطية كاملة' : 'Full Backup'}</h2>
        <p className="text-body-md text-muted-foreground mt-1">
          {language === 'ar' ? 'أنشئ نسخة احتياطية شاملة لجميع بيانات مؤسستك' : 'Create a comprehensive backup of all your organization data'}
        </p>
        <Button
          className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={createFullBackup}
          disabled={backupLoading}
        >
          {backupLoading ? <Loader2 size={16} className="animate-spin me-2" /> : <Database size={16} className="me-2" />}
          {backupLoading
            ? (language === 'ar' ? 'جاري النسخ...' : 'Creating backup...')
            : (language === 'ar' ? 'إنشاء نسخة احتياطية كاملة' : 'Create Full Backup')}
        </Button>
      </div>

      {/* Backup History */}
      {backups.length > 0 && (
        <div>
          <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'سجل النسخ الاحتياطية' : 'Backup History'}</h2>
          <div className="border rounded-lg mt-3 overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium text-muted-foreground">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{language === 'ar' ? 'الحجم' : 'Size'}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="text-start p-3 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b: any) => (
                  <tr key={b.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-medium text-foreground max-w-[180px] truncate">{b.backup_name}</td>
                    <td className="p-3 text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</td>
                    <td className="p-3">{b.status === 'completed' ? formatBytes(b.data_size_bytes || 0) : '—'}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-body-sm ${
                        b.status === 'completed' ? 'bg-success/10 text-success' :
                        b.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                        'bg-info/10 text-info'
                      }`}>
                        {b.status === 'completed' ? (language === 'ar' ? 'مكتمل' : 'Completed') :
                         b.status === 'failed' ? (language === 'ar' ? 'فشل' : 'Failed') :
                         (language === 'ar' ? 'قيد التنفيذ' : 'In Progress')}
                      </span>
                    </td>
                    <td className="p-3">
                      {b.status === 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(b)}>
                          <Download size={14} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
