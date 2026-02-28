import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Scale, UserPlus, Calendar, RefreshCw, MessageSquare, Pencil, FileCheck, CheckCircle, CheckCircle2, XCircle, Upload, Download, GitBranch, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  title_ar: string | null;
  created_at: string;
  entity_type: 'case' | 'client' | 'errand';
  entity_id: string;
}

const ACTIVITY_ICON_MAP: Record<string, { icon: typeof Activity; color: string }> = {
  case_created: { icon: Scale, color: '#3B82F6' },
  case_updated: { icon: Pencil, color: '#3B82F6' },
  status_changed: { icon: RefreshCw, color: '#F59E0B' },
  priority_changed: { icon: RefreshCw, color: '#F59E0B' },
  hearing_scheduled: { icon: Calendar, color: '#EF4444' },
  hearing_completed: { icon: Calendar, color: '#22C55E' },
  hearing_adjourned: { icon: Calendar, color: '#F59E0B' },
  note_added: { icon: MessageSquare, color: '#8B5CF6' },
  note_updated: { icon: MessageSquare, color: '#8B5CF6' },
  client_created: { icon: UserPlus, color: '#C9A84C' },
  client_updated: { icon: Pencil, color: '#3B82F6' },
  client_archived: { icon: UserPlus, color: '#64748B' },
  team_member_added: { icon: UserPlus, color: '#06B6D4' },
  errand_created: { icon: FileCheck, color: '#8B5CF6' },
  step_completed: { icon: CheckCircle, color: '#22C55E' },
  errand_completed: { icon: CheckCircle2, color: '#C9A84C' },
  errand_cancelled: { icon: XCircle, color: '#94A3B8' },
  uploaded: { icon: Upload, color: '#22C55E' },
  downloaded: { icon: Download, color: '#3B82F6' },
  version_created: { icon: GitBranch, color: '#C9A84C' },
  shared_with_client: { icon: Eye, color: '#8B5CF6' },
  renamed: { icon: Pencil, color: '#3B82F6' },
};

export default function RecentActivityWidget() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const fetch = async () => {
    const [caseRes, clientRes, errandRes, docRes] = await Promise.all([
        supabase
          .from('case_activities')
          .select('id, activity_type, title, title_ar, created_at, case_id')
          .eq('organization_id', profile.organization_id!)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('client_activities')
          .select('id, activity_type, title, title_ar, created_at, client_id')
          .eq('organization_id', profile.organization_id!)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('errand_activities')
          .select('id, activity_type, title, title_ar, created_at, errand_id')
          .eq('organization_id', profile.organization_id!)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('document_activities')
          .select('id, activity_type, title, title_ar, created_at, document_id')
          .eq('organization_id', profile.organization_id!)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const caseItems: ActivityItem[] = (caseRes.data || []).map(a => ({
        id: a.id, activity_type: a.activity_type, title: a.title,
        title_ar: a.title_ar, created_at: a.created_at,
        entity_type: 'case', entity_id: a.case_id,
      }));
      const clientItems: ActivityItem[] = (clientRes.data || []).map(a => ({
        id: a.id, activity_type: a.activity_type, title: a.title,
        title_ar: a.title_ar, created_at: a.created_at,
        entity_type: 'client', entity_id: a.client_id,
      }));
      const errandItems: ActivityItem[] = (errandRes.data || []).map(a => ({
        id: a.id, activity_type: a.activity_type, title: a.title,
        title_ar: a.title_ar, created_at: a.created_at,
        entity_type: 'errand', entity_id: a.errand_id,
      }));
      const docItems: ActivityItem[] = (docRes.data || []).map(a => ({
        id: a.id, activity_type: a.activity_type, title: a.title,
        title_ar: a.title_ar, created_at: a.created_at,
        entity_type: 'case' as const, entity_id: a.document_id,
      }));

      const merged = [...caseItems, ...clientItems, ...errandItems, ...docItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setActivities(merged);
      setLoading(false);
    };
    fetch();
  }, [profile?.organization_id]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card shadow-sm animate-pulse">
        <div className="px-5 py-4 border-b border-slate-100"><div className="h-5 w-40 bg-muted rounded" /></div>
        <div className="p-5 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.recentActivity')}</h2>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 min-h-[180px]">
          <Activity className="h-12 w-12 text-slate-300 mb-3" strokeWidth={1.5} />
          <p className="text-body-md text-muted-foreground">{t('dashboard.noRecentActivity')}</p>
          <p className="text-body-sm text-slate-400 mt-1">{t('dashboard.activityWillAppear')}</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {activities.map(a => {
            const config = ACTIVITY_ICON_MAP[a.activity_type] || { icon: Activity, color: '#64748B' };
            const Icon = config.icon;
            const link = a.entity_type === 'case' ? `/cases/${a.entity_id}` : a.entity_type === 'errand' ? `/errands/${a.entity_id}` : `/clients/${a.entity_id}`;

            return (
              <div
                key={a.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(link)}
              >
                <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon size={14} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md text-foreground">{language === 'ar' && a.title_ar ? a.title_ar : a.title}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
