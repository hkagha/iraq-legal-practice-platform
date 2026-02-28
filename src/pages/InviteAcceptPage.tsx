import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Building } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  organization_id: string;
  expires_at: string;
  personal_message: string | null;
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [orgName, setOrgName] = useState('');
  const [status, setStatus] = useState<'valid' | 'expired' | 'used' | 'notfound'>('valid');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) { setStatus('notfound'); setLoading(false); return; }

      // Use a direct query since this is a public page (no auth)
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) { setStatus('notfound'); setLoading(false); return; }

      const inv = data as unknown as InvitationData;

      if (inv.status === 'accepted') { setStatus('used'); setLoading(false); return; }
      if (inv.status === 'cancelled' || inv.status === 'expired') { setStatus('expired'); setLoading(false); return; }
      if (new Date(inv.expires_at) < new Date()) { setStatus('expired'); setLoading(false); return; }

      setInvitation(inv);
      setFirstName(inv.first_name || '');
      setLastName(inv.last_name || '');

      // Fetch org name
      const { data: org } = await supabase
        .from('organizations')
        .select('name, name_ar')
        .eq('id', inv.organization_id)
        .single();
      if (org) setOrgName(language === 'ar' ? (org as any).name_ar || (org as any).name : (org as any).name);

      setLoading(false);
    };
    fetchInvitation();
  }, [token, language]);

  const handleAcceptExisting = async () => {
    if (!invitation || !user) return;
    setSubmitting(true);
    // Update profile with new org
    await supabase.from('profiles').update({
      organization_id: invitation.organization_id,
      role: invitation.role,
    } as any).eq('id', user.id);
    // Mark invitation accepted
    await supabase.from('invitations').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    } as any).eq('id', invitation.id);
    setSubmitting(false);
    toast.success(t('team.invite.accept'));
    navigate('/dashboard');
  };

  const handleRegister = async () => {
    if (!invitation || !firstName || !password) return;
    setSubmitting(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: invitation.role,
        },
      },
    });

    if (authError) { toast.error(authError.message); setSubmitting(false); return; }
    if (!authData.user) { toast.error('Registration failed'); setSubmitting(false); return; }

    // Wait a bit for the trigger to create profile, then update
    await new Promise(r => setTimeout(r, 1000));

    await supabase.from('profiles').update({
      organization_id: invitation.organization_id,
      role: invitation.role,
      first_name: firstName,
      last_name: lastName,
    } as any).eq('id', authData.user.id);

    await supabase.from('invitations').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    } as any).eq('id', invitation.id);

    setSubmitting(false);
    toast.success(t('team.invite.accept'));
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (status === 'expired' || status === 'notfound') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle size={48} className="text-destructive mb-4" />
            <h2 className="text-heading-lg text-foreground mb-2">{t('team.invite.expired')}</h2>
            <p className="text-body-md text-muted-foreground">
              {language === 'ar'
                ? 'يرجى الاتصال بمدير المؤسسة لإرسال دعوة جديدة.'
                : 'Please ask your administrator to send a new invitation.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 size={48} className="text-green-500 mb-4" />
            <h2 className="text-heading-lg text-foreground mb-2">{t('team.invite.alreadyUsed')}</h2>
            <Button className="mt-4" onClick={() => navigate('/login')}>{t('auth.signIn')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = t(`team.roles.${invitation?.role}`);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-3">
            <Building size={28} className="text-accent" />
          </div>
          <CardTitle className="text-heading-lg">{orgName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-body-md text-center text-muted-foreground">
            {language === 'ar'
              ? `مرحباً بك! تمت دعوتك بصفة ${roleLabel}.`
              : `Welcome! You've been invited as a ${roleLabel}.`}
          </p>
          {invitation?.personal_message && (
            <div className="bg-muted/50 rounded-lg p-3 text-body-sm text-foreground italic">
              "{(invitation as any).personal_message}"
            </div>
          )}

          {user ? (
            <Button onClick={handleAcceptExisting} disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent-dark">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t('team.invite.accept')}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('auth.firstName')} required>
                  <FormInput value={firstName} onChange={e => setFirstName(e.target.value)} />
                </FormField>
                <FormField label={t('auth.lastName')}>
                  <FormInput value={lastName} onChange={e => setLastName(e.target.value)} />
                </FormField>
              </div>
              <FormField label={t('auth.email')}>
                <FormInput value={invitation?.email || ''} disabled />
              </FormField>
              <FormField label={t('auth.password')} required>
                <FormInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </FormField>
              <Button onClick={handleRegister} disabled={submitting || !firstName || !password} className="w-full bg-accent text-accent-foreground hover:bg-accent-dark">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {t('team.invite.accept')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
