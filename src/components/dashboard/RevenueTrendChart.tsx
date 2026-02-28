import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueTrendChart() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [data, setData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const fetchRevenue = async () => {
      const now = new Date();
      const months: { month: string; from: string; to: string }[] = [];
      const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        months.push({
          month: t(`months.${monthKeys[d.getMonth()]}`),
          from: d.toISOString().split('T')[0],
          to: end.toISOString().split('T')[0],
        });
      }

      const results = await Promise.all(
        months.map(async (m) => {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('organization_id', profile.organization_id!)
            .gte('payment_date', m.from)
            .lte('payment_date', m.to);
          const total = (payments || []).reduce((s, p) => s + (parseFloat(String(p.amount)) || 0), 0);
          return { month: m.month, amount: total };
        })
      );
      setData(results);
      setLoading(false);
    };
    fetchRevenue();
  }, [profile?.organization_id, language]);

  const formatYAxis = (v: number) => {
    if (v >= 1000000) return language === 'ar' ? `${(v / 1000000).toFixed(1)} مليون` : `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return language === 'ar' ? `${(v / 1000).toFixed(0)} ألف` : `${(v / 1000).toFixed(0)}K`;
    return String(v);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card shadow-sm animate-pulse">
        <div className="px-5 py-4 border-b border-border"><div className="h-5 w-40 bg-muted rounded" /></div>
        <div className="p-5"><div className="w-full h-[220px] bg-muted rounded" /></div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.revenueTrend')}</h2>
      </div>
      <div className="p-5">
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(42, 50%, 54%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(42, 50%, 54%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 40% 96%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={{ stroke: 'hsl(214 32% 91%)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={{ stroke: 'hsl(214 32% 91%)' }} tickLine={false} tickFormatter={formatYAxis} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: 13 }}
                formatter={(value: number) => [
                  language === 'ar' ? `${value.toLocaleString('ar-IQ')} د.ع` : `${value.toLocaleString()} IQD`,
                  language === 'ar' ? 'الإيرادات' : 'Revenue',
                ]}
              />
              <Area type="monotone" dataKey="amount" stroke="hsl(42, 50%, 54%)" strokeWidth={2} fill="url(#goldFill)" dot={{ r: 4, fill: 'hsl(42, 50%, 54%)', strokeWidth: 0 }} activeDot={{ r: 6, fill: 'hsl(42, 50%, 54%)', strokeWidth: 2, stroke: 'white' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
