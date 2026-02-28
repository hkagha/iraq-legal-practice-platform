import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/lib/notifications';

/**
 * Run daily notification checks once per user session.
 * Creates notifications for overdue items, upcoming deadlines, etc.
 * Prevents duplicates by checking existing notifications for today.
 */
export async function runDailyNotificationChecks(
  organizationId: string,
  currentUserId: string,
) {
  const todayKey = new Date().toISOString().split('T')[0];
  const sessionKey = `daily_checks_ran_${currentUserId}`;

  // Only run once per session per day
  if (sessionStorage.getItem(sessionKey) === todayKey) return;

  try {
    const today = todayKey;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    // Run all queries in parallel
    const [
      overdueTasksRes,
      todayTasksRes,
      tomorrowTasksRes,
      todayHearingsRes,
      tomorrowHearingsRes,
      overdueErrandsRes,
      overdueInvoicesRes,
      approachingCasesRes,
    ] = await Promise.all([
      // 1. Overdue tasks
      supabase.from('tasks').select('id, title, title_ar, due_date, assigned_to')
        .eq('organization_id', organizationId)
        .lt('due_date', today)
        .not('status', 'in', '("completed","cancelled")')
        .eq('reminder_sent', false),
      // 2. Tasks due today
      supabase.from('tasks').select('id, title, title_ar, due_date, assigned_to')
        .eq('organization_id', organizationId)
        .eq('due_date', today)
        .not('status', 'in', '("completed","cancelled")'),
      // 3. Tasks due tomorrow
      supabase.from('tasks').select('id, title, title_ar, due_date, assigned_to')
        .eq('organization_id', organizationId)
        .eq('due_date', tomorrowStr)
        .not('status', 'in', '("completed","cancelled")'),
      // 4. Hearings today
      supabase.from('case_hearings').select('id, hearing_date, hearing_type, case_id, hearing_time')
        .eq('organization_id', organizationId)
        .eq('hearing_date', today)
        .eq('status', 'scheduled'),
      // 5. Hearings tomorrow
      supabase.from('case_hearings').select('id, hearing_date, hearing_type, case_id, hearing_time')
        .eq('organization_id', organizationId)
        .eq('hearing_date', tomorrowStr)
        .eq('status', 'scheduled'),
      // 6. Overdue errands
      supabase.from('errands').select('id, title, title_ar, due_date, assigned_to')
        .eq('organization_id', organizationId)
        .lt('due_date', today)
        .not('status', 'in', '("completed","cancelled","approved","rejected")'),
      // 7. Overdue invoices
      supabase.from('invoices').select('id, invoice_number, due_date, total_amount, currency, created_by')
        .eq('organization_id', organizationId)
        .lt('due_date', today)
        .in('status', ['sent', 'viewed', 'partially_paid']),
      // 8. Case deadlines approaching
      supabase.from('cases').select('id, title, title_ar, statute_of_limitations')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .gte('statute_of_limitations', today)
        .lte('statute_of_limitations', sevenDaysStr),
    ]);

    // Helper to check for existing notification today
    async function hasTodayNotification(userId: string, entityType: string, entityId: string, notifType: string): Promise<boolean> {
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;
      const { data } = await supabase.from('notifications').select('id')
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('notification_type', notifType)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .limit(1);
      return (data?.length || 0) > 0;
    }

    // 1. Overdue tasks
    for (const task of overdueTasksRes.data || []) {
      if (!task.assigned_to) continue;
      if (await hasTodayNotification(task.assigned_to, 'task', task.id, 'task_overdue')) continue;
      await createNotification({
        organizationId, userId: task.assigned_to, notificationType: 'task_overdue',
        title: `Task overdue: ${task.title}`,
        titleAr: task.title_ar ? `مهمة متأخرة: ${task.title_ar}` : undefined,
        priority: 'high', entityType: 'task', entityId: task.id, actorId: currentUserId,
      });
      await supabase.from('tasks').update({ reminder_sent: true }).eq('id', task.id);
    }

    // 2. Tasks due today
    for (const task of todayTasksRes.data || []) {
      if (!task.assigned_to) continue;
      if (await hasTodayNotification(task.assigned_to, 'task', task.id, 'task_due_today')) continue;
      await createNotification({
        organizationId, userId: task.assigned_to, notificationType: 'task_due_today',
        title: `Task due today: ${task.title}`,
        titleAr: task.title_ar ? `مهمة مستحقة اليوم: ${task.title_ar}` : undefined,
        priority: 'normal', entityType: 'task', entityId: task.id, actorId: currentUserId,
      });
    }

    // 3. Tasks due tomorrow
    for (const task of tomorrowTasksRes.data || []) {
      if (!task.assigned_to) continue;
      if (await hasTodayNotification(task.assigned_to, 'task', task.id, 'task_due_tomorrow')) continue;
      await createNotification({
        organizationId, userId: task.assigned_to, notificationType: 'task_due_tomorrow',
        title: `Task due tomorrow: ${task.title}`,
        titleAr: task.title_ar ? `مهمة مستحقة غداً: ${task.title_ar}` : undefined,
        priority: 'normal', entityType: 'task', entityId: task.id, actorId: currentUserId,
      });
    }

    // 4. Hearings today — notify all case team members
    for (const h of todayHearingsRes.data || []) {
      const { data: team } = await supabase.from('case_team_members').select('user_id').eq('case_id', h.case_id);
      const { data: caseData } = await supabase.from('cases').select('title, title_ar').eq('id', h.case_id).single();
      for (const member of team || []) {
        if (await hasTodayNotification(member.user_id, 'hearing', h.id, 'case_hearing_today')) continue;
        await createNotification({
          organizationId, userId: member.user_id, notificationType: 'case_hearing_today',
          title: `Hearing today: ${caseData?.title || ''}`,
          titleAr: caseData?.title_ar ? `جلسة اليوم: ${caseData.title_ar}` : undefined,
          priority: 'high', entityType: 'hearing', entityId: h.case_id, actorId: currentUserId,
        });
      }
    }

    // 5. Hearings tomorrow — notify all case team members
    for (const h of tomorrowHearingsRes.data || []) {
      const { data: team } = await supabase.from('case_team_members').select('user_id').eq('case_id', h.case_id);
      const { data: caseData } = await supabase.from('cases').select('title, title_ar').eq('id', h.case_id).single();
      for (const member of team || []) {
        if (await hasTodayNotification(member.user_id, 'hearing', h.id, 'case_hearing_tomorrow')) continue;
        await createNotification({
          organizationId, userId: member.user_id, notificationType: 'case_hearing_tomorrow',
          title: `Hearing tomorrow: ${caseData?.title || ''}`,
          titleAr: caseData?.title_ar ? `جلسة غداً: ${caseData.title_ar}` : undefined,
          priority: 'high', entityType: 'hearing', entityId: h.case_id, actorId: currentUserId,
        });
      }
    }

    // 6. Overdue errands
    for (const errand of overdueErrandsRes.data || []) {
      if (!errand.assigned_to) continue;
      if (await hasTodayNotification(errand.assigned_to, 'errand', errand.id, 'errand_overdue')) continue;
      await createNotification({
        organizationId, userId: errand.assigned_to, notificationType: 'errand_overdue',
        title: `Errand overdue: ${errand.title}`,
        titleAr: errand.title_ar ? `معاملة متأخرة: ${errand.title_ar}` : undefined,
        priority: 'high', entityType: 'errand', entityId: errand.id, actorId: currentUserId,
      });
    }

    // 7. Overdue invoices — update status & notify firm_admin
    if (overdueInvoicesRes.data?.length) {
      // Update statuses
      await supabase.from('invoices').update({ status: 'overdue' } as any)
        .eq('organization_id', organizationId)
        .lt('due_date', today)
        .in('status', ['sent', 'viewed']);

      // Notify the admin (use created_by or currentUserId)
      const { data: admins } = await supabase.from('profiles').select('id')
        .eq('organization_id', organizationId).eq('role', 'firm_admin').limit(5);

      for (const inv of overdueInvoicesRes.data) {
        for (const admin of admins || []) {
          if (await hasTodayNotification(admin.id, 'invoice', inv.id, 'invoice_overdue')) continue;
          await createNotification({
            organizationId, userId: admin.id, notificationType: 'invoice_overdue',
            title: `Invoice overdue: ${inv.invoice_number}`,
            priority: 'high', entityType: 'invoice', entityId: inv.id, actorId: currentUserId,
          });
        }
      }
    }

    // 8. Case deadlines approaching — notify lead attorney (first team member)
    for (const c of approachingCasesRes.data || []) {
      const { data: team } = await supabase.from('case_team_members').select('user_id')
        .eq('case_id', c.id).eq('role', 'lead').limit(1);
      const targetUser = team?.[0]?.user_id || currentUserId;
      if (await hasTodayNotification(targetUser, 'case', c.id, 'case_deadline_approaching')) continue;
      await createNotification({
        organizationId, userId: targetUser, notificationType: 'case_deadline_approaching',
        title: `Deadline approaching: ${c.title}`,
        titleAr: c.title_ar ? `اقتراب موعد نهائي: ${c.title_ar}` : undefined,
        priority: 'high', entityType: 'case', entityId: c.id, actorId: currentUserId,
      });
    }

    // Mark session as checked
    sessionStorage.setItem(sessionKey, todayKey);
  } catch (err) {
    console.error('Daily notification checks failed:', err);
  }
}
