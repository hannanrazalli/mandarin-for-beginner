# ADR 004 — Canonical reviews, activity days and test-out

Accepted 2026-10-24. Each mutation derives the confirmed allowlisted owner from auth,
locks the owner's profile, uses the shared publication lock, and commits its session,
state changes and private idempotency receipt atomically. Replay returns the original
snapshot; reusing an event ID for a different payload or RPC fails. Client direct writes
remain denied. Private helpers are not callable by browser roles.

**Reviews.** `review_word(p_event_id uuid,p_word_id uuid,p_modality text,p_answer text,
p_expected_version integer,p_hints_used integer,p_duration_seconds integer)` accepts
meaning/listening/tone/hanzi, one bounded answer, hints 0–2 and duration 0–600. Existing
schedule version must match and be due. Meaning compares Malay meaning, hanzi compares
characters, and listening/tone compare pinyin; normalization is lower(trim), preserving
accents and internal spacing. Correct grade is 5 minus reported hints; incorrect grade
is zero. Hints can only reduce ease and are not a trusted observation of client behavior.
No self-assessed correctness is accepted. Correct review earns 10 XP, wrong earns zero.
New EF = clamp(old EF + .1 − (5−grade)×(.08 + (5−grade)×.02), 1.3, 5).
For success, intervals are 1 day, 6 days, then round(old interval × old EF), capped at
36,500 days; repetitions increment. Failure resets repetitions to zero and interval to
one day. Due time is server receipt plus the interval; version increments once. Response
includes event_id, word_id, modality, correct, grade, xp_awarded, total_xp and a schedule
object (ease_factor, repetitions, interval_days, due_at, version). Completed lessons
initialize four review modalities per approved linked word; existing schedules survive.
Early weak-item practice is local practice and does not change the canonical schedule.

**Days and rewards.** Owner timezone remains trusted-only (default Asia/Kuala_Lumpur).
Any accepted new study event counts as activity, including a wrong attempt; duration is
bounded reported time, not verified elapsed time. Same-day events count once. A new
learner has one freeze. A gap of exactly one missing day consumes a token on return and
records that missing date's freeze_used, extending the streak across it. Longer gaps or
no token reset the current streak to one; longest is retained. Every seven actual active
days replenish one token, capped at two; frozen dates are not actual active days.
`streak_state.active_days` tracks actual activity since this feature became available.
Badges derive from actual completed lessons, active days, reviewed words or XP; three
initial definitions cover first lesson, seven active days and first reviewed word.
Historical receipt replay never grants new activity or tokens. Existing phase-3 history
is not backfilled into synthetic dates or review attempts.

**Test-out.** `test_out_unit(p_event_id uuid,p_unit_slug text,p_content_version integer,
p_answers jsonb,p_duration_seconds integer)` requires the exact full published unit item
set: each answer has only lesson_slug, item_id and answer. Validate current private keys,
approval, versions, duplicate/missing items and limits (200 answers, 128 KiB, 600 seconds).
Unit 0 cannot be tested out and must already be completed, as must the target's prerequisite
unit. At least 90% canonical accuracy marks all target lessons completed atomically and
initializes reviews. Lower accuracy never unlocks lessons. Correct answers still earn
practice XP. Per-lesson best_accuracy on successful test-out stores the aggregate exam
accuracy; it is not a claim of per-lesson answer accuracy. Response: event_id, unit_slug,
accuracy, passed, xp_awarded, total_xp, completed_lesson_slugs. These are receipt snapshots.
Public sessions remain aggregate; per-word/topic/tone analytics need a separate validated
read model and must not be inferred from session averages.

**Hosted advisor results.** The three private tables intentionally have RLS with no client
policy/grant (deny all). The three public mutation RPCs intentionally use SECURITY DEFINER:
fixed empty search_path, confirmed-owner checks, bounded canonical inputs and explicit
authenticated-only EXECUTE allow atomic rewards without client table writes. Hosted advisor
warns about this intentional capability; 199 SQL assertions and the scoped security review
verify the access boundary. See [definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
and [deny-all RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
The hosted Auth advisor also reports leaked-password protection disabled; this external Auth
setting remains a next step, with [provider guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
