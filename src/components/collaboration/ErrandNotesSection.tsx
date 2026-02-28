import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pin, MoreHorizontal, Trash2, Eye, EyeOff, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import MentionTextarea, { renderMentionContent, extractMentionedUserIds } from '@/components/collaboration/MentionTextarea';
import { createNotification } from '@/lib/notifications';

interface Note {
  id: string;
  content: string;
  content_ar: string | null;
  author_id: string;
  is_pinned: boolean;
  is_visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  errandId: string;
  errandTitle?: string;
}

export default function ErrandNotesSection({ errandId, errandTitle }: Props) {
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('errand_notes')
      .select('*')
      .eq('errand_id', errandId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setNotes(data as Note[]);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [errandId]);

  const postNote = async () => {
    if (!newNote.trim() || !profile?.organization_id) return;
    setPosting(true);
    const { error } = await supabase.from('errand_notes').insert({
      errand_id: errandId,
      organization_id: profile.organization_id,
      author_id: profile.id,
      content: newNote,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Send mention notifications
      const mentionedIds = extractMentionedUserIds(newNote).filter(id => id !== profile.id);
      for (const userId of mentionedIds) {
        await createNotification({
          organizationId: profile.organization_id,
          userId,
          notificationType: 'errand_mentioned',
          title: `${profile.first_name} mentioned you in an errand note`,
          titleAr: `ذكرك ${profile.first_name_ar || profile.first_name} في ملاحظة معاملة`,
          body: newNote.substring(0, 100),
          entityType: 'errand',
          entityId: errandId,
          actorId: profile.id,
        });
      }
      setNewNote('');
      fetchNotes();
    }
    setPosting(false);
  };

  const togglePin = async (note: Note) => {
    await supabase.from('errand_notes').update({ is_pinned: !note.is_pinned } as any).eq('id', note.id);
    fetchNotes();
  };

  const toggleVisibility = async (note: Note) => {
    await supabase.from('errand_notes').update({ is_visible_to_client: !note.is_visible_to_client } as any).eq('id', note.id);
    fetchNotes();
    toast({ title: !note.is_visible_to_client ? (language === 'ar' ? 'مرئي للعميل' : 'Visible to client') : (language === 'ar' ? 'مخفي عن العميل' : 'Hidden from client') });
  };

  const deleteNote = async (id: string) => {
    await supabase.from('errand_notes').delete().eq('id', id);
    fetchNotes();
    toast({ title: language === 'ar' ? 'تم حذف الملاحظة' : 'Note deleted' });
  };

  const fmtRelative = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined });

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h3 className="text-heading-sm text-foreground">{t('collaboration.internalNotes')}</h3>

      {/* Add note */}
      <div className="space-y-2">
        <MentionTextarea
          value={newNote}
          onChange={setNewNote}
          placeholder={language === 'ar' ? 'أضف ملاحظة... اكتب @ لذكر شخص' : 'Add a note... type @ to mention someone'}
          rows={2}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={postNote} disabled={!newNote.trim() || posting} className="bg-accent text-accent-foreground">
            {posting ? (language === 'ar' ? 'جاري النشر...' : 'Posting...') : t('collaboration.postNote')}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <p className="text-body-sm text-muted-foreground text-center py-4">{t('common.loading')}</p>
      ) : notes.length === 0 ? (
        <p className="text-body-sm text-muted-foreground text-center py-4">
          {language === 'ar' ? 'لا توجد ملاحظات بعد' : 'No notes yet'}
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className={cn(
              'p-3 rounded-lg border',
              note.is_pinned && 'border-accent/30 bg-accent/5'
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {note.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent mb-1">
                      <Pin size={10} /> {language === 'ar' ? 'مثبت' : 'Pinned'}
                    </span>
                  )}
                  <div className="text-body-md text-foreground whitespace-pre-wrap">
                    {renderMentionContent(note.content, language)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-muted-foreground">{fmtRelative(note.created_at)}</span>
                    {note.is_visible_to_client && (
                      <span className="text-[10px] bg-info/10 text-info px-1.5 py-0.5 rounded">
                        {language === 'ar' ? 'مرئي للعميل' : 'Client visible'}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                      <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => togglePin(note)}>
                      <Pin size={14} className="me-2" />
                      {note.is_pinned ? (language === 'ar' ? 'إلغاء التثبيت' : 'Unpin') : (language === 'ar' ? 'تثبيت' : 'Pin')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleVisibility(note)}>
                      {note.is_visible_to_client ? <EyeOff size={14} className="me-2" /> : <Eye size={14} className="me-2" />}
                      {note.is_visible_to_client ? (language === 'ar' ? 'إخفاء عن العميل' : 'Hide from client') : (language === 'ar' ? 'إظهار للعميل' : 'Show to client')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteNote(note.id)} className="text-destructive">
                      <Trash2 size={14} className="me-2" />{language === 'ar' ? 'حذف' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
