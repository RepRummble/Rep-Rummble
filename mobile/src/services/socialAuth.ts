import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from '../config/api';

/** Where the sign-in page sends the person back to. Must also be allowed in Supabase and on the server. */
export const AUTH_REDIRECT = 'reprummble://auth-callback';

export type SocialProvider = 'apple' | 'google' | 'azure' | 'facebook';

// Lets the sign-in page close itself cleanly on return.
WebBrowser.maybeCompleteAuthSession();

/** Reads key=value pairs from the part of the address after # (or ?), without relying on URLSearchParams. */
function readParams(url: string): Record<string, string> {
  const part = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
  const out: Record<string, string> = {};
  for (const pair of part.split('&')) {
    if (!pair) continue;
    const [k, ...rest] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
  }
  return out;
}

export interface SocialTokens { accessToken: string; refreshToken: string }

/**
 * Opens the provider's sign-in page in the system browser (the one that already knows their Apple,
 * Google, Microsoft or Facebook account) and returns the session tokens. Returns null if they closed it.
 * No password or provider secret ever passes through the app.
 */
export async function signInWithProvider(provider: SocialProvider): Promise<SocialTokens | null> {
  const start = `${API_BASE_URL}/auth/oauth/${provider}?redirect=${encodeURIComponent(AUTH_REDIRECT)}`;
  const result = await WebBrowser.openAuthSessionAsync(start, AUTH_REDIRECT);
  if (result.type !== 'success') return null;

  const params = readParams(result.url);
  if (params.error || params.error_description) {
    throw new Error(params.error_description || params.error || 'Sign-in was not completed.');
  }
  if (!params.access_token || !params.refresh_token) {
    throw new Error('The sign-in page did not return a session. Please try again.');
  }
  return { accessToken: params.access_token, refreshToken: params.refresh_token };
}
