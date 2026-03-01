import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SendHorizonal, MessageSquare, Scale, FileCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: string;
  created_at: string;
  case_id: string | null;
  errand_id: string | null;
  is_read: boolean;
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
  const { t, language, isRTL } = useLanguage();
  const { profile } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string>('general');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffProfiles, setStaffProfiles] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.id) return;
    init();
  }, [profile?.id]);

  const init = async () => {
    setLoading(true);
    const { data: link } = await supabase.from('client_user_links').select('client_id, organization_id').eq('user_id', profile!.id).maybeSingle();
    if (!link) { setLoading(false); return; }
    setClientId(link.client_id);
    setOrgId(link.organization_id);
    await loadMessages(link.client_id);
    setLoading(false);
  };

  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', cid)
      .order('created_at', { ascending: true })
      .limit(200);
    const msgs = (data || []) as Message[];
    setMessages(msgs);
    buildThreads(msgs);

    // Load staff profiles
    const staffIds = [...new Set(msgs.filter(m => m.sender_type === 'staff').map(m => m.sender_id))];
    if (staffIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, first_name_ar, last_name_ar').in('id', staffIds);
      const map: Record<string, any> = {};
      (profiles || []).forEach(p => { map[p.id] = p; });
      setStaffProfiles(map);
    }
  }, []);

  const buildThreads = (msgs: Message[]) => {
    const threadMap: Record<string, Thread> = {};
    // General thread always exists
    threadMap['general'] = { key: 'general', label: language === 'en' ? 'General' : 'عام', icon: MessageSquare, case_id: null, errand_id: null, lastMessage: '', lastDate: '', unread: 0 };

    msgs.forEach(m => {
      let key = 'general';
      if (m.case_id) key = `case-${m.case_id}`;
      else if (m.errand_id) key = `errand-${m.errand_id}`;

      if (!threadMap[key]) {
        threadMap[key] = {
          key, label: m.case_id ? `Case` : `Errand`,
          icon: m.case_id ? Scale : FileCheck,
          case_id: m.case_id, errand_id: m.errand_id,
          lastMessage: '', lastDate: '', unread: 0,
        };
      }
      threadMap[key].lastMessage = m.content.slice(0, 60);
      threadMap[key].lastDate = m.created_at;
      if (!m.is_read && m.sender_type === 'staff') threadMap[key].unread++;
    });
    setThreads(Object.values(threadMap));
  };

  // Realtime
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel('portal-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${clientId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          // Mark as read if in active thread
          if (newMsg.sender_type === 'staff') {
            const key = newMsg.case_id ? `case-${newMsg.case_id}` : newMsg.errand_id ? `errand-${newMsg.errand_id}` : 'general';
            if (key === activeThread) {
              supabase.from('client_messages').update({ is_read: true, read_at: new Date().toISOString() } as any).eq('id', newMsg.id).then(() => {});
            }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeThread]);

  const filteredMessages = messages.filter(m => {
    if (activeThread === 'general') return !m.case_id && !m.errand_id;
    if (activeThread.startsWith('case-')) return m.case_id === activeThread.replace('case-', '');
    if (activeThread.startsWith('errand-')) return m.errand_id === activeThread.replace('errand-', '');
    return true;
  });

  const handleSend = async () => {
    if (!input.trim() || !clientId || !orgId || !profile?.id) return;
    setSending(true);
    const msgData: any = {
      organization_id: orgId,
      client_id: clientId,
      sender_id: profile.id,
      sender_type: 'client',
      content: input.trim(),
    };
    if (activeThread.startsWith('case-')) msgData.case_id = activeThread.replace('case-', '');
    if (activeThread.startsWith('errand-')) msgData.errand_id = activeThread.replace('errand-', '');

    const { error } = await supabase.from('client_messages').insert(msgData);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setInput('');
    setSending(false);
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

      <div className="flex gap-4 h-[500px] bg-card border border-border rounded-xl overflow-hidden">
        {/* Thread list */}
        <div className="w-64 border-e border-border shrink-0 overflow-y-auto hidden sm:block">
          {threads.map(thread => {
            const Icon = thread.icon;
            return (
              <button
                key={thread.key}
                onClick={() => setActiveThread(thread.key)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-muted/50 transition-colors border-b border-border/50',
                  activeThread === thread.key && 'bg-accent/10'
                )}
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
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
          {/* Mobile thread select */}
          <div className="sm:hidden p-2 border-b border-border">
            <select value={activeThread} onChange={e => setActiveThread(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-body-sm">
              {threads.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          {/* Messages */}
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
                        <div className={cn('max-w-[80%]')}>
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
          <div className="border-t border-border p-3 flex items-end gap-2">
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
  );
}
