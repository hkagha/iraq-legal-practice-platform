import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CheckSquare } from 'lucide-react';
import { format, isToday, isTomorrow, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TasksDueSoonWidget() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user || !profile?.organization_id) { setLoading(false); return; }
    const inSevenDays = new Date();
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const { data } = await supabase
      .from('tasks')
      .select('id, title, title_ar, due_date, priority, status')
      .eq('organization_id', profile.organization_id)
      .eq('assigned_to', user.id)
      .not('status', 'in', '("completed","cancelled")')
      .lte('due_date', inSevenDays.toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(5);
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user, profile?.organization_id]);

  const handleToggle = async (task: any) => {
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: user!.id } as any).eq('id', task.id);
    toast.success(t('tasks.messages.completed'));
    fetchTasks();
  };

  const getDueDateColor = (dueDate: string) => {
    const d = new Date(dueDate + 'T00:00:00');
    if (isBefore(d, startOfDay(new Date()))) return 'text-destructive';
    if (isToday(d)) return 'text-warning';
    if (isTomorrow(d)) return 'text-info';
    return 'text-muted-foreground';
  };

  const formatDueDate = (dueDate: string) => {
    const d = new Date(dueDate + 'T00:00:00');
    if (isToday(d)) return language === 'ar' ? 'اليوم' : 'Today';
    if (isTomorrow(d)) return language === 'ar' ? 'غداً' : 'Tomorrow';
    return format(d, 'MMM d');
  };

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.tasksDueSoon')}</h2>
        <button onClick={() => navigate('/tasks')} className="text-body-sm text-accent hover:underline font-medium">
          {t('dashboard.viewAll')}
        </button>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 min-h-[200px]">
          <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
          <p className="text-body-md text-muted-foreground mb-3">{t('dashboard.noTasksDue')}</p>
          <button onClick={() => navigate('/tasks')} className="text-body-sm text-accent font-medium border border-accent rounded-button px-4 h-8 hover:bg-accent/5 transition-colors">
            {t('dashboard.createTask')}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
              <Checkbox checked={false} onCheckedChange={() => handleToggle(task)} className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-medium text-foreground truncate">
                  {language === 'ar' && task.title_ar ? task.title_ar : task.title}
                </p>
              </div>
              {task.due_date && (
                <span className={cn('text-body-sm whitespace-nowrap', getDueDateColor(task.due_date))}>
                  {formatDueDate(task.due_date)}
                </span>
              )}
              <StatusBadge status={task.priority} type="priority" size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
