-- Apply with the trusted migration role, never a browser credential.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;
grant usage on schema public, private to authenticated;

-- The singleton key permits exactly one provisioned learner. No metadata is trusted.
create table private.app_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provisioned_at timestamptz not null default now()
);
alter table private.app_owner enable row level security;
revoke all on private.app_owner from public, anon, authenticated;

create function private.is_app_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.app_owner o
  join auth.users u on u.id = o.user_id
  where o.user_id = (select auth.uid()) and u.email_confirmed_at is not null) $$;
revoke all on function private.is_app_owner() from public, anon, authenticated;
grant execute on function private.is_app_owner() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'ms' check (locale in ('ms','en')),
  timezone text not null default 'Asia/Kuala_Lumpur' check (length(timezone) between 1 and 100),
  daily_goal integer not null default 5 check (daily_goal in (3,5,10)),
  sound_enabled boolean not null default true,
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null unique check (position >= 0),
  title_ms text not null check (length(title_ms) between 1 and 200),
  title_en text not null check (length(title_en) between 1 and 200),
  prerequisite_unit_id uuid references public.units(id),
  content_version integer not null check (content_version > 0),
  published boolean not null default false,
  check (prerequisite_unit_id is null or prerequisite_unit_id <> id)
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id),
  position integer not null check (position >= 0),
  title_ms text not null check (length(title_ms) between 1 and 200),
  title_en text not null check (length(title_en) between 1 and 200),
  kind text not null check (kind in ('pronunciation','vocabulary','mixed')),
  duration_seconds integer not null check (duration_seconds between 1 and 3600),
  content_path text not null check (length(content_path) between 1 and 500),
  content_version integer not null check (content_version > 0),
  published boolean not null default false,
  unique(unit_id, position)
);
create table public.words (
  id uuid primary key default gen_random_uuid(),
  hanzi text not null check (length(hanzi) between 1 and 100),
  pinyin text not null check (length(pinyin) between 1 and 300),
  meaning_ms text not null check (length(meaning_ms) between 1 and 500),
  example_hanzi text, example_pinyin text, example_ms text, tone_note_ms text,
  topic text not null,
  hsk_level integer check (hsk_level between 1 and 9),
  hsk_edition text,
  source text not null check (length(source) between 1 and 1000),
  content_version integer not null check (content_version > 0),
  needs_review boolean not null default true,
  check ((hsk_level is null) = (hsk_edition is null))
);
create table public.lesson_words (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word_id uuid not null references public.words(id),
  position integer not null check (position >= 0),
  primary key(lesson_id, word_id), unique(lesson_id, position)
);
create table public.user_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id),
  status text not null check (status in ('in_progress','completed')),
  best_accuracy numeric(5,4) not null default 0 check (best_accuracy between 0 and 1),
  completed_at timestamptz,
  content_version integer not null check (content_version > 0),
  primary key(user_id, lesson_id),
  check ((status = 'completed') = (completed_at is not null))
);
create table public.review_schedule (
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id),
  modality text not null check (modality in ('meaning','listening','tone','hanzi')),
  ease_factor numeric(5,3) not null default 2.5 check (ease_factor between 1.3 and 5),
  repetitions integer not null default 0 check (repetitions >= 0),
  interval_days integer not null default 0 check (interval_days between 0 and 36500),
  due_at timestamptz not null, last_reviewed_at timestamptz,
  version integer not null default 1 check (version > 0),
  primary key(user_id, word_id, modality)
);
create index review_schedule_due on public.review_schedule(user_id, due_at);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_event_id uuid not null,
  started_at timestamptz not null, ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 0 and 3600),
  xp_awarded integer not null check (xp_awarded between 0 and 10000),
  correct_count integer not null check (correct_count >= 0),
  answer_count integer not null check (answer_count between 0 and 200),
  lesson_id uuid references public.lessons(id),
  unique(user_id, client_event_id),
  check (ended_at >= started_at), check (correct_count <= answer_count)
);
create index study_sessions_user_time on public.study_sessions(user_id, ended_at);
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label_ms text not null, label_en text not null,
  criterion text not null check (criterion in ('completed_lessons','studied_days','reviewed_words','total_xp')),
  target integer not null check (target > 0)
);
create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id),
  earned_at timestamptz not null default now(),
  primary key(user_id, achievement_id)
);
create table public.daily_activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  timezone text not null check (length(timezone) between 1 and 100),
  xp integer not null default 0 check (xp >= 0),
  seconds_studied integer not null default 0 check (seconds_studied between 0 and 86400),
  freeze_used boolean not null default false,
  primary key(user_id, local_date)
);
create table public.streak_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_days integer not null default 0 check (current_days >= 0),
  longest_days integer not null default 0 check (longest_days >= current_days),
  last_active_date date,
  freeze_balance integer not null default 0 check (freeze_balance between 0 and 10)
);

