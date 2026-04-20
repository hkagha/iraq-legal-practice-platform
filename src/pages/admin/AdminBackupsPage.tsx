import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/progress';
import { SlideOver } from '@/components/ui/SlideOver';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import CreateBackupModal from '@/components/admin/CreateBackupModal';
import ScheduleBackupModal from '@/components/admin/ScheduleBackupModal';
import BackupDetailSlideOver from '@/components/admin/BackupDetailSlideOver';
import { HelpButton } from '@/components/ui/HelpButton';
import {
  Database, Calendar, Clock, HardDrive, Plus, Download, Eye, Trash2,
  RotateCcw, MoreHorizontal, Play, Pause, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface BackupRow {
  id: string;
  backup_name: string;
  backup_type: string;
  scope: string;
  organization_id: string | null;
  includes_database: boolean;
  includes_storage: boolean;
  tables_included: string[] | null;
  data_file_path: string | null;
  data_size_bytes: number;
  record_counts: Record<string, number>;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

interface ScheduleRow {
  id: string;
  name: string;
  scope: string;
  organization_id: string | null;
  includes_database: boolean;
  includes_storage: boolean;
  tables_included: string[] | null;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_time: string;
  timezone: string;
  retention_days: number;
  max_backups: number;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  next_run_at: string | null;
  created_by: string;
  created_at: string;
}

const ALL_TABLES = [
  'organizations', 'profiles', 'clients', 'client_contacts', 'client_user_links',
  'cases', 'case_hearings', 'case_notes', 'case_team_members', 'case_activities',
  'errands', 'errand_steps', 'errand_notes', 'errand_documents', 'errand_activities',
  'documents', 'document_templates', 'document_activities',
  'time_entries', 'billing_rates', 'invoices', 'invoice_line_items', 'payments',
  'tasks', 'task_comments', 'calendar_events',
  'notifications', 'notification_preferences', 'client_messages',
  'ai_usage_log', 'saved_reports', 'email_queue',
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function totalRecords(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

export default function AdminBackupsPage() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();

  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    const [bRes, sRes] = await Promise.all([
      supabase.from('system_backups').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('backup_schedules').select('*').order('created_at', { ascending: false }),
    ]);
    setBackups((bRes.data || []) as unknown as BackupRow[]);
    setSchedules((sRes.data || []) as unknown as ScheduleRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const executeBackup = async (
    name: string, scope: string, orgId: string | null,
    includesStorage: boolean, tables: string[] | null, expiryDays: number
  ) => {
    if (!user) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const { data: backup, error: insertError } = await supabase
      .from('system_backups')
      .insert({
        backup_name: name,
        backup_type: 'manual',
        scope,
        organization_id: orgId,
        includes_database: true,
        includes_storage: includesStorage,
        tables_included: tables,
        status: 'in_progress',
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      } as any)
      .select()
      .single();

    if (insertError || !backup) {
      toast({ title: language === 'ar' ? 'فشل إنشاء النسخة' : 'Failed to create backup', variant: 'destructive' });
      return;
    }

    toast({ title: language === 'ar' ? 'بدأ النسخ الاحتياطي. قد يستغرق بضع دقائق.' : 'Backup started. This may take a few minutes.' });
    setShowCreateModal(false);
    fetchData();

    // Execute backup in background
    try {
      const results: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};
      const tablesToBackup = tables || ALL_TABLES;

      for (const tableName of tablesToBackup) {
        let query = supabase.from(tableName as any).select('*');
        if (scope === 'organization' && orgId) {
          query = query.eq('organization_id', orgId);
        }
        const { data, error } = await query.limit(10000);
        if (!error && data) {
          results[tableName] = data;
          recordCounts[tableName] = data.length;
        }
      }

      const backupData = {
        backup_meta: {
          id: (backup as any).id,
          name,
          scope,
          created_at: new Date().toISOString(),
          platform_version: '1.0.0',
          tables_count: Object.keys(results).length,
          total_records: totalRecords(recordCounts),
        },
        data: results,
        record_counts: recordCounts,
      };

      const jsonStr = JSON.stringify(backupData);
      const filePath = `backups/${(backup as any).id}/backup-${Date.now()}.json`;
      const blob = new Blob([jsonStr], { type: 'application/json' });

      const { error: uploadError } = await supabase.storage
        .from('system-backups')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      await supabase
        .from('system_backups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          data_file_path: filePath,
          data_size_bytes: jsonStr.length,
          record_counts: recordCounts,
        } as any)
        .eq('id', (backup as any).id);

      toast({ title: language === 'ar' ? 'اكتمل النسخ الاحتياطي بنجاح!' : 'Backup completed successfully!' });
    } catch (err) {
      await supabase
        .from('system_backups')
        .update({ status: 'failed', error_message: String(err) } as any)
        .eq('id', (backup as any).id);
      toast({ title: language === 'ar' ? 'فشل النسخ الاحتياطي' : 'Backup failed', variant: 'destructive' });
    }
    fetchData();
  };

  const handleDownload = async (backup: BackupRow) => {
    if (!backup.data_file_path) return;
    const { data } = await supabase.storage.from('system-backups').createSignedUrl(backup.data_file_path, 3600);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `qanuni-backup-${backup.scope}-${new Date(backup.created_at).toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    if (deleteTarget.data_file_path) {
      await supabase.storage.from('system-backups').remove([deleteTarget.data_file_path]);
    }
    await supabase.from('system_backups').update({ status: 'deleted' } as any).eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    fetchData();
    toast({ title: language === 'ar' ? 'تم حذف النسخة' : 'Backup deleted' });
  };

  const toggleSchedule = async (schedule: ScheduleRow) => {
    await supabase
      .from('backup_schedules')
      .update({ is_active: !schedule.is_active } as any)
      .eq('id', schedule.id);
    fetchData();
    toast({ title: schedule.is_active
      ? (language === 'ar' ? 'تم إيقاف الجدولة مؤقتاً' : 'Schedule paused')
      : (language === 'ar' ? 'تم استئناف الجدولة' : 'Schedule resumed')
    });
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from('backup_schedules').delete().eq('id', id);
    fetchData();
    toast({ title: language === 'ar' ? 'تم حذف الجدولة' : 'Schedule deleted' });
  };

  const filteredBackups = backups.filter(b => {
    if (b.status === 'deleted') return false;
    if (scopeFilter !== 'all' && b.scope !== scopeFilter) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  const lastCompleted = backups.find(b => b.status === 'completed');
  const completedCount = backups.filter(b => b.status === 'completed').length;
  const expiredCount = backups.filter(b => b.status === 'expired').length;
  const totalSize = backups.filter(b => b.status === 'completed').reduce((s, b) => s + b.data_size_bytes, 0);
  const activeSchedules = schedules.filter(s => s.is_active);
  const nextScheduled = activeSchedules.find(s => s.next_run_at);

  // Backup health
  const lastCompletedAge = lastCompleted ? (Date.now() - new Date(lastCompleted.completed_at!).getTime()) / 86400000 : Infinity;
  const lastFailed = backups[0]?.status === 'failed';
  const healthColor = lastCompletedAge <= 1 && !lastFailed ? 'text-success' : lastCompletedAge <= 7 ? 'text-warning' : 'text-destructive';
  const healthLabel = lastCompletedAge <= 1 && !lastFailed
    ? (language === 'ar' ? 'صحي' : 'Healthy')
    : lastCompletedAge <= 7
    ? (language === 'ar' ? 'يحتاج انتباه' : 'Attention')
    : (language === 'ar' ? 'معرض للخطر' : 'At Risk');

  const statusBadgeMap: Record<string, { variant: string; label: string }> = {
    completed: { variant: 'success', label: language === 'ar' ? 'مكتمل' : 'Completed' },
    in_progress: { variant: 'info', label: language === 'ar' ? 'قيد التنفيذ' : 'In Progress' },
    failed: { variant: 'destructive', label: language === 'ar' ? 'فشل' : 'Failed' },
    expired: { variant: 'secondary', label: language === 'ar' ? 'منتهي' : 'Expired' },
  };

  const dayNames = language === 'ar'
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-heading-xl text-foreground">{language === 'ar' ? 'النسخ الاحتياطي والتصدير' : 'Backup & Export'}</h1>
            <HelpButton helpKey="admin.backups" />
          </div>
          <p className="text-body-md text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة النسخ الاحتياطية والتصدير واستعادة البيانات' : 'Manage system backups, exports, and data recovery'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowScheduleModal(true)}>
            <Calendar className="h-4 w-4 me-2" />
            {language === 'ar' ? 'جدولة نسخ احتياطي' : 'Schedule Backup'}
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 me-2" />
            {language === 'ar' ? 'إنشاء نسخة احتياطية' : 'Create Backup'}
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <Clock size={20} className="text-info mb-2" />
          <p className="text-heading-lg text-foreground">
            {lastCompleted ? formatDistanceToNow(new Date(lastCompleted.completed_at!), { addSuffix: true }) : (language === 'ar' ? 'أبداً' : 'Never')}
          </p>
          <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'آخر نسخة احتياطية' : 'Last Backup'}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <Calendar size={20} className="text-accent mb-2" />
          <p className="text-heading-lg text-foreground">
            {nextScheduled?.next_run_at
              ? new Date(nextScheduled.next_run_at).toLocaleDateString()
              : (language === 'ar' ? 'لا توجد جداول نشطة' : 'No schedules active')}
          </p>
          <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'المجدول التالي' : 'Next Scheduled'}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <Database size={20} className="text-success mb-2" />
          <p className="text-heading-lg text-foreground">{completedCount}</p>
          <p className="text-body-sm text-muted-foreground">
            {language === 'ar' ? `${completedCount} نشطة، ${expiredCount} منتهية` : `${completedCount} active, ${expiredCount} expired`}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <HardDrive size={20} className="text-warning mb-2" />
          <p className="text-heading-lg text-foreground">{formatBytes(totalSize)}</p>
          <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'مساحة النسخ المستخدمة' : 'Backup Storage Used'}</p>
        </div>
      </div>

      {/* Health Indicator */}
      <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
        {lastCompletedAge <= 1 && !lastFailed ? <CheckCircle className="text-success" size={20} /> :
         lastCompletedAge <= 7 ? <AlertTriangle className="text-warning" size={20} /> :
         <XCircle className="text-destructive" size={20} />}
        <span className={`text-body-md font-medium ${healthColor}`}>{healthLabel}</span>
        <span className="text-body-sm text-muted-foreground">
          {lastCompleted
            ? `${language === 'ar' ? 'آخر نسخة ناجحة:' : 'Last successful:'} ${formatDistanceToNow(new Date(lastCompleted.completed_at!), { addSuffix: true })}`
            : (language === 'ar' ? 'لا توجد نسخ احتياطية بعد' : 'No backups yet')}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
          { value: 'system', label: language === 'ar' ? 'النظام' : 'System' },
          { value: 'organization', label: language === 'ar' ? 'مؤسسة' : 'Organization' },
        ].map(f => (
          <Button key={f.value} variant={scopeFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => setScopeFilter(f.value)}>
            {f.label}
          </Button>
        ))}
        <div className="w-px bg-border mx-1" />
        {[
          { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
          { value: 'completed', label: language === 'ar' ? 'مكتمل' : 'Completed' },
          { value: 'in_progress', label: language === 'ar' ? 'قيد التنفيذ' : 'In Progress' },
          { value: 'failed', label: language === 'ar' ? 'فشل' : 'Failed' },
        ].map(f => (
          <Button key={f.value} variant={statusFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* Backup History Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : filteredBackups.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No backups yet"
          titleAr="لا توجد نسخ احتياطية بعد"
          subtitle="Create your first backup to protect your data"
          subtitleAr="أنشئ أول نسخة احتياطية لحماية بياناتك"
          actionLabel="Create Backup"
          actionLabelAr="إنشاء نسخة احتياطية"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  language === 'ar' ? 'الاسم' : 'Name',
                  language === 'ar' ? 'النطاق' : 'Scope',
                  language === 'ar' ? 'الحالة' : 'Status',
                  language === 'ar' ? 'الحجم' : 'Size',
                  language === 'ar' ? 'السجلات' : 'Records',
                  language === 'ar' ? 'التاريخ' : 'Created',
                  language === 'ar' ? 'تنتهي' : 'Expires',
                  '',
                ].map((h, i) => (
                  <th key={i} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBackups.map(b => {
                const badge = statusBadgeMap[b.status] || statusBadgeMap.completed;
                return (
                  <tr key={b.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-medium text-foreground max-w-[200px] truncate cursor-pointer" onClick={() => setSelectedBackup(b)}>
                      {b.backup_name}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-body-sm ${b.scope === 'system' ? 'bg-info/10 text-info' : 'bg-accent/10 text-accent'}`}>
                        {b.scope === 'system' ? (language === 'ar' ? 'النظام' : 'System') : (language === 'ar' ? 'مؤسسة' : 'Org')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-body-sm ${
                        b.status === 'completed' ? 'bg-success/10 text-success' :
                        b.status === 'in_progress' ? 'bg-info/10 text-info' :
                        b.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-3">{b.status === 'completed' ? formatBytes(b.data_size_bytes) : '—'}</td>
                    <td className="p-3">{b.status === 'completed' ? totalRecords(b.record_counts).toLocaleString() : '—'}</td>
                    <td className="p-3">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</td>
                    <td className="p-3">
                      {b.expires_at ? (
                        <span className={new Date(b.expires_at) < new Date(Date.now() + 7 * 86400000) ? 'text-warning' : ''}>
                          {formatDistanceToNow(new Date(b.expires_at), { addSuffix: true })}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedBackup(b)}>
                            <Eye size={14} className="me-2" /> {language === 'ar' ? 'التفاصيل' : 'Details'}
                          </DropdownMenuItem>
                          {b.status === 'completed' && (
                            <DropdownMenuItem onClick={() => handleDownload(b)}>
                              <Download size={14} className="me-2" /> {language === 'ar' ? 'تحميل' : 'Download'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setDeleteTarget(b)} className="text-destructive">
                            <Trash2 size={14} className="me-2" /> {language === 'ar' ? 'حذف' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Scheduled Backups Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'النسخ الاحتياطية المجدولة' : 'Scheduled Backups'}</h2>
        </div>
        {schedules.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-body-md">
            {language === 'ar' ? 'لا توجد جداول بعد' : 'No schedules yet'}
          </div>
        ) : (
          <div className="grid gap-3">
            {schedules.map(s => (
              <div key={s.id} className="bg-card border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-accent" />
                    <span className="text-body-md font-medium text-foreground">{s.name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-body-sm ${s.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                      {s.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'متوقف' : 'Paused')}
                    </span>
                  </div>
                  <p className="text-body-sm text-muted-foreground mt-1">
                    {language === 'ar' ? 'كل' : 'Every'} {s.frequency === 'daily' ? (language === 'ar' ? 'يوم' : 'day') :
                    s.frequency === 'weekly' && s.day_of_week != null ? dayNames[s.day_of_week] :
                    s.frequency === 'monthly' ? `${s.day_of_month}${language === 'ar' ? '' : 'th'}` : s.frequency}
                    {' '}{language === 'ar' ? 'الساعة' : 'at'} {s.preferred_time?.slice(0, 5)}
                    {' • '}{s.scope === 'system' ? (language === 'ar' ? 'النظام' : 'System') : (language === 'ar' ? 'مؤسسة' : 'Org')}
                    {' • '}{language === 'ar' ? `الاحتفاظ ${s.retention_days} يوم` : `Retention ${s.retention_days}d`}
                  </p>
                  {s.last_run_at && (
                    <p className="text-body-sm text-muted-foreground">
                      {language === 'ar' ? 'آخر تشغيل:' : 'Last run:'} {formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true })}
                      {s.last_run_status === 'completed' ? ' ✅' : s.last_run_status === 'failed' ? ' ❌' : ''}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm"><MoreHorizontal size={16} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      executeBackup(
                        `${s.name} - ${new Date().toLocaleDateString()}`,
                        s.scope, s.organization_id, s.includes_storage,
                        s.tables_included, s.retention_days
                      );
                    }}>
                      <Play size={14} className="me-2" /> {language === 'ar' ? 'تشغيل الآن' : 'Run Now'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSchedule(s)}>
                      {s.is_active ? <Pause size={14} className="me-2" /> : <Play size={14} className="me-2" />}
                      {s.is_active ? (language === 'ar' ? 'إيقاف' : 'Pause') : (language === 'ar' ? 'استئناف' : 'Resume')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteSchedule(s.id)} className="text-destructive">
                      <Trash2 size={14} className="me-2" /> {language === 'ar' ? 'حذف' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
        <p className="text-body-sm text-muted-foreground italic">
          {language === 'ar'
            ? 'النسخ الاحتياطية المجدولة تعمل عند زيارة المدير لهذه الصفحة.'
            : 'Scheduled backups run when an admin visits this page.'}
        </p>
      </div>

      {/* Modals */}
      <CreateBackupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={executeBackup}
      />
      <ScheduleBackupModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onCreated={fetchData}
      />
      {selectedBackup && (
        <BackupDetailSlideOver
          backup={selectedBackup}
          isOpen={!!selectedBackup}
          onClose={() => setSelectedBackup(null)}
          onDownload={handleDownload}
          onDelete={(b) => setDeleteTarget(b)}
        />
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Backup"
        titleAr="حذف النسخة الاحتياطية"
        message="Delete this backup? The backup file will be permanently removed."
        messageAr="حذف هذه النسخة الاحتياطية؟ سيتم إزالة الملف نهائياً."
        type="danger"
        isLoading={deleting}
      />
    </div>
  );
}
