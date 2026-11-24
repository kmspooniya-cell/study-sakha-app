export function validateApiBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('The Study Sakha API URL must be an absolute HTTPS URL.');
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('The Study Sakha API URL must be an absolute HTTPS URL.');
  }
  return normalized;
}
