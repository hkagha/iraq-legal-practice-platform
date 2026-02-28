import { useLanguage } from '@/contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const monthKeys = ['jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb'];

export default function RevenueTrendChart() {
  const { t, language } = useLanguage();

  // Generate last 6 months
  const now = new Date();
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()];
    data.push({
      month: t(`months.${key}`),
      amount: 0,
    });
  }

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.revenueTrend')}</h2>
      </div>

      <div className="p-5">
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
                tickFormatter={(v) => language === 'ar' ? `${v} د.ع` : `${v} IQD`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  fontSize: 13,
                }}
                formatter={(value: number) => [
                  language === 'ar' ? `${value.toLocaleString('ar-IQ')} د.ع` : `${value.toLocaleString()} IQD`,
                  language === 'ar' ? 'الإيرادات' : 'Revenue',
                ]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#C9A84C"
                strokeWidth={2}
                dot={{ r: 4, fill: '#C9A84C', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#C9A84C', strokeWidth: 2, stroke: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
