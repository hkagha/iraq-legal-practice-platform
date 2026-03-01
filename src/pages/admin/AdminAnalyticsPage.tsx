import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminAnalyticsPage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const [featureData, setFeatureData] = useState<any[]>([]);
  const [orgHealth, setOrgHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    const [orgsRes, casesRes, errandsRes, docsRes, timeRes, invoicesRes, tasksRes, aiRes] = await Promise.all([
      supabase.from('organizations').select('id, name, is_active'),
      supabase.from('cases').select('id, organization_id, created_at'),
      supabase.from('errands').select('id, organization_id'),
      supabase.from('documents').select('id, organization_id'),
      supabase.from('time_entries').select('id, organization_id'),
      supabase.from('invoices').select('id, organization_id'),
      supabase.from('tasks').select('id, organization_id'),
      supabase.from('ai_usage_log').select('id, organization_id'),
    ]);

    const orgs = (orgsRes.data || []).filter((o: any) => o.is_active);
    const cases = casesRes.data || [];
    const errands = errandsRes.data || [];
    const docs = docsRes.data || [];
    const time = timeRes.data || [];
    const invoices = invoicesRes.data || [];
    const tasks = tasksRes.data || [];
    const ai = aiRes.data || [];

    const countDistinctOrgs = (items: any[]) => new Set(items.map(i => i.organization_id)).size;

    setFeatureData([
      { feature: isEN ? 'Cases' : 'القضايا', orgs: countDistinctOrgs(cases) },
      { feature: isEN ? 'Errands' : 'المعاملات', orgs: countDistinctOrgs(errands) },
      { feature: isEN ? 'Documents' : 'المستندات', orgs: countDistinctOrgs(docs) },
      { feature: isEN ? 'Time Tracking' : 'تتبع الوقت', orgs: countDistinctOrgs(time) },
      { feature: isEN ? 'Invoicing' : 'الفوترة', orgs: countDistinctOrgs(invoices) },
      { feature: isEN ? 'Tasks' : 'المهام', orgs: countDistinctOrgs(tasks) },
      { feature: isEN ? 'AI Features' : 'ميزات الذكاء', orgs: countDistinctOrgs(ai) },
    ]);

    // Org health
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const health = orgs.map((org: any) => {
      const orgCases = cases.filter((c: any) => c.organization_id === org.id && c.created_at > thirtyDaysAgo).length;
      const orgDocs = docs.filter((d: any) => d.organization_id === org.id).length;
      let status = 'inactive';
      if (orgCases > 0 || orgDocs > 5) status = 'active';
      else if (orgDocs > 0) status = 'low';
      return { name: org.name, cases30d: orgCases, docs30d: orgDocs, status };
    });
    setOrgHealth(health);
    setLoading(false);
  }

  const healthIcon = (s: string) => s === 'active' ? '🟢' : s === 'low' ? '🟡' : '🔴';
  const healthLabel = (s: string) => s === 'active' ? (isEN ? 'Active' : 'نشط') : s === 'low' ? (isEN ? 'Low Activity' : 'نشاط منخفض') : (isEN ? 'Inactive' : 'غير نشط');

  if (loading) return <div className="py-12 text-center text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm text-foreground">{isEN ? 'Platform Analytics' : 'تحليلات المنصة'}</h1>
        <p className="text-body-md text-muted-foreground">{isEN ? 'Feature adoption and organization health' : 'اعتماد الميزات وصحة المؤسسات'}</p>
      </div>

      {/* Feature Adoption */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Feature Adoption (by org count)' : 'اعتماد الميزات (حسب عدد المؤسسات)'}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={featureData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="feature" tick={{ fontSize: 12 }} width={100} />
            <Tooltip />
            <Bar dataKey="orgs" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Org Health Matrix */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Organization Health Matrix' : 'مصفوفة صحة المؤسسات'}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead className="bg-muted/50">
              <tr>
                {[isEN ? 'Organization' : 'المؤسسة', isEN ? 'Cases (30d)' : 'القضايا (30 يوم)', isEN ? 'Docs (30d)' : 'المستندات (30 يوم)', isEN ? 'Health' : 'الصحة'].map(h => (
                  <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgHealth.map(oh => (
                <tr key={oh.name} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-medium text-foreground">{oh.name}</td>
                  <td className="p-3">{oh.cases30d}</td>
                  <td className="p-3">{oh.docs30d}</td>
                  <td className="p-3">{healthIcon(oh.status)} {healthLabel(oh.status)}</td>
                </tr>
              ))}
              {orgHealth.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{isEN ? 'No organizations' : 'لا توجد مؤسسات'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
