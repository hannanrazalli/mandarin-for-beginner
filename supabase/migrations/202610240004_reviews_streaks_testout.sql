begin;
alter table public.streak_state add column active_days integer not null default 0 check(active_days>=0);
alter table public.streak_state alter column freeze_balance set default 1;
update public.streak_state set freeze_balance=1 where last_active_date is null and freeze_balance=0;
insert into public.achievements(code,label_ms,label_en,criterion,target) values
 ('first-lesson','Pelajaran pertama','First lesson','completed_lessons',1),
 ('seven-days','Tujuh hari belajar','Seven study days','studied_days',7),
 ('first-review','Ulang kaji pertama','First review','reviewed_words',1)
on conflict(code) do nothing;

create function private.award_activity(p_user uuid,p_date date) returns void
language plpgsql set search_path='' as $$
declare s public.streak_state%rowtype; gap integer; days integer; tokens integer;
begin
 insert into public.streak_state(user_id) values(p_user) on conflict do nothing;
 select * into s from public.streak_state where user_id=p_user for update;
 if s.last_active_date is null or p_date>s.last_active_date then
   gap:=p_date-s.last_active_date; tokens:=s.freeze_balance;
   if gap=1 then days:=s.current_days+1;
   elsif gap=2 and tokens>0 then
     days:=s.current_days+2; tokens:=tokens-1;
     insert into public.daily_activity(user_id,local_date,timezone,freeze_used)
       select p_user,p_date-1,timezone,true from public.profiles where id=p_user
       on conflict(user_id,local_date) do update set freeze_used=true;
   else days:=1; end if;
   if mod(s.active_days+1,7)=0 then tokens:=least(2,tokens+1); end if;
   update public.streak_state set current_days=days,longest_days=greatest(longest_days,days),
     last_active_date=p_date,freeze_balance=tokens,active_days=s.active_days+1 where user_id=p_user;
 end if;
 insert into public.user_achievements(user_id,achievement_id)
 select p_user,a.id from public.achievements a where
   (a.criterion='completed_lessons' and (select count(*) from public.user_progress where user_id=p_user and status='completed')>=a.target)
   or (a.criterion='studied_days' and (select active_days from public.streak_state where user_id=p_user)>=a.target)
   or (a.criterion='reviewed_words' and (select count(distinct word_id) from public.review_schedule where user_id=p_user and last_reviewed_at is not null)>=a.target)
   or (a.criterion='total_xp' and (select coalesce(sum(xp_awarded),0) from public.study_sessions where user_id=p_user)>=a.target)
 on conflict do nothing;
end $$;
revoke all on function private.award_activity(uuid,date) from public,anon,authenticated;

create function private.initialize_reviews(p_user uuid,p_lesson uuid) returns void
language sql set search_path='' as $$
 insert into public.review_schedule(user_id,word_id,modality,due_at)
 select p_user,lw.word_id,m,statement_timestamp() from public.lesson_words lw
 join public.words w on w.id=lw.word_id and not w.needs_review
 cross join unnest(array['meaning','listening','tone','hanzi']) m where lw.lesson_id=p_lesson
 on conflict do nothing
$$;
revoke all on function private.initialize_reviews(uuid,uuid) from public,anon,authenticated;

-- Preserve the v3 implementation and original receipts; expose only the checked wrapper.
alter function public.complete_lesson(uuid,text,integer,jsonb,integer) set schema private;
alter function private.complete_lesson(uuid,text,integer,jsonb,integer) rename to complete_lesson_v3;
revoke all on function private.complete_lesson_v3(uuid,text,integer,jsonb,integer) from public,anon,authenticated;
create function public.complete_lesson(p_event_id uuid,p_lesson_slug text,p_content_version integer,p_answers jsonb,p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); tz text; result jsonb; already_recorded boolean;
begin
 if learner is null or not private.is_app_owner() then raise exception 'Owner required' using errcode='42501'; end if;
 select timezone into tz from public.profiles where id=learner for update;
 if not found then raise exception 'Profile required' using errcode='42501'; end if;
 select exists(select 1 from private.completion_events where user_id=learner and event_id=p_event_id) into already_recorded;
 result:=private.complete_lesson_v3(p_event_id,p_lesson_slug,p_content_version,p_answers,p_duration_seconds);
 if not already_recorded then
   if (result->>'completed')::boolean then
     perform private.initialize_reviews(learner,(select id from public.lessons where slug=p_lesson_slug));
   end if;
   perform private.award_activity(learner,(statement_timestamp() at time zone tz)::date);
 end if;
 return result;
