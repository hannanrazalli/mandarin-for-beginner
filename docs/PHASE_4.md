# Phase 4 brief

1. Add canonical SM-2 reviews, due queue and weak-item practice without trusting client rewards.
2. Backend owns SQL/ADRs/tests: idempotent answer grading, schedule version conflicts, streak/freezes/badges.
3. Define Asia/Kuala_Lumpur days, EF >=1.3, integer intervals, lapse reset and generous transparent freezes.
4. Frontend owns reviews, daily 3/5/10-minute goal, real level/badge/streak display and optional effects.
5. Add tone/pinyin typing, matching, ordering and self-hosted hanzi strokes; no speech-scoring claims.
6. Add a real answer-validated test-out path; do not unlock cloud progress using client assertions.
7. Keep local practice separate, owner state purge synchronous and offline rewards provisional.
8. Verify algorithms, malicious/repeated/concurrent requests, responsive keyboard flows and axe.
9. One code/UX/security review group, at most one fix pass, record unresolved work and continue.

## Verification and review

- Root typecheck/lint/build and five Playwright/axe flows pass. There are 32 applicable unit
  tests (35 including three unimported Phase 5 helper tests prepared independently).
- PostgreSQL 17.11: 199 assertions pass, including same-version concurrent review contention.
- Reviewers ran once: no security findings; code/UX found matching reset, sentence splitting,
  selected-state styling, answer-case parity, clear test-out labels and focus transitions.
  All findings fixed in one consolidated frontend pass, including local test-out grading
  parity. No second review was run; regression coverage includes matching, ordering and focus.
- Reviewed SQL applied to intended hosted project: three mutation RPCs, three badge definitions,
  initial freeze balance one. No artificial owner study sessions inserted.
- Reported durations are bounded client input. Review/test-out currently record zero duration;
  analytics must disclose this until elapsed timing is added. Device audio remains unverified.
- Roughly nine agent turns including interrupted-review continuations; six main build/review/fix
  tasks. To save credits, the orchestrator can handle the consolidated small UI fixes.
- After fixes: full lint/build, 41 unit tests (38 applicable + three future helpers), and all
  five browser flows pass. SQL was unchanged after its passing 199-assertion run.
