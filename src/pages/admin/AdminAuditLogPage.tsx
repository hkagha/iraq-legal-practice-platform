import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, ClipboardList } from 'lucide-react';

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  details: any;
  created_at: string;
  admin_name?: string;
}

export default function AdminAuditLogPage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    const { data } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(100) as any;
    const entries = data || [];
    // Get admin names
    const adminIds = [...new Set(entries.map((e: any) => e.admin_id))] as string[];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', adminIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = `${p.first_name} ${p.last_name}`; });
      entries.forEach((e: any) => { e.admin_name = nameMap[e.admin_id] || 'Admin'; });
    }
    setEntries(entries);
    setLoading(false);
  }

  const actionLabels: Record<string, string> = {
    login: isEN ? 'Logged in' : 'سجل الدخول',
    logout: isEN ? 'Logged out' : 'سجل الخروج',
    impersonate_start: isEN ? 'Started impersonation' : 'بدأ الانتحال',
    impersonate_end: isEN ? 'Ended impersonation' : 'أنهى الانتحال',
    org_created: isEN ? 'Created organization' : 'أنشأ مؤسسة',
    org_updated: isEN ? 'Updated organization' : 'حدّث مؤسسة',
    org_suspended: isEN ? 'Suspended organization' : 'علّق مؤسسة',
    org_activated: isEN ? 'Activated organization' : 'فعّل مؤسسة',
    user_created: isEN ? 'Created user' : 'أنشأ مستخدم',
    user_updated: isEN ? 'Updated user' : 'حدّث مستخدم',
    user_deactivated: isEN ? 'Deactivated user' : 'عطّل مستخدم',
    user_activated: isEN ? 'Activated user' : 'فعّل مستخدم',
    user_role_changed: isEN ? 'Changed user role' : 'غيّر دور المستخدم',
    user_password_reset: isEN ? 'Reset user password' : 'أعاد تعيين كلمة المرور',
    plan_changed: isEN ? 'Changed plan' : 'غيّر الخطة',
    backup_created: isEN ? 'Created backup' : 'أنشأ نسخة احتياطية',
    announcement_sent: isEN ? 'Sent announcement' : 'أرسل إعلان',
    settings_changed: isEN ? 'Changed settings' : 'غيّر الإعدادات',
  };

  const actionColor = (action: string) => {
    if (action.includes('delete') || action.includes('suspend') || action.includes('deactivat')) return 'bg-destructive/10 text-destructive';
    if (action.includes('creat') || action.includes('activat')) return 'bg-success/10 text-success';
    return 'bg-info/10 text-info';
  };

  const filtered = entries.filter(e => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.target_name || '').toLowerCase().includes(q) || e.action.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm text-foreground">{isEN ? 'Audit Log' : 'سجل المراجعة'}</h1>
        <p className="text-body-md text-muted-foreground">{isEN ? 'All administrative actions across the platform' : 'جميع الإجراءات الإدارية عبر المنصة'}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isEN ? 'Search...' : 'بحث...'} className="w-full h-10 ps-9 pe-3 rounded-lg border border-border bg-card text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-body-md">
          <option value="all">{isEN ? 'All Actions' : 'كل الإجراءات'}</option>
          {Object.keys(actionLabels).map(a => <option key={a} value={a}>{actionLabels[a]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{isEN ? 'No audit entries found' : 'لا توجد سجلات'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-card">
          <table className="w-full text-body-sm">
            <thead className="bg-muted/50">
              <tr>
                {[isEN ? 'Timestamp' : 'الوقت', isEN ? 'Admin' : 'المدير', isEN ? 'Action' : 'الإجراء', isEN ? 'Target' : 'الهدف', isEN ? 'Details' : 'التفاصيل'].map(h => (
                  <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-t hover:bg-muted/20">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-3 font-medium text-foreground">{e.admin_name || 'Admin'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-body-sm ${actionColor(e.action)}`}>{actionLabels[e.action] || e.action}</span></td>
                  <td className="p-3 text-muted-foreground">{e.target_name || '—'}</td>
                  <td className="p-3 text-muted-foreground max-w-[200px] truncate">{e.details && Object.keys(e.details).length > 0 ? JSON.stringify(e.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
