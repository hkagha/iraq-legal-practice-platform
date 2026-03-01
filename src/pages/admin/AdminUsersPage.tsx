import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/adminAudit';
import { Users, Search, MoreVertical, Plus, Pencil, Trash2, Power, KeyRound, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import ChangeRoleModal from '@/components/settings/ChangeRoleModal';
import CreateUserModal from '@/components/admin/CreateUserModal';
import EditUserModal from '@/components/admin/EditUserModal';
import ResetPasswordModal from '@/components/admin/ResetPasswordModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SlideOver } from '@/components/ui/SlideOver';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface UserRow {
  id: string; email: string; first_name: string; last_name: string;
  first_name_ar: string | null; last_name_ar: string | null;
  role: string; is_active: boolean; organization_id: string | null;
  last_active_at: string | null; created_at: string; org_name?: string;
}

export default function AdminUsersPage() {
  const { language } = useLanguage();
  const { profile: adminProfile, user } = useAuth();
  const isEN = language === 'en';
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [changeRoleUser, setChangeRoleUser] = useState<UserRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [usersRes, orgsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('organizations').select('id, name').order('name'),
    ]);
    const orgsList = orgsRes.data || [];
    setAllOrgs(orgsList as any);
    const orgMap: Record<string, string> = {};
    orgsList.forEach((o: any) => { orgMap[o.id] = o.name; });
    setUsers((usersRes.data || []).map((u: any) => ({ ...u, org_name: u.organization_id ? orgMap[u.organization_id] || '—' : '—' })));
    setLoading(false);
  }

  async function toggleActive(u: UserRow) {
    await supabase.from('profiles').update({ is_active: !u.is_active } as any).eq('id', u.id);
    if (user) await logAdminAction(user.id, u.is_active ? 'user_deactivated' : 'user_activated', 'user', u.id, `${u.first_name} ${u.last_name}`);
    toast.success(isEN ? 'User updated' : 'تم تحديث المستخدم');
    loadData();
  }


  async function handleDeleteUser() {
    if (!deleteUser || !user) return;
    await supabase.from('profiles').update({ is_active: false, organization_id: null } as any).eq('id', deleteUser.id);
    await logAdminAction(user.id, 'user_deleted', 'user', deleteUser.id, deleteUser.email);
    toast.success(isEN ? 'User deactivated' : 'تم تعطيل المستخدم');
    setDeleteUser(null);
    loadData();
  }

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    if (orgFilter !== 'all' && u.organization_id !== orgFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const paged = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paged.length < filtered.length;

  function lastActiveLabel(dt: string | null) {
    if (!dt) return isEN ? 'Never' : 'أبداً';
    const hours = Math.floor((Date.now() - new Date(dt).getTime()) / 3600000);
    if (hours < 1) return isEN ? 'Just now' : 'الآن';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  function activeColor(dt: string | null) {
    if (!dt) return 'text-muted-foreground';
    const hours = (Date.now() - new Date(dt).getTime()) / 3600000;
    if (hours < 24) return 'text-success'; if (hours < 168) return 'text-warning'; return 'text-destructive';
  }

  const roleBadgeColor: Record<string, string> = {
    super_admin: 'bg-destructive/10 text-destructive', firm_admin: 'bg-accent/10 text-accent',
    lawyer: 'bg-info/10 text-info', paralegal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    secretary: 'bg-muted text-muted-foreground', accountant: 'bg-success/10 text-success', client: 'bg-muted text-muted-foreground',
  };

  const roles = ['all', 'super_admin', 'firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-display-sm text-foreground">{isEN ? 'All Users' : 'جميع المستخدمين'}</h1>
          <p className="text-body-md text-muted-foreground">{filtered.length} {isEN ? 'total users' : 'مستخدم'}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 me-2" />{isEN ? 'Create User' : 'إنشاء مستخدم'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isEN ? 'Search users...' : 'بحث...'} className="w-full h-10 ps-9 pe-3 rounded-lg border border-border bg-card text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          {roles.map(r => <option key={r} value={r}>{r === 'all' ? (isEN ? 'All Roles' : 'كل الأدوار') : r.replace('_', ' ')}</option>)}
        </select>
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          <option value="all">{isEN ? 'All Orgs' : 'كل المؤسسات'}</option>
          {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          <option value="all">{isEN ? 'All Status' : 'كل الحالات'}</option>
          <option value="active">{isEN ? 'Active' : 'نشط'}</option><option value="inactive">{isEN ? 'Inactive' : 'غير نشط'}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg bg-card">
            <table className="w-full text-body-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[isEN ? 'User' : 'المستخدم', isEN ? 'Email' : 'البريد', isEN ? 'Organization' : 'المؤسسة', isEN ? 'Role' : 'الدور', isEN ? 'Status' : 'الحالة', isEN ? 'Last Active' : 'آخر نشاط', isEN ? 'Created' : 'التاريخ', ''].map(h => (
                    <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(u => (
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
                    <td className="p-3">
                      {u.organization_id ? (
                        <button onClick={() => navigate(`/admin/organizations/${u.organization_id}`)} className="text-primary hover:underline">{u.org_name}</button>
                      ) : '—'}
                    </td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-body-sm capitalize ${roleBadgeColor[u.role] || 'bg-muted text-muted-foreground'}`}>{u.role?.replace('_', ' ')}</span></td>
                    <td className="p-3">{u.is_active ? '✅' : '❌'}</td>
                    <td className={`p-3 ${activeColor(u.last_active_at)}`}>{lastActiveLabel(u.last_active_at)}</td>
                    <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center"><MoreVertical className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewUser(u)}><Eye className="h-4 w-4 me-2" />{isEN ? 'View Profile' : 'عرض الملف'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditUserId(u.id)}><Pencil className="h-4 w-4 me-2" />{isEN ? 'Edit' : 'تعديل'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setChangeRoleUser(u)}>{isEN ? 'Change Role' : 'تغيير الدور'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetPasswordUser(u)}><KeyRound className="h-4 w-4 me-2" />{isEN ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(u)}><Power className="h-4 w-4 me-2" />{u.is_active ? (isEN ? 'Deactivate' : 'تعطيل') : (isEN ? 'Activate' : 'تفعيل')}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteUser(u)} className="text-destructive"><Trash2 className="h-4 w-4 me-2" />{isEN ? 'Delete' : 'حذف'}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="text-center pt-2"><Button variant="outline" onClick={() => setPage(p => p + 1)}>{isEN ? 'Load More' : 'تحميل المزيد'}</Button></div>
          )}
        </>
      )}

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={loadData} />
      {editUserId && <EditUserModal open={!!editUserId} userId={editUserId} onClose={() => setEditUserId(null)} onSuccess={loadData} />}
      {changeRoleUser && <ChangeRoleModal member={{ id: changeRoleUser.id, first_name: changeRoleUser.first_name, last_name: changeRoleUser.last_name, role: changeRoleUser.role }} adminCount={99} onClose={() => setChangeRoleUser(null)} onSuccess={() => { setChangeRoleUser(null); loadData(); }} />}
      {deleteUser && <ConfirmDialog isOpen={!!deleteUser} onClose={() => setDeleteUser(null)} title={isEN ? 'Delete User' : 'حذف المستخدم'} titleAr="حذف المستخدم" message={isEN ? `Deactivate "${deleteUser.email}" and remove from organization?` : `تعطيل "${deleteUser.email}"؟`} messageAr={`تعطيل "${deleteUser.email}"؟`} confirmLabel={isEN ? 'Delete' : 'حذف'} confirmLabelAr="حذف" type="danger" onConfirm={handleDeleteUser} />}
      {viewUser && (
        <SlideOver isOpen={!!viewUser} onClose={() => setViewUser(null)} title={isEN ? 'User Profile' : 'ملف المستخدم'} titleAr="ملف المستخدم">
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent/20 text-accent flex items-center justify-center text-heading-sm font-semibold">
                {(viewUser.first_name?.[0] || '') + (viewUser.last_name?.[0] || '')}
              </div>
              <div>
                <p className="text-heading-sm text-foreground">{viewUser.first_name} {viewUser.last_name}</p>
                <p className="text-body-sm text-muted-foreground">{viewUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-body-sm">
              <div><span className="text-muted-foreground">{isEN ? 'Role' : 'الدور'}:</span> <span className="font-medium capitalize">{viewUser.role?.replace('_', ' ')}</span></div>
              <div><span className="text-muted-foreground">{isEN ? 'Status' : 'الحالة'}:</span> {viewUser.is_active ? '✅ Active' : '❌ Inactive'}</div>
              <div><span className="text-muted-foreground">{isEN ? 'Org' : 'المؤسسة'}:</span> {viewUser.org_name}</div>
              <div><span className="text-muted-foreground">{isEN ? 'Joined' : 'انضم'}:</span> {new Date(viewUser.created_at).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">{isEN ? 'Last Active' : 'آخر نشاط'}:</span> {lastActiveLabel(viewUser.last_active_at)}</div>
            </div>
          </div>
        </SlideOver>
      )}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => { setResetPasswordUser(null); loadData(); }}
        />
      )}
    </div>
  );
}
