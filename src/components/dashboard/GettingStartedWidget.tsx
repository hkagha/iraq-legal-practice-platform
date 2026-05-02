import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  FolderOpen,
  Receipt,
  Scale,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type ChecklistItem = {
  key: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  href: string;
  action: string;
  actionAr: string;
  done: boolean;
  icon: typeof CheckCircle2;
};

type ChecklistState = {
  clients: number;
  cases: number;
  errands: number;
  documents: number;
  staff: number;
  portalLinks: number;
  aiUsage: number;
  billingRates: number;
  trustAccounts: number;
};

const initialState: ChecklistState = {
  clients: 0,
  cases: 0,
  errands: 0,
  documents: 0,
  staff: 0,
  portalLinks: 0,
  aiUsage: 0,
  billingRates: 0,
  trustAccounts: 0,
};

export default function GettingStartedWidget() {
  const { profile, organization } = useAuth();
  const { language } = useLanguage();
  const isAR = language === 'ar';
  const [counts, setCounts] = useState<ChecklistState>(initialState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.organization_id || profile.role !== 'firm_admin') return;

    const orgId = profile.organization_id;
    const countRows = async (table: string, build?: (query: any) => any) => {
      let query = supabase.from(table as any).select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
      if (build) query = build(query);
      const { count } = await query;
      return count || 0;
    };

    const load = async () => {
      setLoading(true);
      try {
        const [persons, entities, cases, errands, documents, staff, portalLinks, aiUsage, billingRates, trustAccounts] = await Promise.all([
          countRows('persons'),
          countRows('entities'),
          countRows('cases'),
          countRows('errands'),
          countRows('documents', (query) => query.eq('status', 'active')),
          countRows('profiles', (query) => query.neq('id', profile.id).in('role', ['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant'])),
          countRows('portal_user_links', (query) => query.eq('is_active', true)),
          countRows('ai_usage_log'),
          countRows('billing_rates'),
          countRows('trust_accounts'),
        ]);

        setCounts({
          clients: persons + entities,
          cases,
          errands,
          documents,
          staff,
          portalLinks,
          aiUsage,
          billingRates,
          trustAccounts,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profile?.organization_id, profile?.id, profile?.role]);

  const orgProfileDone = Boolean((organization as any)?.phone && (organization as any)?.city);

  const items = useMemo<ChecklistItem[]>(() => [
    {
      key: 'firm-profile',
      title: 'Complete firm profile',
      titleAr: 'إكمال ملف المكتب',
      description: 'Add phone, city, branding, and core firm details.',
      descriptionAr: 'أضف الهاتف والمدينة والهوية البصرية وبيانات المكتب الأساسية.',
      href: '/settings',
      action: 'Open settings',
      actionAr: 'فتح الإعدادات',
      done: orgProfileDone,
      icon: Building2,
    },
    {
      key: 'first-client',
      title: 'Add first client or party',
      titleAr: 'إضافة أول موكل أو طرف',
      description: 'Create a person or legal entity in the party database.',
      descriptionAr: 'أنشئ شخصاً أو جهة اعتبارية في قاعدة بيانات الأطراف.',
      href: '/clients',
      action: 'Add client',
      actionAr: 'إضافة موكل',
      done: counts.clients > 0,
      icon: Users,
    },
    {
      key: 'first-case',
      title: 'Create first case',
      titleAr: 'إنشاء أول قضية',
      description: 'Open a contentious matter with parties and conflict review.',
      descriptionAr: 'افتح ملفاً نزاعياً مع الأطراف وفحص تعارض المصالح.',
      href: '/cases/new',
      action: 'New case',
      actionAr: 'قضية جديدة',
      done: counts.cases > 0,
      icon: Scale,
    },
    {
      key: 'first-errand',
      title: 'Create first errand',
      titleAr: 'إنشاء أول معاملة',
      description: 'Track a non-contentious government or administrative service.',
      descriptionAr: 'تابع خدمة حكومية أو إدارية غير نزاعية.',
      href: '/errands/new',
      action: 'New errand',
      actionAr: 'معاملة جديدة',
      done: counts.errands > 0,
      icon: Briefcase,
    },
    {
      key: 'first-document',
      title: 'Upload first document',
      titleAr: 'رفع أول مستند',
      description: 'Start building the searchable AI-indexed archive.',
      descriptionAr: 'ابدأ بناء الأرشيف القابل للبحث والمفهرس بالذكاء الاصطناعي.',
      href: '/documents',
      action: 'Open documents',
      actionAr: 'فتح المستندات',
      done: counts.documents > 0,
      icon: Upload,
    },
    {
      key: 'invite-staff',
      title: 'Invite staff',
      titleAr: 'دعوة فريق العمل',
      description: 'Add lawyers, paralegals, secretaries, or accountants.',
      descriptionAr: 'أضف المحامين والمعاونين والسكرتارية والمحاسبين.',
      href: '/settings',
      action: 'Manage team',
      actionAr: 'إدارة الفريق',
      done: counts.staff > 0,
      icon: UserPlus,
    },
    {
      key: 'portal-access',
      title: 'Create client portal access',
      titleAr: 'إنشاء دخول بوابة العميل',
      description: 'Give a client representative access to visible matters.',
      descriptionAr: 'امنح ممثل العميل وصولاً إلى الملفات المرئية له.',
      href: '/clients',
      action: 'Manage clients',
      actionAr: 'إدارة الموكلين',
      done: counts.portalLinks > 0,
      icon: FolderOpen,
    },
    {
      key: 'try-ai',
      title: 'Try AI drafting or research',
      titleAr: 'تجربة الصياغة أو البحث بالذكاء الاصطناعي',
      description: 'Generate a draft or research memo and save it to documents.',
      descriptionAr: 'أنشئ مسودة أو مذكرة بحث واحفظها ضمن المستندات.',
      href: '/ai/draft',
      action: 'Open AI',
      actionAr: 'فتح الذكاء الاصطناعي',
      done: counts.aiUsage > 0,
      icon: Bot,
    },
    {
      key: 'billing-trust',
      title: 'Set billing and trust preferences',
      titleAr: 'ضبط الفوترة وحسابات الأمانات',
      description: 'Set rates and create at least one trust account if used.',
      descriptionAr: 'حدد الأجور وأنشئ حساب أمانات واحداً على الأقل عند الحاجة.',
      href: '/settings',
      action: 'Billing settings',
      actionAr: 'إعدادات الفوترة',
      done: counts.billingRates > 0 || counts.trustAccounts > 0,
      icon: Receipt,
    },
  ], [counts, orgProfileDone]);

  if (profile?.role !== 'firm_admin') return null;

  const completed = items.filter((item) => item.done).length;
  const percent = Math.round((completed / items.length) * 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-heading-sm">
              {isAR ? 'قائمة البدء' : 'Getting started'}
            </CardTitle>
            <p className="text-body-sm text-muted-foreground mt-1">
              {isAR
                ? 'خطوات عملية لتجهيز المكتب وتشغيل أهم وظائف قانوني.'
                : 'Practical steps to activate the firm workspace and core Qanuni workflows.'}
            </p>
          </div>
          <div className="text-body-sm text-muted-foreground">
            {completed}/{items.length}
          </div>
        </div>
        <Progress value={loading ? undefined : percent} className="h-1.5 mt-3" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {items.map((item) => {
            const Icon = item.done ? CheckCircle2 : item.icon;
            return (
              <div
                key={item.key}
                className={cn(
                  'border border-border rounded-md p-3 min-h-[128px] flex flex-col justify-between gap-3',
                  item.done && 'bg-success-light/40 border-success/20',
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', item.done ? 'text-success' : 'text-accent')} />
                  <div className="min-w-0">
                    <div className="text-body-sm font-medium text-foreground">
                      {isAR ? item.titleAr : item.title}
                    </div>
                    <p className="text-body-xs text-muted-foreground mt-1 leading-relaxed">
                      {isAR ? item.descriptionAr : item.description}
                    </p>
                  </div>
                </div>
                <Button asChild variant={item.done ? 'ghost' : 'outline'} size="sm" className="justify-start">
                  <Link to={item.href}>
                    {item.done ? (isAR ? 'مراجعة' : 'Review') : (isAR ? item.actionAr : item.action)}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
