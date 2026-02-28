import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/contexts/TimerContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import LogTimeModal from '@/components/time-tracking/LogTimeModal';
import { Clock, DollarSign, Banknote, PlayCircle, MoreHorizontal, Pencil, Copy, Send, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const statusColors: Record<string, { variant: string }> = {
  draft: { variant: 'slate' },
  submitted: { variant: 'info' },
  approved: { variant: 'success' },
  invoiced: { variant: 'accent' },
  written_off: { variant: 'muted' },
};

export default function TimeTrackingPage() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const { startTimer } = useTimer();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [deleteEntry, setDeleteEntry] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('week');
  const [billableFilter, setBillableFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Stats
  const [stats, setStats] = useState({ totalMinutes: 0, billableMinutes: 0, nonBillableMinutes: 0, totalAmount: 0 });

  const getDateRange = useCallback(() => {
    const now = new Date();
    if (periodFilter === 'today') return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    if (periodFilter === 'week') return { from: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd') };
    if (periodFilter === 'month') return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
  }, [periodFilter]);

  const fetchEntries = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const range = getDateRange();
    let query = supabase
      .from('time_entries')
      .select('*, cases(case_number, title), errands(errand_number, title), clients(first_name, last_name, company_name, client_type)')
      .eq('organization_id', profile.organization_id)
      .eq('is_timer_running', false)
      .gte('date', range.from)
      .lte('date', range.to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (billableFilter === 'billable') query = query.eq('is_billable', true);
    if (billableFilter === 'non-billable') query = query.eq('is_billable', false);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (search) query = query.or(`description.ilike.%${search}%,description_ar.ilike.%${search}%`);

    const { data } = await query.limit(200);
    const entries = data || [];
    setEntries(entries);

    // Calc stats
    const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
    const billableMinutes = entries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes || 0), 0);
    const nonBillableMinutes = totalMinutes - billableMinutes;
    const totalAmount = entries.reduce((s, e) => s + (parseFloat(String(e.total_amount)) || 0), 0);
    setStats({ totalMinutes, billableMinutes, nonBillableMinutes, totalAmount });
    setLoading(false);
  }, [profile?.organization_id, getDateRange, billableFilter, statusFilter, search]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleToggleBillable = async (entry: any) => {
    await supabase.from('time_entries').update({ is_billable: !entry.is_billable } as any).eq('id', entry.id);
    fetchEntries();
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    await supabase.from('time_entries').delete().eq('id', deleteEntry.id);
    setDeleteEntry(null);
    toast.success(t('Time entry deleted', 'تم حذف سجل الوقت'));
    fetchEntries();
  };

  const handleDuplicate = async (entry: any) => {
    if (!profile?.organization_id || !user) return;
    await supabase.from('time_entries').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      description: entry.description,
      description_ar: entry.description_ar,
      date: new Date().toISOString().split('T')[0],
      duration_minutes: entry.duration_minutes,
      is_billable: entry.is_billable,
      billing_rate: entry.billing_rate,
      case_id: entry.case_id,
      errand_id: entry.errand_id,
      client_id: entry.client_id,
    } as any);
    toast.success(t('Time entry duplicated', 'تم نسخ سجل الوقت'));
    fetchEntries();
  };

  const handleStartTimer = async () => {
    await startTimer({ description: '' });
    toast.success(t('Timer started', 'بدأ المؤقت'));
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (isToday(d)) return t('Today', 'اليوم');
    if (isYesterday(d)) return t('Yesterday', 'أمس');
    return format(d, 'EEE, MMM d, yyyy');
  };

  // Group entries by date
  const grouped = entries.reduce<Record<string, any[]>>((acc, entry) => {
    const key = entry.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const getClientName = (entry: any) => {
    const c = entry.clients;
    if (!c) return '';
    return c.client_type === 'company' ? c.company_name : `${c.first_name} ${c.last_name}`;
  };

  const getLinkedEntity = (entry: any) => {
    if (entry.cases) return { icon: '⚖️', label: entry.cases.case_number, name: entry.cases.title };
    if (entry.errands) return { icon: '📋', label: entry.errands.errand_number, name: entry.errands.title };
    return null;
  };

  const formatAmount = (amount: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat(language === 'ar' ? 'ar-IQ' : 'en-IQ', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + ' IQD';
  };

  return (
    <div>
      <PageHeader
        title="Time Tracking"
        titleAr="تتبع الوقت"
        subtitle="Track billable and non-billable hours"
        subtitleAr="تتبع ساعات العمل القابلة وغير القابلة للفوترة"
        actionLabel="Log Time"
        actionLabelAr="تسجيل وقت"
        onAction={() => { setEditEntry(null); setShowLogModal(true); }}
        secondaryActions={[{
          label: 'Start Timer', labelAr: 'بدء المؤقت', icon: PlayCircle, onClick: handleStartTimer
        }]}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Time Tracking', labelAr: 'تتبع الوقت' },
        ]}
      />

      {/* Period selector + Stats */}
      <div className="flex items-center justify-end mb-4">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-auto min-w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t('Today', 'اليوم')}</SelectItem>
            <SelectItem value="week">{t('This Week', 'هذا الأسبوع')}</SelectItem>
            <SelectItem value="month">{t('This Month', 'هذا الشهر')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} iconColor="hsl(217 91% 60%)" iconBgColor="hsl(214 100% 97%)" label="Total Hours" labelAr="إجمالي الساعات" value={`${(stats.totalMinutes / 60).toFixed(1)}h`} isLoading={loading} />
        <StatCard icon={DollarSign} iconColor="hsl(142 71% 45%)" iconBgColor="hsl(138 76% 97%)" label="Billable Hours" labelAr="ساعات قابلة للفوترة" value={`${(stats.billableMinutes / 60).toFixed(1)}h`} isLoading={loading} />
        <StatCard icon={Clock} iconColor="hsl(215 16% 47%)" iconBgColor="hsl(210 40% 96%)" label="Non-Billable Hours" labelAr="ساعات غير قابلة للفوترة" value={`${(stats.nonBillableMinutes / 60).toFixed(1)}h`} isLoading={loading} />
        <StatCard icon={Banknote} iconColor="hsl(42 50% 54%)" iconBgColor="hsl(42 52% 95%)" label="Total Amount" labelAr="المبلغ الإجمالي" value={formatAmount(stats.totalAmount)} isLoading={loading} />
      </div>

      <FilterBar
        searchPlaceholder="Search time entries..."
        searchPlaceholderAr="البحث في سجلات الوقت..."
        onSearchChange={setSearch}
        filters={[
          { key: 'billable', label: 'Billable', labelAr: 'الفوترة', options: [
            { value: 'billable', label: 'Billable', labelAr: 'قابل للفوترة' },
            { value: 'non-billable', label: 'Non-Billable', labelAr: 'غير قابل للفوترة' },
          ]},
          { key: 'status', label: 'Status', labelAr: 'الحالة', options: [
            { value: 'draft', label: 'Draft', labelAr: 'مسودة' },
            { value: 'submitted', label: 'Submitted', labelAr: 'مقدم' },
            { value: 'approved', label: 'Approved', labelAr: 'موافق عليه' },
            { value: 'invoiced', label: 'Invoiced', labelAr: 'مفوتر' },
          ]},
        ]}
        activeFilters={{ billable: billableFilter, status: statusFilter }}
        onFilterChange={(key, val) => {
          if (key === 'billable') setBillableFilter(val);
          if (key === 'status') setStatusFilter(val);
        }}
        onClearAll={() => { setBillableFilter('all'); setStatusFilter('all'); }}
      />

      {!loading && entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No time entries yet"
          titleAr="لا توجد سجلات وقت بعد"
          subtitle="Start tracking your time by logging entries or using the timer"
          subtitleAr="ابدأ بتتبع وقتك من خلال تسجيل السجلات أو استخدام المؤقت"
          actionLabel="Log Your First Entry"
          actionLabelAr="سجّل أول سجل وقت"
          onAction={() => { setEditEntry(null); setShowLogModal(true); }}
        />
      ) : (
        <div className="space-y-1">
          {Object.entries(grouped).map(([dateKey, dayEntries]) => {
            const dayTotal = dayEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-md mb-1">
                  <span className="text-body-sm font-semibold text-muted-foreground">{formatDateLabel(dateKey)}</span>
                  <span className="text-body-sm text-muted-foreground">{formatDuration(dayTotal)}</span>
                </div>
                {/* Entries */}
                <div className="bg-card rounded-lg border border-border divide-y divide-border">
                  {dayEntries.map(entry => {
                    const linked = getLinkedEntity(entry);
                    return (
                      <div key={entry.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md font-medium text-foreground truncate">{entry.description}</p>
                          {linked && (
                            <p className="text-body-sm text-muted-foreground truncate">{linked.icon} {linked.label} · {linked.name}</p>
                          )}
                          {!linked && entry.clients && (
                            <p className="text-body-sm text-muted-foreground truncate">{getClientName(entry)}</p>
                          )}
                        </div>
                        {/* Duration */}
                        <div className={`text-body-md font-medium whitespace-nowrap ${entry.is_billable ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {formatDuration(entry.duration_minutes)}
                        </div>
                        {/* Billable toggle */}
                        <Switch checked={entry.is_billable} onCheckedChange={() => handleToggleBillable(entry)} className="data-[state=checked]:bg-accent" />
                        {/* Rate */}
                        <div className="text-body-sm text-muted-foreground w-20 text-end">
                          {entry.is_billable && entry.billing_rate ? `${entry.billing_rate}/hr` : '—'}
                        </div>
                        {/* Amount */}
                        <div className={`text-body-sm font-medium w-24 text-end ${entry.status === 'invoiced' ? 'text-accent' : 'text-foreground'}`}>
                          {entry.is_billable ? formatAmount(parseFloat(entry.total_amount) || 0) : '—'}
                        </div>
                        {/* Status */}
                        <StatusBadge status={entry.status} type="invoice" />
                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditEntry(entry); setShowLogModal(true); }}>
                              <Pencil size={14} className="me-2" />{t('Edit', 'تعديل')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(entry)}>
                              <Copy size={14} className="me-2" />{t('Duplicate', 'نسخ')}
                            </DropdownMenuItem>
                            {entry.status === 'draft' && (
                              <DropdownMenuItem onClick={async () => {
                                await supabase.from('time_entries').update({ status: 'submitted' } as any).eq('id', entry.id);
                                toast.success(t('Submitted', 'تم التقديم'));
                                fetchEntries();
                              }}>
                                <Send size={14} className="me-2" />{t('Submit', 'تقديم')}
                              </DropdownMenuItem>
                            )}
                            {entry.status === 'submitted' && profile?.role === 'firm_admin' && (
                              <DropdownMenuItem onClick={async () => {
                                await supabase.from('time_entries').update({ status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString() } as any).eq('id', entry.id);
                                toast.success(t('Approved', 'تمت الموافقة'));
                                fetchEntries();
                              }}>
                                <CheckCircle size={14} className="me-2" />{t('Approve', 'موافقة')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteEntry(entry)}>
                              <Trash2 size={14} className="me-2" />{t('Delete', 'حذف')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LogTimeModal open={showLogModal} onOpenChange={setShowLogModal} onSaved={fetchEntries} editEntry={editEntry} />
      <ConfirmDialog
        isOpen={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        title="Delete Time Entry"
        titleAr="حذف سجل الوقت"
        message="Are you sure you want to delete this time entry?"
        messageAr="هل أنت متأكد من حذف سجل الوقت هذا؟"
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmLabelAr="حذف"
        type="danger"
      />
    </div>
  );
}
