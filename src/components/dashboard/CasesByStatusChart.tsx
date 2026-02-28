import { useLanguage } from '@/contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function CasesByStatusChart() {
  const { t } = useLanguage();

  // Empty state donut
  const emptyData = [{ name: 'empty', value: 1 }];

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.casesByStatus')}</h2>
      </div>

      <div className="p-5 flex flex-col items-center">
        <div className="w-full h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={emptyData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#E2E8F0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-body-sm text-muted-foreground text-center">{t('dashboard.noCasesYet')}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
          {[
            { key: 'intake', color: '#3B82F6' },
            { key: 'active', color: '#22C55E' },
            { key: 'pendingHearing', color: '#F59E0B' },
            { key: 'pendingJudgment', color: '#8B5CF6' },
            { key: 'onHold', color: '#94A3B8' },
            { key: 'won', color: '#C9A84C' },
            { key: 'lost', color: '#EF4444' },
            { key: 'settled', color: '#06B6D4' },
            { key: 'closed', color: '#6B7280' },
          ].map(({ key, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-body-sm text-muted-foreground">{t(`dashboard.${key}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
