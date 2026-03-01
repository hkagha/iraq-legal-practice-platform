import { useEffect, useRef, useState } from 'react';
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
import AIInsightsWidget from '@/components/dashboard/AIInsightsWidget';
import GettingStartedWidget from '@/components/dashboard/GettingStartedWidget';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { runDailyNotificationChecks } from '@/lib/dailyNotificationChecks';
import { supabase } from '@/integrations/supabase/client';

export default function DashboardPage() {
  const { isLoading, profile } = useAuth();
  const checkedRef = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!profile?.organization_id || !profile?.id || checkedRef.current) return;
    checkedRef.current = true;
    runDailyNotificationChecks(profile.organization_id, profile.id);

    // Check onboarding status
    supabase.from('profiles').select('onboarding_completed').eq('id', profile.id).single().then(({ data }) => {
      if (data && !(data as any).onboarding_completed && profile.role === 'firm_admin') {
        setShowOnboarding(true);
      }
    });
  }, [profile?.organization_id, profile?.id, profile?.role]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      <DashboardHeader />

      {/* Getting Started Checklist */}
      <GettingStartedWidget />

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

      {/* AI Insights */}
      <AIInsightsWidget />

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
