begin;
-- Aggregate only the caller's canonical receipts. Never return private answer keys.
create function public.learning_insights() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare learner uuid:=auth.uid(); result jsonb;
begin
 if learner is null or not private.is_app_owner() then
   raise exception 'Owner required' using errcode='42501';
 end if;
 with item_totals as (
   select l.slug as lesson_slug,(e.payload->>'content_version')::integer as content_version,
     a->>'item_id' as item_id,
     count(*) filter(where lower(btrim(a->>'answer'))=lower(btrim(k.correct_answer)))::integer as correct,
     count(*)::integer as total
   from private.completion_events e
   cross join lateral jsonb_array_elements(e.payload->'answers') a
   join public.lessons l on l.slug=e.payload->>'lesson_slug'
   join private.lesson_items k on k.lesson_id=l.id
     and k.content_version=(e.payload->>'content_version')::integer and k.item_id=a->>'item_id'
   where e.user_id=learner and e.payload ? 'lesson_slug'
   group by l.slug,(e.payload->>'content_version')::integer,a->>'item_id'
 ), review_totals as (
   select e.payload->>'word_id' as word_id,e.payload->>'modality' as modality,
     count(*) filter(where (e.response->>'correct')::boolean)::integer as correct,
     count(*)::integer as total
   from private.completion_events e
   where e.user_id=learner and e.payload->>'kind'='review'
   group by e.payload->>'word_id',e.payload->>'modality'
 )
 select jsonb_build_object(
   'items',(select coalesce(jsonb_agg(to_jsonb(i) order by lesson_slug,content_version,item_id),'[]') from item_totals i),
   'reviews',(select coalesce(jsonb_agg(to_jsonb(r) order by word_id,modality),'[]') from review_totals r)
 ) into result;
 return result;
end $$;
revoke all on function public.learning_insights() from public,anon,authenticated;
grant execute on function public.learning_insights() to authenticated;
commit;
