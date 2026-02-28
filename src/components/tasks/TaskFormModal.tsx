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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TASK_TYPES = [
  'general', 'research', 'drafting', 'review', 'filing',
  'court_preparation', 'client_communication', 'follow_up',
  'document_preparation', 'meeting', 'deadline', 'administrative', 'other'
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

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
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [caseId, setCaseId] = useState('');
  const [errandId, setErrandId] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    // Fetch team members, cases, errands
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
      setDueDate(task.due_date || '');
      setAssignedTo(task.assigned_to || '');
      setCaseId(task.case_id || '');
      setErrandId(task.errand_id || '');
      setEstimatedMinutes(task.estimated_minutes?.toString() || '');
    } else {
      setTitle('');
      setTitleAr('');
      setDescription('');
      setTaskType('general');
      setPriority('medium');
      setDueDate('');
      setAssignedTo(user?.id || '');
      setCaseId(prefillCaseId || '');
      setErrandId(prefillErrandId || '');
      setEstimatedMinutes('');
    }
  }, [task, user, prefillCaseId, prefillErrandId]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error(language === 'ar' ? 'عنوان المهمة مطلوب' : 'Task title is required'); return; }
    if (!profile?.organization_id || !user) return;

    setSaving(true);
    const payload: any = {
      organization_id: profile.organization_id,
      title: title.trim(),
      title_ar: titleAr.trim() || null,
      description: description.trim() || null,
      task_type: taskType,
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      assigned_by: user.id,
      case_id: caseId || null,
      errand_id: errandId || null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
    };

    if (isEditing) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', task.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('tasks.messages.updated'));
    } else {
      payload.created_by = user.id;
      payload.status = 'todo';
      const { error } = await supabase.from('tasks').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('tasks.messages.created'));
    }

    setSaving(false);
    onSaved();
    onClose();
  };

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
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'ar' ? 'عنوان المهمة...' : 'Task title...'} />
          </div>
          {language === 'ar' && (
            <div>
              <Label>{t('tasks.fields.titleAr')}</Label>
              <Input value={titleAr} onChange={e => setTitleAr(e.target.value)} />
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
                    <SelectItem key={p} value={p}>{t(`statuses.priority.${p}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date + Assigned to */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('tasks.fields.dueDate')}</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('tasks.fields.assignedTo')}</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Case + Errand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('tasks.fields.linkedCase')}</Label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'لا يوجد' : 'None'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {cases.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.case_number} - {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('tasks.fields.linkedErrand')}</Label>
              <Select value={errandId} onValueChange={setErrandId}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'لا يوجد' : 'None'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {errands.map(er => (
                    <SelectItem key={er.id} value={er.id}>{er.errand_number} - {er.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimated time */}
          <div className="w-1/2">
            <Label>{t('tasks.fields.estimatedTime')} ({language === 'ar' ? 'دقائق' : 'minutes'})</Label>
            <Input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} min={0} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : isEditing ? t('common.update') : t('common.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
