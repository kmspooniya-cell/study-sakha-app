export function validateSignInCredentials(email: string, password: string): string | null {
  if (!email.trim() || !password) return 'Enter both your email and password.';
  return null;
}
