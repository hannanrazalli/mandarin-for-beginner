# Phase 0 schema proposal — not a migration

Backend/security specialist validates this in Phase 2 before SQL exists. IDs are UUIDs,
timestamps timestamptz, durations/counts nonnegative, and content carries a version.
Foreign keys, unique constraints and CHECK constraints enforce the rules below.

| Table | Proposed fields / relationships | Access |
| --- | --- | --- |
| profiles | id → auth.users, locale ms/en, timezone default Asia/Kuala_Lumpur, daily_goal, sound_enabled, reduced_motion, created_at | owner SELECT/UPDATE settings; trusted provisioning INSERT; no client DELETE |
| units | id, slug unique, position unique (0 first), title_ms/en, prerequisite_unit_id → units, content_version, published | authenticated published SELECT; trusted migration writes |
| lessons | id, unit_id → units, position, title_ms/en, kind pronunciation/vocabulary/mixed, duration_seconds, content_path, content_version, published; unique(unit_id,position) | authenticated published SELECT; trusted writes |
| words | id, hanzi, pinyin, meaning_ms, example_hanzi/pinyin/ms, tone_note_ms, topic, hsk_level nullable, hsk_edition nullable, source, needs_review | authenticated approved SELECT; trusted writes |
| lesson_words | lesson_id → lessons, word_id → words, position; PK(lesson_id,word_id) | inherits approved parent visibility; trusted writes |
| user_progress | user_id → profiles, lesson_id → lessons, status, best_accuracy, completed_at, content_version; PK(user_id,lesson_id) | owner SELECT; server-validated mutations only |
| review_schedule | user_id → profiles, word_id → words, modality meaning/listening/tone/hanzi, ease_factor, repetitions, interval_days, due_at, last_reviewed_at, version; PK(user_id,word_id,modality) | owner SELECT; validated review RPC writes |
| study_sessions | id, user_id → profiles, client_event_id, started_at, ended_at, duration_seconds, xp_awarded, correct_count, answer_count, lesson_id nullable; unique(user_id,client_event_id) | owner SELECT; validated completion RPC writes |
| achievements | id, code unique, label_ms/en, criterion, target | authenticated SELECT; trusted writes |
| user_achievements | user_id → profiles, achievement_id → achievements, earned_at; PK(user_id,achievement_id) | owner SELECT; trusted award writes |
| daily_activity | user_id → profiles, local_date, timezone, xp, seconds_studied, freeze_used; PK(user_id,local_date) | owner SELECT; server updates |
| streak_state | user_id → profiles PK, current_days, longest_days, last_active_date, freeze_balance | owner SELECT; server updates |

Every table enables RLS. Shared curriculum/achievement definitions are read-only reference
data, not user-owned rows: authenticated approved SELECT only, with all client writes denied.
Every personal row is user-owned. Policies explicitly allow only the listed operations;
all unlisted operations are denied, including anonymous reads. For profile UPDATE use
USING and WITH CHECK auth.uid() = id plus column grants; never let settings grant rewards.
Published lesson visibility also requires its unit to be published; lesson_words visibility
requires approved words and its published lesson/unit. Reject needs_review items at publish.
Anonymous requests receive nothing. If public curriculum access is wanted later, decide explicitly.

## Secure mutations and sync

Completion/review RPCs take bounded answer/event payloads, derive auth.uid() server-side,
validate against lesson content, and atomically update progress, SM-2, XP/streaks/badges.
Do not trust a client-provided user ID, XP total, score, due date or achievement flag.
Any SECURITY DEFINER code must have fixed safe search_path, explicit ownership checks,
restricted EXECUTE grants and tests; use invoker rights when feasible.
Server response is canonical. Idempotent (user_id,client_event_id) prevents duplicate rewards
when an offline queue retries. Reject mismatched content versions or return explicit conflicts.
Offline progress is provisional until accepted. Review ordering/concurrency, clock skew and
freeze rules require a short Phase 2 ADR and Phase 4 algorithm tests.
Store UTC timestamps; calculate streak days in the stored IANA timezone, with timezone-change
rules preventing double awards. SM-2 ease factor minimum 1.3; algorithm details in Phase 4.
Owner data export spans personal tables; account deletion uses a trusted explicit flow.

## Content structure

`docs/content.schema.json` proposes a versioned lesson envelope with discriminated
pronunciation or vocabulary items. It allows pronunciation without pretending syllables
are HSK words. Add validators in the build phase for referenced IDs, tone marks, approved
word lists, source attribution, audio existence/licensing and curriculum sequence.
JSON Schema alone cannot establish linguistic correctness or native audio quality.

Unit 0 sequence: (1) listening and four + neutral tones, (2) initials, (3) finals incl. ü,
(4) initial-final syllables, (5) short tone pairs, (6) simple 不 and 一 tone-change listening.
Keep drills short across multiple lessons. Add basic third-tone context before tone pairs;
teach written dictionary pinyin separately from spoken tone changes to avoid confusion.
不 is normally bù, changes to bú before a fourth tone; 一 is normally yī, often yí before
fourth tone and yì before first/second/third, retaining yī in counting/ordinal contexts.
Teacher must verify examples and audio before publishing. No dialect knowledge assumed.
HSK 1 comes next; ~20 words in Phase 3 follow Unit 0, then ~300 words in Phase 6.

## Proposed folders (future folders are not created yet)

```text
.codex/agents/       eight narrow role definitions
design/             compared directions, chosen system and screen specs
src/app/            routes, providers, app shell
src/features/       auth, learning, reviews, analytics, settings
src/components/     shared accessible UI
src/styles/         approved tokens/themes
src/lib/            audio abstraction, SRS, scoring, streaks, sync
public/             icons, reviewed audio and offline assets
content/            schema, Unit 0, approved curriculum; batches/ for bulk drafts
supabase/           migrations, functions, RLS tests
tests/              a few critical e2e flows
docs/adr/           one-page decisions
scripts/            configuration/content validation
```
