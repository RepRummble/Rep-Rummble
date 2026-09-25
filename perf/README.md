# Reprummble performance tests (Gatling)

Self-contained Maven project — you do **not** need `mvn` installed; use the
bundled wrapper (`./mvnw`). Only a JDK (17+) is required.

## Simulations

| Class | Purpose |
|---|---|
| `HealthCheckSimulation` | Baseline latency/throughput on unauthenticated `/api/health` — the floor everything else is measured against |
| `AuthenticatedApiSimulation` | Logs in once per virtual user (like a real client), then repeatedly hits `/api/auth/me`, `/api/leaderboard`, `/api/exercises`, `/api/meals`, `/api/workouts` |
| `LoginRateLimitSimulation` | Fires 50 concurrent bad-credential logins at once and asserts the rate limiter (added in `server/src/middleware/rateLimit.middleware.ts`) actually blocks the majority of them — the perf/security crossover test |

## Running

```bash
cd perf

# 1. Baseline
BASE_URL=http://localhost:5001 ./mvnw gatling:test \
  -Dgatling.simulationClass=reprummble.perf.HealthCheckSimulation

# 2. Realistic authenticated read load — needs real pre-existing accounts
BASE_URL=http://localhost:5001 \
PERF_TEST_ACCOUNTS="loadtest1@example.com:Passw0rd!,loadtest2@example.com:Passw0rd!" \
  ./mvnw gatling:test -Dgatling.simulationClass=reprummble.perf.AuthenticatedApiSimulation

# 3. Confirm the login rate limiter holds under concurrency
BASE_URL=http://localhost:5001 ./mvnw gatling:test \
  -Dgatling.simulationClass=reprummble.perf.LoginRateLimitSimulation
```

Tune load with env vars (all optional, see `Config.java`):
`PERF_USERS`, `PERF_RAMP_SECONDS`, `PERF_DURATION_SECONDS`.

HTML reports land in `perf/target/gatling/<simulation>-<timestamp>/index.html`
— open directly in a browser for percentile breakdowns and per-request charts.

## Never run these against production

`LoginRateLimitSimulation` intentionally looks identical to a credential
stuffing attack, and `AuthenticatedApiSimulation` generates sustained
authenticated traffic. Point `BASE_URL` at local dev or a staging
environment you're explicitly allowed to load-test. If you ever do need a
real production capacity test, schedule it, use a dedicated low-privilege
test account, and warn whoever's watching alerts.

## A real finding from building this

`LoginRateLimitSimulation` initially reported ~20% of a 50-request concurrent
burst returning `400` instead of the expected `401`/`429`. Cross-checking
with plain concurrent `curl` (no Gatling) showed a clean 401/429 split with
zero 400s — so that was Gatling's local AsyncHttpClient connection-pool
warm-up on this machine, not a server bug. Worth knowing if you see the same
thing: re-verify anomalies from a load tool with a simpler client before
concluding the server is at fault.

## CI

Wired into `.github/workflows/ci-cd.yml` (the `perf` job) as a required gate
on every push/PR — `HealthCheckSimulation` runs a fast smoke-sized load by
default so the pipeline stays quick, plus `LoginRateLimitSimulation` to
confirm the rate limiter holds. Trigger the workflow manually from the
Actions tab with `heavy_perf: true` for a heavier, more realistic load run
instead of the CI-sized one. Perf passing here is one of the gates the
manually-approved production deploy needs — see
[`DEPLOYMENT.md`](../DEPLOYMENT.md).
