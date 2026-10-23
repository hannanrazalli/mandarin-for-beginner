# BelajarMandarin

Personal Mandarin PWA for one Malay-speaking learner in Malaysia, starting from zero.
UI: Bahasa Melayu with English toggle. Teach Simplified Chinese directly from Malay.
The user's overrides take precedence over the original brief. Current phase: 1 (visual choice pending).

## Working agreement
- Complete only the approved phase; summarize in at most 10 lines and STOP for "continue".
- Do small tasks solo. Read relevant files only. Orchestrator checks official docs directly.
- No app scaffold in Phase 0. Phase 1 starts with TWO visual directions from uiux_specialist;
  user must choose before components, tokens, or application implementation.
- "low credits mode" means NO subagents; use the role checklists below solo.
- Never use ultra effort or automatic delegation. No nested spawning, including by reviewers.
- Cap concurrent children at 4; give each a 600-second budget and a bounded output.
- Parent manages timeouts; these are workflow rules, not claimed runtime sandbox controls.

## Stack and layout (planned; versions verified when installed)
React, strict TypeScript, Vite, Tailwind, Motion, TanStack Query, Zustand, Zod,
router, vite-plugin-pwa, hanzi-writer, Supabase, Vitest/Testing Library, Playwright.
Prefer minimal dependencies; charts only when analytics needs them. pnpm + Vercel.
src/app: routing/providers; src/features: learning/reviews/auth/analytics/settings;
src/components and src/styles: shared UI; src/lib: pure algorithms, audio, sync.
public: static assets; content: reviewed curriculum and batches; design: specs;
supabase: migrations/functions/tests; tests: critical e2e; docs/adr: short decisions.
See docs/SCHEMA_PROPOSAL.md and docs/ASSUMPTIONS.md.

## Commands
Phase 0: `python3 scripts/configure_agents.py` validates all eight TOMLs.
Change model tiers in docs/MODEL_TIERS.md, then `python3 scripts/configure_agents.py --sync`.
After Phase 1 defines scripts: pnpm dev, pnpm typecheck, pnpm lint, pnpm test,
pnpm test:e2e, pnpm build. They do NOT exist yet; never report them as passed.

## Coding and learning quality
- Feature-based folders, small pure functions, semantic HTML, no any or unsafe HTML injection.
- Pin verified stable dependency versions and commit the lockfile. Conventional commits.
- Unit 0 precedes HSK 1: initials/finals, four + neutral tones, tone pairs, 不/一 sandhi.
- First lessons: 1–3 minutes, listen/replay first, slow audio and clear Malay explanations.
- Later sessions: 3/5/10 minutes. Uncertain language gets needs_review: true.
- No hearts, ads, guilt or fake progress. One-tap resume, explanation and retry per answer.
- WCAG AA, >=44px targets, large hanzi, keyboard support, reduced motion, muted sounds option.
- Missing zh-CN TTS/offline audio needs honest fallback; never grade speech with TTS.

## Security
- Never ask for or print secret keys. Browser receives public URL/publishable key only.
- Local public settings: .env.local; any future privileged tooling: .env.server.local,
  excluded from Git and NEVER imported by Vite. Deployment secrets go in provider settings.
- RLS on every table; explicit operations and ownership checks. Clients cannot grant XP/badges.
- Test anonymous, owner, second user, forged ownership and insert/update/delete denial.
- Confirm email, strong password policy, rate limits; close signup after owner is provisioned.
- Zod at boundaries, parameterized SQL, strict CSP/security headers, HTTPS, no trackers.
- No unsafe caching of authenticated API/session responses or secrets in logs.
- Phase 1: secret-scanning pre-commit + CI, dependency audit/updates. No hooks installed yet.
- Session lifetime, logout-all and offline user-data purge need a documented implementation.

## Delegation roster and solo checklists
Permissions below are INSTRUCTION scopes. Agents inherit parent permissions; TOML does not
create isolated read-only or directory-only sandboxes. Audit writes; never promise isolation.

| Agent | Tier | Scope | Explicitly spawn when / solo checklist |
| --- | --- | --- | --- |
| uiux_specialist | MID | write design/ only | design specs: two palettes/types/mascots/moods, then chosen system and states |
| code_specialist | MID | src/, public/, tests/, named root config | large isolated implementation; unit tests and critical e2e |
| code_reviewer | MID | read-only by instruction | phase-end correctness, types, errors, tests, bundle review |
| uiux_reviewer | MID | read-only by instruction | phase-end spec, 360/768/1280px, a11y and Malay microcopy review |
| backend_security_engineer | HIGH | supabase/, docs/adr/, named security config | major schema/auth/RLS decision; policies, tests, short ADR |
| security_reviewer | HIGH | read-only by instruction | phases 2/4/6 only; auth/RLS/input/headers/offline OWASP audit |
| mandarin_teacher | MID | content/ except bulk output | curriculum specs; approved word list, tone/audio notes, uncertainty |
| content_bulk_writer | LOW | content/batches/ | approved content batches only; exact schema/list, no invented words |

## Phase workflow
1. Parent writes a 5–10 line brief: goal, phase, changed/allowed files, inputs, acceptance,
   checks, model tier, no delegation, 600-second budget and concise output.
2. Explicitly spawn the named specialist above ONLY for design specs, large isolated builds,
   content batches or phase-end reviews. Never give two writers overlapping files.
3. Verify typecheck/lint/relevant tests, then phase-end applicable full checks once.
   Phase 0 substitutes TOML/schema/document verification; do not scaffold to run app checks.
4. ONCE per phase explicitly spawn code_reviewer and uiux_reviewer together after checks.
   Add security_reviewer only in phases 2, 4 and 6. Supply changed-file diff and relevant
   acceptance criteria only; never whole-repository context. Phase 0 reviews setup/spec only.
5. Findings: BLOCKER / SHOULD-FIX / NIT with file:line, impact and concrete fix, no padding.
   Run at most ONE fix pass; validate fixes locally, no second reviewer run.
6. Record remaining findings in NEXT_STEPS.md. Unresolved blockers prevent deployment;
   user decides next action. Do not silently accept a blocker or add review loops.
7. Commit conventional checkpoint; report verified results, limits and approximate runs,
   justify each spawn in one line, suggest credit trimming; STOP for "continue".

## Definition of done
Applicable typecheck/lint/unit/e2e/build pass; no unresolved blockers or high/critical audit
issues, RLS verified, beginner setup/env/deploy/account-lockdown README, versioned migrations,
updated assumptions/ADRs, honest offline behavior. Final performance/a11y/security gates in
Phase 6; prioritize recommended improvements with S/M/L effort and benefit then.