-- Explicit privileges override Supabase's permissive default table grants.
do $$ declare t text; begin
  foreach t in array array['profiles','units','lessons','words','lesson_words','user_progress',
    'review_schedule','study_sessions','achievements','user_achievements','daily_activity','streak_state'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  foreach t in array array['user_progress','review_schedule','study_sessions','user_achievements','daily_activity','streak_state'] loop
    execute format('create policy owner_read on public.%I for select to authenticated using ((select private.is_app_owner()) and user_id = (select auth.uid()))', t);
  end loop;
end $$;
grant update(locale, daily_goal, sound_enabled, reduced_motion) on public.profiles to authenticated;
create policy owner_read on public.profiles for select to authenticated
  using ((select private.is_app_owner()) and id = (select auth.uid()));
create policy owner_settings on public.profiles for update to authenticated
  using ((select private.is_app_owner()) and id = (select auth.uid()))
  with check ((select private.is_app_owner()) and id = (select auth.uid()));
create policy published_read on public.units for select to authenticated
  using ((select private.is_app_owner()) and published);
create policy published_read on public.lessons for select to authenticated
  using ((select private.is_app_owner()) and published and exists (
    select 1 from public.units u where u.id = unit_id and u.published));
create policy approved_read on public.words for select to authenticated
  using ((select private.is_app_owner()) and not needs_review);
create policy approved_read on public.lesson_words for select to authenticated
  using ((select private.is_app_owner()) and exists (
    select 1 from public.lessons l where l.id = lesson_id and l.published)
    and exists (select 1 from public.words w where w.id = word_id and not w.needs_review));
create policy definitions_read on public.achievements for select to authenticated
  using ((select private.is_app_owner()));

-- A profile may only be initialized for the manually allowlisted confirmed owner.
create function private.require_owner_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.app_owner o join auth.users u on u.id = o.user_id
    where o.user_id = new.id and u.email_confirmed_at is not null) then
    raise exception 'Profile requires an allowlisted, confirmed owner' using errcode = '23514';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown timezone' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.require_owner_profile() from public, anon, authenticated;
create trigger require_owner_profile before insert or update of id, timezone on public.profiles
  for each row execute function private.require_owner_profile();

-- Trusted content publishing is atomic; never expose draft words through a lesson.
-- Serialize trusted curriculum changes to prevent concurrent publication/review races.
create function private.validate_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(78421, 1);
  if exists (select 1 from public.lesson_words lw
    join public.lessons l on l.id = lw.lesson_id
    join public.words w on w.id = lw.word_id
    where l.published and w.needs_review) then
    raise exception 'Published lessons require approved words' using errcode = '23514';
  end if;
  return null;
end $$;
revoke all on function private.validate_publication() from public, anon, authenticated;
create trigger validate_publication after insert or update on public.lessons
  for each statement execute function private.validate_publication();
create trigger validate_publication after insert or update on public.lesson_words
  for each statement execute function private.validate_publication();
create trigger validate_publication after update on public.words
  for each statement execute function private.validate_publication();

-- New private helpers must explicitly opt into client execution.
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public;
commit;
