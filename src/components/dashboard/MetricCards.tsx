import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Scale, FileCheck, CheckSquare, Clock, Receipt, type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
  href: string;
}

function MetricCard({ icon: Icon, iconColor, iconBg, value, label, href }: MetricCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(href)}
      className="bg-card border border-border rounded-card p-5 shadow-sm hover:shadow-md transition-shadow duration-200 text-start w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-card flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-display-sm text-foreground">{value}</p>
      <p className="text-body-sm text-muted-foreground mt-1">{label}</p>
    </button>
  );
}

export default function MetricCards() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [activeCasesCount, setActiveCasesCount] = useState(0);
  const [activeErrandsCount, setActiveErrandsCount] = useState(0);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const fetchCounts = async () => {
      const [casesRes, errandsRes] = await Promise.all([
        supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .in('status', ['active', 'pending_hearing', 'pending_judgment', 'intake']),
        supabase
          .from('errands')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .in('status', ['new', 'in_progress', 'awaiting_documents', 'submitted_to_government', 'under_review_by_government', 'additional_requirements']),
      ]);
      setActiveCasesCount(casesRes.count || 0);
      setActiveErrandsCount(errandsRes.count || 0);
    };
    fetchCounts();
  }, [profile?.organization_id]);

  const cards: MetricCardProps[] = [
    {
      icon: Scale,
      iconColor: '#3B82F6',
      iconBg: '#EFF6FF',
      value: String(activeCasesCount),
      label: t('dashboard.activeCases'),
      href: '/cases',
    },
    {
      icon: FileCheck,
      iconColor: '#8B5CF6',
      iconBg: '#F5F3FF',
      value: String(activeErrandsCount),
      label: t('dashboard.activeErrands'),
      href: '/errands',
    },
    {
      icon: CheckSquare,
      iconColor: '#F59E0B',
      iconBg: '#FFFBEB',
      value: '0',
      label: t('dashboard.pendingTasks'),
      href: '/tasks',
    },
    {
      icon: Clock,
      iconColor: '#22C55E',
      iconBg: '#F0FDF4',
      value: language === 'ar' ? '٠ س' : '0h',
      label: t('dashboard.billableHours'),
      href: '/time-tracking',
    },
    {
      icon: Receipt,
      iconColor: '#EF4444',
      iconBg: '#FEF2F2',
      value: language === 'ar' ? '٠ د.ع' : '0 IQD',
      label: t('dashboard.outstandingInvoices'),
      href: '/billing',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div key={i} className={i === cards.length - 1 ? 'col-span-2 md:col-span-1' : ''}>
          <MetricCard {...card} />
        </div>
      ))}
    </div>
  );
}
