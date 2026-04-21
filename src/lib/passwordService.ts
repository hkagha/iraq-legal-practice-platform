import { supabase } from '@/integrations/supabase/client';

interface AdminCreateUserArgs {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: string;
  organization_id: string;
  phone?: string;
  client_id?: string;
  person_id?: string;
}

export function generateTempPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const randomValues = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(randomValues, (value) => charset[value % charset.length]).join('');
}

export const generateSecurePassword = generateTempPassword;

export async function resetUserPassword(userId: string, newPassword?: string): Promise<{ success: boolean; password?: string; error?: string }> {
  const password = newPassword || generateSecurePassword();
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: { target_user_id: userId, new_password: password },
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to reset password' };
  }

  if (data?.error) {
    return { success: false, error: data.error };
  }

  return { success: true, password };
}

export const adminResetPassword = resetUserPassword;

export async function createUserWithPassword(args: AdminCreateUserArgs): Promise<{ success: boolean; user_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: args,
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to create user' };
  }

  if (data?.error) {
    return { success: false, error: data.error };
  }

  return { success: !!data?.success, user_id: data?.user_id, error: data?.success ? undefined : 'Failed to create user' };
}

export const adminCreateUser = createUserWithPassword;
