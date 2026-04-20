import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TASK_TYPES = [
  'general', 'research', 'drafting', 'review', 'filing',
  'court_preparation', 'client_communication', 'follow_up',
  'document_preparation', 'meeting', 'deadline', 'administrative', 'other'
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CREATE_STATUSES = ['todo', 'in_progress', 'in_review'];

interface ChecklistItem {
  id: string;
  text: string;
  text_ar?: string;
  completed: boolean;
  completed_at?: string | null;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: any;
  onSaved: () => void;
  prefillCaseId?: string;
  prefillErrandId?: string;
}

export default function TaskFormModal({ isOpen, onClose, task, onSaved, prefillCaseId, prefillErrandId }: TaskFormModalProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [linkType, setLinkType] = useState<'none' | 'case' | 'errand'>('none');
  const [caseId, setCaseId] = useState('');
  const [errandId, setErrandId] = useState('');
  const [estHours, setEstHours] = useState('');
  const [estMinutes, setEstMinutes] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [noEndDate, setNoEndDate] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    Promise.all([
      supabase.from('profiles').select('id, first_name, last_name').eq('organization_id', profile.organization_id),
      supabase.from('cases').select('id, case_number, title').eq('organization_id', profile.organization_id).not('status', 'in', '("closed","archived")').limit(100),
      supabase.from('errands').select('id, errand_number, title').eq('organization_id', profile.organization_id).not('status', 'in', '("completed","cancelled")').limit(100),
    ]).then(([membersRes, casesRes, errandsRes]) => {
      setTeamMembers(membersRes.data || []);
      setCases(casesRes.data || []);
      setErrands(errandsRes.data || []);
    });
  }, [profile?.organization_id]);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setTitleAr(task.title_ar || '');
      setDescription(task.description || '');
      setTaskType(task.task_type || 'general');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'todo');
      setDueDate(task.due_date || '');
      setDueTime(task.due_time || '');
      setStartDate(task.start_date || '');
      setAssignedTo(task.assigned_to || '');
      if (task.case_id) { setLinkType('case'); setCaseId(task.case_id); }
      else if (task.errand_id) { setLinkType('errand'); setErrandId(task.errand_id); }
      else setLinkType('none');
      const estMins = task.estimated_minutes || 0;
      setEstHours(estMins >= 60 ? String(Math.floor(estMins / 60)) : '');
      setEstMinutes(estMins % 60 > 0 ? String(estMins % 60) : '');
      setChecklist(Array.isArray(task.checklist) ? task.checklist : []);
      setIsRecurring(task.is_recurring || false);
      setRecurrencePattern(task.recurrence_pattern || 'weekly');
      setRecurrenceEndDate(task.recurrence_end_date || '');
      setNoEndDate(!task.recurrence_end_date);
      if (task.is_recurring) setShowAdvanced(true);
    } else {
      setTitle(''); setTitleAr(''); setDescription(''); setTaskType('general');
      setPriority('medium'); setStatus('todo'); setDueDate(''); setDueTime('');
      setStartDate(''); setAssignedTo(user?.id || ''); setChecklist([]);
      setIsRecurring(false); setRecurrencePattern('weekly'); setRecurrenceEndDate('');
      setNoEndDate(true); setShowAdvanced(false);
      if (prefillCaseId) { setLinkType('case'); setCaseId(prefillCaseId); }
      else if (prefillErrandId) { setLinkType('errand'); setErrandId(prefillErrandId); }
      else { setLinkType('none'); setCaseId(''); setErrandId(''); }
      setEstHours(''); setEstMinutes('');
    }
  }, [task, user, prefillCaseId, prefillErrandId]);

  const addChecklistItem = () => {
    if (checklist.length >= 20) return;
    setChecklist(prev => [...prev, { id: crypto.randomUUID(), text: '', completed: false }]);
  };

  const updateChecklistItem = (id: string, text: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null } : item));
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim() || title.trim().length < 3) {
      toast.error(language === 'ar' ? 'عنوان المهمة مطلوب (3 أحرف على الأقل)' : 'Task title is required (min 3 chars)');
      return;
    }
    if (!profile?.organization_id || !user) return;

    setSaving(true);
    const totalEstMinutes = (parseInt(estHours) || 0) * 60 + (parseInt(estMinutes) || 0);
    const filteredChecklist = checklist.filter(item => item.text.trim());

    const payload: any = {
      organization_id: profile.organization_id,
      title: title.trim(),
      title_ar: titleAr.trim() || null,
      description: description.trim() || null,
      task_type: taskType,
      priority,
      status,
      due_date: dueDate || null,
      due_time: dueTime || null,
      start_date: startDate || null,
      assigned_to: assignedTo || null,
      assigned_by: user.id,
      case_id: linkType === 'case' && caseId ? caseId : null,
      errand_id: linkType === 'errand' && errandId ? errandId : null,
      estimated_minutes: totalEstMinutes > 0 ? totalEstMinutes : null,
      checklist: filteredChecklist,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
      recurrence_end_date: isRecurring && !noEndDate && recurrenceEndDate ? recurrenceEndDate : null,
    };

    if (isEditing) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', task.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('tasks.messages.updated'));
    } else {
      payload.created_by = user.id;
      const { error } = await supabase.from('tasks').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('tasks.messages.created'));
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const priorityDots: Record<string, string> = { low: 'bg-muted-foreground/50', medium: 'bg-blue-500', high: 'bg-amber-500', urgent: 'bg-red-500' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('tasks.editTask') : t('tasks.addTask')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <Label>{t('tasks.fields.title')} *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'ar' ? 'ما الذي يجب فعله؟' : 'What needs to be done?'} className="h-11" />
          </div>
          {language === 'ar' && (
            <div>
              <Label>{t('tasks.fields.titleAr')}</Label>
              <Input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" />
            </div>
          )}

          {/* Description */}
          <div>
            <Label>{t('tasks.fields.description')}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('tasks.fields.taskType')}</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(tt => (
                    <SelectItem key={tt} value={tt}>{t(`tasks.types.${tt}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('tasks.fields.priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', priorityDots[p])} />
                        {t(`statuses.priority.${p}`)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned To + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('tasks.fields.assignedTo')}</Label>
              <FormSearchSelect
                value={assignedTo}
                onChange={setAssignedTo}
                placeholder={language === 'ar' ? 'اختر...' : 'Select...'}
                options={teamMembers.map(m => ({
                  value: m.id,
                  label: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.id,
                }))}
              />
            </div>
            <div>
              <Label>{t('tasks.fields.status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREATE_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{t(`tasks.statuses.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t('tasks.fields.startDate')}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('tasks.fields.dueDate')}</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('tasks.fields.dueTime')}</Label>
              <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
            </div>
          </div>

          {/* Link to */}
          <div>
            <Label>{t('tasks.linkTo')}</Label>
            <div className="flex gap-2 mb-2">
              {(['none', 'case', 'errand'] as const).map(lt => (
                <button key={lt} onClick={() => { setLinkType(lt); if (lt !== 'case') setCaseId(''); if (lt !== 'errand') setErrandId(''); }}
                  className={cn('px-3 py-1.5 rounded-md text-body-sm font-medium border transition-colors',
                    linkType === lt ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:bg-muted')}>
                  {lt === 'none' ? t('tasks.none') : lt === 'case' ? t('tasks.fields.linkedCase') : t('tasks.fields.linkedErrand')}
                </button>
              ))}
            </div>
            {linkType === 'case' && (
              <FormSearchSelect
                value={caseId}
                onChange={setCaseId}
                placeholder={language === 'ar' ? 'اختر قضية...' : 'Select case...'}
                options={cases.map(c => ({ value: c.id, label: c.title, subtitle: c.case_number }))}
              />
            )}
            {linkType === 'errand' && (
              <FormSearchSelect
                value={errandId}
                onChange={setErrandId}
                placeholder={language === 'ar' ? 'اختر معاملة...' : 'Select errand...'}
                options={errands.map(er => ({ value: er.id, label: er.title, subtitle: er.errand_number }))}
              />
            )}
          </div>

          {/* Estimated Time */}
          <div>
            <Label>{t('tasks.fields.estimatedTime')}</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} max={99} value={estHours} onChange={e => setEstHours(e.target.value)} placeholder={language === 'ar' ? 'ساعات' : 'Hours'} className="w-24" />
              <span className="text-muted-foreground text-body-sm">h</span>
              <Input type="number" min={0} max={59} value={estMinutes} onChange={e => setEstMinutes(e.target.value)} placeholder={language === 'ar' ? 'دقائق' : 'Min'} className="w-24" />
              <span className="text-muted-foreground text-body-sm">m</span>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <Label>{t('tasks.fields.checklist')}</Label>
            <div className="space-y-2 mt-1">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklistItem(item.id)} className="h-4 w-4" />
                  <Input
                    value={item.text}
                    onChange={e => updateChecklistItem(item.id, e.target.value)}
                    className={cn('h-8 flex-1', item.completed && 'line-through text-muted-foreground')}
                    placeholder={language === 'ar' ? 'عنصر...' : 'Item...'}
                    autoFocus={!item.text}
                  />
                  <button onClick={() => removeChecklistItem(item.id)} className="text-muted-foreground hover:text-destructive">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {checklist.length < 20 && (
                <button onClick={addChecklistItem} className="flex items-center gap-1 text-body-sm text-accent font-medium hover:underline">
                  <Plus size={14} /> {t('tasks.addItem')}
                </button>
              )}
            </div>
          </div>

          {/* Advanced (Recurring) */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex items-center gap-1 text-body-sm font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown size={14} className={cn('transition-transform', showAdvanced && 'rotate-180')} />
              {t('tasks.advanced')}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-body-sm cursor-pointer">
                <Checkbox checked={isRecurring} onCheckedChange={(v) => setIsRecurring(!!v)} />
                {t('tasks.makeRecurring')}
              </label>
              {isRecurring && (
                <div className="grid grid-cols-2 gap-3 ps-6">
                  <div>
                    <Label>{t('tasks.fields.recurrencePattern')}</Label>
                    <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].map(p => (
                          <SelectItem key={p} value={p}>{t(`tasks.recurrence.${p}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('tasks.recurrence.until')}</Label>
                    <Input type="date" value={recurrenceEndDate} onChange={e => { setRecurrenceEndDate(e.target.value); setNoEndDate(false); }} disabled={noEndDate} />
                    <label className="flex items-center gap-1 text-body-sm text-muted-foreground mt-1 cursor-pointer">
                      <Checkbox checked={noEndDate} onCheckedChange={(v) => { setNoEndDate(!!v); if (v) setRecurrenceEndDate(''); }} className="h-3.5 w-3.5" />
                      {t('tasks.recurrence.noEndDate')}
                    </label>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : isEditing ? t('common.update') : t('common.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
