import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Scale, Building, DollarSign, Users, ChevronRight, ChevronLeft, X } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t, language, isRTL } = useLanguage();
  const { profile, organization } = useAuth();
  const [step, setStep] = useState(0); // 0 = welcome, 1-3 = steps
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [orgPhone, setOrgPhone] = useState('');
  const [orgCity, setOrgCity] = useState('');

  // Step 2 state
  const [currency, setCurrency] = useState('IQD');
  const [hourlyRate, setHourlyRate] = useState('');

  // Step 3 state
  const [inviteEmail, setInviteEmail] = useState('');

  const handleSkip = async () => {
    await supabase.from('profiles').update({ onboarding_completed: true, onboarding_step: 3 } as any).eq('id', profile!.id);
    onComplete();
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save org updates if provided
      if (organization && (orgPhone || orgCity)) {
        await supabase.from('organizations').update({
          phone: orgPhone || undefined,
          city: orgCity || undefined,
        } as any).eq('id', organization.id);
      }

      // Save default billing rate if provided
      if (hourlyRate && profile?.organization_id) {
        await supabase.from('billing_rates').insert({
          organization_id: profile.organization_id,
          rate: parseFloat(hourlyRate),
          currency,
          is_default: true,
          effective_from: new Date().toISOString().split('T')[0],
        });
      }

      await supabase.from('profiles').update({ onboarding_completed: true, onboarding_step: 3 } as any).eq('id', profile!.id);
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  // Welcome screen
  if (step === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-8">
          <Scale className="h-16 w-16 text-accent mx-auto" />
          <div>
            <h1 className="text-display-lg text-foreground">Qanuni / قانوني</h1>
            <p className="text-heading-sm text-muted-foreground mt-3">
              {language === 'ar' ? 'مرحباً بك في مركز ممارستك القانونية' : 'Welcome to Your Legal Practice Hub'}
            </p>
            <p className="text-body-md text-muted-foreground mt-2">
              {language === 'ar' ? 'لنقم بإعداد مساحة عملك في خطوات سهلة' : "Let's set up your workspace in a few easy steps"}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={() => setStep(1)} className="gap-2">
              {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
              <NextIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              {language === 'ar' ? 'تخطي الإعداد' : 'Skip Setup'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-heading-lg text-foreground">
            {language === 'ar' ? `الخطوة ${step} من 3` : `Step ${step} of 3`}
          </h2>
          <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Progress value={(step / 3) * 100} className="h-1.5" />

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Building className="h-6 w-6 text-accent" />
              <h3 className="text-heading-sm">{language === 'ar' ? 'ملف المؤسسة' : 'Organization Profile'}</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label>{language === 'ar' ? 'اسم المؤسسة' : 'Organization Name'}</Label>
                <Input value={organization?.name || ''} disabled className="mt-1" />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                <Input value={orgPhone} onChange={e => setOrgPhone(e.target.value)} placeholder="+964..." className="mt-1" />
              </div>
              <div>
                <Label>{language === 'ar' ? 'المدينة / المحافظة' : 'City / Governorate'}</Label>
                <Input value={orgCity} onChange={e => setOrgCity(e.target.value)} placeholder={language === 'ar' ? 'بغداد' : 'Baghdad'} className="mt-1" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-6 w-6 text-accent" />
              <h3 className="text-heading-sm">{language === 'ar' ? 'أساسيات الفوترة' : 'Billing Basics'}</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label>{language === 'ar' ? 'العملة الافتراضية' : 'Default Currency'}</Label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-body-md">
                  <option value="IQD">{language === 'ar' ? 'دينار عراقي (IQD)' : 'Iraqi Dinar (IQD)'}</option>
                  <option value="USD">{language === 'ar' ? 'دولار أمريكي (USD)' : 'US Dollar (USD)'}</option>
                </select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'سعر الساعة الافتراضي' : 'Default Hourly Rate'}</Label>
                <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="0" className="mt-1" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-6 w-6 text-accent" />
              <h3 className="text-heading-sm">{language === 'ar' ? 'دعوة فريقك' : 'Invite Your Team'}</h3>
            </div>
            <div>
              <Label>{language === 'ar' ? 'البريد الإلكتروني لعضو الفريق' : 'Team member email'}</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@email.com" className="mt-1" />
              <p className="text-body-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'يمكنك تخطي هذه الخطوة ودعوة أعضاء لاحقاً من الإعدادات' : 'You can skip this and invite members later from Settings'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
              <BackIcon className="h-4 w-4" />
              {t('common.back')}
            </Button>
          ) : <div />}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="gap-2">
              {t('common.next')}
              <NextIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving} className="gap-2">
              {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'إكمال الإعداد' : 'Complete Setup')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
