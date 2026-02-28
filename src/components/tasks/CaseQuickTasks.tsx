import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import TaskFormModal from '@/components/tasks/TaskFormModal';

interface CaseQuickTasksProps {
  caseId: string;
}

export default function CaseQuickTasks({ caseId }: CaseQuickTasksProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const fetchTasks = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, title, title_ar, due_date, assigned_to, profiles!tasks_assigned_to_fkey(first_name, last_name)')
      .eq('case_id', caseId)
      .eq('organization_id', profile.organization_id)
      .not('status', 'in', '("completed","cancelled")')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5);
    setTasks(data || []);
  };

  useEffect(() => { fetchTasks(); }, [caseId, profile?.organization_id]);

  const handleToggle = async (task: any) => {
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: user!.id } as any).eq('id', task.id);
    toast.success(t('tasks.messages.completed'));
    fetchTasks();
  };

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return 'text-muted-foreground';
    const d = new Date(dueDate + 'T00:00:00');
    if (isBefore(d, startOfDay(new Date()))) return 'text-destructive';
    if (isToday(d)) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-sm font-semibold text-foreground">{t('tasks.quickTasks')}</h3>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} className="me-1" /> {t('tasks.addTask')}
          </Button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground italic">{t('tasks.noTasksForCase')}</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const assignee = task.profiles;
              return (
                <div key={task.id} className="flex items-center gap-2">
                  <Checkbox checked={false} onCheckedChange={() => handleToggle(task)} className="h-4 w-4" />
                  <span className="text-body-md text-foreground truncate flex-1">
                    {language === 'ar' && task.title_ar ? task.title_ar : task.title}
                  </span>
                  {task.due_date && (
                    <span className={cn('text-body-sm whitespace-nowrap', getDueDateColor(task.due_date))}>
                      {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}
                    </span>
                  )}
                  {assignee && (
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-medium text-accent flex-shrink-0">
                      {assignee.first_name?.[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <TaskFormModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={fetchTasks}
          prefillCaseId={caseId}
        />
      )}
    </>
  );
}
