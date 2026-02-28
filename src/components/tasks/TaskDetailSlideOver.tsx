import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  CheckCircle, Trash2, Pencil, Plus, Send, Clock, User, Calendar,
  Briefcase, FileText, Tag, RotateCcw, MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TaskFormModal from './TaskFormModal';

const STATUSES = ['todo', 'in_progress', 'in_review', 'completed'] as const;
const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-muted-foreground/60 text-white',
  in_progress: 'bg-blue-500 text-white',
  in_review: 'bg-amber-500 text-white',
  completed: 'bg-green-500 text-white',
};
const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-muted-foreground/50', medium: 'bg-blue-500', high: 'bg-amber-500', urgent: 'bg-red-500',
};

interface TaskDetailSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  onUpdated: () => void;
}

export default function TaskDetailSlideOver({ isOpen, onClose, taskId, onUpdated }: TaskDetailSlideOverProps) {
  const { t, language, isRTL } = useLanguage();
  const { user, profile } = useAuth();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, cases(id, case_number, title), errands(id, errand_number, title), assigned_profile:profiles!tasks_assigned_to_fkey(first_name, last_name, role, avatar_url), creator:profiles!tasks_created_by_fkey(first_name, last_name)')
      .eq('id', taskId)
      .maybeSingle();
    setTask(data);
    setLoading(false);
  }, [taskId]);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    const { data } = await supabase
      .from('task_comments')
      .select('*, profiles(first_name, last_name, avatar_url)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    setComments(data || []);
  }, [taskId]);

  useEffect(() => {
    if (isOpen && taskId) { fetchTask(); fetchComments(); }
  }, [isOpen, taskId, fetchTask, fetchComments]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user!.id;
    } else {
      updates.completed_at = null;
      updates.completed_by = null;
    }
    await supabase.from('tasks').update(updates).eq('id', task.id);

    if (newStatus === 'completed' && task.is_recurring && task.recurrence_pattern) {
      // Create next occurrence
      const nextDue = getNextDate(task.due_date, task.recurrence_pattern);
      if (!task.recurrence_end_date || nextDue <= task.recurrence_end_date) {
        const { id, created_at, updated_at, completed_at, completed_by, cases, errands, assigned_profile, creator, ...rest } = task;
        await supabase.from('tasks').insert({ ...rest, status: 'todo', due_date: nextDue, completed_at: null, completed_by: null, parent_task_id: task.id, created_by: user!.id } as any);
        toast.success(language === 'ar' ? `تم إنشاء المهمة المتكررة التالية بتاريخ ${nextDue}` : `Next recurring task created for ${nextDue}`);
      }
    }

    toast.success(newStatus === 'completed' ? t('tasks.messages.completed') : t('tasks.messages.updated'));
    fetchTask();
    onUpdated();
  };

  const getNextDate = (dateStr: string | null, pattern: string): string => {
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    switch (pattern) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().split('T')[0];
  };

  const toggleChecklistItem = async (itemId: string) => {
    if (!task) return;
    const updated = (task.checklist || []).map((item: any) =>
      item.id === itemId ? { ...item, completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null } : item
    );
    await supabase.from('tasks').update({ checklist: updated } as any).eq('id', task.id);
    setTask((prev: any) => ({ ...prev, checklist: updated }));
  };

  const addChecklistItem = async (text: string) => {
    if (!task || !text.trim()) return;
    const updated = [...(task.checklist || []), { id: crypto.randomUUID(), text: text.trim(), completed: false }];
    await supabase.from('tasks').update({ checklist: updated } as any).eq('id', task.id);
    setTask((prev: any) => ({ ...prev, checklist: updated }));
  };

  const postComment = async () => {
    if (!newComment.trim() || !task || !user || !profile?.organization_id) return;
    setPostingComment(true);
    await supabase.from('task_comments').insert({
      task_id: task.id,
      organization_id: profile.organization_id,
      author_id: user.id,
      content: newComment.trim(),
    } as any);
    setNewComment('');
    setPostingComment(false);
    toast.success(t('tasks.messages.commentAdded'));
    fetchComments();
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from('task_comments').delete().eq('id', commentId);
    fetchComments();
  };

  const handleDelete = async () => {
    if (!task) return;
    await supabase.from('tasks').delete().eq('id', task.id);
    toast.success(t('tasks.messages.deleted'));
    setShowDeleteConfirm(false);
    onClose();
    onUpdated();
  };

  const fmtRelative = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined });

  const [newChecklistText, setNewChecklistText] = useState('');

  const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
  const completedCount = checklist.filter((i: any) => i.completed).length;
  const checklistPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
  const assignee = task?.assigned_profile;
  const assigneeName = assignee ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() : '—';
  const creatorName = task?.creator ? `${task.creator.first_name || ''} ${task.creator.last_name || ''}`.trim() : '—';
  const isOverdue = task?.due_date && task.status !== 'completed' && new Date(task.due_date + 'T00:00:00') < new Date();
  const overdueDays = task?.due_date ? Math.abs(differenceInDays(new Date(task.due_date + 'T00:00:00'), new Date())) : 0;

  if (!task && !loading) return null;

  return (
    <>
      <SlideOver
        isOpen={isOpen}
        onClose={onClose}
        title={loading ? '...' : (language === 'ar' && task?.title_ar ? task.title_ar : task?.title || '')}
        titleAr={loading ? '...' : (task?.title_ar || task?.title || '')}
        width="lg"
        footer={
          task && task.status !== 'completed' ? (
            <div className="flex items-center gap-2 w-full justify-between">
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} className="me-1" /> {t('common.delete')}
              </Button>
              <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => handleStatusChange('completed')}>
                <CheckCircle size={14} className="me-1" /> {t('tasks.completeTask')}
              </Button>
            </div>
          ) : task ? (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} className="me-1" /> {t('common.delete')}
            </Button>
          ) : undefined
        }
      >
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">{t('common.loading')}</div>
        ) : task && (
          <div className="space-y-6">
            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={task.status} type="task" />
              <StatusBadge status={task.priority} type="priority" />
              <span className="text-body-sm text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">{t(`tasks.types.${task.task_type}`)}</span>
              <Button variant="outline" size="sm" className="ms-auto h-7" onClick={() => setShowEditModal(true)}>
                <Pencil size={12} className="me-1" /> {t('common.edit')}
              </Button>
            </div>

            {/* Status quick-change */}
            <div className="flex gap-1 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors',
                    task.status === s ? STATUS_COLORS[s] : 'border border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t(`tasks.statuses.${s}`)}
                </button>
              ))}
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-body-sm font-medium text-muted-foreground mb-1">{t('tasks.fields.description')}</h4>
                <p className="text-body-md text-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <DetailItem icon={User} label={t('tasks.fields.assignedTo')} value={assigneeName} />
                <DetailItem icon={Calendar} label={t('tasks.fields.dueDate')}
                  value={task.due_date ? format(new Date(task.due_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                  valueClass={isOverdue ? 'text-destructive' : undefined}
                  extra={isOverdue ? <span className="text-destructive text-[11px]">{overdueDays}d overdue</span> : undefined}
                />
                <DetailItem icon={Calendar} label={t('tasks.fields.startDate')} value={task.start_date ? format(new Date(task.start_date + 'T00:00:00'), 'MMM d, yyyy') : '—'} />
                <DetailItem icon={Clock} label={t('tasks.fields.estimatedTime')} value={task.estimated_minutes ? `${Math.floor(task.estimated_minutes / 60)}h ${task.estimated_minutes % 60}m` : '—'} />
              </div>
              <div className="space-y-3">
                <DetailItem icon={User} label={language === 'ar' ? 'أنشأ بواسطة' : 'Created By'} value={creatorName} extra={<span className="text-muted-foreground text-[11px]">{fmtRelative(task.created_at)}</span>} />
                {task.cases && (
                  <DetailItem icon={Briefcase} label={t('tasks.fields.linkedCase')}
                    value={<Link to={`/cases/${task.cases.id}`} className="text-accent hover:underline">{task.cases.case_number}</Link>} />
                )}
                {task.errands && (
                  <DetailItem icon={FileText} label={t('tasks.fields.linkedErrand')}
                    value={<Link to={`/errands/${task.errands.id}`} className="text-accent hover:underline">{task.errands.errand_number}</Link>} />
                )}
                {task.is_recurring && (
                  <DetailItem icon={RotateCcw} label={t('tasks.fields.recurring')} value={t(`tasks.recurrence.${task.recurrence_pattern}`)} />
                )}
              </div>
            </div>

            {/* Checklist */}
            {(checklist.length > 0 || true) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-body-sm font-medium text-foreground">{t('tasks.fields.checklist')}</h4>
                  {checklist.length > 0 && (
                    <span className="text-body-sm text-muted-foreground">{completedCount}/{checklist.length}</span>
                  )}
                </div>
                {checklist.length > 0 && (
                  <Progress value={checklistPct} className="h-1 mb-3" />
                )}
                <div className="space-y-1.5">
                  {checklist.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklistItem(item.id)} className="h-[18px] w-[18px]" />
                      <span className={cn('text-body-md', item.completed && 'line-through text-muted-foreground')}>{item.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    placeholder={language === 'ar' ? 'إضافة عنصر...' : 'Add item...'}
                    className="h-8 flex-1"
                    onKeyDown={e => { if (e.key === 'Enter' && newChecklistText.trim()) { addChecklistItem(newChecklistText); setNewChecklistText(''); } }}
                  />
                  <button onClick={() => { if (newChecklistText.trim()) { addChecklistItem(newChecklistText); setNewChecklistText(''); } }}
                    className="text-accent hover:underline text-body-sm font-medium flex items-center gap-1">
                    <Plus size={14} /> {t('tasks.addItem')}
                  </button>
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <h4 className="text-body-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <MessageSquare size={14} /> {t('tasks.comments')} ({comments.length})
              </h4>
              <div className="flex items-start gap-2 mb-4">
                <Textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={language === 'ar' ? 'أضف تعليقاً...' : 'Add a comment...'}
                  rows={1}
                  className="flex-1 min-h-[36px]"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                />
                <Button size="sm" onClick={postComment} disabled={!newComment.trim() || postingComment} className="bg-accent text-accent-foreground hover:bg-accent/90 h-9">
                  <Send size={14} />
                </Button>
              </div>
              {comments.length === 0 ? (
                <p className="text-body-sm text-muted-foreground italic">{t('tasks.noComments')}</p>
              ) : comments.map(c => (
                <div key={c.id} className="py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-medium text-accent">
                      {c.profiles?.first_name?.[0] || '?'}
                    </div>
                    <span className="text-body-sm font-medium">{c.profiles?.first_name} {c.profiles?.last_name}</span>
                    <span className="text-body-sm text-muted-foreground">{fmtRelative(c.created_at)}</span>
                    {(c.author_id === user?.id || profile?.role === 'firm_admin') && (
                      <button onClick={() => deleteComment(c.id)} className="ms-auto text-muted-foreground hover:text-destructive">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-body-md text-foreground ps-8 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlideOver>

      {showEditModal && task && (
        <TaskFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          task={task}
          onSaved={() => { fetchTask(); onUpdated(); }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('tasks.deleteConfirmTitle')}
        titleAr={t('tasks.deleteConfirmTitle')}
        message={t('tasks.deleteConfirmMessage')}
        messageAr={t('tasks.deleteConfirmMessage')}
        type="danger"
      />
    </>
  );
}

function DetailItem({ icon: Icon, label, value, valueClass, extra }: { icon: any; label: string; value: React.ReactNode; valueClass?: string; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-body-sm text-muted-foreground mb-0.5">
        <Icon size={12} /> {label}
      </div>
      <div className={cn('text-body-md text-foreground', valueClass)}>{value}</div>
      {extra}
    </div>
  );
}
