select test.ok((select count(*) from public.lessons)=25,'repeat seed creates no duplicate lessons');
select test.ok((select count(*) from public.words)=20,'repeat seed creates no duplicate words');
select test.ok((select count(*) from public.user_progress where status='completed')=1,'repeat seed preserves completed progress');
select test.ok((select count(*) from public.study_sessions)=1,'repeat seed preserves study sessions');
select test.ok((select count(*) from private.completion_events)=1,'repeat seed preserves idempotency ledger');
