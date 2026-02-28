import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import LogTimeModal from '@/components/time-tracking/LogTimeModal';
import { Clock, Receipt, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

interface CaseTimeBillingTabProps {
  caseId: string;
  clientId?: string;
  caseTitle?: string;
}

export default function CaseTimeBillingTab({ caseId, clientId }: CaseTimeBillingTabProps) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { profile } = useAuth();
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);

  const [stats, setStats] = useState({ totalHours: 0, billableHours: 0, totalAmount: 0 });

  const fetchData = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    const [teRes, invRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_timer_running', false)
        .order('date', { ascending: false })
        .limit(20),
      supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, total_amount, amount_paid, balance_due, status, currency')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false }),
    ]);
    const entries = teRes.data || [];
    setTimeEntries(entries);
    setInvoices(invRes.data || []);
    const totalMins = entries.reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    const billableMins = entries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    const totalAmount = entries.reduce((s: number, e: any) => s + (parseFloat(String(e.total_amount)) || 0), 0);
    setStats({ totalHours: totalMins / 60, billableHours: billableMins / 60, totalAmount });
    setLoading(false);
  }, [caseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return language === 'ar' ? format(date, 'dd MMM yyyy', { locale: arLocale }) : format(date, 'MMM dd, yyyy');
  };

  const fmtAmount = (a: number) => a ? `${a.toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-IQ')} IQD` : '—';
  const fmtDuration = (mins: number) => { const h = Math.floor(mins / 60); const m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الساعات' : 'Total Hours'}</p>
          <p className="text-heading-sm font-semibold text-foreground">{stats.totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'ساعات قابلة للفوترة' : 'Billable Hours'}</p>
          <p className="text-heading-sm font-semibold text-foreground">{stats.billableHours.toFixed(1)}h</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</p>
          <p className="text-heading-sm font-semibold text-accent">{fmtAmount(stats.totalAmount)}</p>
        </div>
      </div>

      {/* Time Entries Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-lg font-semibold text-foreground">{language === 'ar' ? 'سجلات الوقت' : 'Time Entries'}</h3>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm" onClick={() => { setEditEntry(null); setShowLogModal(true); }}>
            <Clock size={14} className="me-1" /> {language === 'ar' ? 'تسجيل وقت' : 'Log Time'}
          </Button>
        </div>
        {timeEntries.length === 0 ? (
          <EmptyState icon={Clock} title={language === 'ar' ? 'لا توجد سجلات وقت لهذه القضية' : 'No time entries for this case'} titleAr="لا توجد سجلات وقت لهذه القضية" actionLabel={language === 'ar' ? 'تسجيل وقت' : 'Log Time'} actionLabelAr="تسجيل وقت" onAction={() => { setEditEntry(null); setShowLogModal(true); }} size="sm" />
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.date')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.description')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'المدة' : 'Duration'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">{language === 'ar' ? 'السعر' : 'Rate'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map(entry => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => { if (entry.status === 'draft' || entry.status === 'submitted') { setEditEntry(entry); setShowLogModal(true); } }}>
                    <td className="px-4 py-2.5 text-body-sm text-muted-foreground">{fmtDate(entry.date)}</td>
                    <td className="px-4 py-2.5 text-body-md text-foreground truncate max-w-[200px]">{entry.description}</td>
                    <td className={`px-4 py-2.5 text-body-md font-medium ${entry.is_billable ? 'text-accent' : 'text-muted-foreground'}`}>{fmtDuration(entry.duration_minutes)}</td>
                    <td className="px-4 py-2.5 text-body-sm text-muted-foreground hidden sm:table-cell">{entry.is_billable && entry.billing_rate ? `${entry.billing_rate}/hr` : '—'}</td>
                    <td className="px-4 py-2.5 text-body-sm font-medium text-foreground hidden sm:table-cell">{entry.is_billable ? fmtAmount(parseFloat(entry.total_amount) || 0) : '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={entry.status} type="invoice" size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-lg font-semibold text-foreground">{language === 'ar' ? 'الفواتير' : 'Invoices'}</h3>
          <Button variant="outline" size="sm" onClick={() => navigate(`/billing/new?clientId=${clientId}&caseId=${caseId}`)}>
            <Plus size={14} className="me-1" /> {language === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'}
          </Button>
        </div>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title={language === 'ar' ? 'لا توجد فواتير لهذه القضية' : 'No invoices for this case'} titleAr="لا توجد فواتير لهذه القضية" actionLabel={language === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'} actionLabelAr="إنشاء فاتورة" onAction={() => navigate(`/billing/new?clientId=${clientId}&caseId=${caseId}`)} size="sm" />
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.date')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'المدفوع' : 'Paid'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'المتبقي' : 'Balance'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/billing/${inv.id}`)}>
                    <td className="px-4 py-2.5 text-body-sm font-mono font-medium text-accent">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-body-sm text-muted-foreground">{fmtDate(inv.issue_date)}</td>
                    <td className="px-4 py-2.5 text-body-sm font-medium text-foreground">{fmtAmount(parseFloat(inv.total_amount) || 0)}</td>
                    <td className="px-4 py-2.5 text-body-sm text-[#22C55E]">{fmtAmount(parseFloat(inv.amount_paid) || 0)}</td>
                    <td className={`px-4 py-2.5 text-body-sm font-medium ${parseFloat(inv.balance_due) > 0 ? 'text-destructive' : 'text-[#22C55E]'}`}>{parseFloat(inv.balance_due) > 0 ? fmtAmount(parseFloat(inv.balance_due)) : language === 'ar' ? 'مدفوعة' : 'Paid'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={inv.status} type="invoice" size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLogModal && (
        <LogTimeModal
          open={showLogModal}
          onOpenChange={(v) => { if (!v) { setShowLogModal(false); setEditEntry(null); } }}
          onSaved={fetchData}
          editEntry={editEntry}
          prefillCaseId={caseId}
        />
      )}
    </div>
  );
}
