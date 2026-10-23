# Database setup

No hosted project is configured by these files. Apply `migrations/*.sql` in filename order
with the trusted Supabase migration role. Never run `tests/fixture.sql` on a real project:
it creates synthetic auth roles/users solely for the disposable PostgreSQL harness.
Only `public` should be exposed in the Supabase Data API; keep `private` unexposed.
Use the publishable key and project URL in the browser, never a service-role/secret key.

## Manually provision the sole owner

1. In the intended project's Auth dashboard/admin tooling, create the intended user with a
   strong unique password and confirm their email through an operator-verified workflow.
   The browser has login only; it must never expose `signUp` or an administrative credential.
2. Copy that confirmed user's UUID from Auth. In the trusted SQL editor, replace the one
   placeholder below. Do not commit a real email, password or UUID. This transaction refuses
   an unconfirmed/missing user and an existing different owner; it does not replace an owner.
3. Disable hosted new-user signup and anonymous sign-in; check email confirmation, password
   policy, rate limiting, allowed HTTPS redirects, JWT expiry and session restrictions.
   These are hosted configuration actions, not SQL guarantees. See ADR 002.
4. Log in with that user and verify the profile read. An accidental second auth account must
   see no application data. No publicly callable function can provision an account.

```sql
begin;
do $provision$
declare
  owner_user_id uuid := 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID';
begin
  if not exists (select 1 from auth.users where id = owner_user_id
                 and email_confirmed_at is not null) then
    raise exception 'Create and confirm the intended auth user first';
  end if;
  if exists (select 1 from private.app_owner where user_id <> owner_user_id) then
    raise exception 'A different owner is already configured';
  end if;
  insert into private.app_owner(user_id) values (owner_user_id)
    on conflict (user_id) do nothing;
  insert into public.profiles(id) values (owner_user_id) on conflict (id) do nothing;
  insert into public.streak_state(user_id) values (owner_user_id)
    on conflict (user_id) do nothing;
end
$provision$;
commit;
```

Removing the private allowlist row immediately denies subsequent app queries, including
queries with an otherwise-valid access token. Account deletion/export is an explicit
trusted operation, not a browser table write. The profile's timezone defaults to Malaysia;
client timezone edits are deliberately denied to prevent duplicate streak-day attribution.
The daily goal is measured in minutes (3/5/10).

## Test grants and RLS locally

Run `bash supabase/tests/run.sh` with Docker access. It uses official `postgres:17-bookworm`,
a uniquely named disposable container, `--network none`, no exposed ports and synthetic
trust authentication. It explicitly targets the managed local Docker socket, bounds
readiness to 60 attempts, and always removes the container and data volumes on exit.
The first run may pull the official image using the configured Docker registry/proxy.
The script prints the assertion count and exact PostgreSQL version actually tested.

The fixture models anon/authenticated roles and `auth.uid()` with synthetic subjects,
including malicious metadata. It tests direct grants, real RLS visibility, settings
updates, forged ownership, owner revocation, denied reward writes, publication chains,
content approval, singleton provisioning, unconfirmed provisioning and event uniqueness.
It does **not** test the Supabase gateway, GoTrue, signature validation, hosted session
settings or future completion RPC semantics. Client-side claim settings in the fixture
are test-only; no application endpoint can set arbitrary SQL session claims.

Verified 2026-10-24: **107 assertions passed** on PostgreSQL **17.11** (Debian
17.11-1.pgdg12+2), using the official image digest pinned in `tests/run.sh`.
Two implementation runs were performed; the final run includes isolated RLS tests with
write grants temporarily enabled inside a transaction that is then rolled back.
This version also validates confirmed status when checking the active owner allowlist.

## Curriculum and canonical completion (phase 3)

Run `python3 supabase/scripts/generate_seed.py` after curriculum validation. Apply migration
`202610240003_lesson_completion.sql` before the generated `supabase/seed.sql` through trusted
operator tooling. The seed contains public teaching content and private grading keys, never
an owner identifier or credential. It uses authored slugs rather than generated UUIDs.
It creates 2 units, 25 lessons and 20 vocabulary words. Semantic `needs_review` blocks lesson
publication; synthetic TTS `needs_audio_review` is independent and remains disclosed by UI.
Reapplying the same seed preserves personal progress, sessions and receipts. A changed
answer/item set at the same `content_version` fails: increment that field and regenerate.
The format `schema_version` is separate. Reordering/removing established content requires
an explicit migration review; the generator deliberately performs no destructive deletes.

Call the authenticated `complete_lesson` RPC with the five named parameters documented in
ADR 003. Read `user_progress`, `study_sessions` and `daily_activity` for current state.
Historical retry responses retain their original aggregate snapshot. Streaks/reviews/badges
are not yet awarded by this RPC. Practice duration is bounded client-reported time.
The expanded test harness also checks actual seed completion and reseeding preservation
in a second fresh database inside the same disposable, network-isolated container.

Phase 3 verification, 2026-10-24: **159 PostgreSQL assertions passed** (the original 107,
41 RPC/seed-helper assertions, and 11 actual curriculum/reseed assertions), PostgreSQL
17.11. Two implementation runs: initial 144 and final 159. No hosted behavior is inferred.
