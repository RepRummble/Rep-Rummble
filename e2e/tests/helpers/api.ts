import { APIRequestContext, expect } from '@playwright/test';
import { API_BASE_URL } from './env';

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const res = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password },
  });
  expect(res.ok(), `login failed for ${email}: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return { token: body.data.token, userId: body.data.user.id };
}

export async function registerViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
  displayName = 'E2E Test User'
) {
  return request.post(`${API_BASE_URL}/api/auth/register`, {
    data: { email, password, displayName },
  });
}
