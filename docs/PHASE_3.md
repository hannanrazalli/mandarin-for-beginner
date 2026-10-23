# Phase 3 brief

1. Build real Unit 0 before the first HSK vocabulary unit of about 20 words.
2. Teacher owns content/ curriculum/approved list; parent coordinates source validation.
3. Content JSON follows docs/content.schema.json; explicit edition, source and review flags.
4. Frontend owns flashcards, choice/listening, audio replay/slow/stop and meaningful feedback.
5. Backend owns canonical lesson/word seed, answer validation, atomic idempotent completion RPC.
6. Preserve single-owner boundary; server derives XP/progress from answers, not client score.
7. Unconfigured or signed-out practice must be clearly local practice, not synced account progress.
8. Session-only curriculum is not full offline sync yet; queued/conflict sync belongs to Phase 6.
9. Run content validation, logic/RLS/browser checks, then one code/UX review pair and one fix pass.
10. Commit checkpoint and proceed automatically to Phase 4; no "continue" question.

## Verification (2026-10-24, Malaysia)

- Typecheck and full Biome check pass; 21 unit tests and four Playwright/axe flows pass.
- Validator passes: two ordered units, 25 lessons, 90 active items, 300 approved expansion words.
- PostgreSQL 17.11: 159 assertions pass, including forged payloads, prerequisites, repeat-event
  identity, stable replay responses and repeatable real-content seeding preserving history.
- Production PWA includes the curriculum font; production dependency audit has no known issues.
- Real owner password login remains a user browser check; no password was requested or stored.
- The 823KB main bundle is a Phase 6 performance task. Device TTS is not recorded/native-checked audio.
- Trusted completion migration and generated curriculum seed applied to the intended hosted project.
  No test fixtures or fabricated owner learning sessions were inserted there.

## One review/fix pass

Code and UX reviewers ran once, scoped to Phase 3 changes. Fixed scope transitions during
auth revalidation, cross-scope autosaving, text fallback after audio failure, focus after
revealing a card, and uncertain cloud-save wording. Seven regression tests were added;
28 unit tests now pass. No unresolved review findings. Approximately six specialist runs;
under tight credits the orchestrator can handle the single consolidated UI fix pass.
