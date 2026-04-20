import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckSquare, UserCheck, AlertTriangle, CheckCircle, MoreHorizontal, Pencil, Copy, Trash2, List, LayoutGrid, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskFormModal from '@/components/tasks/TaskFormModal';
import TaskDetailSlideOver from '@/components/tasks/TaskDetailSlideOver';

const TASK_TYPES = [
  'general', 'research', 'drafting', 'review', 'filing',
  'court_preparation', 'client_communication', 'follow_up',
  'document_preparation', 'meeting', 'deadline', 'administrative', 'other'
];

const STATUSES = ['todo', 'in_progress', 'in_review', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-muted-foreground/50',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-red-500',
};

const KANBAN_COLUMNS = ['todo', 'in_progress', 'in_review', 'completed'] as const;
const KANBAN_BORDER: Record<string, string> = {
  todo: 'border-t-muted-foreground/60',
  in_progress: 'border-t-blue-500',
  in_review: 'border-t-amber-500',
  completed: 'border-t-green-500',
};

export default function TasksPage() {
  const { language, t } = useLanguage();
  const { user, profile } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [deleteTask, setDeleteTask] = useState<any>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('my');
  const [typeFilter, setTypeFilter] = useState('all');
  const [linkedFilter, setLinkedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_date');

  // Kanban drag state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, my: 0, overdue: 0, completedToday: 0 });

  const fetchTasks = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    let query = supabase
      .from('tasks')
      .select('*, cases(case_number, title), errands(errand_number, title), profiles!tasks_assigned_to_fkey(first_name, last_name, avatar_url)')
      .eq('organization_id', profile.organization_id);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);
    if (assignedFilter === 'my' && user) query = query.eq('assigned_to', user.id);
    if (typeFilter !== 'all') query = query.eq('task_type', typeFilter);
    if (linkedFilter === 'case') query = query.not('case_id', 'is', null);
    else if (linkedFilter === 'errand') query = query.not('errand_id', 'is', null);
    else if (linkedFilter === 'standalone') query = query.is('case_id', null).is('errand_id', null);
    if (search) query = query.or(`title.ilike.%${search}%,title_ar.ilike.%${search}%`);

    if (sortBy === 'due_date') query = query.order('due_date', { ascending: true, nullsFirst: false });
    else if (sortBy === 'priority') query = query.order('priority', { ascending: true });
    else if (sortBy === 'created_at') query = query.order('created_at', { ascending: false });
    else query = query.order('title', { ascending: true });

    const { data } = await query.limit(500);
    setTasks(data || []);
    setLoading(false);
  }, [profile?.organization_id, user, statusFilter, priorityFilter, assignedFilter, typeFilter, linkedFilter, search, sortBy]);

  const fetchStats = useCallback(async () => {
    if (!profile?.organization_id || !user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [totalRes, myRes, overdueRes, completedRes] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).not('status', 'in', '("completed","cancelled")'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('assigned_to', user.id).not('status', 'in', '("completed","cancelled")'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).lt('due_date', today).not('status', 'in', '("completed","cancelled")'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('status', 'completed').gte('completed_at', todayStart.toISOString()),
    ]);
    setStats({
      total: totalRes.count || 0,
      my: myRes.count || 0,
      overdue: overdueRes.count || 0,
      completedToday: completedRes.count || 0,
    });
  }, [profile?.organization_id, user]);

  useEffect(() => { fetchTasks(); fetchStats(); }, [fetchTasks, fetchStats]);

  const handleToggleComplete = async (task: any) => {
    if (task.status === 'completed') {
      await supabase.from('tasks').update({ status: 'todo', completed_at: null, completed_by: null } as any).eq('id', task.id);
      toast.success(t('tasks.messages.updated'));
    } else {
      await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: user!.id } as any).eq('id', task.id);
      toast.success(t('tasks.messages.completed'));
    }
    fetchTasks();
    fetchStats();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user!.id;
    } else {
      updates.completed_at = null;
      updates.completed_by = null;
    }
    await supabase.from('tasks').update(updates).eq('id', taskId);
    toast.success(t('tasks.messages.updated'));
    fetchTasks();
    fetchStats();
  };

  const handleDelete = async () => {
    if (!deleteTask) return;
    await supabase.from('tasks').delete().eq('id', deleteTask.id);
    setDeleteTask(null);
    toast.success(t('tasks.messages.deleted'));
    fetchTasks();
    fetchStats();
  };

  const handleDuplicate = async (task: any) => {
    const { id, created_at, updated_at, completed_at, completed_by, cases, errands, profiles, ...rest } = task;
    await supabase.from('tasks').insert({ ...rest, status: 'todo', created_by: user!.id } as any);
    toast.success(t('tasks.messages.created'));
    fetchTasks();
    fetchStats();
  };

  // Kanban drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!dragTaskId) return;
    await handleStatusChange(dragTaskId, newStatus);
    setDragTaskId(null);
  };

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return 'text-muted-foreground';
    const d = new Date(dueDate + 'T00:00:00');
    const today = startOfDay(new Date());
    if (isBefore(d, today)) return 'text-destructive';
    if (isToday(d)) return 'text-amber-600';
    if (isTomorrow(d)) return 'text-blue-500';
    return 'text-muted-foreground';
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return '';
    const d = new Date(dueDate + 'T00:00:00');
    if (isToday(d)) return language === 'ar' ? 'اليوم' : 'Today';
    if (isTomorrow(d)) return language === 'ar' ? 'غداً' : 'Tomorrow';
    return format(d, 'MMM d');
  };

  const getLinkedLabel = (task: any) => {
    if (task.cases) return task.cases.case_number;
    if (task.errands) return task.errands.errand_number;
    return null;
  };

  const getAssigneeName = (task: any) => {
    const p = task.profiles;
    if (!p) return '';
    return language === 'ar' ? `${p.first_name || ''} ${p.last_name || ''}` : `${p.first_name || ''} ${p.last_name || ''}`;
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const renderTaskRow = (task: any) => {
    const isComplete = task.status === 'completed';
    const linked = getLinkedLabel(task);
    const assignee = getAssigneeName(task);

    return (
      <div
        key={task.id}
        className={cn(
          'flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-all',
          isComplete && 'opacity-60'
        )}
      >
        <Checkbox
          checked={isComplete}
          onCheckedChange={() => handleToggleComplete(task)}
          className="h-5 w-5"
        />
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority])} />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTaskId(task.id)}>
          <p className={cn('text-body-md font-medium text-foreground truncate', isComplete && 'line-through text-muted-foreground')}>
            {language === 'ar' && task.title_ar ? task.title_ar : task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.due_date && (
              <span className={cn('text-body-sm', getDueDateColor(task.due_date))}>
                {formatDueDate(task.due_date)}
              </span>
            )}
            {assignee && (
              <>
                <span className="text-muted-foreground text-body-sm">·</span>
                <span className="text-body-sm text-muted-foreground truncate max-w-[120px]">{assignee}</span>
              </>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {linked && (
            <span className="text-body-sm bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{linked}</span>
          )}
          <StatusBadge status={task.priority} type="priority" size="sm" />
          <span className="text-body-sm text-muted-foreground capitalize">
            {t(`tasks.types.${task.task_type}`)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditTask(task); setShowFormModal(true); }}>
              <Pencil size={14} className="me-2" /> {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t('tasks.changeStatus')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {STATUSES.map(s => (
                  <DropdownMenuItem key={s} onClick={() => handleStatusChange(task.id, s)}>
                    {t(`tasks.statuses.${s}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => handleDuplicate(task)}>
              <Copy size={14} className="me-2" /> {t('tasks.duplicate')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTask(task)}>
              <Trash2 size={14} className="me-2" /> {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderKanbanCard = (task: any) => {
    const linked = getLinkedLabel(task);
    const assignee = getAssigneeName(task);

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onClick={() => setDetailTaskId(task.id)}
        className={cn(
          'bg-card border border-border rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow relative',
          dragTaskId === task.id && 'opacity-50'
        )}
      >
        <div className={cn('absolute top-0 start-0 w-1 h-full rounded-s-lg', PRIORITY_DOT[task.priority])} />
        <p className="text-body-md font-medium text-foreground line-clamp-2 ps-2">
          {language === 'ar' && task.title_ar ? task.title_ar : task.title}
        </p>
        <div className="flex items-center gap-2 mt-2 ps-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
            {t(`tasks.types.${task.task_type}`)}
          </span>
          {linked && (
            <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{linked}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 ps-2">
          {assignee && (
            <span className="text-body-sm text-muted-foreground truncate max-w-[120px]">{assignee}</span>
          )}
          {task.due_date && (
            <span className={cn('text-body-sm', getDueDateColor(task.due_date))}>
              {formatDueDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={t('tasks.title')}
        titleAr={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        subtitleAr={t('tasks.subtitle')}
        actionLabel={t('tasks.addTask')}
        actionLabelAr={t('tasks.addTask')}
        onAction={() => { setEditTask(null); setShowFormModal(true); }}
        helpKey="tasks"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: t('tasks.title'), labelAr: t('tasks.title') },
        ]}
      />

      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button onClick={() => setViewMode('list')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors', viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
            <List size={14} /> {t('tasks.list')}
          </button>
          <button onClick={() => setViewMode('kanban')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors', viewMode === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
            <LayoutGrid size={14} /> {t('tasks.kanban')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CheckSquare} iconColor="hsl(217 91% 60%)" iconBgColor="hsl(214 100% 97%)" label={t('tasks.totalTasks')} labelAr={t('tasks.totalTasks')} value={String(stats.total)} isLoading={loading} />
        <StatCard icon={UserCheck} iconColor="hsl(42 50% 54%)" iconBgColor="hsl(42 52% 95%)" label={t('tasks.myTasks')} labelAr={t('tasks.myTasks')} value={String(stats.my)} isLoading={loading} />
        <StatCard icon={AlertTriangle} iconColor="hsl(0 84% 60%)" iconBgColor="hsl(0 86% 97%)" label={t('tasks.overdueTasks')} labelAr={t('tasks.overdueTasks')} value={String(stats.overdue)} isLoading={loading} />
        <StatCard icon={CheckCircle} iconColor="hsl(142 71% 45%)" iconBgColor="hsl(138 76% 97%)" label={t('tasks.completedToday')} labelAr={t('tasks.completedToday')} value={String(stats.completedToday)} isLoading={loading} />
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search tasks..."
        searchPlaceholderAr="البحث في المهام..."
        onSearchChange={setSearch}
        filters={[
          { key: 'status', label: 'Status', labelAr: 'الحالة', options: STATUSES.map(s => ({ value: s, label: t(`tasks.statuses.${s}`), labelAr: t(`tasks.statuses.${s}`) })) },
          { key: 'priority', label: 'Priority', labelAr: 'الأولوية', options: PRIORITIES.map(p => ({ value: p, label: t(`statuses.priority.${p}`), labelAr: t(`statuses.priority.${p}`) })) },
          { key: 'assigned', label: 'Assigned', labelAr: 'المسند إليه', options: [
            { value: 'my', label: t('tasks.myTasks'), labelAr: t('tasks.myTasks') },
            { value: 'all', label: t('tasks.allTeam'), labelAr: t('tasks.allTeam') },
          ]},
          { key: 'type', label: 'Type', labelAr: 'النوع', options: TASK_TYPES.map(tt => ({ value: tt, label: t(`tasks.types.${tt}`), labelAr: t(`tasks.types.${tt}`) })) },
        ]}
        activeFilters={{ status: statusFilter, priority: priorityFilter, assigned: assignedFilter, type: typeFilter }}
        onFilterChange={(key, val) => {
          if (key === 'status') setStatusFilter(val);
          if (key === 'priority') setPriorityFilter(val);
          if (key === 'assigned') setAssignedFilter(val);
          if (key === 'type') setTypeFilter(val);
        }}
        onClearAll={() => { setStatusFilter('all'); setPriorityFilter('all'); setAssignedFilter('my'); setTypeFilter('all'); }}
      />

      {/* Content */}
      {!loading && tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t('tasks.empty.title')}
          titleAr={t('tasks.empty.title')}
          subtitle={t('tasks.empty.subtitle')}
          subtitleAr={t('tasks.empty.subtitle')}
          actionLabel={t('tasks.empty.action')}
          actionLabelAr={t('tasks.empty.action')}
          onAction={() => { setEditTask(null); setShowFormModal(true); }}
        />
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(colStatus => {
            const colTasks = tasks.filter(t => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className={cn('min-w-[280px] w-[280px] flex-shrink-0 bg-muted/40 rounded-lg p-2 border-t-[3px]', KANBAN_BORDER[colStatus])}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, colStatus)}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-body-sm font-semibold text-foreground">{t(`tasks.statuses.${colStatus}`)}</h3>
                  <span className="text-body-sm text-muted-foreground bg-muted rounded-full px-2 py-0.5">{colTasks.length}</span>
                </div>
                <div className="min-h-[200px]">
                  {colTasks.map(task => renderKanbanCard(task))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div>
          {activeTasks.length > 0 && (
            <div className="bg-card rounded-lg border border-border mb-4">
              {activeTasks.map(renderTaskRow)}
            </div>
          )}

          {completedTasks.length > 0 && (
            <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
              <CollapsibleTrigger className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
                {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {t('tasks.completed')} ({completedTasks.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-card rounded-lg border border-border">
                  {completedTasks.map(renderTaskRow)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Detail SlideOver */}
      <TaskDetailSlideOver
        isOpen={!!detailTaskId}
        onClose={() => setDetailTaskId(null)}
        taskId={detailTaskId}
        onUpdated={() => { fetchTasks(); fetchStats(); }}
      />

      {/* Form modal */}
      {showFormModal && (
        <TaskFormModal
          isOpen={showFormModal}
          onClose={() => { setShowFormModal(false); setEditTask(null); }}
          task={editTask}
          onSaved={() => { fetchTasks(); fetchStats(); }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={handleDelete}
        title={t('tasks.deleteConfirmTitle')}
        titleAr={t('tasks.deleteConfirmTitle')}
        message={t('tasks.deleteConfirmMessage')}
        messageAr={t('tasks.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        confirmLabelAr={t('common.delete')}
        type="danger"
      />
    </div>
  );
}
