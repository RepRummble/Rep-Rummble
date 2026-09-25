# Security & performance testing

This repo has three testing layers beyond unit tests, all set up 2026-08-05:

1. **[`e2e/`](e2e/)** — Playwright: auth flows, authorization/IDOR checks, security headers, payment-page tripwires.
2. **[`perf/`](perf/)** — Gatling: load testing + a rate-limiter-under-concurrency check.
3. **CI/CD pipeline** — [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml): lint, typecheck, both builds, npm audit, Semgrep, Gitleaks, Playwright, Gatling, then a manually-approved production deploy. See [`DEPLOYMENT.md`](DEPLOYMENT.md). Complements the existing [`codeql.yml`](.github/workflows/codeql.yml).

Run locally:
```bash
cd e2e && npm install && npm run install:browsers && npm test   # E2E + security tests
cd perf && BASE_URL=http://localhost:5001 ./mvnw gatling:test \  # perf baseline
  -Dgatling.simulationClass=reprummble.perf.HealthCheckSimulation
```

## Fixed this session

| Issue | File | Fix |
|---|---|---|
| JWT verify/sign fell back to the hardcoded string `'secret'` if `JWT_SECRET` was unset — anyone could forge valid tokens in that state | [`server/src/middleware/auth.middleware.ts`](server/src/middleware/auth.middleware.ts), [`auth.controller.ts`](server/src/controllers/auth.controller.ts) | New [`server/src/config/security.ts`](server/src/config/security.ts): refuses to start in production without a real `JWT_SECRET` (≥32 chars); generates a random per-process secret in dev instead of a fixed guessable one |
| `adminOnly` middleware was a stub that let **any logged-in user** through (`// TODO: Check admin status from database`) — not wired to a live route yet, but a landmine for the next admin endpoint | [`server/src/middleware/auth.middleware.ts`](server/src/middleware/auth.middleware.ts) | Added a real `role: 'user' | 'admin'` field to `User.model.ts`; `adminOnly` now checks it from the DB. Confirmed `PUT /api/users/profile` already allowlists fields and excludes `role`, so this can't be self-escalated |
| No rate limiting on `/api/auth/login` or `/register` — unlimited credential-stuffing attempts | [`server/src/routes/auth.routes.ts`](server/src/routes/auth.routes.ts) | Added `express-rate-limit`: 10 login attempts / 15 min / IP, 20 for register. Verified it holds under **concurrent** load, not just sequential requests, via `perf/…/LoginRateLimitSimulation.java` |
| `server`/`web` had 11 + 7 known-vulnerable dependency versions | `server/package-lock.json`, `web/package-lock.json` | Ran `npm audit fix` (non-breaking only) → server down to 3, web down to 2, both requiring a major-version bump to close (see below) |

## Found, not yet fixed — needs your call

- **`server/src/middleware/errorHandler.ts`** doesn't `return` after each `if` branch, so a Mongoose duplicate-key or validation error sends a response *and then falls through* to the final catch-all, which tries to send a second response (`ERR_HTTP_HEADERS_SENT`). Reproduces on e.g. registering with a duplicate email. Not a security hole by itself, but it turns expected 400s into noisy 500 crashes — worth a quick fix (`return` after each branch, or restructure as `else if`).
- **Remaining dependency vulns needing a breaking upgrade** (`npm audit fix --force`):
  - `server`: `nodemailer` (high — SSRF/arbitrary file read via the `raw` message option), `@anthropic-ai/sdk` (moderate), `uuid` (moderate)
  - `web`: `react-router-dom` → `react-router` (moderate — open redirect)
  - `mobile`: 19 vulnerabilities (13 moderate, 6 high) in the Expo/React Native dependency tree — run `npx expo install --fix` (not raw `npm audit fix`, which can desync Expo's SDK version matrix) and test the app boots before committing.
- **Payment page** ([`web/src/pages/Payment.tsx`](web/src/pages/Payment.tsx)) currently ships marketing copy ("PCI-compliant", "Encrypted checkout with tokenized storage") ahead of any actual payment integration — no processor is wired in yet ("Payment processing coming soon"). Not a vulnerability today since no card data is collected, but revisit the copy before it's live, and when you do add real billing, route it through a PCI-compliant processor's hosted fields (Stripe Elements/Payment Element, etc.) so raw card data never touches `server/`. `e2e/tests/payment-page.spec.ts` is written as a tripwire for that day.
- **`PUT /api/users/profile`** lets a user directly set their own `streak`/`xp`/`level` — not a data-breach risk, but a gamification-integrity gap (a user can self-award XP/streak via a raw API call instead of earning it). Worth server-side validation if leaderboard integrity matters to you.

## Ongoing hygiene

- **CodeQL** (existing) + **Semgrep** (new) run on every PR; **Gitleaks** blocks commits containing leaked credentials.
- `npm audit --audit-level=high` runs per-workspace on every PR; currently non-blocking beyond high/critical by design — see the audit job comment for how to tighten it once today's backlog is cleared.
- **Report a vulnerability**: see [`SECURITY.md`](SECURITY.md) (unchanged — already had a real disclosure process).
