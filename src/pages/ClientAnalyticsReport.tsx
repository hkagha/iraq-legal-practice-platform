import { useQuery } from '@tanstack/react-query';
import { Download, Users, Briefcase, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ClientAnalyticsReport() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const orgId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['client-analytics', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [persons, entities, parties, invoices] = await Promise.all([
        supabase.from('persons').select('id, first_name, last_name, first_name_ar, last_name_ar').eq('organization_id', orgId!),
        supabase.from('entities').select('id, company_name, company_name_ar').eq('organization_id', orgId!),
        supabase.from('case_parties').select('person_id, entity_id, party_type, role').eq('organization_id', orgId!).eq('role', 'client'),
        supabase.from('invoices').select('person_id, entity_id, party_type, total_amount, amount_paid, status').eq('organization_id', orgId!).neq('status', 'draft'),
      ]);

      const caseCount = new Map<string, number>();
      (parties.data ?? []).forEach((p: any) => {
        const key = p.party_type === 'person' ? `p:${p.person_id}` : `e:${p.entity_id}`;
        caseCount.set(key, (caseCount.get(key) ?? 0) + 1);
      });
      const billed = new Map<string, number>();
      const paid = new Map<string, number>();
      (invoices.data ?? []).forEach((i: any) => {
        const key = i.party_type === 'person' ? `p:${i.person_id}` : `e:${i.entity_id}`;
        billed.set(key, (billed.get(key) ?? 0) + Number(i.total_amount));
        paid.set(key, (paid.get(key) ?? 0) + Number(i.amount_paid));
      });

      const rows = [
        ...(persons.data ?? []).map((p: any) => ({
          id: p.id, type: 'person',
          name: isEN ? `${p.first_name} ${p.last_name}` : `${p.first_name_ar || p.first_name} ${p.last_name_ar || p.last_name}`,
          cases: caseCount.get(`p:${p.id}`) ?? 0,
          billed: billed.get(`p:${p.id}`) ?? 0,
          paid: paid.get(`p:${p.id}`) ?? 0,
        })),
        ...(entities.data ?? []).map((e: any) => ({
          id: e.id, type: 'entity',
          name: isEN ? e.company_name : (e.company_name_ar || e.company_name),
          cases: caseCount.get(`e:${e.id}`) ?? 0,
          billed: billed.get(`e:${e.id}`) ?? 0,
          paid: paid.get(`e:${e.id}`) ?? 0,
        })),
      ].sort((a, b) => b.billed - a.billed);

      return {
        rows,
        totalParties: rows.length,
        activeClients: rows.filter(r => r.cases > 0).length,
        totalBilled: rows.reduce((s, r) => s + r.billed, 0),
      };
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 print:p-0">
      <PageHeader
        title="Client Analytics"
        titleAr="تحليلات الموكلين"
        helpKey="reports.client-analytics"
        secondaryActions={[{ label: 'Export PDF', labelAr: 'تصدير PDF', icon: Download, onClick: () => window.print() }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total parties" labelAr="إجمالي الأطراف" value={data?.totalParties ?? 0} />
        <StatCard icon={Briefcase} label="Active clients" labelAr="الموكلون النشطون" value={data?.activeClients ?? 0} />
        <StatCard icon={DollarSign} label="Total billed" labelAr="إجمالي المُصدر" value={Math.round(data?.totalBilled ?? 0).toLocaleString()} />
      </div>

      <Card className="p-5">
        <h3 className="text-heading-md font-semibold text-primary mb-4">{isEN ? 'Top clients by billed amount' : 'أعلى الموكلين بالقيمة المُصدرة'}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isEN ? 'Name' : 'الاسم'}</TableHead>
              <TableHead>{isEN ? 'Type' : 'النوع'}</TableHead>
              <TableHead className="text-end">{isEN ? 'Cases' : 'القضايا'}</TableHead>
              <TableHead className="text-end">{isEN ? 'Billed' : 'المُصدر'}</TableHead>
              <TableHead className="text-end">{isEN ? 'Paid' : 'المدفوع'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.rows ?? []).slice(0, 50).map(r => (
              <TableRow key={`${r.type}-${r.id}`}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.type === 'person' ? (isEN ? 'Individual' : 'فرد') : (isEN ? 'Company' : 'شركة')}</TableCell>
                <TableCell className="text-end">{r.cases}</TableCell>
                <TableCell className="text-end">{Math.round(r.billed).toLocaleString()}</TableCell>
                <TableCell className="text-end">{Math.round(r.paid).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
