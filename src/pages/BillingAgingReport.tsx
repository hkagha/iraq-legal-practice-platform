import { useQuery } from '@tanstack/react-query';
import { Download, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';

type Bucket = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus';

const BUCKET_LABELS: Record<Bucket, [string, string]> = {
  current: ['Current', 'الحالي'],
  d1_30: ['1–30 days', '1-30 يوم'],
  d31_60: ['31–60 days', '31-60 يوم'],
  d61_90: ['61–90 days', '61-90 يوم'],
  d90_plus: ['90+ days', '+90 يوم'],
};

function bucketize(dueDate: string | null): Bucket {
  if (!dueDate) return 'current';
  const due = new Date(dueDate);
  const today = new Date();
  const days = Math.floor((+today - +due) / 86400000);
  if (days <= 0) return 'current';
  if (days <= 30) return 'd1_30';
  if (days <= 60) return 'd31_60';
  if (days <= 90) return 'd61_90';
  return 'd90_plus';
}

export default function BillingAgingReport() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const orgId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['billing-aging', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, due_date, total_amount, amount_paid, currency, party_type, person_id, entity_id, status')
        .eq('organization_id', orgId!)
        .not('status', 'in', '(paid,cancelled,written_off,draft)');

      const inv = invoices ?? [];
      const personIds = [...new Set(inv.filter(i => i.party_type === 'person').map(i => i.person_id).filter(Boolean))];
      const entityIds = [...new Set(inv.filter(i => i.party_type === 'entity').map(i => i.entity_id).filter(Boolean))];
      const [personsRes, entitiesRes] = await Promise.all([
        personIds.length ? supabase.from('persons').select('id, first_name, last_name, first_name_ar, last_name_ar').in('id', personIds) : Promise.resolve({ data: [] }),
        entityIds.length ? supabase.from('entities').select('id, company_name, company_name_ar').in('id', entityIds) : Promise.resolve({ data: [] }),
      ]);
      const personMap = new Map((personsRes.data ?? []).map((p: any) => [p.id, p]));
      const entityMap = new Map((entitiesRes.data ?? []).map((e: any) => [e.id, e]));

      const buckets: Record<Bucket, number> = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
      const rows = inv.map((i: any) => {
        const balance = Number(i.total_amount) - Number(i.amount_paid);
        const b = bucketize(i.due_date);
        buckets[b] += balance;
        const partyName = i.party_type === 'person'
          ? (() => { const p: any = personMap.get(i.person_id); return p ? (isEN ? `${p.first_name} ${p.last_name}` : `${p.first_name_ar || p.first_name} ${p.last_name_ar || p.last_name}`) : '—'; })()
          : (() => { const e: any = entityMap.get(i.entity_id); return e ? (isEN ? e.company_name : (e.company_name_ar || e.company_name)) : '—'; })();
        return { ...i, balance, bucket: b, partyName };
      }).sort((a, b) => b.balance - a.balance);

      return { rows, buckets, total: Object.values(buckets).reduce((s, v) => s + v, 0) };
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 print:p-0">
      <PageHeader
        title="Billing Aging"
        titleAr="تقادم الفواتير"
        helpKey="reports.billing-aging"
        secondaryActions={[{ label: 'Export PDF', labelAr: 'تصدير PDF', icon: Download, onClick: () => window.print() }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(Object.keys(BUCKET_LABELS) as Bucket[]).map(b => (
          <StatCard
            key={b}
            label={BUCKET_LABELS[b][0]}
            labelAr={BUCKET_LABELS[b][1]}
            value={Math.round(data?.buckets[b] ?? 0).toLocaleString()}
          />
        ))}
      </div>

      <Card className="p-5">
        <h3 className="text-heading-md font-semibold text-primary mb-4">
          {isEN ? `Outstanding invoices (${data?.rows.length ?? 0})` : `الفواتير المستحقة (${data?.rows.length ?? 0})`}
        </h3>
        {(data?.rows.length ?? 0) === 0 ? (
          <EmptyState icon={AlertTriangle} title="Nothing outstanding" titleAr="لا توجد مستحقات" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEN ? 'Invoice' : 'الفاتورة'}</TableHead>
                <TableHead>{isEN ? 'Client' : 'الموكل'}</TableHead>
                <TableHead>{isEN ? 'Due' : 'الاستحقاق'}</TableHead>
                <TableHead>{isEN ? 'Bucket' : 'الفئة'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Balance' : 'الرصيد'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">
                    <Link to={`/billing/${r.id}`} className="text-primary hover:underline">{r.invoice_number}</Link>
                  </TableCell>
                  <TableCell>{r.partyName}</TableCell>
                  <TableCell>{r.due_date || '—'}</TableCell>
                  <TableCell>{isEN ? BUCKET_LABELS[r.bucket as Bucket][0] : BUCKET_LABELS[r.bucket as Bucket][1]}</TableCell>
                  <TableCell className="text-end font-medium">{Math.round(r.balance).toLocaleString()} {r.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
