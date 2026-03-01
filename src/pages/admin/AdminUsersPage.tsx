import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ChangeRoleModal from '@/components/settings/ChangeRoleModal';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  role: string;
  is_active: boolean;
  organization_id: string | null;
  last_active_at: string | null;
  created_at: string;
  org_name?: string;
}

export default function AdminUsersPage() {
  const { language } = useLanguage();
  const { profile: adminProfile } = useAuth();
  const isEN = language === 'en';
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [changeRoleUser, setChangeRoleUser] = useState<UserRow | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [usersRes, orgsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('organizations').select('id, name'),
    ]);
    const orgMap: Record<string, string> = {};
    (orgsRes.data || []).forEach((o: any) => { orgMap[o.id] = o.name; });
    setOrgs(orgMap);
    setUsers((usersRes.data || []).map((u: any) => ({ ...u, org_name: u.organization_id ? orgMap[u.organization_id] || '—' : '—' })));
    setLoading(false);
  }

  async function toggleActive(user: UserRow) {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    // Log audit
    if (adminProfile) {
      await supabase.from('admin_audit_log').insert({
        admin_id: adminProfile.id,
        action: user.is_active ? 'user_deactivated' : 'user_activated',
        target_type: 'user',
        target_id: user.id,
        target_name: `${user.first_name} ${user.last_name}`,
      } as any);
    }
    toast.success(isEN ? 'User updated' : 'تم تحديث المستخدم');
    loadData();
  }

  async function resetPassword(user: UserRow) {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isEN ? 'Password reset email sent' : 'تم إرسال رابط إعادة تعيين كلمة المرور');
      if (adminProfile) {
        await supabase.from('admin_audit_log').insert({
          admin_id: adminProfile.id, action: 'user_password_reset',
          target_type: 'user', target_id: user.id, target_name: `${user.first_name} ${user.last_name}`,
        } as any);
      }
    }
  }

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  function lastActiveLabel(dt: string | null) {
    if (!dt) return isEN ? 'Never' : 'أبداً';
    const diff = Date.now() - new Date(dt).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return isEN ? 'Just now' : 'الآن';
    if (hours < 24) return `${hours}h ${isEN ? 'ago' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days}d ${isEN ? 'ago' : ''}`;
  }

  function activeColor(dt: string | null) {
    if (!dt) return 'text-muted-foreground';
    const hours = (Date.now() - new Date(dt).getTime()) / 3600000;
    if (hours < 24) return 'text-success';
    if (hours < 168) return 'text-warning';
    return 'text-destructive';
  }

  const roles = ['all', 'super_admin', 'firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm text-foreground">{isEN ? 'All Users' : 'جميع المستخدمين'}</h1>
        <p className="text-body-md text-muted-foreground">{filtered.length} {isEN ? 'total users' : 'مستخدم'}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isEN ? 'Search users...' : 'بحث في المستخدمين...'} className="w-full h-10 ps-9 pe-3 rounded-lg border border-border bg-card text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          {roles.map(r => <option key={r} value={r}>{r === 'all' ? (isEN ? 'All Roles' : 'كل الأدوار') : r.replace('_', ' ')}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          <option value="all">{isEN ? 'All Status' : 'كل الحالات'}</option>
          <option value="active">{isEN ? 'Active' : 'نشط'}</option>
          <option value="inactive">{isEN ? 'Inactive' : 'غير نشط'}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-card">
          <table className="w-full text-body-sm">
            <thead className="bg-muted/50">
              <tr>
                {[isEN ? 'User' : 'المستخدم', isEN ? 'Email' : 'البريد', isEN ? 'Organization' : 'المؤسسة', isEN ? 'Role' : 'الدور', isEN ? 'Status' : 'الحالة', isEN ? 'Last Active' : 'آخر نشاط', ''].map(h => (
                  <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-body-sm font-semibold shrink-0">
                        {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                      </div>
                      <span className="font-medium text-foreground">{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3 text-muted-foreground">{u.org_name}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-body-sm capitalize">{u.role?.replace('_', ' ')}</span></td>
                  <td className="p-3">{u.is_active ? '✅' : '❌'}</td>
                  <td className={`p-3 ${activeColor(u.last_active_at)}`}>{lastActiveLabel(u.last_active_at)}</td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center"><MoreVertical className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setChangeRoleUser(u)}>{isEN ? 'Change Role' : 'تغيير الدور'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resetPassword(u)}>{isEN ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(u)} className={u.is_active ? 'text-destructive' : 'text-success'}>
                          {u.is_active ? (isEN ? 'Deactivate' : 'تعطيل') : (isEN ? 'Activate' : 'تفعيل')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {changeRoleUser && (
        <ChangeRoleModal
          member={{ id: changeRoleUser.id, first_name: changeRoleUser.first_name, last_name: changeRoleUser.last_name, role: changeRoleUser.role }}
          adminCount={99}
          onClose={() => setChangeRoleUser(null)}
          onSuccess={() => { setChangeRoleUser(null); loadData(); }}
        />
      )}
    </div>
  );
}
