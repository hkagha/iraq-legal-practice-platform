import { supabase } from '@/integrations/supabase/client';

/**
 * Create a notification via the database helper function.
 * Call this after key actions (task assign, case status change, etc.)
 */
export async function createNotification(params: {
  organizationId: string;
  userId: string;
  notificationType: string;
  title: string;
  titleAr?: string;
  body?: string;
  bodyAr?: string;
  priority?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
}) {
  const { data, error } = await supabase.rpc('create_notification', {
    p_organization_id: params.organizationId,
    p_user_id: params.userId,
    p_notification_type: params.notificationType,
    p_title: params.title,
    p_title_ar: params.titleAr || null,
    p_body: params.body || null,
    p_body_ar: params.bodyAr || null,
    p_priority: params.priority || 'normal',
    p_entity_type: params.entityType || null,
    p_entity_id: params.entityId || null,
    p_actor_id: params.actorId || null,
  });
  if (error) console.error('Failed to create notification:', error);
  return data;
}

/**
 * Check for overdue tasks and create notifications (call on dashboard load).
 * Prevents duplicates by checking reminder_sent flag.
 */
export async function checkOverdueTaskNotifications(
  organizationId: string,
  currentUserId: string,
) {
  const today = new Date().toISOString().split('T')[0];

  // Find overdue tasks assigned to current user that haven't been notified
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, title_ar, due_date, assigned_to')
    .eq('organization_id', organizationId)
    .lt('due_date', today)
    .eq('reminder_sent', false)
    .not('status', 'in', '("completed","cancelled")');

  if (!overdueTasks?.length) return;

  for (const task of overdueTasks) {
    if (task.assigned_to) {
      await createNotification({
        organizationId,
        userId: task.assigned_to,
        notificationType: 'task_overdue',
        title: `Task overdue: ${task.title}`,
        titleAr: task.title_ar ? `مهمة متأخرة: ${task.title_ar}` : undefined,
        priority: 'high',
        entityType: 'task',
        entityId: task.id,
        actorId: currentUserId,
      });
    }
    // Mark as notified
    await supabase.from('tasks').update({ reminder_sent: true }).eq('id', task.id);
  }
}

/**
 * Check for tomorrow's hearings and create notifications.
 */
export async function checkUpcomingHearingNotifications(
  organizationId: string,
  currentUserId: string,
) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: hearings } = await supabase
    .from('case_hearings')
    .select('id, hearing_date, hearing_type, case_id, cases!inner(title, title_ar)')
    .eq('organization_id', organizationId)
    .eq('hearing_date', tomorrowStr)
    .eq('status', 'scheduled');

  if (!hearings?.length) return;

  // Get team members for each case
  for (const h of hearings) {
    const caseData = h.cases as any;
    const { data: teamMembers } = await supabase
      .from('case_team_members')
      .select('user_id')
      .eq('case_id', h.case_id);

    if (teamMembers) {
      for (const member of teamMembers) {
        // Check if notification already exists
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', member.user_id)
          .eq('entity_type', 'hearing')
          .eq('entity_id', h.id)
          .eq('notification_type', 'case_hearing_tomorrow')
          .limit(1);

        if (!existing?.length) {
          await createNotification({
            organizationId,
            userId: member.user_id,
            notificationType: 'case_hearing_tomorrow',
            title: `Hearing tomorrow: ${caseData?.title || ''}`,
            titleAr: caseData?.title_ar ? `جلسة غداً: ${caseData.title_ar}` : undefined,
            priority: 'high',
            entityType: 'hearing',
            entityId: h.case_id,
            actorId: currentUserId,
          });
        }
      }
    }
  }
}
