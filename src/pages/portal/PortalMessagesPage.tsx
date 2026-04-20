import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { toast } from '@/hooks/use-toast';

interface ClientMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_id: string;
  created_at: string;
  organization_id: string;
  party_type: string;
  person_id: string | null;
  entity_id: string | null;
}

export default function PortalMessagesPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEN = language === 'en';
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get the portal user's primary link to determine party_type/person_id and org
  const { data: link } = useQuery({
    queryKey: ['portal-user-primary-link', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: pu, error: e1 } = await supabase
        .from('portal_users')
        .select('id, last_selected_org_id')
        .eq('auth_user_id', user!.id)
        .maybeSingle();
      if (e1) throw e1;
      if (!pu) return null;

      const { data: links, error: e2 } = await supabase
        .from('portal_user_links')
        .select('person_id, organization_id')
        .eq('portal_user_id', pu.id)
        .eq('is_active', true);
      if (e2) throw e2;
      if (!links || links.length === 0) return null;

      const chosen = links.find((l) => l.organization_id === pu.last_selected_org_id) ?? links[0];
      return chosen;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['portal-messages', link?.person_id, link?.organization_id],
    enabled: !!link?.person_id,
    queryFn: async (): Promise<ClientMessage[]> => {
      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('party_type', 'person')
        .eq('person_id', link!.person_id)
        .eq('organization_id', link!.organization_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ClientMessage[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!link?.person_id) return;
    const channel = supabase
      .channel(`portal-messages-${link.person_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `person_id=eq.${link.person_id}` },
        () => queryClient.invalidateQueries({ queryKey: ['portal-messages'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [link?.person_id, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!link?.person_id || !user?.id) throw new Error('No active client link');
      const { error } = await supabase.from('client_messages').insert({
        organization_id: link.organization_id,
        party_type: 'person',
        person_id: link.person_id,
        sender_id: user.id,
        sender_type: 'client',
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
    },
    onError: (e: Error) => toast({ title: isEN ? 'Send failed' : 'فشل الإرسال', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-[900px] mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-display-sm font-bold text-primary mb-1">
          {isEN ? 'Messages' : 'الرسائل'}
        </h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'Direct messages with your firm' : 'الرسائل المباشرة مع مكتبك'}
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {(messages ?? []).length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                titleAr="لا توجد رسائل"
                subtitle="Start a conversation with your firm below."
                subtitleAr="ابدأ محادثة مع مكتبك أدناه."
              />
            </div>
          ) : (
            (messages ?? []).map((m) => {
              const mine = m.sender_type === 'client';
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      mine ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-body-sm">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'opacity-80' : 'text-muted-foreground'}`}>
                      {new Date(m.created_at).toLocaleString(isEN ? 'en-GB' : 'ar-IQ')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isEN ? 'Write a message…' : 'اكتب رسالة…'}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) sendMutation.mutate(draft.trim());
              }
            }}
          />
          <Button
            onClick={() => draft.trim() && sendMutation.mutate(draft.trim())}
            disabled={!draft.trim() || sendMutation.isPending || !link}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
