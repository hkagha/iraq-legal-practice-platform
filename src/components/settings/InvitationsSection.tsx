import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export default function InvitationsSection() {
  const { t } = useLanguage();
  const { organization } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showAccepted, setShowAccepted] = useState(false);

  const fetchInvitations = async () => {
    if (!organization?.id) return;
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    if (data) setInvitations(data as unknown as Invitation[]);
  };

  useEffect(() => { fetchInvitations(); }, [organization?.id]);

  const pending = invitations.filter(i => i.status === 'pending');
  const accepted = invitations.filter(i => i.status === 'accepted');

  const getName = (i: Invitation) => {
    const parts = [i.first_name, i.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : i.email;
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success(t('team.invite.linkCopied'));
  };

  const handleResend = async (inv: Invitation) => {
    const newToken = crypto.randomUUID();
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('invitations')
      .update({ token: newToken, expires_at: newExpiry } as any)
      .eq('id', inv.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('team.invite.resend'));
    fetchInvitations();
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled' } as any)
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('team.invite.cancel'));
    fetchInvitations();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-heading-lg text-foreground">{t('settings.sections.invitations')}</h2>

      {pending.length === 0 ? (
        <p className="text-muted-foreground text-body-md py-8 text-center">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-2">
          {pending.map(inv => {
            const isExpired = new Date(inv.expires_at) < new Date();
            return (
              <div key={inv.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-body-md text-foreground font-medium truncate">{getName(inv)}</p>
                  <p className="text-body-sm text-muted-foreground">{inv.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">{t(`team.roles.${inv.role}`)}</Badge>
                {isExpired ? (
                  <Badge variant="destructive" className="text-xs">{t('team.invite.expired')}</Badge>
                ) : (
                  <span className="text-body-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                  </span>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(inv.token)} title={t('team.invite.copyLink')}>
                    <Copy size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResend(inv)} title={t('team.invite.resend')}>
                    <RefreshCw size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleCancel(inv.id)} title={t('team.invite.cancel')}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <button
            onClick={() => setShowAccepted(!showAccepted)}
            className="flex items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAccepted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {accepted.length} accepted
          </button>
          {showAccepted && (
            <div className="space-y-2 mt-3">
              {accepted.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 p-3 bg-muted/30 border border-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-foreground truncate">{getName(inv)}</p>
                    <p className="text-body-sm text-muted-foreground">{inv.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{t(`team.roles.${inv.role}`)}</Badge>
                  <span className="text-body-sm text-green-600">{t('team.invite.accept')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
