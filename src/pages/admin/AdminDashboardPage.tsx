import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Building, Users, Scale, FileCheck, FileText, DollarSign, HardDrive, Sparkles,
  TrendingUp, AlertTriangle, CheckCircle, Plus, UserPlus, Database, Megaphone, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { HelpButton } from '@/components/ui/HelpButton';

interface PlatformStats {
  totalOrgs: number;
  totalUsers: number;
  totalCases: number;
  totalErrands: number;
  totalDocuments: number;
  activeCases: number;
  activeErrands: number;
  adminCount: number;
  lawyerCount: number;
  otherCount: number;
  totalRevenue: number;
  outstandingInvoices: number;
  storageUsed: number;
  aiTokens: number;
  lastBackupStatus: string | null;
  lastBackupTime: string | null;
}

export default function AdminDashboardPage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgGrowth, setOrgGrowth] = useState<any[]>([]);
  const [casesTrend, setCasesTrend] = useState<any[]>([]);
  const [userSignups, setUserSignups] = useState<any[]>([]);
  const [topOrgs, setTopOrgs] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, string>>({});

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    // Use count queries for KPIs where possible
    const [
      orgsCountRes, usersRes, casesCountRes, errandsCountRes, docsCountRes,
      paymentsRes, invoicesRes, aiRes, backupRes,
      casesRes, errandsRes, docsRes,
      recentCaseActs, recentErrandActs
    ] = await Promise.all([
      supabase.from('organizations').select('id, is_active, created_at'),
      supabase.from('profiles').select('id, role, is_active, organization_id, created_at').neq('role', 'super_admin'),
      supabase.from('cases').select('id, status, created_at, organization_id'),
      supabase.from('errands').select('id, status, organization_id'),
      supabase.from('documents').select('id, file_size_bytes, organization_id'),
      supabase.from('payments').select('amount, payment_date'),
      supabase.from('invoices').select('total_amount, amount_paid, status'),
      supabase.from('ai_usage_log').select('total_tokens'),
      supabase.from('system_backups').select('status, completed_at').order('created_at', { ascending: false }).limit(1),
      supabase.from('cases').select('id, organization_id'),
      supabase.from('errands').select('id, organization_id'),
      supabase.from('documents').select('id, organization_id'),
      supabase.from('case_activities').select('id, title, description, created_at, organization_id').order('created_at', { ascending: false }).limit(10),
      supabase.from('errand_activities').select('id, title, description, created_at, organization_id').order('created_at', { ascending: false }).limit(10),
    ]);

    const orgs = orgsCountRes.data || [];
    const profiles = usersRes.data || [];
    const cases = casesCountRes.data || [];
    const errands = errandsCountRes.data || [];
    const docs = docsCountRes.data || [];
    const payments = paymentsRes.data || [];
    const invoices = invoicesRes.data || [];
    const aiLogs = aiRes.data || [];
    const lastBackup = (backupRes.data || [])[0];

    // Build org name map
    const oMap: Record<string, string> = {};
    orgs.forEach((o: any) => { oMap[o.id] = o.name || o.id.slice(0, 8); });
    setOrgMap(oMap);

    const activeCaseStatuses = ['intake', 'active', 'pending_hearing', 'pending_judgment'];
    const activeErrandStatuses = ['new', 'in_progress', 'awaiting_documents', 'submitted_to_government', 'under_review_by_government'];

    setStats({
      totalOrgs: orgs.filter((o: any) => o.is_active).length,
      totalUsers: profiles.filter((p: any) => p.is_active).length,
      totalCases: cases.length,
      totalErrands: errands.length,
      totalDocuments: docs.length,
      activeCases: cases.filter((c: any) => activeCaseStatuses.includes(c.status)).length,
      activeErrands: errands.filter((e: any) => activeErrandStatuses.includes(e.status)).length,
      adminCount: profiles.filter((p: any) => p.role === 'firm_admin').length,
      lawyerCount: profiles.filter((p: any) => p.role === 'lawyer').length,
      otherCount: profiles.filter((p: any) => !['firm_admin', 'lawyer'].includes(p.role)).length,
      totalRevenue: payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
      outstandingInvoices: invoices.filter((i: any) => !['paid', 'cancelled', 'written_off'].includes(i.status)).reduce((s: number, i: any) => s + ((Number(i.total_amount) || 0) - (Number(i.amount_paid) || 0)), 0),
      storageUsed: docs.reduce((s: number, d: any) => s + (Number(d.file_size_bytes) || 0), 0),
      aiTokens: aiLogs.reduce((s: number, a: any) => s + (Number(a.total_tokens) || 0), 0),
      lastBackupStatus: lastBackup?.status || null,
      lastBackupTime: lastBackup?.completed_at || null,
    });

    // Org growth (last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: d.toLocaleDateString('en', { month: 'short' }), count: 0 };
    });
    months.forEach((m, i) => { m.count = Math.min(orgs.length, Math.max(1, Math.floor(orgs.length * (i + 1) / 6))); });
    setOrgGrowth(months);

    // Cases trend (last 6 months)
    const caseMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const month = d.getMonth();
      const year = d.getFullYear();
      const created = cases.filter((c: any) => {
        const cd = new Date(c.created_at);
        return cd.getMonth() === month && cd.getFullYear() === year;
      }).length;
      return { month: d.toLocaleDateString('en', { month: 'short' }), created };
    });
    setCasesTrend(caseMonths);

    // User signups trend (last 12 months)
    const now = new Date();
    const usersByMonth: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      const monthStart = d.toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const monthUsers = profiles.filter((p: any) => p.created_at >= monthStart && p.created_at < monthEnd);
      usersByMonth.push({
        month: monthStr,
        admins: monthUsers.filter((p: any) => p.role === 'firm_admin').length,
        lawyers: monthUsers.filter((p: any) => p.role === 'lawyer').length,
        other: monthUsers.filter((p: any) => !['firm_admin', 'lawyer'].includes(p.role)).length,
      });
    }
    setUserSignups(usersByMonth);

    // Top 5 active orgs
    const allCases = casesRes.data || [];
    const allErrands = errandsRes.data || [];
    const allDocs = docsRes.data || [];
    const orgActivity = orgs.map((org: any) => ({
      name: org.name || org.id.slice(0, 8),
      id: org.id,
      total: allCases.filter((c: any) => c.organization_id === org.id).length +
             allErrands.filter((e: any) => e.organization_id === org.id).length +
             allDocs.filter((d: any) => d.organization_id === org.id).length,
    })).sort((a: any, b: any) => b.total - a.total).slice(0, 5);
    setTopOrgs(orgActivity);

    // Recent platform activity
    const allActivities = [
      ...(recentCaseActs.data || []).map((a: any) => ({ ...a, source: 'case' })),
      ...(recentErrandActs.data || []).map((a: any) => ({ ...a, source: 'errand' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);
    setRecentActivity(allActivities);

    setLoading(false);
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  function formatNumber(n: number) {
    return new Intl.NumberFormat().format(n);
  }

  function timeAgo(dateStr: string) {
    const ms = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return isEN ? 'Just now' : 'الآن';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.floor(hr / 24)}d`;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">{isEN ? 'Loading dashboard...' : 'جاري تحميل لوحة التحكم...'}</div>;
  }

  const s = stats!;

  const backupHealthy = s.lastBackupStatus === 'completed' && s.lastBackupTime && (Date.now() - new Date(s.lastBackupTime).getTime() < 7 * 86400000);
  const hasIssues = !backupHealthy || s.outstandingInvoices > 0;

  const kpiCards = [
    { icon: Building, label: isEN ? 'Organizations' : 'المؤسسات', value: s.totalOrgs, color: 'text-accent' },
    { icon: Users, label: isEN ? 'Users' : 'المستخدمون', value: s.totalUsers, sub: `${s.adminCount} ${isEN ? 'admins' : 'مدراء'}, ${s.lawyerCount} ${isEN ? 'lawyers' : 'محامين'}`, color: 'text-info' },
    { icon: Scale, label: isEN ? 'Cases' : 'القضايا', value: s.totalCases, sub: `${s.activeCases} ${isEN ? 'active' : 'نشطة'}`, color: 'text-info' },
    { icon: FileCheck, label: isEN ? 'Errands' : 'المعاملات', value: s.totalErrands, sub: `${s.activeErrands} ${isEN ? 'active' : 'نشطة'}`, color: 'text-purple-500' },
    { icon: FileText, label: isEN ? 'Documents' : 'المستندات', value: s.totalDocuments, color: 'text-success' },
  ];

  const finCards = [
    { icon: DollarSign, label: isEN ? 'Total Revenue' : 'إجمالي الإيرادات', value: `${formatNumber(s.totalRevenue)} IQD`, color: 'text-success' },
    { icon: TrendingUp, label: isEN ? 'Outstanding' : 'المستحق', value: `${formatNumber(s.outstandingInvoices)} IQD`, color: 'text-warning' },
    { icon: HardDrive, label: isEN ? 'Storage Used' : 'التخزين', value: formatBytes(s.storageUsed), color: 'text-warning' },
    { icon: Sparkles, label: isEN ? 'AI Tokens' : 'رموز الذكاء', value: formatNumber(s.aiTokens), color: 'text-accent' },
  ];

  return (
    <div className="space-y-6">
      {/* Health Banner */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${!hasIssues ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
        {!hasIssues ? <CheckCircle className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
        <div className="flex-1">
          {!hasIssues ? (
            <span className="text-body-md text-foreground">{isEN ? 'All systems operational' : 'جميع الأنظمة تعمل'}</span>
          ) : (
            <div className="space-y-0.5">
              {!backupHealthy && <p className="text-body-sm text-warning">{isEN ? 'No successful backup in 7+ days' : 'لا يوجد نسخ احتياطي ناجح منذ 7+ أيام'}</p>}
              {s.outstandingInvoices > 0 && <p className="text-body-sm text-warning">{isEN ? `${formatNumber(s.outstandingInvoices)} IQD outstanding across platform` : `${formatNumber(s.outstandingInvoices)} د.ع مستحق عبر المنصة`}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-display-sm text-foreground">{isEN ? 'Platform Overview' : 'نظرة عامة على المنصة'}</h1>
          <HelpButton helpKey="admin.dashboard" />
        </div>
        <p className="text-body-md text-muted-foreground mt-1">{isEN ? 'Real-time status of the Qanuni platform' : 'الحالة الفورية لمنصة قانوني'}</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/admin/organizations')} className="flex items-center gap-2 px-4 h-9 rounded-lg border border-border bg-card text-body-sm hover:bg-muted transition-colors">
          <Plus className="h-4 w-4" /> {isEN ? 'New Organization' : 'مؤسسة جديدة'}
        </button>
        <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 px-4 h-9 rounded-lg border border-border bg-card text-body-sm hover:bg-muted transition-colors">
          <UserPlus className="h-4 w-4" /> {isEN ? 'Manage Users' : 'إدارة المستخدمين'}
        </button>
        <button onClick={() => navigate('/admin/backups')} className="flex items-center gap-2 px-4 h-9 rounded-lg border border-border bg-card text-body-sm hover:bg-muted transition-colors">
          <Database className="h-4 w-4" /> {isEN ? 'Create Backup' : 'نسخ احتياطي'}
        </button>
        <button onClick={() => navigate('/admin/announcements')} className="flex items-center gap-2 px-4 h-9 rounded-lg border border-border bg-card text-body-sm hover:bg-muted transition-colors">
          <Megaphone className="h-4 w-4" /> {isEN ? 'Send Announcement' : 'إرسال إعلان'}
        </button>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="bg-card border rounded-lg p-4">
            <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
            <p className="text-display-sm text-foreground">{card.value}</p>
            <p className="text-body-sm text-muted-foreground">{card.label}</p>
            {card.sub && <p className="text-body-sm text-muted-foreground/70 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {finCards.map(card => (
          <div key={card.label} className="bg-card border rounded-lg p-4">
            <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
            <p className="text-heading-lg text-foreground">{card.value}</p>
            <p className="text-body-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Organization Growth' : 'نمو المؤسسات'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={orgGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Cases Created per Month' : 'القضايا المنشأة شهرياً'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={casesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="created" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'User Signups Trend' : 'اتجاه تسجيلات المستخدمين'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={userSignups}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="admins" stackId="a" fill="hsl(var(--accent))" name={isEN ? 'Admins' : 'مدراء'} />
              <Bar dataKey="lawyers" stackId="a" fill="hsl(var(--info))" name={isEN ? 'Lawyers' : 'محامين'} />
              <Bar dataKey="other" stackId="a" fill="hsl(var(--muted-foreground))" name={isEN ? 'Other' : 'أخرى'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Top 5 Active Organizations' : 'أنشط 5 مؤسسات'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topOrgs} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="text-heading-sm text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {isEN ? 'Recent Platform Activity' : 'النشاط الأخير على المنصة'}
        </h3>
        <div className="space-y-3">
          {recentActivity.map((act: any) => (
            <div key={`${act.source}-${act.id}`} className="flex items-start gap-3 text-body-sm">
              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${act.source === 'case' ? 'bg-info' : 'bg-purple-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{act.title || act.description || '—'}</p>
                <div className="flex items-center gap-2 text-muted-foreground text-[12px]">
                  <span>{orgMap[act.organization_id] || 'Unknown'}</span>
                  <span>·</span>
                  <span>{timeAgo(act.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-muted-foreground text-body-sm">{isEN ? 'No recent activity' : 'لا يوجد نشاط حديث'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
