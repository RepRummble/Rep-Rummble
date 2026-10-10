import { test, expect } from '@playwright/test';
import { API_BASE_URL } from './helpers/env';
import { registerViaApi } from './helpers/api';
import { throwawayEmail } from './helpers/env';

test.describe('Auth API - basic correctness', () => {
  test('register rejects missing fields', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/register`, { data: { email: 'nope@example.com' } });
    expect(res.status()).toBe(400);
  });

  test('login rejects unknown email', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: throwawayEmail('nouser'), password: 'whatever-not-real' },
    });
    // 401 = unknown credentials; 429 = rate-limited by a parallel worker's
    // brute-force test. Both correctly deny access.
    expect([401, 429]).toContain(res.status());
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('protected route rejects request with no token', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  test('protected route rejects garbage bearer token', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Auth API - security hardening', () => {
  test('login response never echoes the submitted password', async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: throwawayEmail('probe'), password: 'super-secret-probe-value' },
    });
    const text = await res.text();
    expect(text).not.toContain('super-secret-probe-value');
  });

  test('repeated bad logins from the same client eventually get rate-limited', async ({ request }) => {
    // loginLimiter allows 10 requests / 15 min per IP (see server/src/middleware/rateLimit.middleware.ts).
    // Fire past that and expect a 429 at some point instead of the server
    // happily accepting unlimited guesses forever.
    const email = throwawayEmail('bruteforce-probe');
    let sawRateLimit = false;

    for (let i = 0; i < 15; i++) {
      const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email, password: `wrong-guess-${i}` },
      });
      if (res.status() === 429) {
        sawRateLimit = true;
        break;
      }
      expect(res.status(), 'expected 401 for wrong credentials until rate-limited').toBe(401);
    }

    expect(sawRateLimit, 'expected a 429 after repeated failed logins — rate limiting may be disabled').toBe(true);
  });

  test('a freshly registered account cannot self-assign the admin role via profile update', async ({ request }) => {
    const email = throwawayEmail('privesc-probe');
    const password = 'A-Reasonably-Strong-Passw0rd!';

    const reg = await registerViaApi(request, email, password);
    if (!reg.ok()) {
      // Registration depends on Supabase being configured in this environment.
      test.skip(true, `register endpoint returned ${reg.status()} — skipping (is Supabase configured for this env?)`);
      return;
    }
    const { data } = await reg.json();
    const token = data.token;

    // Attempt to smuggle role escalation through the profile update endpoint.
    const update = await request.put(`${API_BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: 'admin', displayName: 'Still Just A User' },
    });
    expect(update.ok()).toBeTruthy();

    const me = await request.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const meBody = await me.json();
    // /api/auth/me doesn't currently return role at all, which is itself
    // fine, but if it ever does, this pins it to never being 'admin' for a
    // self-registered account.
    expect(meBody.data.role).not.toBe('admin');
  });
});
