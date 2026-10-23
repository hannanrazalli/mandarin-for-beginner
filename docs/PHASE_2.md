# Phase 2 brief

1. User authorizes automatic phase 2–6 continuation; existing quality gates remain.
2. Backend specialist owns supabase/ and a short architecture/session ADR.
3. Implement schema/RLS and database owner provisioning; deny unauthorized client mutations.
4. Run real PostgreSQL tests with synthetic auth fixtures; no live credentials required.
5. Frontend auth uses configured Supabase only, validated input, no public signup.
6. No configuration: retain clearly identified preview; do not claim working hosted login.
7. Parent owns verified dependencies, CI, CSP, beginner cloud provisioning instructions.
8. Verify applicable checks, then code/UX/security reviewers once; at most one fix pass.
9. Account connections and deployment remain unconfirmed; user asked status asynchronously.
10. Commit checkpoint and continue independent later work without asking for "continue".

## Checkpoint

- Backend/RLS: 107 assertions passed on real PostgreSQL 17.11 with synthetic auth fixtures.
- Frontend: typecheck, global lint, 17 unit tests, production build and 3 responsive/axe
  browser tests passed after the single review-fix pass. Dependency audit: zero vulnerabilities.
- Code review escalated SDK cross-tab broadcast behavior; installed SDK confirmed it.
  Fixed using unique SDK channel keys with stable per-tab storage adapters and write fences.
- Security findings fixed: privileged environment keys fail before bundling; logout/expiry
  clears persisted credentials immediately, rejects stale writes and bounds remote revocation.
- UX findings fixed: focus on changed account headings and actionable bilingual remote-logout errors.
- Build guard negative fixture proved a secret-shaped value is rejected without echoing it.
- Supabase integration connected: inspected empty intended project `belajarmandarin`, applied
  initial schema and FK-index migrations; confirmed 13 tables with RLS and zero without RLS.
- Confirmed sole auth user provisioned as owner; no password was retrieved or put in chat.
- Hosted advisor INFO for private deny-all owner registry is intentional; see ADR 002 links.
- Actual password sign-in, hosted signup/password/rate-limit configuration and Vercel deployment
  remain to be verified. User was asked to disable public signup and connect Vercel.
- Six MID/HIGH runs: backend, auth build, code/UX/security reviewers, one auth review-fix run.
  Credit trim: "low credits mode" would run all role checklists solo.
- No second review loop. Continue automatically into Phase 3 under the user's newer instruction.
