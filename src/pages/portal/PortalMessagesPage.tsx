import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SendHorizonal, MessageSquare, Scale, FileCheck, Paperclip, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Attachment = { name: string; bucket: string; path: string; size: number };

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: string;
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

export default function PortalMessagesPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { activeClientId, activeOrg } = usePortalOrg();

  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string>('general');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffProfiles, setStaffProfiles] = useState<Record<string, any>>({});
  const [threadLabels, setThreadLabels] = useState<Record<string, string>>({ general: language === 'en' ? 'General' : 'عام' });

  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeClientId || !activeOrg) return;
    loadMessages(activeClientId);
  }, [activeClientId, activeOrg?.organization_id]);

  const loadMessages = async (cid: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_id', cid)
        .eq('organization_id', activeOrg!.organization_id)
        .order('created_at', { ascending: true })
        .limit(300);

      const msgs = (data || []) as unknown as Message[];
      setMessages(msgs);

      const staffIds = [...new Set(msgs.filter(m => m.sender_type === 'staff').map(m => m.sender_id))];
      if (staffIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, first_name_ar, last_name_ar')
          .in('id', staffIds);
        const map: Record<string, any> = {};
        (profiles || []).forEach(p => { map[p.id] = p; });
        setStaffProfiles(map);
      }

      const caseIds = [...new Set(msgs.filter(m => m.case_id).map(m => m.case_id as string))];
      const errandIds = [...new Set(msgs.filter(m => m.errand_id).map(m => m.errand_id as string))];

      const [casesRes, errandsRes] = await Promise.all([
        caseIds.length ? supabase.from('cases').select('id, case_number').in('id', caseIds) : Promise.resolve({ data: [] as any[] } as any),
        errandIds.length ? supabase.from('errands').select('id, errand_number').in('id', errandIds) : Promise.resolve({ data: [] as any[] } as any),
      ]);

      const labels: Record<string, string> = { general: language === 'en' ? 'General' : 'عام' };
      (casesRes.data || []).forEach((c: any) => {
        labels[`case-${c.id}`] = `${language === 'en' ? 'Case' : 'قضية'}: ${c.case_number}`;
      });
      (errandsRes.data || []).forEach((e: any) => {
        labels[`errand-${e.id}`] = `${language === 'en' ? 'Errand' : 'معاملة'}: ${e.errand_number}`;
      });
      setThreadLabels(labels);

      buildThreads(msgs, labels);
    } finally {
      setLoading(false);
    }
  };

  const buildThreads = (msgs: Message[], labels: Record<string, string>) => {
    const threadMap: Record<string, Thread> = {};
    threadMap['general'] = {
      key: 'general', label: labels.general, icon: MessageSquare,
      case_id: null, errand_id: null, lastMessage: '', lastDate: '', unread: 0,
    };

    msgs.forEach(m => {
      const key = m.case_id ? `case-${m.case_id}` : m.errand_id ? `errand-${m.errand_id}` : 'general';
      if (!threadMap[key]) {
        threadMap[key] = {
          key,
          label: labels[key] || (m.case_id ? (language === 'en' ? 'Case' : 'قضية') : (language === 'en' ? 'Errand' : 'معاملة')),
          icon: m.case_id ? Scale : m.errand_id ? FileCheck : MessageSquare,
          case_id: m.case_id, errand_id: m.errand_id,
          lastMessage: '', lastDate: '', unread: 0,
        };
      }
      threadMap[key].lastMessage = m.content.slice(0, 60);
      threadMap[key].lastDate = m.created_at;
      if (!m.is_read && m.sender_type === 'staff') threadMap[key].unread++;
    });

    setThreads(Object.values(threadMap).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || '')));
  };

  // Realtime
  useEffect(() => {
    if (!activeClientId) return;
    const channel = supabase
      .channel(`portal-messages-${activeClientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${activeClientId}` },
        (payload) => {
          const newMsg = payload.new as any as Message;
          setMessages(prev => {
            const next = [...prev, newMsg];
            buildThreads(next, { ...threadLabels, general: threadLabels.general || (language === 'en' ? 'General' : 'عام') });
            return next;
          });

          if (newMsg.sender_type === 'staff') {
            const key = newMsg.case_id ? `case-${newMsg.case_id}` : newMsg.errand_id ? `errand-${newMsg.errand_id}` : 'general';
            if (key === activeThread) {
              supabase
                .from('client_messages')
                .update({ is_read: true, read_at: new Date().toISOString() } as any)
                .eq('id', newMsg.id)
                .then(() => {});
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeClientId, activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeThread]);

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (activeThread === 'general') return !m.case_id && !m.errand_id;
      if (activeThread.startsWith('case-')) return m.case_id === activeThread.replace('case-', '');
      if (activeThread.startsWith('errand-')) return m.errand_id === activeThread.replace('errand-', '');
      return true;
    });
  }, [messages, activeThread]);

  const handleUploadAttachment = async (file: File) => {
    if (!activeOrg || !activeClientId) return;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${activeOrg.organization_id}/portal-messages/${activeClientId}/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false });
    if (error) throw error;

    setPendingAttachments(prev => [...prev, { name: file.name, bucket: 'documents', path, size: file.size }]);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeClientId || !activeOrg || !profile?.id) return;
    setSending(true);
    try {
      const msgData: any = {
        organization_id: activeOrg.organization_id,
        client_id: activeClientId,
        sender_id: profile.id,
        sender_type: 'client',
        content: input.trim(),
        attachments: pendingAttachments,
      };
      if (activeThread.startsWith('case-')) msgData.case_id = activeThread.replace('case-', '');
      if (activeThread.startsWith('errand-')) msgData.errand_id = activeThread.replace('errand-', '');

      const { error } = await supabase.from('client_messages').insert(msgData);
      if (error) throw error;

      setInput('');
      setPendingAttachments([]);
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

  const formatTime = (d: string) => {
    try { return format(new Date(d), 'HH:mm'); } catch { return ''; }
  };

  const formatDateSeparator = (d: string) => {
    const date = new Date(d);
    if (isToday(date)) return language === 'en' ? 'Today' : 'اليوم';
    if (isYesterday(date)) return language === 'en' ? 'Yesterday' : 'أمس';
    return language === 'ar' ? format(date, 'dd MMM yyyy', { locale: arLocale }) : format(date, 'MMM dd, yyyy');
  };

  const getStaffName = (id: string) => {
    const p = staffProfiles[id];
    if (!p) return '';
    if (language === 'ar' && p.first_name_ar) return `${p.first_name_ar} ${p.last_name_ar || ''}`;
    return `${p.first_name} ${p.last_name}`;
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display-lg font-bold text-foreground">{t('portal.messages.title')}</h1>
        <p className="text-body-md text-muted-foreground mt-1">{t('portal.messages.subtitle')}</p>
      </div>

      <div className="flex gap-4 h-[560px] bg-card border border-border rounded-xl overflow-hidden">
        {/* Thread list */}
        <div className="w-72 border-e border-border shrink-0 overflow-y-auto hidden sm:block">
          {threads.map(thread => {
            const Icon = thread.icon;
            return (
              <button
                key={thread.key}
                onClick={() => { setActiveThread(thread.key); setPendingAttachments([]); }}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-muted/50 transition-colors border-b border-border/50',
                  activeThread === thread.key && 'bg-accent/10'
                )}
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-sm font-medium text-foreground truncate">{thread.label}</span>
                    {thread.unread > 0 && (
                      <span className="h-5 w-5 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">{thread.unread}</span>
                    )}
                  </div>
                  {thread.lastMessage && <p className="text-body-sm text-muted-foreground truncate">{thread.lastMessage}</p>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="sm:hidden p-2 border-b border-border">
            <select value={activeThread} onChange={e => { setActiveThread(e.target.value); setPendingAttachments([]); }} className="w-full h-9 rounded-md border border-input bg-background px-3 text-body-sm">
              {threads.map(th => <option key={th.key} value={th.key}>{th.label}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-body-md">{t('portal.messages.noMessages')}</p>
              </div>
            ) : (
              <>
                {filteredMessages.map((msg, idx) => {
                  const isMe = msg.sender_type === 'client';
                  const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(filteredMessages[idx - 1].created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-3">
                          <span className="text-[11px] bg-muted text-muted-foreground rounded-full px-3 py-1">{formatDateSeparator(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={cn('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                        {!isMe && (
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getStaffName(msg.sender_id).split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="max-w-[85%]">
                          {!isMe && (
                            <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">{getStaffName(msg.sender_id)}</p>
                          )}
                          <div className={cn(
                            'px-3.5 py-2.5 text-body-md whitespace-pre-wrap',
                            isMe
                              ? 'bg-accent text-accent-foreground rounded-2xl rounded-ee-sm'
                              : 'bg-muted text-foreground border border-border rounded-2xl rounded-es-sm'
                          )}>
                            {msg.content}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => (
                                  <button
                                    key={i}
                                    onClick={() => openAttachment(att)}
                                    className={cn(
                                      'text-[11px] px-2 py-1 rounded-full border',
                                      isMe ? 'border-accent-foreground/30 text-accent-foreground' : 'border-border text-foreground'
                                    )}
                                  >
                                    {att.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className={cn('text-[10px] text-muted-foreground mt-0.5', isMe ? 'text-end' : 'text-start')}>{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
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
                placeholder={t('portal.messages.placeholder')}
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
    </div>
  );
}
