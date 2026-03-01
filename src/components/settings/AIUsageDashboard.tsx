import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Zap, Clock, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface UsageStats {
  tokensUsed: number;
  tokenLimit: number;
  totalRequests: number;
  mostUsedFeature: string;
  avgResponseTime: number;
  byFeature: { name: string; value: number }[];
  byMember: { name: string; requests: number; tokens: number; feature: string; lastUsed: string }[];
}

const FEATURE_COLORS = ['#D4A853', '#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

export default function AIUsageDashboard() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [logEntries, setLogEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    loadStats();
  }, [profile?.organization_id]);

  const loadStats = async () => {
    if (!profile?.organization_id) return;
    const orgId = profile.organization_id;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [orgRes, usageRes] = await Promise.all([
      supabase.from('organizations').select('ai_monthly_token_limit, ai_tokens_used_this_month').eq('id', orgId).maybeSingle(),
      supabase.from('ai_usage_log').select('*').eq('organization_id', orgId).gte('created_at', startOfMonth.toISOString()).order('created_at', { ascending: false }).limit(200),
    ]);

    const tokenLimit = (orgRes.data as any)?.ai_monthly_token_limit ?? 500000;
    const tokensUsed = (orgRes.data as any)?.ai_tokens_used_this_month ?? 0;
    const logs = usageRes.data || [];

    // By feature
    const featureMap: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;
    logs.forEach((log: any) => {
      featureMap[log.feature] = (featureMap[log.feature] || 0) + (log.total_tokens || 0);
      if (log.duration_ms) { totalDuration += log.duration_ms; durationCount++; }
    });

    const byFeature = Object.entries(featureMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const mostUsed = byFeature[0]?.name || '-';

    // By member
    const memberMap: Record<string, { requests: number; tokens: number; features: Record<string, number>; lastUsed: string }> = {};
    logs.forEach((log: any) => {
      if (!memberMap[log.user_id]) memberMap[log.user_id] = { requests: 0, tokens: 0, features: {}, lastUsed: log.created_at };
      memberMap[log.user_id].requests++;
      memberMap[log.user_id].tokens += log.total_tokens || 0;
      memberMap[log.user_id].features[log.feature] = (memberMap[log.user_id].features[log.feature] || 0) + 1;
    });

    const byMember = Object.entries(memberMap).map(([id, data]) => {
      const topFeature = Object.entries(data.features).sort(([, a], [, b]) => b - a)[0]?.[0] || '-';
      return { name: id.slice(0, 8), requests: data.requests, tokens: data.tokens, feature: topFeature, lastUsed: data.lastUsed };
    }).sort((a, b) => b.tokens - a.tokens);

    setStats({
      tokensUsed, tokenLimit,
      totalRequests: logs.length,
      mostUsedFeature: mostUsed,
      avgResponseTime: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      byFeature, byMember,
    });
    setLogEntries(logs.slice(0, 50));
    setLoading(false);
  };

  const featureLabel = (f: string) => t(`ai.features.${f.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`) || f;

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /></div>;
  if (!stats) return null;

  const usagePercent = stats.tokenLimit > 0 ? Math.min(100, Math.round((stats.tokensUsed / stats.tokenLimit) * 100)) : 0;

  return (
    <div className="space-y-6 mt-8 border-t border-border pt-8">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <BarChart3 size={18} />
        {t('ai.usage.title')}
      </h3>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Zap size={14} />
            {t('ai.usage.tokensThisMonth')}
          </div>
          <p className="text-lg font-bold text-foreground">{stats.tokensUsed.toLocaleString()}</p>
          <Progress value={usagePercent} className="h-2 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{usagePercent}% of {stats.tokenLimit.toLocaleString()}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <TrendingUp size={14} />
            {t('ai.usage.totalRequests')}
          </div>
          <p className="text-lg font-bold text-foreground">{stats.totalRequests}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            {t('ai.usage.mostUsedFeature')}
          </div>
          <p className="text-sm font-semibold text-foreground">{featureLabel(stats.mostUsedFeature)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Clock size={14} />
            {t('ai.usage.avgResponseTime')}
          </div>
          <p className="text-lg font-bold text-foreground">{stats.avgResponseTime > 0 ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : '-'}</p>
        </div>
      </div>

      {/* Donut chart */}
      {stats.byFeature.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4">{t('ai.usage.byFeature')}</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.byFeature} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {stats.byFeature.map((_, i) => (
                  <Cell key={i} fill={FEATURE_COLORS[i % FEATURE_COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip formatter={(value: number, name: string) => [value.toLocaleString(), featureLabel(name)]} />
              <Legend formatter={(name: string) => featureLabel(name)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log toggle */}
      <button onClick={() => setShowLog(!showLog)} className="text-sm text-accent hover:underline">
        {t('ai.usage.detailedLog')} ({logEntries.length})
      </button>

      {showLog && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-start py-2 pe-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="text-start py-2 pe-3">{language === 'ar' ? 'الميزة' : 'Feature'}</th>
                <th className="text-start py-2 pe-3">{language === 'ar' ? 'الرموز' : 'Tokens'}</th>
                <th className="text-start py-2">{language === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {logEntries.map((log: any) => (
                <tr key={log.id} className="border-b border-border/50">
                  <td className="py-1.5 pe-3 text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</td>
                  <td className="py-1.5 pe-3">{featureLabel(log.feature)}</td>
                  <td className="py-1.5 pe-3">{log.total_tokens?.toLocaleString()}</td>
                  <td className="py-1.5">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
