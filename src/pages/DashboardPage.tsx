import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MetricCards from '@/components/dashboard/MetricCards';
import UpcomingEventsWidget from '@/components/dashboard/UpcomingEventsWidget';
import TasksDueSoonWidget from '@/components/dashboard/TasksDueSoonWidget';
import RecentActivityWidget from '@/components/dashboard/RecentActivityWidget';
import CasesByStatusChart from '@/components/dashboard/CasesByStatusChart';
import RevenueTrendChart from '@/components/dashboard/RevenueTrendChart';

export default function DashboardPage() {
  const { profile, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <MetricCards />
      
      {/* Row 2 — Events + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <UpcomingEventsWidget />
        </div>
        <div className="lg:col-span-2">
          <TasksDueSoonWidget />
        </div>
      </div>

      {/* Row 3 — Activity */}
      <RecentActivityWidget />

      {/* Row 4 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CasesByStatusChart />
        <RevenueTrendChart />
      </div>
    </div>
  );
}
