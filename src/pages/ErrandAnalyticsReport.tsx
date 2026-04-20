import { useQuery } from '@tanstack/react-query';
import { Download, FileText, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(42, 85%, 55%)', 'hsl(0, 84%, 60%)', 'hsl(262, 52%, 47%)', 'hsl(180, 60%, 45%)', 'hsl(30, 80%, 55%)'];

export default function ErrandAnalyticsReport() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const orgId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['errand-analytics', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: errands } = await supabase
        .from('errands')
        .select('id, status, errand_type, created_at, completed_at')
        .eq('organization_id', orgId!);
      const list = errands ?? [];

      const byStatus = new Map<string, number>();
      const byType = new Map<string, number>();
      let totalCompletionDays = 0;
      let completedCount = 0;
      list.forEach((e: any) => {
        byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1);
        if (e.errand_type) byType.set(e.errand_type, (byType.get(e.errand_type) ?? 0) + 1);
        if (e.completed_at) {
          const days = (+new Date(e.completed_at) - +new Date(e.created_at)) / 86400000;
          totalCompletionDays += days;
          completedCount++;
        }
      });

      return {
        total: list.length,
        completed: completedCount,
        active: list.filter((e: any) => !['completed', 'cancelled'].includes(e.status)).length,
        avgDays: completedCount > 0 ? (totalCompletionDays / completedCount).toFixed(1) : '0',
        statusChart: [...byStatus.entries()].map(([name, value]) => ({ name, value })),
        typeChart: [...byType.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      };
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 print:p-0">
      <PageHeader
        title="Errand Analytics"
        titleAr="تحليلات المعاملات"
        helpKey="reports.errand-analytics"
        secondaryActions={[{ label: 'Export PDF', labelAr: 'تصدير PDF', icon: Download, onClick: () => window.print() }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total errands" labelAr="إجمالي المعاملات" value={data?.total ?? 0} />
        <StatCard icon={Clock} label="Active" labelAr="نشطة" value={data?.active ?? 0} />
        <StatCard icon={CheckCircle2} label="Completed" labelAr="مكتملة" value={data?.completed ?? 0} />
        <StatCard label="Avg completion (days)" labelAr="متوسط الإكمال (أيام)" value={data?.avgDays ?? '0'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-heading-md font-semibold text-primary mb-4">{isEN ? 'By status' : 'حسب الحالة'}</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data?.statusChart ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {(data?.statusChart ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-heading-md font-semibold text-primary mb-4">{isEN ? 'Top errand types' : 'أبرز أنواع المعاملات'}</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.typeChart ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(217, 91%, 60%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