end $$;
revoke all on function public.complete_lesson(uuid,text,integer,jsonb,integer) from public,anon,authenticated;
grant execute on function public.complete_lesson(uuid,text,integer,jsonb,integer) to authenticated;

create function public.review_word(p_event_id uuid,p_word_id uuid,p_modality text,p_answer text,
 p_expected_version integer,p_hints_used integer,p_duration_seconds integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); tz text; payload jsonb; prior private.completion_events%rowtype;
 s public.review_schedule%rowtype; w public.words%rowtype; expected text; correct boolean; grade integer;
 ef numeric; reps integer; days integer; xp integer; result jsonb; received timestamptz:=statement_timestamp();
begin
 if learner is null or not private.is_app_owner() then raise exception 'Owner required' using errcode='42501'; end if;
 if p_event_id is null or p_word_id is null or p_modality is null or p_modality not in ('meaning','listening','tone','hanzi')
 or p_answer is null or length(p_answer) not between 1 and 2000 or p_expected_version is null or p_expected_version<1
 or p_hints_used is null or p_hints_used not between 0 and 2 or p_duration_seconds is null or p_duration_seconds not between 0 and 600 then
 raise exception 'Invalid review payload' using errcode='22023'; end if;
 select timezone into tz from public.profiles where id=learner for update;
 if not found then raise exception 'Profile required' using errcode='42501'; end if;
 payload:=jsonb_build_object('kind','review','word_id',p_word_id,'modality',p_modality,'answer',p_answer,
 'expected_version',p_expected_version,'hints_used',p_hints_used,'duration_seconds',p_duration_seconds);
 select * into prior from private.completion_events where user_id=learner and event_id=p_event_id;
 if found then
  if prior.payload<>payload then raise exception 'Event ID payload conflict' using errcode='22023'; end if;
  return prior.response;
 end if;
 perform pg_catalog.pg_advisory_xact_lock_shared(78421,1);
 select * into s from public.review_schedule where user_id=learner and word_id=p_word_id and modality=p_modality for update;
 if not found or s.version<>p_expected_version then raise exception 'Schedule version conflict' using errcode='22023'; end if;
 if s.due_at>received then raise exception 'Review is not due' using errcode='22023'; end if;
 select * into w from public.words where id=p_word_id and not needs_review;
 if not found or not exists(select 1 from public.lesson_words lw join public.lessons l on l.id=lw.lesson_id
 join public.units u on u.id=l.unit_id where lw.word_id=p_word_id and l.published and u.published) then
 raise exception 'Approved published word required' using errcode='22023'; end if;
 expected:=case p_modality when 'meaning' then w.meaning_ms when 'hanzi' then w.hanzi else w.pinyin end;
 correct:=lower(btrim(p_answer))=lower(btrim(expected));
 grade:=case when correct then 5-p_hints_used else 0 end;
 ef:=greatest(1.3,least(5,s.ease_factor+0.1-(5-grade)*(0.08+(5-grade)*0.02)));
 if grade<3 then reps:=0; days:=1;
 else reps:=s.repetitions+1;
  days:=case when s.repetitions=0 then 1 when s.repetitions=1 then 6 else least(36500,greatest(1,round(s.interval_days*s.ease_factor)::integer)) end;
 end if;
 xp:=case when correct then 10 else 0 end;
 update public.review_schedule set ease_factor=ef,repetitions=reps,interval_days=days,
 due_at=received+make_interval(days=>days),last_reviewed_at=received,version=version+1
 where user_id=learner and word_id=p_word_id and modality=p_modality returning * into s;
 insert into public.study_sessions(user_id,client_event_id,started_at,ended_at,duration_seconds,xp_awarded,correct_count,answer_count)
 values(learner,p_event_id,received-make_interval(secs=>p_duration_seconds),received,p_duration_seconds,xp,correct::integer,1);
 insert into public.daily_activity as d(user_id,local_date,timezone,xp,seconds_studied)
 values(learner,(received at time zone tz)::date,tz,xp,p_duration_seconds)
 on conflict(user_id,local_date) do update set xp=d.xp+excluded.xp,seconds_studied=least(86400,d.seconds_studied+excluded.seconds_studied);
 perform private.award_activity(learner,(received at time zone tz)::date);
 result:=jsonb_build_object('event_id',p_event_id,'word_id',p_word_id,'modality',p_modality,'correct',correct,'grade',grade,
 'xp_awarded',xp,'total_xp',(select coalesce(sum(xp_awarded),0) from public.study_sessions where user_id=learner),
 'schedule',jsonb_build_object('ease_factor',s.ease_factor,'repetitions',s.repetitions,'interval_days',s.interval_days,'due_at',s.due_at,'version',s.version));
 insert into private.completion_events(user_id,event_id,payload,response) values(learner,p_event_id,payload,result);
 return result;
