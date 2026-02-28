import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, Users, HardDrive, Briefcase, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubscriptionSection() {
  const { organization } = useAuth();
  const { language } = useLanguage();

  const tier = organization?.subscription_tier || 'free';
  const status = organization?.subscription_status || 'trial';
  const tierLabel = tier === 'professional' ? 'Professional' : tier === 'enterprise' ? 'Enterprise' : 'Free Trial';

  const plans = [
    { name: 'Free', members: '3', storage: '1 GB', cases: '10', portal: false, ai: false, support: false },
    { name: 'Professional', members: '15', storage: '10 GB', cases: language === 'ar' ? 'غير محدود' : 'Unlimited', portal: true, ai: false, support: false },
    { name: 'Enterprise', members: language === 'ar' ? 'غير محدود' : 'Unlimited', storage: '100 GB', cases: language === 'ar' ? 'غير محدود' : 'Unlimited', portal: true, ai: true, support: true },
  ];

  const features = [
    { label: language === 'ar' ? 'أعضاء الفريق' : 'Team Members', key: 'members' },
    { label: language === 'ar' ? 'المساحة' : 'Storage', key: 'storage' },
    { label: language === 'ar' ? 'القضايا' : 'Cases', key: 'cases' },
    { label: language === 'ar' ? 'بوابة العميل' : 'Client Portal', key: 'portal' },
    { label: language === 'ar' ? 'ميزات الذكاء الاصطناعي' : 'AI Features', key: 'ai' },
    { label: language === 'ar' ? 'دعم أولوية' : 'Priority Support', key: 'support' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'الاشتراك والخطة' : 'Subscription & Plan'}</h2>
      </div>

      {/* Current Plan */}
      <div className="border-2 border-accent rounded-lg p-6 bg-accent/5">
        <div className="flex items-center gap-3 mb-3">
          <Crown size={24} className="text-accent" />
          <div>
            <h3 className="text-heading-lg text-foreground">{tierLabel}</h3>
            <span className={cn('text-body-sm px-2 py-0.5 rounded-full', status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
              {status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'تجريبي' : 'Trial')}
            </span>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="space-y-4">
        <h3 className="text-heading-md text-foreground">{language === 'ar' ? 'الاستخدام' : 'Usage'}</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-body-sm mb-1">
              <span className="flex items-center gap-1.5"><Users size={14} /> {language === 'ar' ? 'أعضاء الفريق' : 'Team Members'}</span>
              <span>1 / {(organization as any)?.max_users || 15}</span>
            </div>
            <Progress value={10} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-body-sm mb-1">
              <span className="flex items-center gap-1.5"><HardDrive size={14} /> {language === 'ar' ? 'المساحة' : 'Storage'}</span>
              <span>0 MB / {(organization as any)?.max_storage_mb || 1024} MB</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="border-t pt-6">
        <h3 className="text-heading-md text-foreground mb-4">{language === 'ar' ? 'مقارنة الخطط' : 'Plan Comparison'}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b">
                <th className="text-start py-2 pe-4 font-medium text-muted-foreground">{language === 'ar' ? 'الميزة' : 'Feature'}</th>
                {plans.map(p => (
                  <th key={p.name} className="text-center py-2 px-3 font-semibold">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr key={f.key} className="border-b last:border-0">
                  <td className="py-2.5 pe-4 text-foreground">{f.label}</td>
                  {plans.map(p => {
                    const val = (p as any)[f.key];
                    return (
                      <td key={p.name} className="text-center py-2.5 px-3">
                        {typeof val === 'boolean' ? (
                          val ? <Check size={16} className="mx-auto text-green-600" /> : <X size={16} className="mx-auto text-muted-foreground/40" />
                        ) : (
                          <span className="text-foreground">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button variant="outline" className="border-accent text-accent hover:bg-accent/5" onClick={() => window.open('mailto:sales@qanuni.app')}>
            {language === 'ar' ? 'تواصل معنا للترقية' : 'Contact us to upgrade'}
          </Button>
        </div>
      </div>

      {/* Billing History */}
      <div className="border-t pt-6">
        <h3 className="text-heading-md text-foreground mb-2">{language === 'ar' ? 'سجل الفوترة' : 'Billing History'}</h3>
        <p className="text-body-md text-muted-foreground">
          {language === 'ar' ? 'سجل الفوترة سيكون متاحاً عند تفعيل معالجة الدفع.' : 'Billing history will be available when payment processing is enabled.'}
        </p>
      </div>
    </div>
  );
}
