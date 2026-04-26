import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { Sparkles, RefreshCw, X, Calendar, AlertTriangle, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Insight {
  type: 'warning' | 'info' | 'success' | 'urgent';
  text: string;
  text_ar: string;
  entity_type?: string | null;
  entity_id?: string | null;
}

const CACHE_KEY = 'qanuni_ai_insights';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default function AIInsightsWidget() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load from cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setInsights(data);
          setLoaded(true);
          return;
        }
      }
    } catch {}
    // Auto-generate if org has AI
    if (profile?.organization_id) generateInsights();
  }, [profile?.organization_id]);

  const generateInsights = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    setDismissed(new Set());

    try {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [hearingsRes, tasksRes] = await Promise.all([
        supabase.from('case_hearings').select('hearing_date, case_id, hearing_type, status').eq('organization_id', profile.organization_id!).gte('hearing_date', now.toISOString().split('T')[0]).lte('hearing_date', weekEnd.toISOString().split('T')[0]).limit(10),
        supabase.from('tasks').select('title, due_date, status').eq('organization_id', profile.organization_id!).not('status', 'in', '("completed","cancelled")').lte('due_date', weekEnd.toISOString().split('T')[0]).limit(10),
      ]);

      const dataContext = `Hearings this week: ${hearingsRes.data?.length || 0}. Tasks due soon: ${tasksRes.data?.length || 0}.`;

      let result = '';
      await streamAI({
        feature: 'chat',
        prompt: `Based on this law firm data, provide 3-5 concise, actionable insights as a JSON array. Focus on urgent items and achievements. Each insight: 1-2 sentences.\n\nData:\n${dataContext}\n\nRespond ONLY with a JSON array: [{"type": "warning|info|success|urgent", "text": "English text", "text_ar": "Arabic text"}]`,
        language: language === 'ar' ? 'ar' : 'en',
        onDelta: (text) => { result += text; },
        onDone: () => {
          try {
            // Extract JSON array from response
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as Insight[];
              setInsights(parsed);
              localStorage.setItem(CACHE_KEY, JSON.stringify({ data: parsed, timestamp: Date.now() }));
            }
          } catch {
            // Fallback insights
            setInsights([
              { type: 'info', text: 'Check your dashboard for today\'s schedule and upcoming tasks.', text_ar: 'تحقق من لوحة التحكم لجدول اليوم والمهام القادمة.' }
            ]);
          }
          setLoading(false);
          setLoaded(true);
        },
        onError: () => {
          setInsights([{ type: 'info', text: 'AI insights are currently unavailable.', text_ar: 'رؤى الذكاء الاصطناعي غير متاحة حالياً.' }]);
          setLoading(false);
          setLoaded(true);
        },
      });
    } catch {
      setLoading(false);
      setLoaded(true);
    }
  };

  const typeIcons: Record<string, React.ElementType> = {
    urgent: AlertTriangle,
    warning: Clock,
    info: Calendar,
    success: TrendingUp,
  };

  const typeColors: Record<string, string> = {
    urgent:  'text-destructive',
    warning: 'text-warning',
    info:    'text-info',
    success: 'text-success',
  };

  const visibleInsights = insights.filter((_, i) => !dismissed.has(i));

  if (!loaded && !loading) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-accent via-accent-light to-primary" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            {t('ai.insights.title')}
          </h3>
          <Button variant="ghost" size="sm" onClick={generateInsights} disabled={loading} className="h-8 text-xs">
            {loading ? <Loader2 size={14} className="animate-spin me-1" /> : <RefreshCw size={14} className="me-1" />}
            {t('ai.insights.refresh')}
          </Button>
        </div>

        {loading && visibleInsights.length === 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center">
            <Loader2 size={16} className="animate-spin" />
            <span>{language === 'ar' ? 'جاري تحليل البيانات...' : 'Analyzing data...'}</span>
          </div>
        )}

        {!loading && visibleInsights.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('ai.insights.noInsights')}</p>
        )}

        <div className="space-y-3">
          {visibleInsights.map((insight, idx) => {
            const realIdx = insights.indexOf(insight);
            const Icon = typeIcons[insight.type] || Calendar;
            return (
              <div key={realIdx} className="flex items-start gap-3 group">
                <Icon size={16} className={`mt-0.5 shrink-0 ${typeColors[insight.type] || 'text-muted-foreground'}`} />
                <p className="text-sm text-foreground flex-1">
                  {language === 'ar' ? insight.text_ar : insight.text}
                </p>
                <button onClick={() => setDismissed(prev => new Set([...prev, realIdx]))} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                  <X size={12} className="text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
