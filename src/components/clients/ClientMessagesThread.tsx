import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';

type PartyType = 'person' | 'entity';

interface Props {
  partyType: PartyType;
  /** person_id or entity_id depending on partyType */
  partyId: string;
  /** Required case context for staff-client matter messages. */
  caseId?: string;
}

interface Message {
  id: string;
  organization_id: string;
  party_type: string;
  person_id: string | null;
  entity_id: string | null;
  case_id: string | null;
  errand_id: string | null;
  sender_id: string;
  sender_type: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  profiles?: { first_name: string; last_name: string } | null;
}

/**
 * Two-way message thread between staff and a client (person or entity).
 *
 * Staff can read/send messages here. Realtime subscription keeps the thread
 * up to date when the client posts from the portal.
 */
export default function ClientMessagesThread({ partyType, partyId, caseId }: Props) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const isAR = language === 'ar';
  const orgId = profile?.organization_id;

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The list of messages in this thread.
  const { data: messages, isLoading } = useQuery({
    queryKey: ['client-messages', partyType, partyId, caseId ?? null],
    enabled: !!partyId && !!orgId,
    queryFn: async () => {
      let q = supabase
        .from('client_messages')
        .select(
          'id, organization_id, party_type, person_id, entity_id, case_id, errand_id, sender_id, sender_type, content, is_read, read_at, created_at',
        )
        .eq('organization_id', orgId!)
        .eq('party_type', partyType)
        .eq(partyType === 'person' ? 'person_id' : 'entity_id', partyId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (caseId) q = q.eq('case_id', caseId);
      const { data, error } = await q;
      if (error) throw error;

      // Resolve staff sender names. Client senders are anonymous from the staff
      // POV — they're just the client we're chatting with.
      const staffIds = Array.from(new Set(
        (data || []).filter((m: any) => m.sender_type === 'staff').map((m: any) => m.sender_id),
      ));
      let staffById: Record<string, { first_name: string; last_name: string }> = {};
      if (staffIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', staffIds);
        staffById = Object.fromEntries((profs || []).map((p: any) => [p.id, { first_name: p.first_name, last_name: p.last_name }]));
      }

      return (data || []).map((m: any) => ({
        ...m,
        profiles: m.sender_type === 'staff' ? staffById[m.sender_id] || null : null,
      })) as Message[];
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages?.length]);

  // Realtime subscription — refresh thread when new messages arrive
  useEffect(() => {
    if (!orgId || !partyId) return;
    const ch = supabase
      .channel(`client-messages-${partyType}-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_messages',
          filter: `${partyType === 'person' ? 'person_id' : 'entity_id'}=eq.${partyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['client-messages', partyType, partyId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId, partyType, partyId, qc]);

  // Mark unread client messages as read on view
  useEffect(() => {
    if (!messages || !profile?.id) return;
    const unread = messages.filter((m) => m.sender_type === 'client' && !m.is_read).map((m) => m.id);
    if (unread.length === 0) return;
    supabase
      .from('client_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unread)
      .then(() => {
        // Refresh after marking read
        qc.invalidateQueries({ queryKey: ['client-messages', partyType, partyId] });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length]);

  const sendMessage = async () => {
    if (!draft.trim() || !orgId || !profile?.id) return;
    if (!caseId) {
      toast.error(isAR ? 'افتح محادثة مرتبطة بقضية لإرسال رسالة.' : 'Open a case message thread before sending.');
      return;
    }
    setSending(true);
    const payload: any = {
      organization_id: orgId,
      party_type: partyType,
      person_id: partyType === 'person' ? partyId : null,
      entity_id: partyType === 'entity' ? partyId : null,
      case_id: caseId,
      sender_id: profile.id,
      sender_type: 'staff',
      content: draft.trim(),
    };
    const { error } = await supabase.from('client_messages').insert(payload);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft('');
    qc.invalidateQueries({ queryKey: ['client-messages', partyType, partyId] });
  };

  return (
    <div className="rounded-card border border-border bg-card flex flex-col h-[560px]">
      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (messages?.length ?? 0) === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            titleAr="لا توجد رسائل بعد"
            subtitle="Start the conversation. The client will see your message in their portal."
            subtitleAr="ابدأ المحادثة. سيرى العميل رسالتك في بوابته."
            size="sm"
          />
        ) : (
          messages!.map((m) => {
            const fromStaff = m.sender_type === 'staff';
            const senderName = m.profiles
              ? `${m.profiles.first_name || ''} ${m.profiles.last_name || ''}`.trim()
              : '';
            return (
              <div
                key={m.id}
                className={`flex ${fromStaff ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-body-md ${
                    fromStaff
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      fromStaff ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {fromStaff && senderName && <span>{senderName} · </span>}
                    {format(new Date(m.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={isAR ? 'اكتب رسالة…' : 'Type a message…'}
          rows={2}
          dir={isAR ? 'rtl' : 'ltr'}
          className="flex-1 resize-none rounded-input border border-border bg-background px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button onClick={sendMessage} disabled={sending || !draft.trim()}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {isAR ? 'إرسال' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
