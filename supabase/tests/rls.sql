create schema test;
grant usage on schema test to anon, authenticated;
create function test.ok(condition boolean, label text) returns text language plpgsql as $$
begin
 if condition is distinct from true then raise exception 'FAIL: %', label; end if;
 return 'ok - ' || label;
end $$;
create function test.denied(statement text, label text, expected text default '42501') returns text language plpgsql as $$
begin
 begin execute statement;
 exception when others then
   if sqlstate = expected then return 'ok - ' || label; end if;
   raise exception 'FAIL: %, expected %, received %: %', label, expected, sqlstate, sqlerrm;
 end;
 raise exception 'FAIL: % unexpectedly succeeded', label;
end $$;
create function test.empty_table(relation text) returns boolean language plpgsql as $$
declare total bigint; begin execute format('select count(*) from public.%I',relation) into total; return total = 0; end $$;
create function test.one_row(relation text) returns boolean language plpgsql as $$
declare total bigint; begin execute format('select count(*) from public.%I',relation) into total; return total = 1; end $$;
insert into auth.users values
 ('00000000-0000-0000-0000-000000000001',now(),'{}'),
 ('00000000-0000-0000-0000-000000000002',now(),'{"role":"owner","is_admin":true}'),
 ('00000000-0000-0000-0000-000000000003',null,'{}');
select test.denied($$insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000002')$$,'trusted bootstrap still rejects unallowlisted user','23514');
insert into private.app_owner(user_id) values ('00000000-0000-0000-0000-000000000001');
select test.denied($$insert into private.app_owner(user_id) values ('00000000-0000-0000-0000-000000000002')$$,'allowlist admits one owner only','23505');
insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000001');
insert into public.units(id,slug,position,title_ms,title_en,content_version,published) values
 ('10000000-0000-0000-0000-000000000001','published',0,'Bunyi','Sounds',1,true),
 ('10000000-0000-0000-0000-000000000002','draft',1,'Draf','Draft',1,false);
insert into public.lessons(id,unit_id,position,title_ms,title_en,kind,duration_seconds,content_path,content_version,published) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',0,'Nada','Tones','vocabulary',60,'lessons/one',1,true),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',0,'Draf','Draft','vocabulary',60,'lessons/two',1,true),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',1,'Draf','Draft','vocabulary',60,'lessons/three',1,false);
insert into public.words(id,hanzi,pinyin,meaning_ms,topic,source,content_version,needs_review) values
 ('30000000-0000-0000-0000-000000000001','你','nǐ','awak','greeting','synthetic test',1,false),
 ('30000000-0000-0000-0000-000000000002','好','hǎo','baik','greeting','synthetic test',1,true);
insert into public.lesson_words values
 ('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',0),
 ('20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001',0),
 ('20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002',0);
