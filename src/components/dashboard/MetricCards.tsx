import { useQuery } from '@tanstack/react-query';
import { Scale, FileCheck, CheckSquare, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/StatCard';

export default function MetricCards() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date();
      monthStart.setDate(1);
      const mStart = monthStart.toISOString().slice(0, 10);

      const [activeCases, activeErrands, openTasks, hoursThisMonth] = await Promise.all([
        supabase.from('cases').select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .in('status', ['intake', 'active', 'pending_hearing', 'pending_judgment', 'on_hold']),
        supabase.from('errands').select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .in('status', ['pending', 'in_progress']),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .not('status', 'in', '(completed,cancelled)'),
        supabase.from('time_entries').select('duration_minutes')
          .eq('organization_id', orgId!)
          .eq('is_timer_running', false)
          .gte('date', mStart).lte('date', today),
      ]);
      const totalMinutes = (hoursThisMonth.data ?? []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
      return {
        cases: activeCases.count ?? 0,
        errands: activeErrands.count ?? 0,
        tasks: openTasks.count ?? 0,
        hours: Math.round(totalMinutes / 60 * 10) / 10,
      };
    },
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={Scale} label="Active cases" labelAr="القضايا النشطة" value={data?.cases ?? 0} isLoading={isLoading} accent />
      <StatCard icon={FileCheck} label="Active errands" labelAr="المعاملات النشطة" value={data?.errands ?? 0} isLoading={isLoading} />
      <StatCard icon={CheckSquare} label="Open tasks" labelAr="المهام المفتوحة" value={data?.tasks ?? 0} isLoading={isLoading} />
      <StatCard icon={Clock} label="Hours this month" labelAr="ساعات هذا الشهر" value={data?.hours ?? 0} isLoading={isLoading} />
    </div>
  );
}
