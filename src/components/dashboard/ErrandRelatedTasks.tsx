import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import TaskFormModal from '@/components/tasks/TaskFormModal';

interface Props {
  errandId: string;
  errandTitle?: string;
}

export default function ErrandRelatedTasks({ errandId, errandTitle }: Props) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const fetchTasks = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, title, title_ar, status, due_date, priority, assigned_to')
      .eq('errand_id', errandId)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [errandId, profile?.organization_id]);

  const handleToggle = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      completed_by: newStatus === 'completed' ? user!.id : null,
    } as any).eq('id', task.id);
    toast.success(newStatus === 'completed' ? t('tasks.messages.completed') : t('tasks.messages.updated'));
    fetchTasks();
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading-sm text-foreground">
          {language === 'ar' ? 'المهام المرتبطة' : 'Related Tasks'}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowTaskModal(true)} className="text-accent border-accent/30">
          <Plus size={14} /> {language === 'ar' ? 'إضافة مهمة' : 'Add Task'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckSquare className="h-10 w-10 text-muted-foreground/30 mb-2" strokeWidth={1.5} />
          <p className="text-body-sm text-muted-foreground mb-2">
            {language === 'ar' ? 'لا توجد مهام مرتبطة بهذه المعاملة' : 'No tasks linked to this errand'}
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowTaskModal(true)} className="text-accent border-accent/30">
            {language === 'ar' ? 'إنشاء مهمة' : 'Create Task'}
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3">
              <Checkbox
                checked={task.status === 'completed'}
                onCheckedChange={() => handleToggle(task)}
                className="h-4 w-4"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-body-md truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {language === 'ar' && task.title_ar ? task.title_ar : task.title}
                </p>
              </div>
              <StatusBadge status={task.status} type="task" size="sm" />
              {task.due_date && (
                <span className="text-body-sm text-muted-foreground">{format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {showTaskModal && (
        <TaskFormModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          onSaved={() => { setShowTaskModal(false); fetchTasks(); }}
          prefillErrandId={errandId}
        />
      )}
    </div>
  );
}
