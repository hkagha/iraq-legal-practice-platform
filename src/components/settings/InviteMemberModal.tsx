import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMemberModal({ open, onClose, onSuccess }: Props) {
  const { language, t } = useLanguage();
  const { organization, user } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('lawyer');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail(''); setName(''); setRole('lawyer'); setMessage('');
    setInviteLink(''); setCopied(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSend = async () => {
    if (!email || !organization?.id || !user?.id) return;
    setSaving(true);

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        organization_id: organization.id,
        email: email.trim(),
        first_name: firstName,
        last_name: lastName,
        role,
        personal_message: message || null,
        invited_by: user.id,
      } as any)
      .select()
      .single();

    setSaving(false);
    if (error) { toast.error(error.message); return; }

    const token = (data as any).token;
    const link = `${window.location.origin}/invite/${token}`;
    setInviteLink(link);
    toast.success(t('team.invite.created'));
    onSuccess();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success(t('team.invite.linkCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('team.invite.title')}</DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4">
            <FormField label={t('team.invite.email')} required>
              <FormInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@firm.com" />
            </FormField>
            <FormField label={t('team.invite.name')}>
              <FormInput value={name} onChange={e => setName(e.target.value)} />
            </FormField>
            <FormField label={t('team.invite.role')} required>
              <FormSelect
                value={role}
                onValueChange={setRole}
                options={ROLES.map(r => ({
                  value: r,
                  label: `${t(`team.roles.${r}`)} — ${t(`team.roles.descriptions.${r}`)}`,
                }))}
              />
            </FormField>
            <FormField label={t('team.invite.message')}>
              <FormTextarea value={message} onChange={e => setMessage(e.target.value)} className="min-h-[60px]" />
            </FormField>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
              <Button onClick={handleSend} disabled={saving || !email} className="bg-accent text-accent-foreground hover:bg-accent-dark">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {t('team.invite.send')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-body-md text-foreground">{t('team.invite.shareLink')}</p>
            <div className="flex gap-2">
              <FormInput value={inviteLink} readOnly className="flex-1 text-sm font-mono" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </Button>
            </div>
            <p className="text-body-sm text-muted-foreground">{t('team.invite.expires')}</p>
            <DialogFooter>
              <Button onClick={handleClose}>{t('common.close')}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
