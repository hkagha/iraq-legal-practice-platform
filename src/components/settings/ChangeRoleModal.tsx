import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant'];

interface Props {
  member: { id: string; first_name: string; last_name: string; role: string };
  adminCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangeRoleModal({ member, adminCount, onClose, onSuccess }: Props) {
  const { t } = useLanguage();
  const [newRole, setNewRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const name = `${member.first_name} ${member.last_name}`;

  const isDowngradingAdmin = member.role === 'firm_admin' && newRole !== 'firm_admin';
  const isUpgradingToAdmin = member.role !== 'firm_admin' && newRole === 'firm_admin';
  const cantDowngrade = isDowngradingAdmin && adminCount <= 1;

  const handleSave = async () => {
    if (cantDowngrade) { toast.error(t('team.lastAdmin')); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ role: newRole } as any).eq('id', member.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('team.changeRole'));
    onSuccess();
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('team.changeRole')} — {name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label={t('team.invite.role')}>
            <FormSelect
              value={newRole}
              onValueChange={setNewRole}
              options={ROLES.map(r => ({ value: r, label: t(`team.roles.${r}`) }))}
            />
          </FormField>
          {isDowngradingAdmin && !cantDowngrade && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 text-amber-800 text-body-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Removing admin access means {name} will lose access to settings, team management, and financial reports.</span>
            </div>
          )}
          {isUpgradingToAdmin && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 text-amber-800 text-body-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Making {name} an admin gives them full access to all settings and data.</span>
            </div>
          )}
          {cantDowngrade && (
            <p className="text-destructive text-body-sm">{t('team.lastAdmin')}</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || newRole === member.role || cantDowngrade} className="bg-accent text-accent-foreground hover:bg-accent-dark">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {t('common.update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
