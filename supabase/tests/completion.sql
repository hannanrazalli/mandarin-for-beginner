-- Prior fixture deliberately ended with an unconfirmed allowlist; restore confirmed owner.
update private.app_owner set user_id='00000000-0000-0000-0000-000000000001';
insert into public.units(id,slug,position,title_ms,title_en,content_version,published,prerequisite_unit_id) values
 ('61000000-0000-0000-0000-000000000001','rpc-unit',10,'Ujian','Test',1,true,null),
 ('61000000-0000-0000-0000-000000000002','rpc-next',11,'Seterusnya','Next',1,true,'61000000-0000-0000-0000-000000000001');
insert into public.lessons(id,unit_id,position,title_ms,title_en,kind,duration_seconds,content_path,content_version,published,slug) values
 ('62000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',0,'Satu','One','pronunciation',60,'test/one',1,true,'rpc-one'),
 ('62000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001',1,'Dua','Two','vocabulary',60,'test/two',1,true,'rpc-two'),
 ('62000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000002',0,'Tiga','Three','vocabulary',60,'test/three',1,true,'rpc-three');
insert into private.lesson_items values
 ('62000000-0000-0000-0000-000000000001',1,'one','mā',false),
 ('62000000-0000-0000-0000-000000000001',1,'two','má',false),
 ('62000000-0000-0000-0000-000000000002',1,'three','awak',false),
 ('62000000-0000-0000-0000-000000000003',1,'four','baik',false);
create function test.call_completion(answers jsonb default '[{"item_id":"one","answer":"mā"},{"item_id":"two","answer":"má"}]',
 event_id uuid default '63000000-0000-0000-0000-000000000001',slug text default 'rpc-one',version integer default 1,duration integer default 60)
 returns jsonb language sql as $$ select public.complete_lesson(event_id,slug,version,answers,duration) $$;
set role anon;
select test.denied('select test.call_completion()','anonymous completion denied');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select test.denied('select test.call_completion()','nonowner completion denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.denied('select * from private.lesson_items','answer keys private');
select test.denied('select * from private.completion_events','event ledger private');
select test.denied($$select test.call_completion('[{"item_id":"one","answer":"mā","xp":999}]')$$,'forged XP rejected','22023');
select test.denied($$select test.call_completion('[{"item_id":"one","answer":"mā","user_id":"forged"}]')$$,'forged identity field rejected','22023');
select test.denied($$select test.call_completion('[{"item_id":"one","answer":"mā"}]')$$,'missing item rejected','22023');
select test.denied($$select test.call_completion('[{"item_id":"one","answer":"mā"},{"item_id":"one","answer":"má"}]')$$,'duplicate item rejected','22023');
select test.denied($$select test.call_completion('[{"item_id":"one","answer":"mā"},{"item_id":"unknown","answer":"má"}]')$$,'extra item rejected','22023');
select test.denied($$select test.call_completion('[{"item_id":"one","answer":null}]')$$,'null answer rejected','22023');
select test.denied($$select test.call_completion('[42]')$$,'nonobject answer rejected','22023');
select test.denied($$select test.call_completion('{}')$$,'nonarray payload rejected','22023');
select test.denied($$select test.call_completion(null)$$,'null payload rejected','22023');
select test.denied($$select test.call_completion(version=>2)$$,'content version mismatch rejected','22023');
select test.denied($$select test.call_completion(duration=>601)$$,'duration upper bound','22023');
select test.denied($$select test.call_completion(duration=>-1)$$,'duration lower bound','22023');
select test.denied($$select test.call_completion(duration=>null)$$,'duration null rejected','22023');
select test.denied($$select test.call_completion(slug=>'unknown')$$,'unknown lesson rejected','22023');
select test.denied($$select test.call_completion('[{"item_id":"three","answer":"awak"}]',slug=>'rpc-two')$$,'earlier lesson prerequisite enforced','22023');
select test.denied($$select test.call_completion('[{"item_id":"four","answer":"baik"}]',slug=>'rpc-three')$$,'prior unit prerequisite enforced','22023');
select test.ok((test.call_completion('[{"item_id":"one","answer":"wrong"},{"item_id":"two","answer":"wrong"}]',event_id=>'63000000-0000-0000-0000-000000000002')->>'xp_awarded')::int=0,'wrong answers earn zero');
select test.ok(status='in_progress' and best_accuracy=0,'wrong attempt remains in progress') from public.user_progress where lesson_id='62000000-0000-0000-0000-000000000001';
select test.ok((test.call_completion()->>'correct_count')::int=2,'canonical answers graded server-side');
select test.ok((test.call_completion()->>'total_xp')::int=30,'identical retry returns canonical total');
select test.ok((select count(*) from public.study_sessions where client_event_id='63000000-0000-0000-0000-000000000001')=1,'retry creates one session');
select test.ok((select sum(xp_awarded) from public.study_sessions)=30,'retry awards XP exactly once');
select test.denied($$select test.call_completion(duration=>61)$$,'reused event with different payload conflicts','22023');
select test.ok((test.call_completion('[{"item_id":"one","answer":"wrong"},{"item_id":"two","answer":"wrong"}]',event_id=>'63000000-0000-0000-0000-000000000003')->>'completed')::boolean,'completed status never regresses');
select test.ok(best_accuracy=1,'best accuracy never regresses') from public.user_progress where lesson_id='62000000-0000-0000-0000-000000000001';
select test.ok((test.call_completion('[{"item_id":"three","answer":" AWAK "}]',event_id=>'63000000-0000-0000-0000-000000000004',slug=>'rpc-two',duration=>0)->>'completed')::boolean,'case trim normalization and zero duration accepted');
select test.ok((test.call_completion('[{"item_id":"four","answer":"baik"}]',event_id=>'63000000-0000-0000-0000-000000000005',slug=>'rpc-three',duration=>600)->>'completed')::boolean,'completed prerequisite unlocks next unit and duration600');
select test.ok((test.call_completion()->>'total_xp')::int=30,'retry snapshot stable after later sessions');
select test.ok((select sum(xp) from public.daily_activity)=50,'daily XP equals accepted session awards');
select test.ok((select current_days from public.streak_state)=1,'completion does not invent streak awards');
reset role;
update public.lessons set published=false where slug='rpc-one';
set role authenticated;
select test.denied($$select test.call_completion(event_id=>'63000000-0000-0000-0000-000000000006')$$,'unpublished lesson rejected','22023');
select test.ok((test.call_completion()->>'xp_awarded')::int=20,'historical retry survives lesson withdrawal');
reset role;
update public.lessons set published=true where slug='rpc-one';
update private.lesson_items set needs_review=true where item_id='one';
set role authenticated;
select test.denied($$select test.call_completion(event_id=>'63000000-0000-0000-0000-000000000006')$$,'unreviewed canonical item rejected','22023');
reset role;
set role authenticated;
select test.denied($$select private.seed_lesson_items('rpc-one',1,'[]')$$,'client cannot invoke trusted seed helper');
select test.denied($$select test.call_completion(jsonb_build_array(jsonb_build_object('item_id','one','answer',repeat('x',2001))))$$,'oversized answer rejected','22023');
select test.denied($$select test.call_completion((select jsonb_agg(jsonb_build_object('item_id','item-'||i,'answer','x')) from generate_series(1,201) i))$$,'oversized answer count rejected','22023');
reset role;
select test.denied($$select private.seed_lesson_items('rpc-one',1,'[{"item_id":"one","correct_answer":"changed","needs_review":false}]')$$,'same-version answer-key mutation refused','22023');
