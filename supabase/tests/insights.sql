set role anon;
select test.denied('select public.learning_insights()','anonymous insights denied');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select test.denied('select public.learning_insights()','second user insights denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.ok(jsonb_array_length(public.learning_insights()->'items')>0,'owner receives item counts from actual receipts');
select test.ok(jsonb_array_length(public.learning_insights()->'reviews')>0,'owner receives actual review counts');
select test.ok(not exists(select 1 from jsonb_array_elements(public.learning_insights()->'items') i where (i->>'correct')::int>(i->>'total')::int),'canonical item counts are bounded by attempts');
select test.ok(not (public.learning_insights()::text like '%correct_answer%'),'insights do not expose private answer keys');
reset role;
insert into private.completion_events(user_id,event_id,payload,response)
values('00000000-0000-0000-0000-000000000001','75000000-0000-0000-0000-000000000001',
'{"lesson_slug":"rpc-one","content_version":1,"answers":[{"item_id":"one","answer":"wrong"}]}','{}');
set role authenticated;
select test.ok(exists(select 1 from jsonb_array_elements(public.learning_insights()->'items') i where i->>'lesson_slug'='rpc-one' and i->>'item_id'='one' and (i->>'correct')::int<(i->>'total')::int),'wrong answer receipts remain incorrect in insights');
reset role;
delete from private.completion_events where event_id='75000000-0000-0000-0000-000000000001';
