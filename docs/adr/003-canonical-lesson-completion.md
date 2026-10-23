# ADR 003 — Canonical completion and retry receipts

Accepted 2026-10-24. Supersedes ADR 002's reserved completion contract; review/streak RPCs
remain future work. The public `complete_lesson` RPC accepts `p_event_id` (UUID),
`p_lesson_slug` (authored ID), `p_content_version` (independent of schema format version),
`p_answers` (exact objects `{item_id,answer}`), and `p_duration_seconds` (integer 0–600).
It derives identity from `auth.uid()` and requires the confirmed single-owner allowlist
and existing profile. No identity, XP, score, accuracy or timestamps are client inputs.

**Canonical grading.** The private RLS-protected answer key is versioned per lesson.
All items must be semantically approved, the lesson and unit published, and linked words
approved. Exact item coverage is required; duplicates, extras, missing items, unknown
fields, nonstrings, >200 answers, >2,000 characters per answer, and >128 KiB payloads fail.
Pronunciation answers use authored pinyin; vocabulary answers use authored Malay meanings.
Comparison is `lower(btrim(answer))`: accents, internal spaces and punctuation remain
significant; no speech scoring or fuzzy synonym matching is claimed. Each correct first
submitted answer earns 10 XP. An attempt with accuracy >=0.8 completes the lesson. Best
accuracy and completed status never regress. Earlier published lessons in the unit and
all published lessons in its prerequisite unit must already be completed. Repeated new
events can earn practice XP; retrying the same event cannot. This personal learning system
does not claim to detect a client that looks up known answers.

**Transactions and retries.** Lock the profile row to serialize learner reward writes,
and share the curriculum advisory lock used by trusted publishing. Insert the session,
progress, receipt-date daily totals and private event receipt in one transaction. Store
both payload and canonical response by `(user_id,event_id)`. Identical JSON payload retries
return that original response even after later progress/content changes; reordered answer
arrays or changed duration count as conflicting reuse. Thus response `total_xp` and
`completed_lesson_slugs` on a retry are the original snapshot, not a fresh aggregate query.
Response also includes `event_id, lesson_slug, correct_count, answer_count, accuracy,
xp_awarded, completed`; `completed` is persisted status and `accuracy` describes this attempt.
Refresh normal owner SELECT queries for current aggregates after replaying older events.

**Time and publishing.** Duration is bounded client-reported practice time, not a verified
clock; start time is receipt time minus that reported duration. Daily attribution uses
server receipt time in the trusted stored timezone, with daily seconds capped at 86,400.
This phase does not mutate streaks, freezes, achievements or review schedules. The generator
reads authored slugs and content versions, publishes semantically approved lessons, and
keeps synthetic/unverified audio disclosure in the content. Repeat seeding upserts reference
content without deleting personal history. Same-version key/item changes fail; increment
`content_version` before changing canonical answers. Older version keys and receipts remain.
Only the trusted operator can execute the seed helper. Neither hosted credentials nor live
owner identifiers appear in migrations or seeds. SQL tests use synthetic auth, not GoTrue.
