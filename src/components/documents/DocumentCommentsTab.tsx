import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { Send, MessageSquare, Loader2, User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentRow {
  id: string;
  document_id: string;
  organization_id: string;
  author_id: string;
  author_type: 'staff' | 'client';
  content: string;
  content_ar: string | null;
  is_visible_to_client: boolean;
  parent_comment_id: string | null;
  created_at: string;
  author?: { first_name?: string; last_name?: string; first_name_ar?: string; last_name_ar?: string };
}

interface Props {
  documentId: string;
  organizationId: string;
  /** 'staff' rendering inside firm UI, 'client' from portal */
  variant: 'staff' | 'client';
  /** Whether the document is shared with the client — controls default visibility toggle */
  documentVisibleToClient?: boolean;
}

export default function DocumentCommentsTab({ documentId, organizationId, variant, documentVisibleToClient }: Props) {
  const { language } = useLanguage();
  const { profile, user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [visibleToClient, setVisibleToClient] = useState<boolean>(!!documentVisibleToClient);
  const [posting, setPosting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleToClient(!!documentVisibleToClient);
  }, [documentVisibleToClient]);

  const fetchComments = async () => {
    // Note: author_id has no FK constraint (clients live in portal_users, staff in profiles).
    // We fetch comments first, then resolve staff author names in a follow-up query.
    const { data: rows, error } = await supabase
      .from('document_comments')
      .select('id, document_id, organization_id, author_id, author_type, content, content_ar, is_visible_to_client, created_at, updated_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });
    if (error || !rows) {
      setLoading(false);
      return;
    }

    // Resolve staff authors (author_type='staff') via profiles
    const staffIds = Array.from(new Set(
      rows.filter((r: any) => r.author_type === 'staff' && r.author_id).map((r: any) => r.author_id),
    ));
    let staffById: Record<string, any> = {};
    if (staffIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, first_name_ar, last_name_ar')
        .in('id', staffIds);
      staffById = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
    }

    // Resolve client authors (author_type='client') via portal_users
    const clientIds = Array.from(new Set(
      rows.filter((r: any) => r.author_type === 'client' && r.author_id).map((r: any) => r.author_id),
    ));
    let clientById: Record<string, any> = {};
    if (clientIds.length > 0) {
      const { data: pus } = await supabase
        .from('portal_users')
        .select('auth_user_id, full_name, full_name_ar')
        .in('auth_user_id', clientIds);
      clientById = Object.fromEntries((pus || []).map((p: any) => {
        const [first, ...rest] = (p.full_name || '').split(' ');
        const [firstAr, ...restAr] = (p.full_name_ar || '').split(' ');
        return [p.auth_user_id, {
          first_name: first || '',
          last_name: rest.join(' ') || '',
          first_name_ar: firstAr || '',
          last_name_ar: restAr.join(' ') || '',
        }];
      }));
    }

    const enriched = rows.map((r: any) => ({
      ...r,
      author: r.author_type === 'staff' ? staffById[r.author_id] : clientById[r.author_id],
    }));
    setComments(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    fetchComments();

    const channel = supabase
      .channel(`doc-comments-${documentId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'document_comments', filter: `document_id=eq.${documentId}` },
        () => fetchComments(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handlePost = async () => {
    const authorId = variant === 'client' ? user?.id : profile?.id;
    if (!content.trim() || !authorId) return;
    setPosting(true);
    try {
      const payload: any = {
        document_id: documentId,
        organization_id: organizationId,
        author_id: authorId,
        author_type: variant,
        content: content.trim(),
        is_visible_to_client: variant === 'client' ? true : visibleToClient,
      };
      const { error } = await supabase.from('document_comments').insert(payload);
      if (error) throw error;
      await supabase.from('document_activities').insert({
        document_id: documentId,
        organization_id: organizationId,
        actor_id: authorId,
        activity_type: 'commented',
        title: variant === 'client' ? 'Client commented on document' : 'Staff commented on document',
        title_ar: variant === 'client' ? 'علّق العميل على المستند' : 'علّق الفريق على المستند',
      } as any);
      setContent('');
    } catch (err: any) {
      toast.error(err.message || (language === 'ar' ? 'فشل إرسال التعليق' : 'Failed to post comment'));
    } finally {
      setPosting(false);
    }
  };

  const renderAuthor = (c: CommentRow) => {
    const a = c.author;
    if (!a) return c.author_type === 'client' ? (language === 'ar' ? 'العميل' : 'Client') : (language === 'ar' ? 'الفريق' : 'Staff');
    return language === 'ar' && a.first_name_ar
      ? `${a.first_name_ar} ${a.last_name_ar || ''}`.trim()
      : `${a.first_name || ''} ${a.last_name || ''}`.trim();
  };

  return (
    <div className="flex flex-col">
      <div className="space-y-3 max-h-[420px] overflow-y-auto pe-1">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <MessageSquare size={28} className="opacity-40" />
            <p className="text-body-sm">{language === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}</p>
          </div>
        ) : (
          comments.map((c) => {
            const isClient = c.author_type === 'client';
            const Icon = isClient ? User : Briefcase;
            return (
              <div key={c.id} className={cn('flex gap-2.5 p-3 rounded-lg border', isClient ? 'bg-accent/5 border-accent/20' : 'bg-muted/30 border-border')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', isClient ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary')}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body-sm font-medium text-foreground">{renderAuthor(c)}</span>
                    <span className={cn('text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5', isClient ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary')}>
                      {isClient ? (language === 'ar' ? 'عميل' : 'Client') : (language === 'ar' ? 'فريق' : 'Staff')}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined })}
                    </span>
                    {variant === 'staff' && !c.is_visible_to_client && (
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground">
                        {language === 'ar' ? 'داخلي' : 'Internal'}
                      </span>
                    )}
                  </div>
                  <p className="text-body-md text-foreground whitespace-pre-wrap mt-1">{c.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border pt-3 mt-3 space-y-2">
        <FormTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={language === 'ar' ? 'اكتب تعليقاً...' : 'Write a comment...'}
          rows={3}
        />
        <div className="flex items-center justify-between gap-2">
          {variant === 'staff' ? (
            <label className="flex items-center gap-2 text-body-sm text-muted-foreground cursor-pointer">
              <Switch checked={visibleToClient} onCheckedChange={setVisibleToClient} />
              <span>{language === 'ar' ? 'مرئي للعميل' : 'Visible to client'}</span>
            </label>
          ) : <span />}
          <Button onClick={handlePost} disabled={!content.trim() || posting} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {posting ? <Loader2 size={14} className="animate-spin me-1.5" /> : <Send size={14} className="me-1.5" />}
            {language === 'ar' ? 'إرسال' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  );
}
