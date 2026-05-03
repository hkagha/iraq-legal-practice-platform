import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/adminAudit';
import { Building, Users, Scale, FileCheck, FileText, Search, MoreVertical, Plus, Eye, Pencil, Trash2, LogIn, Power } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CreateOrganizationModal from '@/components/admin/CreateOrganizationModal';
import EditOrganizationModal from '@/components/admin/EditOrganizationModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { HelpButton } from '@/components/ui/HelpButton';

interface OrgWithStats {
  id: string; name: string; name_ar: string;
  is_active: boolean; created_at: string;
  userCount: number; caseCount: number; errandCount: number; docCount: number;
}

export default function AdminOrganizationsPage() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const { startImpersonation } = useImpersonation();
  const isEN = language === 'en';
  const isSuperAdmin = profile?.role === 'super_admin';
  const canImpersonate = profile?.role === 'super_admin';
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editOrgId, setEditOrgId] = useState<string | null>(null);
  const [deleteOrg, setDeleteOrg] = useState<OrgWithStats | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    const [orgsRes, profilesRes, casesRes, errandsRes, docsRes] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, organization_id'),
      supabase.from('cases').select('id, organization_id'),
      supabase.from('errands').select('id, organization_id'),
      supabase.from('documents').select('id, organization_id'),
    ]);
    const profiles = profilesRes.data || []; const cases = casesRes.data || [];
    const errands = errandsRes.data || []; const docs = docsRes.data || [];
    setOrgs((orgsRes.data || []).map((o: any) => ({
      ...o,
      userCount: profiles.filter((p: any) => p.organization_id === o.id).length,
      caseCount: cases.filter((c: any) => c.organization_id === o.id).length,
      errandCount: errands.filter((e: any) => e.organization_id === o.id).length,
      docCount: docs.filter((d: any) => d.organization_id === o.id).length,
    })));
    setLoading(false);
  }

  async function toggleOrgActive(org: OrgWithStats) {
    await supabase.from('organizations').update({ is_active: !org.is_active } as any).eq('id', org.id);
    if (user) await logAdminAction(user.id, org.is_active ? 'org_suspended' : 'org_activated', 'organization', org.id, org.name);
    toast.success(isEN ? 'Organization updated' : 'تم تحديث المؤسسة');
    loadOrgs();
  }

  async function handleDeleteOrg() {
    if (!deleteOrg || !user) return;
    await supabase.from('organizations').update({ is_active: false } as any).eq('id', deleteOrg.id);
    await supabase.from('profiles').update({ is_active: false } as any).eq('organization_id', deleteOrg.id);
    await logAdminAction(user.id, 'org_deleted', 'organization', deleteOrg.id, deleteOrg.name);
    toast.success(isEN ? 'Organization deleted (soft)' : 'تم حذف المؤسسة');
    setDeleteOrg(null);
    loadOrgs();
  }

  async function handleImpersonate(org: OrgWithStats) {
    if (!user) return;
    const { data: admins } = await supabase.from('profiles').select('id').eq('organization_id', org.id).eq('role', 'firm_admin').limit(1);
    const adminUserId = admins?.[0]?.id || user.id;
    const res = await startImpersonation(org.id, org.name, adminUserId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    navigate('/dashboard');
  }

  const filtered = orgs.filter(o => {
    if (statusFilter === 'active' && !o.is_active) return false;
    if (statusFilter === 'inactive' && o.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.name.toLowerCase().includes(q) || o.name_ar?.toLowerCase().includes(q);
    }
    return true;
  });

  const paged = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paged.length < filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-display-sm text-foreground">{isEN ? 'Organizations' : 'المؤسسات'}</h1>
            <HelpButton helpKey="admin.organizations" />
          </div>
          <p className="text-body-md text-muted-foreground">{filtered.length} {isEN ? 'organizations' : 'مؤسسة'}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 me-2" />{isEN ? 'Create Organization' : 'إنشاء مؤسسة'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isEN ? 'Search organizations...' : 'بحث...'} className="w-full h-10 ps-9 pe-3 rounded-lg border border-border bg-card text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          <option value="all">{isEN ? 'All Status' : 'كل الحالات'}</option>
          <option value="active">{isEN ? 'Active' : 'نشط'}</option><option value="inactive">{isEN ? 'Inactive' : 'غير نشط'}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{isEN ? 'No organizations found' : 'لم يتم العثور على مؤسسات'}</div>
      ) : (
        <div className="space-y-3">
          {paged.map(org => (
            <div key={org.id} className="bg-card border rounded-lg p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-heading-sm text-foreground truncate">{org.name}</h3>
                      <span className="text-body-sm px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        {isEN ? 'Full access' : 'وصول كامل'}
                      </span>
                      <span className={`text-body-sm px-2 py-0.5 rounded-full ${org.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {org.is_active ? (isEN ? 'Active' : 'نشط') : (isEN ? 'Inactive' : 'غير نشط')}
                      </span>
                    </div>
                    {org.name_ar && <p className="text-body-sm text-muted-foreground mt-0.5">{org.name_ar}</p>}
                    <div className="flex flex-wrap gap-4 mt-3 text-body-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {org.userCount}</span>
                      <span className="flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> {org.caseCount}</span>
                      <span className="flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> {org.errandCount}</span>
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {org.docCount}</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground/70 mt-2">{isEN ? 'Created' : 'أنشئت'}: {new Date(org.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isSuperAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate(`/admin/organizations/${org.id}`)}><Eye className="h-4 w-4 me-2" />{isEN ? 'View Details' : 'عرض التفاصيل'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditOrgId(org.id)}><Pencil className="h-4 w-4 me-2" />{isEN ? 'Edit' : 'تعديل'}</DropdownMenuItem>
                      </>
                    )}
                    {canImpersonate && (
                      <DropdownMenuItem onClick={() => handleImpersonate(org)}><LogIn className="h-4 w-4 me-2" />{isEN ? 'Login as Admin' : 'الدخول كمسؤول'}</DropdownMenuItem>
                    )}
                    {isSuperAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => toggleOrgActive(org)}><Power className="h-4 w-4 me-2" />{org.is_active ? (isEN ? 'Deactivate' : 'تعطيل') : (isEN ? 'Activate' : 'تفعيل')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteOrg(org)} className="text-destructive"><Trash2 className="h-4 w-4 me-2" />{isEN ? 'Delete' : 'حذف'}</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => setPage(p => p + 1)}>{isEN ? 'Load More' : 'تحميل المزيد'}</Button>
            </div>
          )}
        </div>
      )}

      <CreateOrganizationModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={loadOrgs} />
      {editOrgId && <EditOrganizationModal open={!!editOrgId} orgId={editOrgId} onClose={() => setEditOrgId(null)} onSuccess={loadOrgs} />}
      {deleteOrg && (
        <ConfirmDialog
          isOpen={!!deleteOrg}
          onClose={() => setDeleteOrg(null)}
          title={isEN ? 'Delete Organization' : 'حذف المؤسسة'}
          titleAr="حذف المؤسسة"
          message={isEN ? `This will deactivate "${deleteOrg.name}" and all its users.` : `سيتم تعطيل "${deleteOrg.name}" وجميع مستخدميها.`}
          messageAr={`سيتم تعطيل "${deleteOrg.name}" وجميع مستخدميها.`}
          confirmLabel={isEN ? 'Delete' : 'حذف'}
          confirmLabelAr="حذف"
          type="danger"
          onConfirm={handleDeleteOrg}
        />
      )}
    </div>
  );
}
