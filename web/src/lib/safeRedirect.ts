/**
 * The address Supabase returns is where the user is sent next. It belongs to the app's registered
 * redirect URI, but we still refuse anything that could run code or leave the browser.
 */
export function safeRedirectUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (['javascript:', 'data:', 'vbscript:', 'file:', 'blob:', 'about:'].includes(url.protocol)) return null;
    // Plain http is only acceptable for local testing.
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

