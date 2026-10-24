begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.review_word(gen_random_uuid(),'30000000-0000-0000-0000-000000000001','meaning','awak',5,0,0);
select pg_sleep(0.3);
commit;
