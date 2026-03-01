import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { Globe, FileDown, MessageSquare, Receipt } from 'lucide-react';

export default function ClientPortalActivityCard({ clientId }: { clientId: string }) {
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [portalUserId, setPortalUserId] = useState<string | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);
  const [docsDownloaded, setDocsDownloaded] = useState(0);
  const [messagesSent, setMessagesSent] = useState(0);
  const [invoicesViewed, setInvoicesViewed] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const load = async () => {
    setLoading(true);

    const { data: link } = await supabase
      .from('client_user_links')
      .select('user_id')
      .eq('client_id', clientId)
      .maybeSingle();

    const userId = link?.user_id || null;
    setPortalUserId(userId);

    if (userId) {
      const { data: p } = await supabase
        .from('profiles')
        .select('last_active_at')
        .eq('id', userId)
        .maybeSingle();
      setLastActiveAt(p?.last_active_at || null);
    }

    const [docsRes, msgsRes, invRes] = await Promise.all([
      userId
        ? supabase.from('document_activities').select('*', { count: 'exact', head: true }).eq('actor_id', userId).eq('activity_type', 'downloaded')
        : Promise.resolve({ count: 0 } as any),
      supabase.from('client_messages').select('*', { count: 'exact', head: true }).eq('client_id', clientId).eq('sender_type', 'client'),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('client_id', clientId).not('viewed_at', 'is', null),
    ]);

    setDocsDownloaded(docsRes.count || 0);
    setMessagesSent(msgsRes.count || 0);
    setInvoicesViewed(invRes.count || 0);

    setLoading(false);
  };

  const lastLoginLabel = useMemo(() => {
    if (!portalUserId) return language === 'en' ? 'Not Enabled' : 'غير مفعلة';
    if (!lastActiveAt) return language === 'en' ? 'Never' : 'أبداً';
    return formatDistanceToNow(new Date(lastActiveAt), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined });
  }, [portalUserId, lastActiveAt, language]);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-heading-sm font-semibold text-foreground">{language === 'en' ? 'Portal Activity' : 'نشاط البوابة'}</h3>
        <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${portalUserId ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
          {portalUserId ? (language === 'en' ? 'Active' : 'مفعلة') : (language === 'en' ? 'Not Enabled' : 'غير مفعلة')}
        </span>
      </div>

      {loading ? (
        <p className="text-body-sm text-muted-foreground">{language === 'en' ? 'Loading…' : 'جاري التحميل…'}</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-body-sm">
            <span className="text-muted-foreground">{language === 'en' ? 'Last login' : 'آخر دخول'}</span>
            <span className="text-foreground">{lastLoginLabel}</span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span className="text-muted-foreground inline-flex items-center gap-1"><FileDown className="h-3.5 w-3.5" /> {language === 'en' ? 'Documents downloaded' : 'المستندات المحملة'}</span>
            <span className="text-foreground">{docsDownloaded}</span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span className="text-muted-foreground inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {language === 'en' ? 'Messages sent' : 'الرسائل المرسلة'}</span>
            <span className="text-foreground">{messagesSent}</span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span className="text-muted-foreground inline-flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> {language === 'en' ? 'Invoices viewed' : 'الفواتير التي تم عرضها'}</span>
            <span className="text-foreground">{invoicesViewed}</span>
          </div>
        </div>
      )}
    </div>
  );
}
