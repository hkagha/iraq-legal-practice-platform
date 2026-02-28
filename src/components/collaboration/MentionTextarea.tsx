import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MemberOption {
  id: string;
  name: string;
  nameAr: string | null;
  role: string;
  email: string;
  avatar_url: string | null;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function MentionTextarea({ value, onChange, placeholder, rows = 3, className }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [showPopover, setShowPopover] = useState(false);
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [filtered, setFiltered] = useState<MemberOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load org members
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase.from('profiles').select('id,first_name,last_name,first_name_ar,last_name_ar,role,email,avatar_url')
      .eq('organization_id', profile.organization_id).eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        setMembers(data.map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`.trim(),
          nameAr: p.first_name_ar ? `${p.first_name_ar} ${p.last_name_ar || ''}`.trim() : null,
          role: p.role,
          email: p.email,
          avatar_url: p.avatar_url,
        })));
      });
  }, [profile?.organization_id]);

  // Filter members
  useEffect(() => {
    if (!query) { setFiltered(members.slice(0, 10)); return; }
    const q = query.toLowerCase();
    setFiltered(members.filter(m =>
      m.name.toLowerCase().includes(q) || (m.nameAr && m.nameAr.includes(q)) || m.email.toLowerCase().includes(q)
    ).slice(0, 10));
    setSelectedIdx(0);
  }, [query, members]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    onChange(val);

    // Check if we're in a mention context
    const textBefore = val.substring(0, pos);
    const lastAt = textBefore.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = textBefore.substring(lastAt + 1);
      // Only show if no space break or it's just typed
      if (!afterAt.includes('\n') && afterAt.length <= 20) {
        setMentionStart(lastAt);
        setQuery(afterAt);
        setShowPopover(true);
        return;
      }
    }
    setShowPopover(false);
  };

  const selectMember = useCallback((member: MemberOption) => {
    const displayName = language === 'ar' && member.nameAr ? member.nameAr : member.name;
    const token = `@[${displayName}](${member.id})`;
    const before = value.substring(0, mentionStart);
    const pos = textareaRef.current?.selectionStart || mentionStart;
    const after = value.substring(pos);
    onChange(before + token + ' ' + after);
    setShowPopover(false);
    setQuery('');
    // Refocus
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + token.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [value, mentionStart, onChange, language]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPopover || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); selectMember(filtered[selectedIdx]); }
    if (e.key === 'Escape') { setShowPopover(false); }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {showPopover && filtered.length > 0 && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 w-[280px] max-h-[200px] overflow-y-auto bg-card border border-border rounded-lg shadow-lg"
        >
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
            {language === 'ar' ? 'أذكر شخصاً' : 'Mention someone'}
          </div>
          {filtered.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => selectMember(m)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-start transition-colors',
                idx === selectedIdx ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center text-[11px] font-semibold text-accent shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-foreground truncate">
                  {language === 'ar' && m.nameAr ? m.nameAr : m.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
              </div>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{m.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Parse and render content with mentions
export function renderMentionContent(content: string, language: string): React.ReactNode {
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    parts.push(
      <span
        key={key++}
        className="inline-block bg-accent/10 text-accent font-medium rounded px-1 cursor-pointer hover:bg-accent/20"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  return <>{parts}</>;
}

// Extract mentioned user IDs from content
export function extractMentionedUserIds(content: string): string[] {
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!ids.includes(match[2])) ids.push(match[2]);
  }
  return ids;
}
