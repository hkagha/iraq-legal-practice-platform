import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Briefcase, MessageSquare, Scale, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
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
  case_id: string | null;
  errand_id: string | null;
}

interface MatterThread {
  id: string;
  type: 'case' | 'errand';
  number: string;
  title: string;
  title_ar: string | null;
  status: string;
  updated_at: string;
}

export default function PortalMessagesPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { activeOrg } = usePortalOrg();
  const queryClient = useQueryClient();
  const isEN = language === 'en';
  const [draft, setDraft] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const orgId = activeOrg?.id || null;

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ['portal-message-threads', activeOrg?.context_id],
    enabled: !!orgId && !!activeOrg,
    queryFn: async (): Promise<MatterThread[]> => {
      const [casePartiesRes, errandsRes] = await Promise.all([
        supabase
          .from('case_parties')
          .select('cases!inner(id, case_number, title, title_ar, status, updated_at, organization_id)')
          .eq('role', 'client')
          .eq(activeOrg!.context_type === 'person' ? 'person_id' : 'entity_id', activeOrg!.context_type === 'person' ? activeOrg!.person_id : activeOrg!.entity_id!)
          .eq('cases.organization_id', orgId!),
        supabase
          .from('errands')
          .select('id, errand_number, title, title_ar, status, updated_at')
          .eq('organization_id', orgId!)
          .eq('party_type', activeOrg!.context_type)
          .eq(activeOrg!.context_type === 'person' ? 'person_id' : 'entity_id', activeOrg!.context_type === 'person' ? activeOrg!.person_id : activeOrg!.entity_id!),
      ]);
      if (casePartiesRes.error) throw casePartiesRes.error;
      if (errandsRes.error) throw errandsRes.error;

      const seen = new Set<string>();
      const caseThreads: MatterThread[] = (casePartiesRes.data || [])
        .map((row: any) => row.cases)
        .filter((c: any) => c && !seen.has(c.id) && seen.add(c.id))
        .map((c: any) => ({
          id: c.id,
          type: 'case',
          number: c.case_number,
          title: c.title,
          title_ar: c.title_ar,
          status: c.status,
          updated_at: c.updated_at,
        }));
      const errandThreads: MatterThread[] = (errandsRes.data || []).map((e: any) => ({
        id: e.id,
        type: 'errand',
        number: e.errand_number,
        title: e.title,
        title_ar: e.title_ar,
        status: e.status,
        updated_at: e.updated_at,
      }));
      return [...caseThreads, ...errandThreads].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    },
  });

  const selectedThread = (threads || []).find((t) => `${t.type}:${t.id}` === selectedThreadId) || null;

  useEffect(() => {
    if (!selectedThreadId && threads && threads.length > 0) {
      setSelectedThreadId(`${threads[0].type}:${threads[0].id}`);
    }
  }, [threads, selectedThreadId]);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['portal-matter-messages', activeOrg?.context_id, selectedThreadId],
    enabled: !!activeOrg && !!selectedThread,
    queryFn: async (): Promise<ClientMessage[]> => {
      let q = supabase
        .from('client_messages')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('party_type', activeOrg!.context_type)
        .eq(activeOrg!.context_type === 'person' ? 'person_id' : 'entity_id', activeOrg!.context_type === 'person' ? activeOrg!.person_id : activeOrg!.entity_id!)
        .order('created_at', { ascending: true });
      q = selectedThread!.type === 'case' ? q.eq('case_id', selectedThread!.id) : q.eq('errand_id', selectedThread!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClientMessage[];
    },
  });

  useEffect(() => {
    if (!activeOrg || !selectedThread) return;
    const channel = supabase
      .channel(`portal-matter-messages-${selectedThread.type}-${selectedThread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_messages',
          filter: selectedThread.type === 'case' ? `case_id=eq.${selectedThread.id}` : `errand_id=eq.${selectedThread.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ['portal-matter-messages'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrg, selectedThread, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeOrg || !user?.id || !selectedThread) throw new Error('No active matter thread');
      const { error } = await supabase.from('client_messages').insert({
        organization_id: activeOrg.id,
        party_type: activeOrg.context_type,
        person_id: activeOrg.context_type === 'person' ? activeOrg.person_id : null,
        entity_id: activeOrg.context_type === 'entity' ? activeOrg.entity_id : null,
        case_id: selectedThread.type === 'case' ? selectedThread.id : null,
        errand_id: selectedThread.type === 'errand' ? selectedThread.id : null,
        sender_id: user.id,
        sender_type: 'client',
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['portal-matter-messages'] });
    },
    onError: (e: Error) => toast({ title: isEN ? 'Send failed' : 'فشل الإرسال', description: e.message, variant: 'destructive' }),
  });

  if (threadsLoading) return <PageLoader />;

  return (
    <div className="max-w-[1100px] mx-auto p-4 md:p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-display-sm font-bold text-primary mb-1">{isEN ? 'Messages' : 'الرسائل'}</h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'Messages are organized by case or errand.' : 'يتم تنظيم الرسائل حسب القضية أو المعاملة.'}
        </p>
      </div>

      {(threads || []).length === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={MessageSquare}
            title="No message threads"
            titleAr="لا توجد محادثات"
            subtitle="Messages become available when you have an accessible case or errand."
            subtitleAr="تتوفر الرسائل عندما تكون لديك قضية أو معاملة متاحة."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-0 flex-1">
          <Card className="overflow-y-auto p-2">
            {threads!.map((thread) => {
              const key = `${thread.type}:${thread.id}`;
              const selected = key === selectedThreadId;
              const Icon = thread.type === 'case' ? Scale : Briefcase;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedThreadId(key)}
                  className={`w-full text-start p-3 rounded-md flex items-start gap-3 transition ${
                    selected ? 'bg-accent/10 text-accent' : 'hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-body-xs font-mono text-muted-foreground truncate">{thread.number}</span>
                    <span className="block text-body-sm font-medium truncate">
                      {isEN ? thread.title : (thread.title_ar || thread.title)}
                    </span>
                  </span>
                </button>
              );
            })}
          </Card>

          <Card className="flex flex-col overflow-hidden min-h-0">
            <div className="border-b border-border px-4 py-3">
              <div className="text-body-xs font-mono text-muted-foreground">{selectedThread?.number}</div>
              <div className="text-body-md font-semibold text-foreground truncate">
                {selectedThread ? (isEN ? selectedThread.title : (selectedThread.title_ar || selectedThread.title)) : ''}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messagesLoading ? (
                <PageLoader />
              ) : (messages ?? []).length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages yet"
                    titleAr="لا توجد رسائل"
                    subtitle="Start the conversation with your firm below."
                    subtitleAr="ابدأ المحادثة مع مكتبك أدناه."
                  />
                </div>
              ) : (
                (messages ?? []).map((m) => {
                  const mine = m.sender_type === 'client';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${mine ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
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
                disabled={!draft.trim() || sendMutation.isPending || !selectedThread}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
