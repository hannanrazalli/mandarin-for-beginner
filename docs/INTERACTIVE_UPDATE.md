# Interactive personal learning update

Authorized scope (2026-10-25, Malaysia): combine useful recommendations with the pasted
Claude brief, continue through implementation/review/deployment automatically, preserve
Malay and English, and put each meaning immediately below its pinyin. Keep the existing
Taman Bunyi design and personal single-owner app; no CI/CD or public-product features.

## Architecture inspected first

The canonical curriculum has 3 units, 95 lessons, 370 learning items and 300 vocabulary
words. JSON lesson definitions, the index and a bilingual localization overlay are bundled
public content. Unit 0 still precedes progressively unlocked vocabulary. Existing account
progress, canonical Malay answer values, content versions and SQL seed stay unchanged.
Audio was device `zh-CN` Web Speech with replay/slow/stop. No recorded voice was present.
SM-2 is authoritative in `review_schedule` through checked, idempotent `review_word` RPCs;
local practice has a separate store. Existing authenticated offline intents keep their
original owner/session/version boundaries. This update adds no database migration.

## Selected work

- Meanings sit immediately below pinyin, before audio controls in teaching cards.
- `/interaktif` adds five short Malaysian-context conversations, ten response questions,
  ten sound contrasts, marked/numbered pinyin dictation, recall and optional self-recording.
- Short 3/5/10-minute route suggestions start with existing due reviews and include
  conversation and listening practice. These are suggestions, not an adaptive level test.
- Incorrect answers receive specific explanations and retry. Extra practice is clearly
  separate from canonical XP, streaks, goal time and account sync; no rewards are invented.
- Static audio manifest preference with device fallback; only explicitly listed licensed
  local files are eligible for bounded PWA precaching. No new recordings are claimed.
- Independent repeatable pinyin comparison; review-status overlay preserves canonical
  teaching text and keys. `machine-checked` means software reading agreement only.

All new curriculum and device audio remain unverified. Text drafting by an AI role is not
human verification. The audit reports discrepancies and polyphonic readings for human
review instead of silently replacing content. Translation correctness is not automatically
certified. See CONTENT_AUDIT.md and PRACTICE_CONTENT_REVIEW.md.

## Microphone and offline boundaries

Recording requires an explicit Record gesture and browser permission. It is bounded to
20 seconds / 2 MiB, stays in memory, is never uploaded and has no pronunciation grade.
Navigation, hidden page and account purge stop capture and revoke the playback URL;
late permission results cannot revive capture. Missing or denied microphone has a readable
speaking exercise fallback. Only same-origin microphone permission is enabled; camera,
geolocation and payment stay disabled. CSP adds `blob:` only to media playback.

Static app/content practice remains offline after a successful app update/precache. Device
TTS can require network; no offline voice guarantee is made. Recordings are not persisted.
No authenticated API caching, queue schema changes or synthetic hosted learning is added.

## Deliberately deferred

No paid audio generation, free-form AI tutor, speech/tone score, new account features,
notification scheduling or new server analytics. These add cost or validation requirements
without being necessary for the selected usable practice flows. A blanket ten-minute mode
must not preserve a server streak without accepted study activity. Review backlog caps and
leech handling should be designed with canonical schedule semantics before changing them.

## Verification and release

Initial full gate: typecheck, full lint, 87 unit tests, canonical/localization/practice
validators, reproducible audit, audit regressions and production build passed. All 10
production Chromium flows passed, including axe checks and bilingual practice. Mobile
360px BM/English and 1280px English screenshots had no horizontal overflow.

One changed-file review each: code and security reported no findings. UX found focus lost
on returning to the practice grid and retrying a response. One fix pass restores focus
to the originating tile/mission and first response option; browser assertions cover both.
Security review was included because optional microphone access is new. No second review
loop and no CI/CD. Real phone microphone behavior and voice quality remain manual checks.

Specialist runs: 5 (content teacher, isolated implementation, code/UX/security reviews).
To trim credits next time, author a smaller practice pack solo and keep one bounded build;
low-credits mode removes subagents entirely. Deployment details are in DEPLOYMENT.md.

Final verification after the one UX fix: full 87 units, typecheck, lint, all content
checks and build passed again; the updated interactive browser/axe flow and both focus
assertions passed. Staged secret scan and commit hook passed. Manual production deployment
`dpl_9PR9nVGYHECPPKQrGCbXDyfnrjFD` is READY for code `df14e3d380834e29edd56230fcb625da5dbecc79`.
Authorized Vercel fetches returned HTTP200 for `/interaktif` and `/sw.js`; the service worker
contains the latest Practice chunk and route allowlist, with no Supabase cache URL.
Existing deployment protection is unchanged; these checks do not prove anonymous access.
