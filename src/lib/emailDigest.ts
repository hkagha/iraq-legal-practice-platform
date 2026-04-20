import { supabase } from '@/integrations/supabase/client';

export interface DigestPrefs {
  daily: boolean;
  weekly: boolean;
}

export async function getDigestPrefs(userId: string): Promise<DigestPrefs> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();
  const d = (data?.preferences as any)?.digest || {};
  return { daily: !!d.daily, weekly: !!d.weekly };
}

export async function updateDigestPrefs(userId: string, prefs: DigestPrefs): Promise<void> {
  const { data: row } = await supabase
    .from('notification_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();
  const merged = { ...(row?.preferences as any || {}), digest: prefs };
  const { error } = await supabase
    .from('notification_preferences')
    .update({ preferences: merged })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function triggerDigestNow(frequency: 'daily' | 'weekly', userId?: string) {
  const { data, error } = await supabase.functions.invoke('send-digest', {
    body: { frequency, user_id: userId },
  });
  if (error) throw error;
  return data;
}
