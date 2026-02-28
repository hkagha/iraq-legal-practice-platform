import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserPlus, Search, MoreVertical, Edit, ShieldCheck, UserMinus, UserCheck, UserX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import InviteMemberModal from './InviteMemberModal';
import ChangeRoleModal from './ChangeRoleModal';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

const roleBadgeStyles: Record<string, string> = {
  firm_admin: 'bg-accent/15 text-accent border-accent/30',
  lawyer: 'bg-blue-100 text-blue-700 border-blue-200',
  paralegal: 'bg-purple-100 text-purple-700 border-purple-200',
  secretary: 'bg-muted text-muted-foreground border-border',
  accountant: 'bg-green-100 text-green-700 border-green-200',
};

export default function TeamMembersSection() {
  const { language, t } = useLanguage();
  const { organization, user, isRole } = useAuth();
  const isAdmin = isRole('firm_admin');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [roleTarget, setRoleTarget] = useState<TeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchMembers = async () => {
    if (!organization?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, email, phone, role, avatar_url, is_active, created_at')
      .eq('organization_id', organization.id)
      .order('role', { ascending: true })
      .order('first_name', { ascending: true });
    if (data) {
      // Sort: admins first, then alphabetical
      const sorted = (data as unknown as TeamMember[]).sort((a, b) => {
        if (a.role === 'firm_admin' && b.role !== 'firm_admin') return -1;
        if (b.role === 'firm_admin' && a.role !== 'firm_admin') return 1;
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      });
      setMembers(sorted);
    }
  };

  useEffect(() => { fetchMembers(); }, [organization?.id]);

  const getName = (m: TeamMember) => {
    if (language === 'ar' && m.first_name_ar && m.last_name_ar) return `${m.first_name_ar} ${m.last_name_ar}`;
    return `${m.first_name} ${m.last_name}`;
  };

  const getInitials = (m: TeamMember) => {
    return ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase();
  };

  const getRoleLabel = (role: string) => t(`team.roles.${role}`) || role;

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getName(m).toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const adminCount = members.filter(m => m.role === 'firm_admin' && m.is_active).length;

  const handleToggleActive = async (member: TeamMember) => {
    const newActive = !member.is_active;
    const { error } = await supabase.from('profiles').update({ is_active: newActive } as any).eq('id', member.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newActive ? t('team.activate') : t('team.deactivate'));
    fetchMembers();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    if (removeTarget.role === 'firm_admin' && adminCount <= 1) {
      toast.error(t('team.lastAdmin'));
      setRemoveTarget(null);
      return;
    }
    setRemoving(true);
    const { error } = await supabase.from('profiles').update({ organization_id: null, is_active: false } as any).eq('id', removeTarget.id);
    setRemoving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('team.removeFromOrg'));
    setRemoveTarget(null);
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-heading-lg text-foreground">{t('team.title')}</h2>
          <p className="text-body-sm text-muted-foreground mt-1">{t('team.subtitle')} · {members.length} {t('team.membersCount').replace('{{n}}', '')}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInvite(true)} className="h-10 bg-accent text-accent-foreground hover:bg-accent-dark">
            <UserPlus size={16} />
            {t('team.inviteMember')}
          </Button>
        )}
      </div>

      <FormInput
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('common.search')}
        startIcon={Search}
      />

      <div className="space-y-2">
        {filtered.map(member => {
          const isMe = member.id === user?.id;
          return (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-4 p-4 bg-card border border-border rounded-lg transition-colors hover:bg-muted/30',
                isMe && 'border-s-2 border-s-accent',
              )}
            >
              <Avatar className="h-12 w-12 shrink-0">
                {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                <AvatarFallback className="bg-accent/15 text-accent font-semibold text-sm">
                  {getInitials(member)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-heading-sm text-foreground truncate">{getName(member)}</span>
                  {isMe && <span className="text-body-sm text-accent font-medium">{t('team.you')}</span>}
                </div>
                <p className="text-body-sm text-muted-foreground truncate">{member.email}</p>
                {member.phone && <p className="text-body-sm text-muted-foreground/70">{member.phone}</p>}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className={cn('text-xs border', roleBadgeStyles[member.role] || '')}>
                  {getRoleLabel(member.role)}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', member.is_active ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                  <span className="text-body-sm text-muted-foreground hidden sm:inline">
                    {member.is_active ? t('team.active') : t('team.inactive')}
                  </span>
                </div>
                {isAdmin && !isMe && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setRoleTarget(member)}>
                        <ShieldCheck size={14} className="me-2" /> {t('team.changeRole')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(member)}>
                        {member.is_active ? <UserX size={14} className="me-2" /> : <UserCheck size={14} className="me-2" />}
                        {member.is_active ? t('team.deactivate') : t('team.activate')}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setRemoveTarget(member)}>
                        <UserMinus size={14} className="me-2" /> {t('team.removeFromOrg')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('common.noResults')}</p>
        )}
      </div>

      <InviteMemberModal open={showInvite} onClose={() => setShowInvite(false)} onSuccess={fetchMembers} />
      {roleTarget && (
        <ChangeRoleModal member={roleTarget} adminCount={adminCount} onClose={() => setRoleTarget(null)} onSuccess={fetchMembers} />
      )}
      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        isLoading={removing}
        type="danger"
        title="Remove Member"
        titleAr="إزالة العضو"
        message={`Remove ${removeTarget ? getName(removeTarget) : ''} from this organization? They will lose access to all data.`}
        messageAr={`إزالة ${removeTarget ? getName(removeTarget) : ''} من هذه المؤسسة؟ سيفقد الوصول لجميع البيانات.`}
        confirmLabel="Remove"
        confirmLabelAr="إزالة"
      />
    </div>
  );
}
