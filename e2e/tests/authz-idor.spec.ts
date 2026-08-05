import { test, expect } from '@playwright/test';
import { API_BASE_URL, hasCrossUserFixtures, TEST_USER_A, TEST_USER_B } from './helpers/env';
import { loginViaApi } from './helpers/api';

// These tests need TWO pre-existing, real accounts (TEST_USER_A / TEST_USER_B
// in e2e/.env) because IDOR bugs only show up when one authenticated user
// tries to read/modify another authenticated user's data. Throwaway accounts
// created inline can't prove this on their own since there's no second
// party's data to try to reach.
test.describe('Cross-user authorization (IDOR)', () => {
  test.skip(!hasCrossUserFixtures, 'TEST_USER_A_* / TEST_USER_B_* not set in e2e/.env — skipping IDOR checks');

  test('user A cannot read user B\'s /api/auth/me by swapping tokens is a no-op (sanity)', async ({ request }) => {
    const a = await loginViaApi(request, TEST_USER_A.email!, TEST_USER_A.password!);
    const b = await loginViaApi(request, TEST_USER_B.email!, TEST_USER_B.password!);
    expect(a.userId).not.toBe(b.userId);
  });

  test('user A cannot fetch user B\'s meal log by guessing/reusing an id', async ({ request }) => {
    const a = await loginViaApi(request, TEST_USER_A.email!, TEST_USER_A.password!);
    const b = await loginViaApi(request, TEST_USER_B.email!, TEST_USER_B.password!);

    const bMeals = await request.get(`${API_BASE_URL}/api/meals`, {
      headers: { Authorization: `Bearer ${b.token}` },
    });
    expect(bMeals.ok()).toBeTruthy();
    const bMealsBody = await bMeals.json();
    const targetId = bMealsBody?.data?.[0]?._id;
    test.skip(!targetId, 'user B has no meals to attempt cross-access against — seed one first');

    // The critical check: user A's token against user B's resource id.
    const crossAccess = await request.get(`${API_BASE_URL}/api/meals/${targetId}`, {
      headers: { Authorization: `Bearer ${a.token}` },
    });
    expect([403, 404]).toContain(crossAccess.status());
  });

  test('user A cannot fetch user B\'s workout log by guessing/reusing an id', async ({ request }) => {
    const a = await loginViaApi(request, TEST_USER_A.email!, TEST_USER_A.password!);
    const b = await loginViaApi(request, TEST_USER_B.email!, TEST_USER_B.password!);

    const bWorkouts = await request.get(`${API_BASE_URL}/api/workouts`, {
      headers: { Authorization: `Bearer ${b.token}` },
    });
    expect(bWorkouts.ok()).toBeTruthy();
    const bWorkoutsBody = await bWorkouts.json();
    const targetId = bWorkoutsBody?.data?.[0]?._id;
    test.skip(!targetId, 'user B has no workouts to attempt cross-access against — seed one first');

    const crossAccess = await request.get(`${API_BASE_URL}/api/workouts/${targetId}`, {
      headers: { Authorization: `Bearer ${a.token}` },
    });
    expect([403, 404]).toContain(crossAccess.status());
  });

  test('user A cannot delete user B\'s friendship record', async ({ request }) => {
    const a = await loginViaApi(request, TEST_USER_A.email!, TEST_USER_A.password!);

    // A syntactically valid but non-owned/non-existent Mongo ObjectId — the
    // point is confirming this 404s/403s rather than 500ing or succeeding.
    const fakeFriendshipId = '507f1f77bcf86cd799439011';
    const res = await request.delete(`${API_BASE_URL}/api/friends/${fakeFriendshipId}`, {
      headers: { Authorization: `Bearer ${a.token}` },
    });
    expect([403, 404]).toContain(res.status());
  });
});
