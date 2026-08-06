# Reprummble E2E + security tests (Playwright)

## What's here

| File | Covers |
|---|---|
| `tests/auth-api.spec.ts` | Register/login validation, 401s on missing/bad tokens, **rate limiting**, password never echoed back, role can't be self-escalated via profile update |
| `tests/security-headers.spec.ts` | Helmet headers present, `X-Powered-By` not leaked, CORS rejects unknown origins |
| `tests/payment-page.spec.ts` | No card-shaped data collected/sent (tripwire for when real billing goes live) |
| `tests/authz-idor.spec.ts` | Cross-user (IDOR) checks — user A can't read/delete user B's data |

## Setup

```bash
cd e2e
npm install
npm run install:browsers   # downloads Chromium once
```

## Running

```bash
# Against a local dev stack (Playwright starts web + server for you)
npm test

# Interactive UI mode — great for debugging a failing test
npm run test:ui

# Against staging (never point this at production)
cp .env.example .env
# edit .env: set BASE_URL and API_BASE_URL to staging
npm test
```

The IDOR tests in `authz-idor.spec.ts` need two real, pre-existing accounts
(`TEST_USER_A_EMAIL`/`PASSWORD`, `TEST_USER_B_EMAIL`/`PASSWORD` in `.env`) with
at least one meal and one workout logged for user B. Without them, those
tests report **skipped**, not passed — skipped is not the same as "verified
safe," so don't read a green run as covering IDOR if you never set these.

## CI

Wired into `.github/workflows/ci-cd.yml` (the `e2e` job) — runs on every push
and PR against a local dev stack (with an ephemeral MongoDB service
container), and gates the manually-approved production deploy. See
[`DEPLOYMENT.md`](../DEPLOYMENT.md). Staging runs are manual
(`workflow_dispatch` locally / `BASE_URL` override) since they need real
secrets for `STAGING_WEB_URL`/`STAGING_API_URL` and the fixture accounts.

## Adding tests

Keep new security-relevant tests in this style: assert the *negative* case
explicitly (a 401/403/429 you expect), not just the happy path — the whole
point of this suite is to fail loudly the day someone accidentally removes
an auth check, a rate limit, or a security header.
