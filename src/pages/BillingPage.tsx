import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';

function fmt(amount: number, currency: string, lang: 'en' | 'ar') {
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-IQ', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

export default function BillingPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const isEN = language === 'en';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, status, issue_date, due_date,
          currency, subtotal, total_amount, amount_paid,
          party_type, person_id, entity_id, case_id,
          person:persons(id, first_name, last_name, first_name_ar, last_name_ar),
          entity:entities(id, company_name, company_name_ar),
          case:cases(id, case_number, title, title_ar)
        `)
        .order('issue_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const list = invoices ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(); monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    let totalRevenue = 0, outstanding = 0, overdue = 0, paidThisMonth = 0;
    for (const inv of list) {
      if (inv.status === 'cancelled' || inv.status === 'written_off') continue;
      const total = Number(inv.total_amount) || 0;
      const paid = Number(inv.amount_paid) || 0;
      totalRevenue += paid;
      const balance = total - paid;
      if (balance > 0 && inv.status !== 'draft') outstanding += balance;
      if (balance > 0 && inv.due_date && inv.due_date < today) overdue += balance;
      if (paid > 0 && inv.issue_date >= monthStartStr) paidThisMonth += paid;
    }
    return { totalRevenue, outstanding, overdue, paidThisMonth };
  }, [invoices]);

  const filtered = useMemo(() => {
    const list = invoices ?? [];
    return list.filter((inv: any) => {
      if (status !== 'all' && inv.status !== status) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      if (inv.invoice_number.toLowerCase().includes(q)) return true;
      const lang = isEN ? 'en' : 'ar';
      const partyName = inv.party_type === 'person'
        ? resolvePersonName(inv.person as any, lang)
        : resolveEntityName(inv.entity as any, lang);
      return partyName.toLowerCase().includes(q);
    });
  }, [invoices, search, status, isEN]);

  if (isLoading) return <PageLoader />;

  const baseCurrency = invoices?.[0]?.currency || 'IQD';

  return (
    <div className="container mx-auto p-6 max-w-[1400px]">
      <PageHeader
        title={t('billing.title')}
        titleAr={t('billing.title')}
        subtitle={t('billing.subtitle')}
        subtitleAr={t('billing.subtitle')}
        actionLabel={t('billing.createInvoice')}
        actionLabelAr={t('billing.createInvoice')}
        onAction={() => navigate('/billing/new')}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('billing.totalRevenue')} labelAr={t('billing.totalRevenue')} value={fmt(stats.totalRevenue, baseCurrency, isEN ? 'en' : 'ar')} />
        <StatCard label={t('billing.outstanding')} labelAr={t('billing.outstanding')} value={fmt(stats.outstanding, baseCurrency, isEN ? 'en' : 'ar')} />
        <StatCard label={t('billing.overdue')} labelAr={t('billing.overdue')} value={fmt(stats.overdue, baseCurrency, isEN ? 'en' : 'ar')} />
        <StatCard label={t('billing.paidThisMonth')} labelAr={t('billing.paidThisMonth')} value={fmt(stats.paidThisMonth, baseCurrency, isEN ? 'en' : 'ar')} />
      </div>

      <Card className="p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEN ? 'Search by invoice number or client…' : 'ابحث برقم الفاتورة أو العميل…'}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isEN ? 'All statuses' : 'جميع الحالات'}</SelectItem>
            {['draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'written_off'].map(s => (
              <SelectItem key={s} value={s}>{t(`billing.statuses.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t('billing.empty.title')}
          titleAr={t('billing.empty.title')}
          subtitle={t('billing.empty.subtitle')}
          subtitleAr={t('billing.empty.subtitle')}
          actionLabel={t('billing.empty.action')}
          actionLabelAr={t('billing.empty.action')}
          onAction={() => navigate('/billing/new')}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{t('billing.invoice.invoiceNumber')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('billing.invoice.client')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('billing.invoice.issueDate')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('billing.invoice.dueDate')}</th>
                <th className="text-right px-4 py-3 font-semibold">{t('billing.invoice.total')}</th>
                <th className="text-right px-4 py-3 font-semibold">{t('billing.invoice.balanceDue')}</th>
                <th className="px-4 py-3 font-semibold">{isEN ? 'Status' : 'الحالة'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv: any) => {
                const balance = Number(inv.total_amount) - Number(inv.amount_paid);
                const lang = isEN ? 'en' : 'ar';
                const partyName = inv.party_type === 'person'
                  ? resolvePersonName(inv.person, lang)
                  : resolveEntityName(inv.entity, lang);
                return (
                  <tr key={inv.id} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/billing/${inv.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link to={`/billing/${inv.id}`} className="text-primary hover:underline">{inv.invoice_number}</Link>
                    </td>
                    <td className="px-4 py-3">{partyName || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.issue_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.due_date || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(Number(inv.total_amount), inv.currency, isEN ? 'en' : 'ar')}</td>
                    <td className={`px-4 py-3 text-right font-medium ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {fmt(balance, inv.currency, isEN ? 'en' : 'ar')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} type="invoice" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
