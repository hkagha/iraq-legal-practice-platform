import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Eye, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Access = 'full' | 'view' | 'none' | string;

interface PermRow {
  feature: string;
  featureAr: string;
  admin: Access;
  lawyer: Access;
  paralegal: Access;
  secretary: Access;
  accountant: Access;
}

const permissions: PermRow[] = [
  { feature: 'Dashboard', featureAr: 'لوحة التحكم', admin: 'full', lawyer: 'full', paralegal: 'full', secretary: 'View only', accountant: 'Financial only' },
  { feature: 'Clients', featureAr: 'العملاء', admin: 'full', lawyer: 'full', paralegal: 'full', secretary: 'view', accountant: 'view' },
  { feature: 'Cases', featureAr: 'القضايا', admin: 'full', lawyer: 'full', paralegal: 'full', secretary: 'view', accountant: 'view' },
  { feature: 'Errands', featureAr: 'المعاملات', admin: 'full', lawyer: 'full', paralegal: 'full', secretary: 'view', accountant: 'none' },
  { feature: 'Documents', featureAr: 'المستندات', admin: 'full', lawyer: 'full', paralegal: 'full', secretary: 'Upload/View', accountant: 'view' },
  { feature: 'Time Tracking', featureAr: 'تتبع الوقت', admin: 'All + Approve', lawyer: 'Own entries', paralegal: 'Own entries', secretary: 'Own entries', accountant: 'view' },
  { feature: 'Billing', featureAr: 'الفوترة', admin: 'full', lawyer: 'View own', paralegal: 'none', secretary: 'none', accountant: 'full' },
  { feature: 'Invoices', featureAr: 'الفواتير', admin: 'full', lawyer: 'view', paralegal: 'none', secretary: 'none', accountant: 'full' },
  { feature: 'Tasks', featureAr: 'المهام', admin: 'full', lawyer: 'full', paralegal: 'full', secretary: 'Own only', accountant: 'Own only' },
  { feature: 'Calendar', featureAr: 'التقويم', admin: 'full', lawyer: 'full', paralegal: 'full', secretary: 'full', accountant: 'view' },
  { feature: 'Reports', featureAr: 'التقارير', admin: 'full', lawyer: 'Non-financial', paralegal: 'Non-financial', secretary: 'none', accountant: 'Financial only' },
  { feature: 'Settings', featureAr: 'الإعدادات', admin: 'full', lawyer: 'Profile only', paralegal: 'Profile only', secretary: 'Profile only', accountant: 'Profile only' },
  { feature: 'Team Management', featureAr: 'إدارة الفريق', admin: 'full', lawyer: 'none', paralegal: 'none', secretary: 'none', accountant: 'none' },
];

const roles = [
  { key: 'firm_admin', style: 'bg-accent/15 text-accent border-accent/30' },
  { key: 'lawyer', style: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'paralegal', style: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'secretary', style: 'bg-muted text-muted-foreground border-border' },
  { key: 'accountant', style: 'bg-green-100 text-green-700 border-green-200' },
];

function CellIcon({ access }: { access: Access }) {
  if (access === 'full') return <Check size={16} className="text-green-600 mx-auto" />;
  if (access === 'view') return <Eye size={14} className="text-blue-500 mx-auto" />;
  if (access === 'none') return <Minus size={14} className="text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground text-center block">{access}</span>;
}

export default function RolesPermissionsSection() {
  const { language, t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-lg text-foreground">{t('team.permissions.title')}</h2>
        <p className="text-body-sm text-muted-foreground mt-1">{t('team.permissions.subtitle')}</p>
      </div>

      <div className="overflow-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-start p-3 font-semibold text-foreground sticky start-0 bg-muted/50 z-10 min-w-[140px]">
                {language === 'ar' ? 'الميزة' : 'Feature'}
              </th>
              {roles.map(r => (
                <th key={r.key} className="p-3 text-center min-w-[100px]">
                  <Badge variant="outline" className={cn('text-xs border', r.style)}>
                    {t(`team.roles.${r.key}`)}
                  </Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium text-foreground sticky start-0 bg-card z-10">
                  {language === 'ar' ? row.featureAr : row.feature}
                </td>
                <td className="p-3"><CellIcon access={row.admin} /></td>
                <td className="p-3"><CellIcon access={row.lawyer} /></td>
                <td className="p-3"><CellIcon access={row.paralegal} /></td>
                <td className="p-3"><CellIcon access={row.secretary} /></td>
                <td className="p-3"><CellIcon access={row.accountant} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-body-sm text-muted-foreground">{t('team.permissions.customNote')}</p>
    </div>
  );
}
