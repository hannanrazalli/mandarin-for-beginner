begin;
-- Nullable only for pre-migration legacy curriculum; RPC requires an authored slug.
alter table public.lessons add column slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80);
alter table public.words add column slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80);
create table private.lesson_items (
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 content_version integer not null check (content_version > 0),
 item_id text not null check (item_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(item_id) <= 80),
 correct_answer text not null check (length(correct_answer) between 1 and 2000),
 needs_review boolean not null default true,
 primary key(lesson_id,content_version,item_id)
);
create table private.completion_events (
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid not null,
 payload jsonb not null,
 response jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,event_id)
);
alter table private.lesson_items enable row level security;
alter table private.completion_events enable row level security;
revoke all on private.lesson_items, private.completion_events from public, anon, authenticated;

create function public.complete_lesson(p_event_id uuid, p_lesson_slug text,
 p_content_version integer, p_answers jsonb, p_duration_seconds integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 learner uuid := auth.uid();
 lesson public.lessons%rowtype;
 unit_row public.units%rowtype;
 learner_timezone text;
 item jsonb;
 answer_total integer;
 expected_total integer;
 correct_total integer;
 accuracy numeric;
 xp integer;
 is_completed boolean;
 received_at timestamptz := statement_timestamp();
 study_date date;
 canonical_payload jsonb;
 prior private.completion_events%rowtype;
 result jsonb;
begin
 if learner is null or not private.is_app_owner() then
   raise exception 'Owner authentication required' using errcode='42501';
 end if;
 if p_event_id is null or p_lesson_slug is null or length(p_lesson_slug) not between 1 and 80
   or p_lesson_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
   or p_content_version is null or p_content_version < 1
   or p_duration_seconds is null or p_duration_seconds not between 0 and 600
   or p_answers is null or jsonb_typeof(p_answers) <> 'array' then
   raise exception 'Invalid completion event' using errcode='22023';
 end if;
 answer_total := jsonb_array_length(p_answers);
 if answer_total not between 1 and 200 or octet_length(p_answers::text) > 131072 then
   raise exception 'Answer payload exceeds limits' using errcode='22023';
 end if;
 for item in select value from jsonb_array_elements(p_answers) loop
   if jsonb_typeof(item) <> 'object' then
     raise exception 'Each answer must be an object' using errcode='22023';
   end if;
   if not (item ?& array['item_id','answer']) or (select count(*) from jsonb_object_keys(item)) <> 2
     or jsonb_typeof(item->'item_id') <> 'string' or jsonb_typeof(item->'answer') <> 'string'
     or length(item->>'item_id') not between 1 and 80
     or length(item->>'answer') not between 1 and 2000 then
     raise exception 'Answer fields are invalid' using errcode='22023';
   end if;
 end loop;
 if (select count(distinct value->>'item_id') from jsonb_array_elements(p_answers)) <> answer_total then
   raise exception 'Duplicate item IDs' using errcode='22023';
 end if;
 canonical_payload := jsonb_build_object('lesson_slug',p_lesson_slug,'content_version',p_content_version,
   'answers',p_answers,'duration_seconds',p_duration_seconds);
 -- A single row lock serializes all reward mutations for this learner.
 select timezone into learner_timezone from public.profiles where id=learner for update;
 if not found then raise exception 'Owner profile required' using errcode='42501'; end if;
 select * into prior from private.completion_events where user_id=learner and event_id=p_event_id;
 if found then
   if prior.payload <> canonical_payload then raise exception 'Event ID conflicts with prior payload' using errcode='22023'; end if;
   return prior.response;
 end if;
 -- Hold the publication lock for the entire grade/write transaction.
 perform pg_catalog.pg_advisory_xact_lock_shared(78421,1);
 select * into lesson from public.lessons where slug=p_lesson_slug and published;
 if not found then raise exception 'Published lesson unavailable' using errcode='22023'; end if;
 select * into unit_row from public.units where id=lesson.unit_id and published;
 if not found then raise exception 'Published unit unavailable' using errcode='22023'; end if;
 if lesson.content_version <> p_content_version then raise exception 'Content version conflict' using errcode='22023'; end if;
 if exists(select 1 from public.lesson_words lw join public.words w on w.id=lw.word_id
   where lw.lesson_id=lesson.id and w.needs_review) then
   raise exception 'Lesson contains unapproved vocabulary' using errcode='22023';
 end if;
 select count(*) into expected_total from private.lesson_items
   where lesson_id=lesson.id and content_version=p_content_version;
 if expected_total=0 or expected_total<>answer_total or exists(
   select 1 from private.lesson_items k where k.lesson_id=lesson.id and k.content_version=p_content_version
   and (k.needs_review or not exists(select 1 from jsonb_array_elements(p_answers) a where a->>'item_id'=k.item_id))) then
   raise exception 'Exact approved item set required' using errcode='22023';
 end if;
 if exists(select 1 from public.lessons earlier
   where earlier.unit_id=lesson.unit_id and earlier.position<lesson.position and earlier.published
   and not exists(select 1 from public.user_progress p where p.user_id=learner and p.lesson_id=earlier.id and p.status='completed')) then
   raise exception 'Earlier lessons must be completed' using errcode='22023';
 end if;
 if unit_row.prerequisite_unit_id is not null and (
   not exists(select 1 from public.units u where u.id=unit_row.prerequisite_unit_id and u.published)
   or not exists(select 1 from public.lessons l where l.unit_id=unit_row.prerequisite_unit_id and l.published)
   or exists(select 1 from public.lessons l where l.unit_id=unit_row.prerequisite_unit_id and l.published
      and not exists(select 1 from public.user_progress p where p.user_id=learner and p.lesson_id=l.id and p.status='completed'))
 ) then raise exception 'Prerequisite unit must be completed' using errcode='22023'; end if;
 select count(*) into correct_total from jsonb_array_elements(p_answers) a
 join private.lesson_items k on k.lesson_id=lesson.id and k.content_version=p_content_version and k.item_id=a->>'item_id'
 where lower(btrim(a->>'answer'))=lower(btrim(k.correct_answer));
 accuracy := correct_total::numeric / answer_total;
 xp := correct_total * 10;
 insert into public.study_sessions(user_id,client_event_id,started_at,ended_at,duration_seconds,xp_awarded,correct_count,answer_count,lesson_id)
 values (learner,p_event_id,received_at-make_interval(secs=>p_duration_seconds),received_at,p_duration_seconds,xp,correct_total,answer_total,lesson.id);
 insert into public.user_progress as existing(user_id,lesson_id,status,best_accuracy,completed_at,content_version)
 values(learner,lesson.id,case when accuracy>=0.8 then 'completed' else 'in_progress' end,
   accuracy,case when accuracy>=0.8 then received_at else null end,p_content_version)
 on conflict(user_id,lesson_id) do update set
   status=case when existing.status='completed' or excluded.status='completed' then 'completed' else 'in_progress' end,
   best_accuracy=greatest(existing.best_accuracy,excluded.best_accuracy),
   completed_at=coalesce(existing.completed_at,excluded.completed_at),content_version=excluded.content_version
 returning status='completed' into is_completed;
 study_date := (received_at at time zone learner_timezone)::date;
 insert into public.daily_activity as existing(user_id,local_date,timezone,xp,seconds_studied)
 values(learner,study_date,learner_timezone,xp,p_duration_seconds)
 on conflict(user_id,local_date) do update set xp=existing.xp+excluded.xp,
 seconds_studied=least(86400,existing.seconds_studied+excluded.seconds_studied);
 -- Streak/freezes and spaced repetition are intentionally reserved for phase 4.
 result := jsonb_build_object('event_id',p_event_id,'lesson_slug',p_lesson_slug,
 'correct_count',correct_total,'answer_count',answer_total,'accuracy',accuracy,
 'xp_awarded',xp,'completed',is_completed,
 'total_xp',(select coalesce(sum(s.xp_awarded),0) from public.study_sessions s where s.user_id=learner),
 'completed_lesson_slugs',(select coalesce(jsonb_agg(l.slug order by u.position,l.position),'[]'::jsonb)
 from public.user_progress p join public.lessons l on l.id=p.lesson_id join public.units u on u.id=l.unit_id
 where p.user_id=learner and p.status='completed' and l.slug is not null));
 insert into private.completion_events(user_id,event_id,payload,response) values(learner,p_event_id,canonical_payload,result);
 return result;
end $$;
revoke all on function public.complete_lesson(uuid,text,integer,jsonb,integer) from public,anon,authenticated;
grant execute on function public.complete_lesson(uuid,text,integer,jsonb,integer) to authenticated;
-- Trusted seed helper: preserve prior-version keys and refuse silent same-version changes.
create function private.seed_lesson_items(p_slug text,p_version integer,p_items jsonb) returns void
language plpgsql set search_path = '' as $$
declare target_lesson uuid; previous jsonb; expected jsonb;
begin
 select id into strict target_lesson from public.lessons where slug=p_slug;
 select jsonb_agg(jsonb_build_object('item_id',item_id,'correct_answer',correct_answer) order by item_id)
 into previous from private.lesson_items where lesson_id=target_lesson and content_version=p_version;
 select jsonb_agg(jsonb_build_object('item_id',a->>'item_id','correct_answer',a->>'correct_answer') order by a->>'item_id')
 into expected from jsonb_array_elements(p_items) a;
 if previous is not null and previous <> expected then
   raise exception 'Answer key changed without content_version increment: %',p_slug using errcode='22023';
 end if;
 insert into private.lesson_items(lesson_id,content_version,item_id,correct_answer,needs_review)
 select target_lesson,p_version,a->>'item_id',a->>'correct_answer',(a->>'needs_review')::boolean
 from jsonb_array_elements(p_items) a
 on conflict(lesson_id,content_version,item_id) do update set needs_review=excluded.needs_review;
end $$;
revoke all on function private.seed_lesson_items(text,integer,jsonb) from public,anon,authenticated;
commit;