insert into public.user_progress values ('00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','completed',1,now(),1);
insert into public.review_schedule(user_id,word_id,modality,due_at) values ('00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','meaning',now());
insert into public.study_sessions(user_id,client_event_id,started_at,ended_at,duration_seconds,xp_awarded,correct_count,answer_count,lesson_id) values ('00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',now(),now(),0,10,1,1,'20000000-0000-0000-0000-000000000001');
insert into public.achievements values ('50000000-0000-0000-0000-000000000001','first','Pertama','First','completed_lessons',1);
insert into public.user_achievements(user_id,achievement_id) values ('00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001');
insert into public.daily_activity(user_id,local_date,timezone,xp) values ('00000000-0000-0000-0000-000000000001',current_date,'Asia/Kuala_Lumpur',10);
insert into public.streak_state(user_id,current_days,longest_days) values ('00000000-0000-0000-0000-000000000001',1,1);
select test.ok(count(*)=15 and bool_and(relrowsecurity),'all fifteen application tables have RLS') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r';
select test.denied($$update public.lessons set published=true where id='20000000-0000-0000-0000-000000000003'$$,'cannot publish draft word','23514');
select test.denied($$update public.words set needs_review=true where id='30000000-0000-0000-0000-000000000001'$$,'cannot unapprove published word','23514');
select test.denied($$insert into public.lesson_words values ('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',1)$$,'cannot attach draft word to published lesson','23514');
select test.denied($$update public.profiles set timezone='Invented/Timezone'$$,'timezone must exist','23514');
select test.denied($$insert into public.study_sessions(user_id,client_event_id,started_at,ended_at,duration_seconds,xp_awarded,correct_count,answer_count) values ('00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',now(),now(),0,1,1,1)$$,'event idempotency uniqueness','23505');
set role anon;
select test.denied(format('select * from public.%I',t),'anonymous cannot read '||t) from unnest(array['profiles','units','lessons','words','lesson_words','user_progress','review_schedule','study_sessions','achievements','user_achievements','daily_activity','streak_state']) t;
select test.denied('select private.is_app_owner()','anonymous cannot execute owner helper');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.ok(test.one_row(t),'owner sees exactly one approved/owned row: '||t) from unnest(array['profiles','units','lessons','words','lesson_words','user_progress','review_schedule','study_sessions','achievements','user_achievements','daily_activity','streak_state']) t;
update public.profiles set locale='en',daily_goal=10,sound_enabled=false,reduced_motion=true;
select test.ok(locale='en' and daily_goal=10 and not sound_enabled and reduced_motion,'owner settings update works') from public.profiles;
select test.denied('update public.profiles set daily_goal=999','settings validation','23514');
select test.denied(format('insert into public.%I default values',t),'owner cannot insert '||t) from unnest(array['profiles','units','lessons','words','lesson_words','user_progress','review_schedule','study_sessions','achievements','user_achievements','daily_activity','streak_state']) t;
select test.denied(format('delete from public.%I',t),'owner cannot delete '||t) from unnest(array['profiles','units','lessons','words','lesson_words','user_progress','review_schedule','study_sessions','achievements','user_achievements','daily_activity','streak_state']) t;
select test.denied(format('update public.%I set %I=%I',t,c,c),'owner cannot update '||t) from (values ('units','published'),('lessons','published'),('words','needs_review'),('lesson_words','position'),('user_progress','best_accuracy'),('review_schedule','due_at'),('study_sessions','xp_awarded'),('achievements','target'),('user_achievements','earned_at'),('daily_activity','xp'),('streak_state','current_days')) v(t,c);
select test.denied($$update public.profiles set id='00000000-0000-0000-0000-000000000002'$$,'cannot forge profile ownership');
select test.denied('update public.profiles set created_at=now()','cannot rewrite profile creation');
select test.denied($$update public.profiles set timezone='UTC'$$,'client cannot manipulate streak timezone');
select test.denied('select * from private.app_owner','cannot read owner allowlist');
select test.denied($$update private.app_owner set user_id='00000000-0000-0000-0000-000000000002'$$,'cannot replace owner allowlist');
select test.denied('select private.require_owner_profile()','bootstrap trigger not callable');
select test.denied('select private.validate_publication()','publication trigger not callable');
select test.denied('create table public.evil(id integer)','cannot create public objects');
select test.denied('create function private.evil() returns integer language sql as ''select 1''','cannot create private helpers');
select test.denied('truncate public.study_sessions','cannot truncate rewards');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select test.ok(not private.is_app_owner(),'metadata owner forgery does not authorize');
select test.ok(test.empty_table(t),'second user sees no app rows: '||t) from unnest(array['profiles','units','lessons','words','lesson_words','user_progress','review_schedule','study_sessions','achievements','user_achievements','daily_activity','streak_state']) t;
with changed as (update public.profiles set locale='ms' returning *) select test.ok(count(*)=0,'second user cannot update owner profile') from changed;
select test.denied($$insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000002')$$,'second user cannot provision own profile');
select test.denied($$insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000001')$$,'second user cannot forge owner profile');
select test.denied('update public.study_sessions set xp_awarded=999','second user cannot forge rewards');
select test.denied('delete from public.daily_activity','second user cannot delete activity');
select set_config('request.jwt.claim.sub','',false);
select test.ok(test.empty_table('units') and test.empty_table('profiles'),'authenticated without subject has no app data');
reset role;
-- Exercise RLS itself independently of table ACLs (changes rolled back).
begin;
grant insert, update, delete on all tables in schema public to authenticated;
alter table public.profiles disable trigger require_owner_profile;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select test.denied($$insert into public.study_sessions(user_id,client_event_id,started_at,ended_at,duration_seconds,xp_awarded,correct_count,answer_count) values ('00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',now(),now(),0,999,1,1)$$,'RLS independently denies reward insertion');
select test.denied($$update public.profiles set id='00000000-0000-0000-0000-000000000002'$$,'RLS WITH CHECK rejects forged ownership');
with changed as (update public.study_sessions set xp_awarded=999 returning *) select test.ok(count(*)=0,'RLS independently hides reward update targets') from changed;
with changed as (delete from public.study_sessions returning *) select test.ok(count(*)=0,'RLS independently hides reward delete targets') from changed;
with changed as (update public.units set published=false returning *) select test.ok(count(*)=0,'RLS independently denies curriculum updates') from changed;
rollback;
-- Removing the allowlist immediately cuts off an existing synthetic session.
delete from private.app_owner;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.ok(test.empty_table('profiles') and test.empty_table('units'),'revoked owner has no access');
reset role;
insert into private.app_owner(user_id) values ('00000000-0000-0000-0000-000000000003');
select test.denied($$insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000003')$$,'unconfirmed owner cannot initialize profile','23514');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select test.ok(test.empty_table('units') and not private.is_app_owner(),'unconfirmed allowlisted user cannot read app data');
reset role;
