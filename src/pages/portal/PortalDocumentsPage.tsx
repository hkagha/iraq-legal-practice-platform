import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Download, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { downloadDocumentById } from '@/lib/documentAccess';
import { toast } from '@/hooks/use-toast';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function PortalDocumentsPage() {
  const { language, isRTL } = useLanguage();
  const { activeOrg } = usePortalOrg();
  const isEN = language === 'en';
  const [search, setSearch] = useState('');
  const orgId = activeOrg?.id || null;

  const { data: docs, isLoading } = useQuery({
    queryKey: ['portal-documents', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_name_ar, title, title_ar, file_size_bytes, file_type, file_path, created_at, case_id')
        .eq('organization_id', orgId!)
        .eq('is_visible_to_client', true)
        .eq('status', 'active')
        .eq('is_latest_version', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (docs ?? []).filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (d.title ?? '').toLowerCase().includes(s) ||
      (d.title_ar ?? '').toLowerCase().includes(s) ||
      d.file_name.toLowerCase().includes(s)
    );
  });

  const handleDownload = async (documentId: string, displayName: string) => {
    try {
      await downloadDocumentById(documentId, displayName);
    } catch {
      toast({ title: isEN ? 'Download failed' : 'فشل التحميل', variant: 'destructive' });
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-display-sm font-bold text-primary mb-1">
          {isEN ? 'My Documents' : 'مستنداتي'}
        </h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'Files your firm has shared with you' : 'الملفات التي شاركها معك مكتبك'}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-muted-foreground`} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEN ? 'Search documents…' : 'ابحث في المستندات…'}
          className={isRTL ? 'pr-9' : 'pl-9'}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          titleAr="لا توجد مستندات"
          subtitle="Files your firm shares with you will appear here."
          subtitleAr="ستظهر هنا الملفات التي يشاركها مكتبك معك."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const displayName = isEN ? (d.title || d.file_name) : (d.title_ar || d.title || d.file_name_ar || d.file_name);
            return (
              <Card key={d.id} className="p-4 flex items-center gap-4 hover:border-accent/50 transition-colors">
                <Link to={`/portal/documents/${d.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{displayName}</h3>
                    <div className="flex items-center gap-3 mt-1 text-body-xs text-muted-foreground">
                      <span>{formatBytes(d.file_size_bytes)}</span>
                      <span className="uppercase">{d.file_type}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(d.created_at).toLocaleDateString(isEN ? 'en-GB' : 'ar-IQ')}
                      </span>
                    </div>
                  </div>
                </Link>
                <Button asChild size="sm" variant="ghost" className="shrink-0">
                  <Link to={`/portal/documents/${d.id}`}>
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline ms-2">{isEN ? 'Open' : 'فتح'}</span>
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownload(d.id, displayName)}>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline ms-2">{isEN ? 'Download' : 'تحميل'}</span>
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
