create schema test;
grant usage on schema test to authenticated;
create function test.ok(condition boolean,label text) returns text language plpgsql as $$
begin if condition is distinct from true then raise exception 'FAIL: %',label; end if; return 'ok - '||label; end $$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001',now(),'{}');
insert into private.app_owner(user_id) values ('00000000-0000-0000-0000-000000000001');
insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000001');
select test.ok((select count(*) from public.units)=3,'seed creates three units');
select test.ok((select count(*) from public.lessons)=95,'seed creates ninety-five lessons');
select test.ok((select count(*) from public.words)=300,'seed creates three hundred words');
select test.ok(not exists(select 1 from private.lesson_items where needs_review),'seed canonical items semantically approved');
select test.ok(not exists(select 1 from public.lessons where not published),'all initial lessons published');
select jsonb_agg(jsonb_build_object('item_id',k.item_id,'answer',k.correct_answer)) as answers
from private.lesson_items k join public.lessons l on l.id=k.lesson_id where l.slug='u0-initials-1' and k.content_version=l.content_version \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.ok((public.complete_lesson('64000000-0000-0000-0000-000000000001','u0-initials-1',1,:'answers'::jsonb,60)->>'completed')::boolean,'actual seeded lesson can complete');
reset role;
