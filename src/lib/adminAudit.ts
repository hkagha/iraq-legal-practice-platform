import { supabase } from '@/integrations/supabase/client';

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetName: string | null,
  details?: Record<string, any>
) {
  await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    target_name: targetName,
    details: details || {},
  } as any);
}
