import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Scale, FileCheck, Paperclip, SendHorizonal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Attachment = { name: string; bucket: string; path: string; size: number };

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: 'client' | 'staff';
  created_at: string;
  case_id: string | null;
  errand_id: string | null;
  is_read: boolean;
  attachments: Attachment[] | null;
}

interface Thread {
  key: string;
  label: string;
  icon: React.ElementType;
  case_id: string | null;
  errand_id: string | null;
  lastMessage: string;
  lastDate: string;
  unread: number;
}

interface ClientMessagesTabProps {
  clientId: string;
  defaultThread?: string;
  lockedThread?: boolean;
  caseLabel?: string;
}

export default function ClientMessagesTab({ clientId, defaultThread, lockedThread, caseLabel }: ClientMessagesTabProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState(defaultThread || 'general');

  useEffect(() => {
    if (defaultThread) setActiveThread(defaultThread);
  }, [defaultThread]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [clientProfile, setClientProfile] = useState<any>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const load = async () => {
    const { data } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(500);
    const msgs = (data || []) as unknown as Message[];
    setMessages(msgs);

    // Try to resolve the client portal user profile (for avatar/name)
    const { data: link } = await supabase
      .from('client_user_links')
      .select('user_id')
      .eq('client_id', clientId)
      .maybeSingle();
    if (link?.user_id) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, first_name_ar, last_name_ar')
        .eq('id', link.user_id)
        .maybeSingle();
      setClientProfile(p);
    }
  };

  const buildThreads = (msgs: Message[]) => {
    const threadMap: Record<string, Thread> = {};
    threadMap.general = {
      key: 'general',
      label: language === 'en' ? 'General' : 'عام',
      icon: MessageSquare,
      case_id: null,
      errand_id: null,
      lastMessage: '',
      lastDate: '',
      unread: 0,
    };

    if (defaultThread && defaultThread.startsWith('case-')) {
      const cid = defaultThread.replace('case-', '');
      threadMap[defaultThread] = {
        key: defaultThread,
        label: caseLabel || (language === 'en' ? 'Case' : 'قضية'),
        icon: Scale, case_id: cid, errand_id: null,
        lastMessage: '', lastDate: '', unread: 0,
      };
    } else if (defaultThread && defaultThread.startsWith('errand-')) {
      const eid = defaultThread.replace('errand-', '');
      threadMap[defaultThread] = {
        key: defaultThread,
        label: caseLabel || (language === 'en' ? 'Errand' : 'معاملة'),
        icon: FileCheck, case_id: null, errand_id: eid,
        lastMessage: '', lastDate: '', unread: 0,
      };
    }

    msgs.forEach(m => {
      const key = m.case_id ? `case-${m.case_id}` : m.errand_id ? `errand-${m.errand_id}` : 'general';
      if (!threadMap[key]) {
        threadMap[key] = {
          key,
          label: m.case_id ? (language === 'en' ? 'Case' : 'قضية') : (language === 'en' ? 'Errand' : 'معاملة'),
          icon: m.case_id ? Scale : FileCheck,
          case_id: m.case_id,
          errand_id: m.errand_id,
          lastMessage: '', lastDate: '', unread: 0,
        };
      }
      threadMap[key].lastMessage = m.content.slice(0, 60);
      threadMap[key].lastDate = m.created_at;
      if (!m.is_read && m.sender_type === 'client') threadMap[key].unread++;
    });

    let list = Object.values(threadMap).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
    if (lockedThread && defaultThread) list = list.filter(t => t.key === defaultThread);
    setThreads(list);
  };

  useEffect(() => {
    buildThreads(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, defaultThread, lockedThread, language]);

  // Realtime
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel('client-messages-staff')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${clientId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeThread]);

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (activeThread === 'general') return !m.case_id && !m.errand_id;
      if (activeThread.startsWith('case-')) return m.case_id === activeThread.replace('case-', '');
      if (activeThread.startsWith('errand-')) return m.errand_id === activeThread.replace('errand-', '');
      return true;
    });
  }, [messages, activeThread]);

  const handleUploadAttachment = async (file: File) => {
    if (!profile?.organization_id) return;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${profile.organization_id}/portal-messages/${clientId}/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false });
    if (error) throw error;

    setPendingAttachments(prev => [...prev, { name: file.name, bucket: 'documents', path, size: file.size }]);
  };

  const handleSend = async () => {
    if (!input.trim() || !profile?.id || !profile.organization_id) return;

    setSending(true);
    try {
      const msg: any = {
        organization_id: profile.organization_id,
        client_id: clientId,
        sender_id: profile.id,
        sender_type: 'staff',
        content: input.trim(),
        attachments: pendingAttachments,
      };
      if (activeThread.startsWith('case-')) msg.case_id = activeThread.replace('case-', '');
      if (activeThread.startsWith('errand-')) msg.errand_id = activeThread.replace('errand-', '');

      const { error } = await supabase.from('client_messages').insert(msg);
      if (error) throw error;

      setInput('');
      setPendingAttachments([]);

      // Mark client messages as read in this thread when staff replies
      await supabase
        .from('client_messages')
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .eq('client_id', clientId)
        .eq('sender_type', 'client');

    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const openAttachment = async (att: Attachment) => {
    const { data, error } = await supabase.storage.from(att.bucket).createSignedUrl(att.path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Error', description: error?.message || 'Failed to open attachment', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const clientName = (() => {
    if (!clientProfile) return language === 'en' ? 'Client' : 'العميل';
    if (language === 'ar' && clientProfile.first_name_ar) return `${clientProfile.first_name_ar} ${clientProfile.last_name_ar || ''}`;
    return `${clientProfile.first_name} ${clientProfile.last_name}`;
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-heading-sm font-semibold text-foreground">{language === 'en' ? 'Threads' : 'المحادثات'}</p>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {threads.map(th => {
            const Icon = th.icon;
            return (
              <button
                key={th.key}
                onClick={() => { setActiveThread(th.key); setPendingAttachments([]); }}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-muted/50 transition-colors border-b border-border/50',
                  activeThread === th.key && 'bg-accent/10'
                )}
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-sm font-medium text-foreground truncate">{th.label}</span>
                    {th.unread > 0 && (
                      <span className="h-5 w-5 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">{th.unread}</span>
                    )}
                  </div>
                  {th.lastMessage && <p className="text-body-sm text-muted-foreground truncate">{th.lastMessage}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-heading-sm font-semibold text-foreground">{clientName}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[520px]">
          {filteredMessages.map(m => {
            const isStaff = m.sender_type === 'staff';
            return (
              <div key={m.id} className={cn('flex gap-2', isStaff ? 'justify-end' : 'justify-start')}>
                {!isStaff && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">CL</AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-[85%]">
                  <div className={cn(
                    'px-3.5 py-2.5 text-body-md whitespace-pre-wrap',
                    isStaff
                      ? 'bg-accent text-accent-foreground rounded-2xl rounded-ee-sm'
                      : 'bg-muted text-foreground border border-border rounded-2xl rounded-es-sm'
                  )}>
                    {m.content}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.attachments.map((att, i) => (
                          <button
                            key={i}
                            onClick={() => openAttachment(att)}
                            className={cn(
                              'text-[11px] px-2 py-1 rounded-full border',
                              isStaff ? 'border-accent-foreground/30 text-accent-foreground' : 'border-border text-foreground'
                            )}
                          >
                            {att.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 space-y-2">
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingAttachments.map((a, idx) => (
                <span key={idx} className="inline-flex items-center gap-2 text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-1">
                  {a.name}
                  <button onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await handleUploadAttachment(file);
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message, variant: 'destructive' });
                } finally {
                  e.currentTarget.value = '';
                }
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted/50 transition-colors"
              title={language === 'en' ? 'Attach file' : 'إرفاق ملف'}
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </button>

            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={language === 'en' ? 'Type your message...' : 'اكتب رسالتك...'}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-body-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 max-h-28"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                input.trim() ? 'bg-accent text-accent-foreground hover:bg-accent/90' : 'bg-muted text-muted-foreground'
              )}
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