end $$;
revoke all on function public.review_word(uuid,uuid,text,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.review_word(uuid,uuid,text,text,integer,integer,integer) to authenticated;

create function public.test_out_unit(p_event_id uuid,p_unit_slug text,p_content_version integer,p_answers jsonb,p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); tz text; target public.units%rowtype; item jsonb; payload jsonb;
 prior private.completion_events%rowtype; total integer; expected_count integer; correct integer; accuracy numeric;
 passed boolean; xp integer; result jsonb; received timestamptz:=statement_timestamp(); lesson_row record;
begin
 if learner is null or not private.is_app_owner() then raise exception 'Owner required' using errcode='42501'; end if;
 if p_event_id is null or p_unit_slug is null or length(p_unit_slug) not between 1 and 80
 or p_content_version is null or p_content_version<1 or p_duration_seconds is null or p_duration_seconds not between 0 and 600
 or p_answers is null or jsonb_typeof(p_answers)<>'array' then raise exception 'Invalid test-out event' using errcode='22023'; end if;
 total:=jsonb_array_length(p_answers);
 if total not between 1 and 200 or octet_length(p_answers::text)>131072 then raise exception 'Test-out payload too large' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(p_answers) loop
  if jsonb_typeof(item)<>'object' then raise exception 'Expected answer object' using errcode='22023'; end if;
  if not(item ?& array['lesson_slug','item_id','answer']) or (select count(*) from jsonb_object_keys(item))<>3
  or jsonb_typeof(item->'lesson_slug')<>'string' or jsonb_typeof(item->'item_id')<>'string' or jsonb_typeof(item->'answer')<>'string'
  or length(item->>'lesson_slug') not between 1 and 80 or length(item->>'item_id') not between 1 and 80
  or length(item->>'answer') not between 1 and 2000 then raise exception 'Invalid test-out answer fields' using errcode='22023'; end if;
 end loop;
 if (select count(distinct (a->>'lesson_slug',a->>'item_id')) from jsonb_array_elements(p_answers) a)<>total then
 raise exception 'Duplicate test-out items' using errcode='22023'; end if;
 select timezone into tz from public.profiles where id=learner for update;
 if not found then raise exception 'Profile required' using errcode='42501'; end if;
 payload:=jsonb_build_object('kind','testout','unit_slug',p_unit_slug,'content_version',p_content_version,'answers',p_answers,'duration_seconds',p_duration_seconds);
 select * into prior from private.completion_events where user_id=learner and event_id=p_event_id;
 if found then
  if prior.payload<>payload then raise exception 'Event ID payload conflict' using errcode='22023'; end if;
  return prior.response;
 end if;
 perform pg_catalog.pg_advisory_xact_lock_shared(78421,1);
 select * into target from public.units where slug=p_unit_slug and published and position>0;
 if not found or target.content_version<>p_content_version then raise exception 'Published non-foundation unit/version required' using errcode='22023'; end if;
 if not exists(select 1 from public.units where position=0 and published)
 or not exists(select 1 from public.lessons l join public.units u on u.id=l.unit_id where u.position=0 and u.published and l.published)
 or exists(select 1 from public.lessons l join public.units u on u.id=l.unit_id
   where l.published and (u.position=0 or u.id=target.prerequisite_unit_id)
   and not exists(select 1 from public.user_progress p where p.user_id=learner and p.lesson_id=l.id and p.status='completed')) then
 raise exception 'Foundation and prerequisite lessons must be completed' using errcode='22023'; end if;
 if target.prerequisite_unit_id is not null and (not exists(select 1 from public.units where id=target.prerequisite_unit_id and published)
 or not exists(select 1 from public.lessons where unit_id=target.prerequisite_unit_id and published)) then
 raise exception 'Published prerequisite required' using errcode='22023'; end if;
 if not exists(select 1 from public.lessons where unit_id=target.id and published)
 or exists(select 1 from public.lessons l where l.unit_id=target.id and l.published
   and not exists(select 1 from private.lesson_items k where k.lesson_id=l.id and k.content_version=l.content_version))
 or exists(select 1 from public.lesson_words lw join public.lessons l on l.id=lw.lesson_id join public.words w on w.id=lw.word_id
   where l.unit_id=target.id and l.published and w.needs_review) then
 raise exception 'Complete approved unit required' using errcode='22023'; end if;
 select count(*) into expected_count from private.lesson_items k join public.lessons l on l.id=k.lesson_id
 where l.unit_id=target.id and l.published and k.content_version=l.content_version;
 if expected_count<>total or exists(select 1 from private.lesson_items k join public.lessons l on l.id=k.lesson_id
 where l.unit_id=target.id and l.published and k.content_version=l.content_version
 and (k.needs_review or not exists(select 1 from jsonb_array_elements(p_answers) a where a->>'lesson_slug'=l.slug and a->>'item_id'=k.item_id))) then
 raise exception 'Exact approved unit item set required' using errcode='22023'; end if;
 select count(*) into correct from jsonb_array_elements(p_answers) a join public.lessons l on l.slug=a->>'lesson_slug'
 join private.lesson_items k on k.lesson_id=l.id and k.content_version=l.content_version and k.item_id=a->>'item_id'
 where l.unit_id=target.id and l.published and lower(btrim(a->>'answer'))=lower(btrim(k.correct_answer));
 accuracy:=correct::numeric/total; passed:=accuracy>=0.9; xp:=correct*10;
 insert into public.study_sessions(user_id,client_event_id,started_at,ended_at,duration_seconds,xp_awarded,correct_count,answer_count)
 values(learner,p_event_id,received-make_interval(secs=>p_duration_seconds),received,p_duration_seconds,xp,correct,total);
 if passed then
  for lesson_row in select * from public.lessons where unit_id=target.id and published order by position loop
   insert into public.user_progress as p(user_id,lesson_id,status,best_accuracy,completed_at,content_version)
   values(learner,lesson_row.id,'completed',accuracy,received,lesson_row.content_version)
   on conflict(user_id,lesson_id) do update set status='completed',best_accuracy=greatest(p.best_accuracy,excluded.best_accuracy),
   completed_at=coalesce(p.completed_at,excluded.completed_at),content_version=excluded.content_version;
   perform private.initialize_reviews(learner,lesson_row.id);
  end loop;
 end if;
 insert into public.daily_activity as d(user_id,local_date,timezone,xp,seconds_studied)
 values(learner,(received at time zone tz)::date,tz,xp,p_duration_seconds)
 on conflict(user_id,local_date) do update set xp=d.xp+excluded.xp,seconds_studied=least(86400,d.seconds_studied+excluded.seconds_studied);
 perform private.award_activity(learner,(received at time zone tz)::date);
 result:=jsonb_build_object('event_id',p_event_id,'unit_slug',p_unit_slug,'accuracy',accuracy,'passed',passed,'xp_awarded',xp,
 'total_xp',(select coalesce(sum(xp_awarded),0) from public.study_sessions where user_id=learner),
 'completed_lesson_slugs',(select coalesce(jsonb_agg(l.slug order by u.position,l.position),'[]'::jsonb)
 from public.user_progress p join public.lessons l on l.id=p.lesson_id join public.units u on u.id=l.unit_id
 where p.user_id=learner and p.status='completed' and l.slug is not null));
 insert into private.completion_events(user_id,event_id,payload,response) values(learner,p_event_id,payload,result);
 return result;
end $$;
revoke all on function public.test_out_unit(uuid,text,integer,jsonb,integer) from public,anon,authenticated;
grant execute on function public.test_out_unit(uuid,text,integer,jsonb,integer) to authenticated;
commit;
