# Assumptions and decisions pending

- Phase 0 only; Vercel chosen over Netlify per override. No existing code/accounts assumed.
- Timezone Asia/Kuala_Lumpur for study-day boundaries; store timestamps in UTC.
- Absolute beginner, no dialect knowledge. Unit 0 is mandatory before normal HSK 1 path;
  a later diagnostic can test out, never silently skip foundational instruction.
- Unit 0 lessons are 1–3 minutes with replay/slow audio, 3–5 prompts, no typing barrier.
- HSK edition must be explicitly chosen with mandarin_teacher before word-list generation;
  store edition/source, never combine lists silently. No bulk words in Phase 0.
- Web Speech zh-CN voice availability and offline behavior vary. Unit 0 tone-pair teaching
  needs teacher-checked recordings or verified audio, rather than trusting arbitrary TTS.
  No pronunciation scoring implied. Missing audio must be visible and never block all learning.
- No visual direction selected. Phase 1 pauses after TWO compared directions and waits for
  the user's choice; scaffold/components/tokens follow that choice.
- Agent directory and reviewer limits are instruction-level in this runtime. No claimed
  independent sandbox. No unknown keys added to pretend enforcement.
- Desktop account's model picker/quotas unavailable here; environment catalog is provisional.
- Full app dependency versions will be verified and pinned in Phase 1, not guessed now.
- Offline event conflict/replay and server-authoritative scores are Phase 2 design inputs,
  implemented fully in Phase 6. No personal data should leak between sessions.
- Only eight agents. Architecture/ADRs belong to backend_security_engineer; code_specialist
  owns meaningful unit/e2e tests. Parent handles tiny tasks and docs lookups.
