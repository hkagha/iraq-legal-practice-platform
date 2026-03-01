import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Building, Users, Scale, FileCheck, FileText, Search, MoreVertical, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface OrgWithStats {
  id: string;
  name: string;
  name_ar: string;
  subscription_tier: string;
  subscription_status: string;
  is_active: boolean;
  created_at: string;
  max_users: number;
  userCount: number;
  caseCount: number;
  errandCount: number;
  docCount: number;
}

export default function AdminOrganizationsPage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    const [orgsRes, profilesRes, casesRes, errandsRes, docsRes] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, organization_id'),
      supabase.from('cases').select('id, organization_id'),
      supabase.from('errands').select('id, organization_id'),
      supabase.from('documents').select('id, organization_id'),
    ]);

    const profiles = profilesRes.data || [];
    const cases = casesRes.data || [];
    const errands = errandsRes.data || [];
    const docs = docsRes.data || [];

    const result = (orgsRes.data || []).map((o: any) => ({
      ...o,
      userCount: profiles.filter((p: any) => p.organization_id === o.id).length,
      caseCount: cases.filter((c: any) => c.organization_id === o.id).length,
      errandCount: errands.filter((e: any) => e.organization_id === o.id).length,
      docCount: docs.filter((d: any) => d.organization_id === o.id).length,
    }));

    setOrgs(result);
    setLoading(false);
  }

  async function toggleOrgActive(org: OrgWithStats) {
    await supabase.from('organizations').update({ is_active: !org.is_active }).eq('id', org.id);
    loadOrgs();
  }

  const filtered = orgs.filter(o => {
    if (statusFilter === 'active' && !o.is_active) return false;
    if (statusFilter === 'inactive' && o.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.name.toLowerCase().includes(q) || o.name_ar.toLowerCase().includes(q);
    }
    return true;
  });

  const planBadge = (plan: string) => {
    const colors: Record<string, string> = { free: 'bg-muted text-muted-foreground', professional: 'bg-info/10 text-info', enterprise: 'bg-accent/10 text-accent' };
    return <span className={`text-body-sm px-2 py-0.5 rounded-full ${colors[plan] || colors.free}`}>{plan}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-display-sm text-foreground">{isEN ? 'Organizations' : 'المؤسسات'}</h1>
          <p className="text-body-md text-muted-foreground">{filtered.length} {isEN ? 'organizations' : 'مؤسسة'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isEN ? 'Search organizations...' : 'بحث في المؤسسات...'} className="w-full h-10 ps-9 pe-3 rounded-lg border border-border bg-card text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          <option value="all">{isEN ? 'All Status' : 'كل الحالات'}</option>
          <option value="active">{isEN ? 'Active' : 'نشط'}</option>
          <option value="inactive">{isEN ? 'Inactive' : 'غير نشط'}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{isEN ? 'No organizations found' : 'لم يتم العثور على مؤسسات'}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(org => (
            <div key={org.id} className="bg-card border rounded-lg p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-heading-sm text-foreground truncate">{org.name}</h3>
                      {planBadge(org.subscription_tier)}
                      <span className={`text-body-sm px-2 py-0.5 rounded-full ${org.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {org.is_active ? (isEN ? 'Active' : 'نشط') : (isEN ? 'Inactive' : 'غير نشط')}
                      </span>
                    </div>
                    {org.name_ar && <p className="text-body-sm text-muted-foreground mt-0.5">{org.name_ar}</p>}
                    <div className="flex flex-wrap gap-4 mt-3 text-body-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {org.userCount} {isEN ? 'users' : 'مستخدم'}</span>
                      <span className="flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> {org.caseCount} {isEN ? 'cases' : 'قضية'}</span>
                      <span className="flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> {org.errandCount} {isEN ? 'errands' : 'معاملة'}</span>
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {org.docCount} {isEN ? 'docs' : 'مستند'}</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground/70 mt-2">
                      {isEN ? 'Created' : 'أنشئت'}: {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleOrgActive(org)}>
                      {org.is_active ? (isEN ? 'Deactivate' : 'تعطيل') : (isEN ? 'Activate' : 'تفعيل')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
