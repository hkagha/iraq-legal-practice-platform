import { supabase } from '@/integrations/supabase/client';

export async function adminResetPassword(targetUserId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };

    const response = await supabase.functions.invoke('admin-reset-password', {
      body: {
        target_user_id: targetUserId,
        new_password: newPassword,
      },
    });

    if (response.error) {
      return { success: false, error: response.error.message || 'Failed to reset password' };
    }

    const data = response.data as any;
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unknown error' };
  }
}

export function generateSecurePassword(length: number = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}
