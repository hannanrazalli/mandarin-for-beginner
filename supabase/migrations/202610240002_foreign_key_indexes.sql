-- Cover the foreign-key lookup directions identified by the hosted performance advisor.
create index if not exists lesson_words_word_id_idx on public.lesson_words(word_id);
create index if not exists review_schedule_word_id_idx on public.review_schedule(word_id);
create index if not exists study_sessions_lesson_id_idx on public.study_sessions(lesson_id);
create index if not exists units_prerequisite_idx on public.units(prerequisite_unit_id);
create index if not exists user_achievements_achievement_id_idx on public.user_achievements(achievement_id);
create index if not exists user_progress_lesson_id_idx on public.user_progress(lesson_id);
