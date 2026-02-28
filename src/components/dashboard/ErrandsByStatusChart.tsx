import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  in_progress: '#C9A84C',
  awaiting_documents: '#F59E0B',
  submitted_to_government: '#8B5CF6',
  under_review_by_government: '#06B6D4',
  additional_requirements: '#EF4444',
  approved: '#22C55E',
  rejected: '#DC2626',
  completed: '#16A34A',
};

const STATUS_ORDER = ['new', 'in_progress', 'awaiting_documents', 'submitted_to_government', 'under_review_by_government', 'additional_requirements', 'approved', 'rejected', 'completed'];

export default function ErrandsByStatusChart() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [data, setData] = useState<{ name: string; value: number; status: string }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const fetch = async () => {
      const { data: errands } = await supabase
        .from('errands')
        .select('status')
        .eq('organization_id', profile.organization_id!)
        .neq('status', 'cancelled');

      if (errands && errands.length > 0) {
        const counts: Record<string, number> = {};
        errands.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
        const chartData = STATUS_ORDER
          .filter(s => counts[s])
          .map(s => ({ name: t(`statuses.errand.${s}`), value: counts[s], status: s }));
        setData(chartData);
        setTotal(errands.length);
      }
    };
    fetch();
  }, [profile?.organization_id, t]);

  const emptyData = [{ name: 'empty', value: 1, status: 'empty' }];
  const chartData = data.length > 0 ? data : emptyData;

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.errandsByStatus')}</h2>
      </div>

      <div className="p-5 flex flex-col items-center">
        <div className="w-full h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] || '#E2E8F0'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            {total > 0 ? (
              <div className="text-center">
                <p className="text-display-sm font-bold text-foreground">{total}</p>
                <p className="text-body-sm text-muted-foreground">{t('common.all')}</p>
              </div>
            ) : (
              <p className="text-body-sm text-muted-foreground text-center">{t('dashboard.noErrandsYet')}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
          {STATUS_ORDER.map(key => {
            const count = data.find(d => d.status === key)?.value;
            if (!count && total > 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
                <span className="text-body-sm text-muted-foreground">
                  {t(`statuses.errand.${key}`)}
                  {count !== undefined && <span className="ms-1 font-medium">({count})</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
