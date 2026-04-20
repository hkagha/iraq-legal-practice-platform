import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Receipt, Search, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';

function formatMoney(amount: number, currency: string, lang: 'en' | 'ar') {
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-IQ', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export default function PortalInvoicesPage() {
  const { language, isRTL } = useLanguage();
  const isEN = language === 'en';
  const [search, setSearch] = useState('');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['portal-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, issue_date, due_date, currency, total_amount, amount_paid')
        .neq('status', 'draft')
        .order('issue_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (invoices ?? []).filter((i) => {
    if (!search) return true;
    return i.invoice_number.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-display-sm font-bold text-primary mb-1">
          {isEN ? 'Invoices' : 'الفواتير'}
        </h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'Invoices issued by your firm' : 'الفواتير الصادرة من مكتبك'}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground`} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEN ? 'Search invoices…' : 'ابحث في الفواتير…'}
          className={isRTL ? 'pr-9' : 'pl-9'}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          titleAr="لا توجد فواتير"
          subtitle="Invoices from your firm will appear here."
          subtitleAr="ستظهر هنا الفواتير الصادرة من مكتبك."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const balance = Number(inv.total_amount) - Number(inv.amount_paid);
            return (
              <Link key={inv.id} to={`/portal/invoices/${inv.id}`}>
                <Card className="p-4 hover:border-accent transition-colors cursor-pointer flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-body-xs text-muted-foreground">{inv.invoice_number}</span>
                      <StatusBadge status={inv.status} type="custom" />
                    </div>
                    <div className="flex items-center gap-3 text-body-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(inv.issue_date).toLocaleDateString(isEN ? 'en-GB' : 'ar-IQ')}
                      </span>
                      {inv.due_date && (
                        <span>
                          {isEN ? 'Due' : 'الاستحقاق'}: {new Date(inv.due_date).toLocaleDateString(isEN ? 'en-GB' : 'ar-IQ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-foreground">
                      {formatMoney(Number(inv.total_amount), inv.currency, isEN ? 'en' : 'ar')}
                    </div>
                    {balance > 0 && (
                      <div className="text-body-xs text-destructive">
                        {isEN ? 'Balance' : 'المتبقي'}: {formatMoney(balance, inv.currency, isEN ? 'en' : 'ar')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
