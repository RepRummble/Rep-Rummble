import { test, expect } from '@playwright/test';
import { API_BASE_URL } from './helpers/env';

test.describe('API security headers (helmet)', () => {
  test('health endpoint sets baseline hardening headers', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/health`);
    const headers = res.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    // helmet removes X-Powered-By by default — a leaked "Express" banner is
    // a free hint to an attacker about what to target.
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('CORS rejects an arbitrary, non-allowlisted origin', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/health`, {
      headers: { Origin: 'https://totally-not-reprummble.evil.example' },
    });
    // The server's CORS callback throws for disallowed origins (see
    // server/src/server.ts allowedOrigins check), which Express surfaces as
    // an error response rather than a permissive Access-Control-Allow-Origin.
    const acao = res.headers()['access-control-allow-origin'];
    expect(acao).not.toBe('https://totally-not-reprummble.evil.example');
  });

  test('CORS allows the known web origin', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(res.ok()).toBeTruthy();
  });
});
