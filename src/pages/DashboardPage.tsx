import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MetricCards from '@/components/dashboard/MetricCards';
import UpcomingEventsWidget from '@/components/dashboard/UpcomingEventsWidget';
import TasksDueSoonWidget from '@/components/dashboard/TasksDueSoonWidget';
import TodayScheduleWidget from '@/components/dashboard/TodayScheduleWidget';
import RecentActivityWidget from '@/components/dashboard/RecentActivityWidget';
import CasesByStatusChart from '@/components/dashboard/CasesByStatusChart';
import ErrandsByStatusChart from '@/components/dashboard/ErrandsByStatusChart';
import RevenueTrendChart from '@/components/dashboard/RevenueTrendChart';

export default function DashboardPage() {
  const { isLoading } = useAuth();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <MetricCards />
      
      {/* Row 2 — Today + Events + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <UpcomingEventsWidget />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <TodayScheduleWidget />
          <TasksDueSoonWidget />
        </div>
      </div>

      {/* Row 3 — Activity */}
      <RecentActivityWidget />

      {/* Row 4 — Charts + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CasesByStatusChart />
        <ErrandsByStatusChart />
      </div>

      {/* Row 5 — Revenue Trend */}
      <RevenueTrendChart />
    </div>
  );
}
