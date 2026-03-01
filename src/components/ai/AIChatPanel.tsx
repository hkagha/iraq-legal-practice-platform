import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { streamAI } from '@/lib/aiService';
import { cn } from '@/lib/utils';
import { Sparkles, X, Minus, SendHorizonal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPanel() {
  const { t, language, isRTL } = useLanguage();
  const { profile, organization } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Pulse animation on first visit
  useEffect(() => {
    const seen = localStorage.getItem('qanuni_ai_chat_seen');
    if (!seen) setPulseCount(3);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getPageContext = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/cases/') && path.split('/').length === 3) return `Viewing a case detail page`;
    if (path.startsWith('/errands/') && path.split('/').length === 3) return `Viewing an errand detail page`;
    if (path.startsWith('/clients/') && path.split('/').length === 3) return `Viewing a client detail page`;
    if (path === '/cases') return 'Cases list page';
    if (path === '/errands') return 'Errands list page';
    if (path === '/tasks') return 'Tasks page';
    if (path === '/documents') return 'Documents page';
    if (path === '/calendar') return 'Calendar page';
    if (path === '/billing') return 'Billing page';
    if (path === '/dashboard') return 'Dashboard';
    return `Page: ${path}`;
  }, [location.pathname]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';
    const contextStr = `Current page: ${getPageContext()}. User: ${profile?.first_name} ${profile?.last_name} (${profile?.role}). Organization: ${organization?.name || 'Unknown'}.`;

    // Build conversation for context (last 10 messages)
    const recentMsgs = newMessages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = `${recentMsgs}`;

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await streamAI({
      feature: 'chat',
      prompt: fullPrompt,
      context: contextStr,
      language: language === 'ar' ? 'ar' : 'en',
      onDelta: (text) => {
        assistantContent += text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
      },
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        assistantContent = language === 'ar' ? `عذراً، حدث خطأ: ${err}` : `Sorry, an error occurred: ${err}`;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
        setIsStreaming(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    localStorage.setItem('qanuni_ai_chat_seen', 'true');
    setPulseCount(0);
  };

  const welcomeMsg = language === 'ar'
    ? 'مرحباً! أنا مساعدك القانوني الذكي. يمكنني مساعدتك في الأسئلة القانونية وتحليل القضايا والمهام الإدارية. كيف يمكنني مساعدتك؟'
    : "Hi! I'm your AI legal assistant. I can help you with legal questions, case analysis, and administrative tasks. What can I help you with?";

  if (!open) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleOpen}
            className={cn(
              'fixed z-40 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center',
              isRTL ? 'left-4 bottom-20 lg:bottom-4' : 'right-4 bottom-20 lg:bottom-4',
              pulseCount > 0 && 'animate-pulse'
            )}
          >
            <Sparkles size={24} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={isRTL ? 'right' : 'left'}>
          {t('ai.chat.title')}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className={cn(
          'fixed z-[45] h-14 rounded-full bg-accent text-accent-foreground shadow-lg px-5 flex items-center gap-2 hover:shadow-xl transition-all',
          isRTL ? 'left-4 bottom-20 lg:bottom-4' : 'right-4 bottom-20 lg:bottom-4'
        )}
      >
        <Sparkles size={18} />
        <span className="text-sm font-medium">{t('ai.chat.title')}</span>
      </button>
    );
  }

  return (
    <div className={cn(
      'fixed z-[45] bg-card border border-border shadow-2xl flex flex-col',
      'w-full h-[calc(100vh-64px)] bottom-0 start-0',
      'lg:w-[400px] lg:h-[560px] lg:rounded-t-2xl',
      isRTL ? 'lg:start-4 lg:bottom-0' : 'lg:end-4 lg:start-auto lg:bottom-0'
    )}>
      {/* Header */}
      <div className="h-14 bg-accent text-accent-foreground flex items-center justify-between px-4 shrink-0 lg:rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={18} />
          <span className="font-semibold text-sm">{t('ai.chat.title')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setMessages([]); }} className="p-1.5 hover:bg-accent-foreground/10 rounded" title={t('ai.chat.clearChat')}>
            <Trash2 size={14} />
          </button>
          <button onClick={() => setMinimized(true)} className="p-1.5 hover:bg-accent-foreground/10 rounded">
            <Minus size={14} />
          </button>
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-accent-foreground/10 rounded">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {messages.length === 0 && (
          <div className={cn('flex gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-accent" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-ss-sm p-3 max-w-[85%] text-sm text-foreground">
              {welcomeMsg}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' ? (isRTL ? 'flex-row-reverse justify-start' : 'justify-end') : (isRTL ? 'flex-row-reverse' : ''))}>
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-accent" />
              </div>
            )}
            <div className={cn(
              'rounded-2xl p-3 max-w-[80%] text-sm whitespace-pre-wrap',
              msg.role === 'user'
                ? 'bg-accent text-accent-foreground rounded-ee-sm'
                : 'bg-card border border-border text-foreground rounded-ss-sm'
            )}>
              {msg.content || (isStreaming && i === messages.length - 1 ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.3s' }} />
                </span>
              ) : '')}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 flex items-end gap-2 bg-card">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('ai.chat.placeholder')}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent text-sm focus:outline-none max-h-[120px] py-2 px-2"
          style={{ minHeight: '36px' }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="h-9 w-9 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
        >
          <SendHorizonal size={16} />
        </Button>
      </div>
    </div>
  );
}
