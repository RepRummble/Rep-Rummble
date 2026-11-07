# Feature roadmap

## Shipped

### Web app
- Marketing site with dark-glass UI (hero, features bento, testimonials, stats)
- Auth modal — email/password + Google, Apple, Facebook, Twitter OAuth via Supabase
- Pricing page — monthly/annual toggle, feature comparison table, FAQ
- Analytics dashboard — workout and meal stats with live API data
- Reports page
- Wearables page (UI layer — sync logic in progress)
- Referral and payment flows
- Profile and settings page
- Agent / AI support dashboard
- Chat widget with Socket.io

### Backend
- Auth routes (JWT + Supabase)
- Workout endpoints (create, log, stats)
- Meal endpoints (log, stats, USDA food search)
- Leaderboard
- Challenges and participants
- Social posts and feed
- Friend system
- Wearable data ingestion
- AI endpoints (Google Gemini — meal analysis, workout programming)
- Pose detection service
- Support AI agent (multi-turn conversation)
- Lead capture (waitlist)
- Contact form
- Oracle DB integration for analytics

### Mobile
- Authentication (login / register)
- Home, Leaderboard, Profile tabs
- Snap tab (food scanner)
- Streak screen
- Challenges screen
- Social feed and friends
- Food search and results
- Wearables screen
- Chat FAB with Socket.io

---

## In progress

- Wearable OAuth flows (Apple Health, Garmin Connect, Whoop)
- Recovery readiness score algorithm (HRV + sleep + resting HR)
- Body-composition scanning (Elite plan)
- Push notifications for challenge milestones

---

## Done in the trust-and-safety pass (November 2026)

- [x] Mobile Train and Health screens show only the person's real logs and Apple Health readings (no sample data)
- [x] XP, level, streak and daily missions decided by the server; clients cannot set them
- [x] Server-side daily AI allowances (free vs paid) and a per-person burst limit; photo size cap
- [x] In-app plan upgrade removed: plans are read from the server and bought on the website
- [x] Support-agent live chat requires a signed-in agent (the socket was open to anyone)
- [x] Mock plan/exercise generators, Oracle code, Firebase and the template hero pages removed
- [x] `server/.env` no longer tracked (see docs/ROTATE_SECRETS.md: the old values must still be rotated)
- [x] Guided workout player that records real sets; personal records computed from them
- [x] Mission Control home (rank, missions, hydration, briefing, achievements), real Profile actions, password reset email

## Next

### Needed before a public launch
- [ ] Rotate the secrets listed in docs/ROTATE_SECRETS.md, then purge `server/.env` from git history
- [ ] Report and block for the social feed (App Store requirement for user-generated content)
- [ ] Real in-app purchases, or keep buying on the website only (decide, then follow store rules)
- [x] Bundle ID chosen: `com.reprummble.app` (iOS and Android)
- [ ] EAS project, store listings and screenshots
- [ ] Error monitoring (Sentry) and basic product analytics
- [ ] Staging environment; paid Render plan (no cold starts)

### Features users expect
- [ ] Push notifications and reminders (preferences are saved; nothing sends yet)
- [ ] Personal calorie and protein targets worked out from age, weight, height, sex and goal
- [ ] First-run setup for new accounts
- [ ] Weight and measurement tracking with progress charts
- [ ] Food: barcode scan, saved meals, edit or delete a logged meal
- [ ] Android: Health Connect
- [ ] Website parity: log meals and workouts on the website; social on the website
- [ ] Units (metric/imperial), languages (ES, PT, FR), offline logging queue, deep links for invites

### Quality
- [ ] Tests for the mobile app and the website (server has 127 integration checks; the e2e suite is a separate repo)
- [ ] Accessibility pass on the mobile app
