import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/adminAudit';
import { ArrowLeft, Building, Users, Scale, FileCheck, FileText, DollarSign, HardDrive, Pencil, LogIn, MoreVertical, Power, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EditOrganizationModal from '@/components/admin/EditOrganizationModal';
import CreateUserModal from '@/components/admin/CreateUserModal';
import EditUserModal from '@/components/admin/EditUserModal';
import ResetPasswordModal from '@/components/admin/ResetPasswordModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface OrgDetail {
  id: string; name: string; name_ar: string; subscription_tier: string; subscription_status: string;
  is_active: boolean; created_at: string; max_users: number; phone: string | null; email: string | null;
  website: string | null; city: string | null; governorate: string | null; default_currency: string | null;
  default_hourly_rate: number | null; tax_rate: number | null; payment_terms_days: number | null;
  case_prefix: string | null; errand_prefix: string | null; invoice_prefix: string | null;
  ai_enabled: boolean | null;
}

export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { startImpersonation } = useImpersonation();
  const isEN = language === 'en';

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, cases: 0, errands: 0, documents: 0, revenue: 0, storageBytes: 0 });
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);

  useEffect(() => { if (id) loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const [orgRes, usersRes, casesRes, errandsRes, docsRes, paymentsRes, activitiesRes] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', id!).single(),
      supabase.from('profiles').select('*').eq('organization_id', id!).order('created_at', { ascending: false }),
      supabase.from('cases').select('id', { count: 'exact', head: true }).eq('organization_id', id!),
      supabase.from('errands').select('id', { count: 'exact', head: true }).eq('organization_id', id!),
      supabase.from('documents').select('id, file_size_bytes').eq('organization_id', id!),
      supabase.from('payments').select('amount').eq('organization_id', id!),
      supabase.from('case_activities').select('*').eq('organization_id', id!).order('created_at', { ascending: false }).limit(50),
    ]);

    if (orgRes.data) setOrg(orgRes.data as any);
    setOrgUsers(usersRes.data || []);
    const totalRevenue = (paymentsRes.data || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const totalStorage = (docsRes.data || []).reduce((s: number, d: any) => s + (Number(d.file_size_bytes) || 0), 0);
    setStats({
      users: (usersRes.data || []).length,
      cases: casesRes.count || 0,
      errands: errandsRes.count || 0,
      documents: (docsRes.data || []).length,
      revenue: totalRevenue,
      storageBytes: totalStorage,
    });
    setActivities(activitiesRes.data || []);
    setLoading(false);
  }

  async function handleImpersonate() {
    if (!org || !user) return;
    const admin = orgUsers.find(u => u.role === 'firm_admin') || orgUsers[0];
    startImpersonation(org.id, org.name, admin?.id || user.id, user.id);
    await logAdminAction(user.id, 'impersonate_start', 'organization', org.id, org.name);
    navigate('/dashboard');
  }

  if (loading || !org) return <div className="text-center py-12 text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>;

  const statCards = [
    { label: isEN ? 'Users' : 'المستخدمون', value: stats.users, icon: Users },
    { label: isEN ? 'Cases' : 'القضايا', value: stats.cases, icon: Scale },
    { label: isEN ? 'Errands' : 'المعاملات', value: stats.errands, icon: FileCheck },
    { label: isEN ? 'Documents' : 'المستندات', value: stats.documents, icon: FileText },
    { label: isEN ? 'Revenue' : 'الإيرادات', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign },
    { label: isEN ? 'Storage' : 'التخزين', value: `${(stats.storageBytes / 1024 / 1024).toFixed(1)} MB`, icon: HardDrive },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/organizations')} className="text-body-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> {isEN ? 'Organizations' : 'المؤسسات'}
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"><Building className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-display-sm text-foreground">{org.name}</h1>
            {org.name_ar && <p className="text-body-md text-muted-foreground">{org.name_ar}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-body-sm px-2 py-0.5 rounded-full bg-accent/10 text-accent">{org.subscription_tier}</span>
              <span className={`text-body-sm px-2 py-0.5 rounded-full ${org.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                {org.is_active ? (isEN ? 'Active' : 'نشط') : (isEN ? 'Inactive' : 'غير نشط')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowEdit(true)}><Pencil className="h-4 w-4 me-2" />{isEN ? 'Edit' : 'تعديل'}</Button>
          <Button variant="outline" className="border-warning text-warning hover:bg-warning/10" onClick={handleImpersonate}><LogIn className="h-4 w-4 me-2" />{isEN ? 'Login as Admin' : 'الدخول كمسؤول'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-card border rounded-lg p-4">
            <s.icon className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-heading-lg text-foreground">{s.value}</p>
            <p className="text-body-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{isEN ? 'Overview' : 'نظرة عامة'}</TabsTrigger>
          <TabsTrigger value="users">{isEN ? 'Users' : 'المستخدمون'}</TabsTrigger>
          <TabsTrigger value="data">{isEN ? 'Data' : 'البيانات'}</TabsTrigger>
          <TabsTrigger value="billing">{isEN ? 'Billing' : 'الفوترة'}</TabsTrigger>
          <TabsTrigger value="activity">{isEN ? 'Activity' : 'النشاط'}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="bg-card border rounded-lg p-5">
            <h3 className="text-heading-sm text-foreground mb-3">{isEN ? 'Organization Details' : 'تفاصيل المؤسسة'}</h3>
            <div className="grid grid-cols-2 gap-3 text-body-sm">
              {[
                [isEN ? 'Phone' : 'الهاتف', org.phone], [isEN ? 'Email' : 'البريد', org.email],
                [isEN ? 'Website' : 'الموقع', org.website], [isEN ? 'City' : 'المدينة', org.city],
                [isEN ? 'Governorate' : 'المحافظة', org.governorate],
                [isEN ? 'Created' : 'تاريخ الإنشاء', new Date(org.created_at).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label as string}><span className="text-muted-foreground">{label}:</span> <span className="font-medium text-foreground">{val || '—'}</span></div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateUser(true)} className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
              {isEN ? 'Add User' : 'إضافة مستخدم'}
            </Button>
          </div>
          <div className="overflow-x-auto border rounded-lg bg-card">
            <table className="w-full text-body-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[isEN ? 'Name' : 'الاسم', isEN ? 'Email' : 'البريد', isEN ? 'Role' : 'الدور', isEN ? 'Status' : 'الحالة', ''].map(h => (
                    <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgUsers.map(u => (
                  <tr key={u.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-medium text-foreground">{u.first_name} {u.last_name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 capitalize">{u.role?.replace('_', ' ')}</td>
                    <td className="p-3">{u.is_active ? '✅' : '❌'}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUserId(u.id)}><Pencil className="h-4 w-4 me-2" />{isEN ? 'Edit' : 'تعديل'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetPasswordUser(u)}><KeyRound className="h-4 w-4 me-2" />{isEN ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            await supabase.from('profiles').update({ is_active: !u.is_active } as any).eq('id', u.id);
                            toast.success(isEN ? 'Updated' : 'تم التحديث'); loadAll();
                          }}><Power className="h-4 w-4 me-2" />{u.is_active ? (isEN ? 'Deactivate' : 'تعطيل') : (isEN ? 'Activate' : 'تفعيل')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-body-sm">
              <thead className="bg-muted/50"><tr><th className="text-start p-3 font-medium text-muted-foreground">{isEN ? 'Table' : 'الجدول'}</th><th className="text-start p-3 font-medium text-muted-foreground">{isEN ? 'Count' : 'العدد'}</th></tr></thead>
              <tbody>
                {[
                  { label: isEN ? 'Users' : 'المستخدمون', count: stats.users },
                  { label: isEN ? 'Cases' : 'القضايا', count: stats.cases },
                  { label: isEN ? 'Errands' : 'المعاملات', count: stats.errands },
                  { label: isEN ? 'Documents' : 'المستندات', count: stats.documents },
                ].map(r => (
                  <tr key={r.label} className="border-t"><td className="p-3 text-foreground">{r.label}</td><td className="p-3 font-medium text-foreground">{r.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="bg-card border rounded-lg p-5">
            <h3 className="text-heading-sm text-foreground mb-3">{isEN ? 'Subscription' : 'الاشتراك'}</h3>
            <div className="grid grid-cols-2 gap-3 text-body-sm">
              <div><span className="text-muted-foreground">{isEN ? 'Plan' : 'الخطة'}:</span> <span className="font-medium capitalize">{org.subscription_tier}</span></div>
              <div><span className="text-muted-foreground">{isEN ? 'Status' : 'الحالة'}:</span> <span className="font-medium capitalize">{org.subscription_status}</span></div>
              <div><span className="text-muted-foreground">{isEN ? 'Max Users' : 'أقصى مستخدمين'}:</span> <span className="font-medium">{org.max_users}</span></div>
              <div><span className="text-muted-foreground">{isEN ? 'Total Revenue' : 'إجمالي الإيرادات'}:</span> <span className="font-medium">${stats.revenue.toLocaleString()}</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{isEN ? 'No recent activity' : 'لا يوجد نشاط حديث'}</p>
            ) : activities.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 bg-card border rounded-lg p-3">
                <div className="h-2 w-2 rounded-full bg-accent mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm text-foreground">{isEN ? a.title : (a.title_ar || a.title)}</p>
                  {a.description && <p className="text-body-sm text-muted-foreground mt-0.5">{a.description}</p>}
                  <p className="text-body-sm text-muted-foreground/60 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {showEdit && <EditOrganizationModal open={showEdit} orgId={org.id} onClose={() => setShowEdit(false)} onSuccess={loadAll} />}
      <CreateUserModal open={showCreateUser} onClose={() => setShowCreateUser(false)} onSuccess={loadAll} preselectedOrgId={org.id} />
      {editUserId && <EditUserModal open={!!editUserId} userId={editUserId} onClose={() => setEditUserId(null)} onSuccess={loadAll} />}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => { setResetPasswordUser(null); loadAll(); }}
        />
      )}
    </div>
  );
}
