export async function generateTempPassword(): Promise<string> {
  return Math.random().toString(36).slice(2, 12) + 'A1!';
}
export const generateSecurePassword = generateTempPassword;
export async function resetUserPassword(_userId: string): Promise<{ password: string }> {
  return { password: await generateTempPassword() };
}
export const adminResetPassword = resetUserPassword;
export async function createUserWithPassword(_args: any): Promise<any> { return null; }
export const adminCreateUser = createUserWithPassword;
