import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSavedReports } from '@/hooks/useReportData';
import {
  BarChart3, Users, DollarSign, Scale, FileCheck, UserCheck,
  Clock, Receipt, ArrowRight, Lock, Trash2, FileBarChart, BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const reportCards = [
  { key: 'firmPerformance', icon: BarChart3, color: 'bg-info/10 text-info', link: '/reports/firm-performance', adminOnly: false },
  { key: 'employee360', icon: Users, color: 'bg-accent/10 text-accent', link: '/reports/employee-360', adminOnly: true },
  { key: 'financialSummary', icon: DollarSign, color: 'bg-success/10 text-success', link: '/reports/financial', adminOnly: true },
  { key: 'caseAnalytics', icon: Scale, color: 'bg-info/10 text-info', link: '/reports/cases', adminOnly: false },
  { key: 'errandAnalytics', icon: FileCheck, color: 'bg-purple-100 text-purple-600', link: '/reports/errands', adminOnly: false },
  { key: 'clientAnalytics', icon: UserCheck, color: 'bg-accent/10 text-accent', link: '/reports/clients', adminOnly: false },
  { key: 'timeUtilization', icon: Clock, color: 'bg-warning/10 text-warning', link: '/reports/time', adminOnly: false },
  { key: 'billingAging', icon: Receipt, color: 'bg-destructive/10 text-destructive', link: '/reports/billing-aging', adminOnly: true },
];

const descMap: Record<string, { en: string; ar: string }> = {
  firmPerformance: { en: "Overview of your firm's key metrics and trends", ar: 'نظرة عامة على مؤشرات مكتبك والاتجاهات' },
  employee360: { en: 'Individual performance metrics for each team member', ar: 'مؤشرات الأداء الفردية لكل عضو فريق' },
  financialSummary: { en: 'Revenue, billing, payments, and financial health', ar: 'الإيرادات والفوترة والمدفوعات والصحة المالية' },
  caseAnalytics: { en: 'Case distribution, outcomes, and duration analysis', ar: 'توزيع القضايا والنتائج وتحليل المدة' },
  errandAnalytics: { en: 'Errand completion rates, durations, and bottlenecks', ar: 'نسب إكمال المعاملات والمدد والعقبات' },
  clientAnalytics: { en: 'Client growth, retention, and revenue per client', ar: 'نمو العملاء والاحتفاظ والإيرادات لكل عميل' },
  timeUtilization: { en: 'How your team spends their time', ar: 'كيف يقضي فريقك وقته' },
  billingAging: { en: 'Invoice aging, collection rates, and payment trends', ar: 'تقادم الفواتير ونسب التحصيل واتجاهات الدفع' },
};

const reportTypeNames: Record<string, { en: string; ar: string }> = {
  firm_performance: { en: 'Firm Performance', ar: 'أداء المكتب' },
  employee_360: { en: 'Employee 360°', ar: 'تقييم الموظف ٣٦٠°' },
  financial_summary: { en: 'Financial Summary', ar: 'الملخص المالي' },
  case_analytics: { en: 'Case Analytics', ar: 'تحليلات القضايا' },
  errand_analytics: { en: 'Errand Analytics', ar: 'تحليلات المعاملات' },
  client_analytics: { en: 'Client Analytics', ar: 'تحليلات العملاء' },
  time_utilization: { en: 'Time Utilization', ar: 'استخدام الوقت' },
  billing_aging: { en: 'Billing & Aging', ar: 'الفوترة والتقادم' },
  custom: { en: 'Custom', ar: 'مخصص' },
};

export default function ReportsPage() {
  const { t, language, isRTL } = useLanguage();
  const { isRole } = useAuth();
  const navigate = useNavigate();
  const { reports, loading: reportsLoading, deleteReport } = useSavedReports();
  const isAdmin = isRole('firm_admin');

  return (
    <div>
      <PageHeader
        title="Reports"
        titleAr="التقارير"
        subtitle="Analytics and insights for your firm"
        subtitleAr="التحليلات والرؤى لمكتبك"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير' },
        ]}
      />

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {reportCards.map((card) => {
          const Icon = card.icon;
          const locked = card.adminOnly && !isAdmin;
          const desc = descMap[card.key];

          return (
            <Card
              key={card.key}
              className={cn(
                'transition-shadow cursor-pointer hover:shadow-md border',
                locked && 'opacity-60 cursor-not-allowed'
              )}
              onClick={() => !locked && navigate(card.link)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', card.color)}>
                    <Icon size={24} />
                  </div>
                  {locked && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock size={16} className="text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>{language === 'ar' ? 'للمسؤولين فقط' : 'Admin only'}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <h3 className="text-heading-sm text-foreground mb-1">{t(`reports.${card.key}`)}</h3>
                <p className="text-body-sm text-muted-foreground line-clamp-2 mb-4">
                  {language === 'ar' ? desc.ar : desc.en}
                </p>
                <div className={cn('flex items-center gap-1 text-body-sm text-accent font-medium', isRTL && 'flex-row-reverse')}>
                  <span>{language === 'ar' ? 'عرض التقرير' : 'View Report'}</span>
                  <ArrowRight size={14} className={cn(isRTL && 'rotate-180')} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Saved Reports */}
      <div>
        <h2 className="text-heading-lg text-foreground mb-4">{t('reports.savedReports')}</h2>
        {reports.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No saved reports yet"
            titleAr="لا توجد تقارير محفوظة بعد"
            subtitle="Generate a report and save it for quick access."
            subtitleAr="أنشئ تقريراً واحفظه للوصول السريع."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {reports.map((report: any) => {
              const typeName = reportTypeNames[report.report_type] || { en: report.report_type, ar: report.report_type };
              return (
                <Card key={report.id} className="border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileBarChart size={20} className="text-muted-foreground" />
                      <div>
                        <p className="text-body-md font-medium text-foreground">{language === 'ar' ? (report.name_ar || report.name) : report.name}</p>
                        <p className="text-body-sm text-muted-foreground">
                          {language === 'ar' ? typeName.ar : typeName.en}
                          {report.date_range_start && ` • ${report.date_range_start} → ${report.date_range_end}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm text-muted-foreground hidden sm:inline">
                        {format(new Date(report.created_at), 'MMM d, yyyy')}
                      </span>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
