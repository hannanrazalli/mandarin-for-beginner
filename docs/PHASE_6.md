# Phase 6 brief

1. Promote only schema-valid, teacher-reviewed approved vocabulary drafts toward 300 words.
2. Cache static curriculum/strokes/fonts; never cache auth or authenticated API responses.
3. Queue validated owner events separately by owner; retry stable IDs, stop on permanent conflicts.
4. Clear queue/account snapshots on logout/expiry; show provisional progress and real sync state.
5. Handle reconnection, duplicate delivery, stale schedule/content versions and multiple tabs safely.
6. Split heavy code/content and measure production Lighthouse mobile (target >=90), axe and offline flows.
7. One final code/UX/security review group and one fix pass; unresolved blockers prevent deployment.
8. Publish reviewed Git checkpoint to connected Vercel with public Supabase config only; verify URL/headers.
9. Update beginner README/guide/ADRs, honest limitations and prioritized improvements (effort/benefit).

## Content and database evidence

- LOW writer drafted 280 approved words; teacher reviewed every entry and corrected 56.
  All 280 text entries approved, audio still pending listening review. Active validator:
  3 units / 95 lessons / 370 items / exactly 300 vocabulary IDs with approved metadata.
- Committed assets cover all Chinese curriculum characters (84KB font) and all 353 unique
  headword characters' licensed local stroke data. Normal builds require no asset downloads.
- Expanded generated seed passes all 206 PostgreSQL 17.11 assertions, including repeat-seed
  preservation of real fixture completions/history and concurrent review version contention.
- Offline architecture was specified by backend_security_engineer (ADR 006 plus contract),
  implemented by code_specialist, and is being completed against the acceptance checks.

## Final gate before the single fix pass

- Typecheck and lint pass; all 58 unit tests and eight browser/axe flows pass. The owner
  browser fixture proves response-loss replay keeps the same payload/ID and one award.
- Mobile Lighthouse 13.5.0, simulated mobile against production preview: performance 90,
  accessibility 100, best practices 100, SEO 91; FCP 2.7s, LCP 2.9s, TBT 110ms, CLS 0.
  Scores vary by device/network. All runtime Zod schemas use the jitless wrapper; the actual
  browser CSP regression passes without allowing eval. App dependency audit reports no issues.
- All 300 words / 95 lessons are now in the intended hosted database, with zero fabricated
  learner sessions. Twenty words retain legacy HSK1 metadata; the other 280 remain unclassified.
- Three reviewers ran once. Their concrete findings cover epoch invalidation, real database
  timestamp offsets, oldest-first sends, force retry, schedule pagination and rejected-form
  recovery/copy. One consolidated fix pass is in progress; no second review is planned.
- Vercel project prj_qdmR95ivhfAmuHS4HL0VBPLXSLSE in Hannan team is prepared with Node24
  and public Supabase config only. An attempted preview-only protection change was rejected
  by automatic approval review; default protection remains unchanged. No app deployment yet.

## Single review-fix pass

All seven consolidated findings addressed, with regression checks for stale-epoch reload
and delayed verification, actual PostgreSQL timestamp offsets, ordered dependent events,
manual retry preserving IDs, all 1,200 schedule rows, rejected-form restart/focus and owner
navigation copy. No second reviewer run. The snapshot bound counts serialized UTF-8 JSON;
the separate 2MiB intent budget conservatively counts UTF-16 storage bytes.

## Release candidate verification

After the one fix pass: full typecheck/lint/build pass, all 68 unit tests in 13 files pass,
all eight Playwright/axe flows pass and the staged-blob scanner regression passes. Database
source is unchanged from its passing 206-assertion expanded-seed run. Dependency audit has
no known issues. Latest release mobile Lighthouse scores: 91 performance, 100 accessibility,
100 best practices and 91 SEO. No unresolved reviewer finding remains; no rereview was run.

Approximately nine specialist runs: LOW content draft, teacher text review, HIGH offline
architecture, frontend build plus its acceptance completion, three final reviewers and one
consolidated fix pass. Parent handled assets, analytics, documentation, provider setup and
verification. For later small maintenance, low credits mode avoids all subagent runs.
