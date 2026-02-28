import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Building, Users, Scale, FileCheck, Shield } from 'lucide-react';

interface OrgRow {
  id: string; name: string; name_ar: string; subscription_tier: string;
  subscription_status: string; is_active: boolean; created_at: string;
  max_users: number;
}

interface UserRow {
  id: string; email: string; first_name: string; last_name: string;
  role: string; is_active: boolean; organization_id: string | null;
  last_active_at: string | null;
}

export default function SuperAdminPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'sales_admin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    Promise.all([
      supabase.from('organizations').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    ]).then(([orgRes, userRes]) => {
      setOrgs((orgRes.data || []) as unknown as OrgRow[]);
      setUsers((userRes.data || []) as unknown as UserRow[]);
      setLoading(false);
    });
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-accent" />
        <h1 className="text-heading-xl text-foreground">Super Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Building, label: 'Organizations', value: orgs.length },
          { icon: Users, label: 'Users', value: users.length },
          { icon: Scale, label: 'Active Orgs', value: orgs.filter(o => o.is_active).length },
          { icon: FileCheck, label: 'Admin Users', value: users.filter(u => u.role === 'firm_admin').length },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-lg p-4">
            <s.icon size={20} className="text-muted-foreground mb-2" />
            <p className="text-heading-lg text-foreground">{s.value}</p>
            <p className="text-body-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Organizations Table */}
          <div>
            <h2 className="text-heading-lg text-foreground mb-4">Organizations</h2>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-body-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Name', 'Plan', 'Status', 'Active', 'Max Users', 'Created'].map(h => (
                      <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orgs.map(org => (
                    <tr key={org.id} className="border-t hover:bg-muted/20">
                      <td className="p-3 font-medium text-foreground">{org.name}</td>
                      <td className="p-3">{org.subscription_tier}</td>
                      <td className="p-3">{org.subscription_status}</td>
                      <td className="p-3">{org.is_active ? '✅' : '❌'}</td>
                      <td className="p-3">{org.max_users}</td>
                      <td className="p-3">{new Date(org.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users Table */}
          <div>
            <h2 className="text-heading-lg text-foreground mb-4">Users</h2>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-body-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Name', 'Email', 'Role', 'Active', 'Last Active'].map(h => (
                      <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t hover:bg-muted/20">
                      <td className="p-3 font-medium text-foreground">{u.first_name} {u.last_name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{u.is_active ? '✅' : '❌'}</td>
                      <td className="p-3">{u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
