# Deployment: CI/CD pipeline + manual production gate

Single pipeline: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).
On every push/PR it runs lint, typecheck, both builds, dependency audit,
Semgrep, Gitleaks, Playwright E2E, and a Gatling perf gate. On push to
`master`, once **all** of those pass, `deploy-production` becomes available
— but it only actually ships when a human clicks approve. Nothing here
auto-deploys.

## Why this needs one-time manual setup (three things I can't do for you)

I don't have access to your GitHub repo settings, Vercel account, or Render
account from this session — no `gh auth`, no dashboard access. These three
steps have to happen once, by you, before the pipeline can deploy anything:

### 1. Turn off Vercel's and Render's own auto-deploy

You confirmed at least one of these auto-deploys on push today via its
native Git integration — that will keep shipping to prod on every push
**regardless of the GitHub Actions gate**, so this has to be disabled first
or the "manual click" promise is false.

**Vercel** — Project Settings → Git. Vercel doesn't have a single
"production auto-deploy off, previews still on" checkbox, so use one of:
- **Recommended:** change **Production Branch** to something that never
  receives pushes (e.g. `production-unused`). Pushes to `master` then only
  create Preview deployments; `deploy-production` promotes to Production
  explicitly via `vercel deploy --prod`.
- Simpler but loses PR preview links: Project Settings → Git → **Disconnect**
  the Git integration entirely; all deploys then only happen through Actions.

**Render** — Service → Settings → Build & Deploy → set **Auto-Deploy** to
**No**. Then copy the **Deploy Hook** URL from that same page — that's what
the pipeline calls to trigger a deploy on demand instead.

### 2. Add these GitHub repo secrets (Settings → Secrets and variables → Actions)

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Run `vercel link` inside `web/` locally once; it writes `web/.vercel/project.json` with both IDs (then delete that file — don't commit it) |
| `VERCEL_PROJECT_ID` | Same as above |
| `RENDER_DEPLOY_HOOK_URL` | Render service → Settings → Deploy Hook (from step 1) |
| `RENDER_SERVICE_URL` | *(optional)* your Render service's public URL — enables an automatic post-deploy health check |
| `E2E_REPO_SSH_KEY` / `PERF_REPO_SSH_KEY` | **Required (already set).** Private halves of read-only deploy keys on `reprummble-e2e` / `reprummble-perf`. CI uses them to check out the private test suites; without them the `e2e` and `perf` jobs fail and production deploys are blocked. To rotate: generate a new ed25519 key, add the public key as a read-only deploy key on the test repo, and replace the secret |

Already-referenced but optional (unskips more Playwright tests in CI — see
the [reprummble-e2e README](https://github.com/RepRummble/reprummble-e2e)): `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_KEY`, `TEST_USER_A_EMAIL`/`PASSWORD`,
`TEST_USER_B_EMAIL`/`PASSWORD`.

### 3. Create the `production` Environment with Required Reviewers

Settings → Environments → New environment → name it exactly `production` →
**Required reviewers** → add yourself (and anyone else who should be able to
approve a deploy) → Save. Optionally also restrict it to the `master` branch
under **Deployment branches**.

This is the actual mechanism behind "click to deploy": once this exists,
every run of `deploy-production` pauses in a **Waiting** state and shows a
**Review deployments** button on the Actions run page. Nothing deploys until
an approved reviewer clicks it — even though the job was already scheduled
and every other check already passed.

## The resulting flow

1. Push to `master` (or merge a PR into it).
2. `lint-web`, `typecheck-server`, `build-web`, `build-server`,
   `dependency-audit` (×3), `secrets-scan`, `semgrep`, `e2e`, `perf` all run,
   in parallel where they can.
3. If every one of those succeeds, `deploy-production` starts and immediately
   pauses — **Waiting for review** — because of the environment protection
   rule from step 3 above.
4. Go to the Actions run → **Review deployments** → check `production` →
   **Approve and deploy**.
5. Only now: `vercel build && vercel deploy --prebuilt --prod`, then the
   Render deploy hook is called, then (if `RENDER_SERVICE_URL` is set) the
   pipeline polls `/api/health` until the server responds.

If any earlier job fails, `deploy-production` never becomes available at
all — there's nothing to approve.

## Running things manually outside the pipeline

- `npm run setup:tests` (root, once) — clones the test repos into `e2e/` and `perf/` (git-ignored)
- `npm run test:e2e` (root) — Playwright against local dev
- `npm run test:perf` (root) — Gatling baseline against local dev
- Full manual pipeline dry-run without deploying: `Actions tab → CI/CD →
  Run workflow` (workflow_dispatch) — runs everything except
  `deploy-production`, since that's gated to `push` on `master` only.
