export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001';

// Optional pair of pre-existing accounts used only by IDOR / cross-user
// authorization tests. Kept separate from throwaway accounts created inline
// by other tests because IDOR tests need a *second* user whose data already
// exists to attempt (and expect to fail) cross-account access.
export const TEST_USER_A = {
  email: process.env.TEST_USER_A_EMAIL,
  password: process.env.TEST_USER_A_PASSWORD,
};
export const TEST_USER_B = {
  email: process.env.TEST_USER_B_EMAIL,
  password: process.env.TEST_USER_B_PASSWORD,
};

export const hasCrossUserFixtures = Boolean(
  TEST_USER_A.email && TEST_USER_A.password && TEST_USER_B.email && TEST_USER_B.password
);

/** Generates a unique, obviously-fake throwaway email for signup tests. */
export function throwawayEmail(prefix = 'e2e'): string {
  // Date.now()/Math.random() are fine here — this file only ever runs
  // inside a real Playwright test process, not a Workflow script.
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}
