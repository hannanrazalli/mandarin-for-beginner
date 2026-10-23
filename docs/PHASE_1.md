# Phase 1 brief

1. Goal: chosen design system, responsive shell, PWA basics, CI and deploy pipeline.
2. First deliver exactly two visual directions; user choice is REQUIRED before any build.
3. uiux_specialist owns design/DIRECTIONS.md only for this first step; no components/tokens.
4. Compare palette, Latin/hanzi type, mascot and mood in a short Bahasa Melayu table.
5. Both options suit an absolute beginner, Unit 0 audio-first lessons and one-tap resume.
6. Shared requirements: large hanzi, WCAG AA intent, 44px targets, reduced motion, no guilt.
7. Use MID (gpt-6.1-sol, medium), fresh bounded context, no delegation, 600-second budget.
8. Parent checks the proposal, presents both options and pauses for user selection.
9. After selection: chosen specs, verified dependencies, build/checks, then ONE phase-end review pair.
10. Deployment/account prerequisites remain unconfirmed; never request secret keys in chat.

## Progress

- Phase 0 accepted by user's "continue" on 2026-10-24 (Asia/Kuala_Lumpur).
- User selected A — Taman Bunyi. Proceed with chosen design spec, then application build.
- Account/software checklist remains in docs/SETUP.md; completion not yet confirmed.
- Runs: five MID runs total — two uiux_specialist runs (directions, selected spec),
  one code_specialist build, one code_reviewer and one uiux_reviewer phase-end review.
- Parent checked both options include palette/type/mascot/mood and shared beginner/a11y requirements.
- Selected design, shell, local PWA, CI workflow and Vercel configuration implemented.

## Verified locally

- `pnpm typecheck`, global `pnpm lint`, `pnpm test`: PASS (3 settings tests).
- `node --test scripts/scan-secrets.test.mjs`: PASS; staged fake secret is caught even
  after the working copy is cleaned. Whole-index `pnpm secrets:check`: PASS.
- `pnpm audit --audit-level=high`: zero vulnerabilities across all reported severities.
- Production `pnpm build`: PASS; PWA precaches 24 static entries, about 502 KiB.
- `CHROMIUM_PATH=/usr/bin/chromium pnpm test:e2e`: 3 PASS, covering 360/768/1280px,
  persisted English/dark settings, route focus, honest empty screens and axe checks.
- Browser tests enforce the Vercel global security headers through Vite preview settings.
- Additional production browser smoke: cached home and lazy Unit 0 reopen offline;
  `/auth` is not cached; no JavaScript page errors. This does not establish account sync.
- Parent inspected desktop/mobile screenshots. Review screenshots are local ignored artifacts.
- Native custom-agent discovery/account entitlement, hosted CI, Vercel deployment and actual
  deployed headers remain unverified. No Supabase/auth backend or verified lesson audio yet.

## Single review-fix pass

- code_reviewer: remove sandbox-specific absolute pnpm store-dir from repository config;
  fixed. Sandbox installs may pass the store override as a command flag only.
- uiux_reviewer: mobile brand/home link needs a 44px target; fixed and covered by the
  mobile browser flow. No other reviewer findings; no second review or security-agent run.
- UX reviewer inspected changed source and screenshots; its own Chromium launch was blocked
  by sandbox socket restrictions. Parent's browser checks succeeded with execution permissions.
- Rechecked frozen install, typecheck, global lint, agent config, production build and all
  3 browser flows after fixes; final secret/whitespace gates passed. No additional review loop.

## Checkpoint and limits

Phase 1 is a working preview shell, not a complete Mandarin course: no login, real XP,
streaks, learning completion, synced progress, verified pronunciation or speech scoring.
Vercel deployment requires connected hosting access; use docs/DEPLOYMENT.md when ready.
Five subagent runs were justified above; say "low credits mode" to do future role checklists solo.
Stop after this checkpoint and wait for "continue" before Phase 2 (Supabase/auth/RLS).
