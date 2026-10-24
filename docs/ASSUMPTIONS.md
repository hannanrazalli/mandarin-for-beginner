# Assumptions and current decisions

- One personal learner, Malay-speaking, absolute beginner with no dialect background.
- Vercel hosts the PC/mobile PWA; Supabase provides confirmed-owner Auth/Postgres/RLS.
- User authorized automatic continuation through phases 2–6 and pushes to the named GitHub
  repository. Only reviewed checkpoints are pushed; secrets/env files remain excluded.
- The intended Supabase project is belajarmandarin, gvnfckgishsjwslurmuj, region
  ap-northeast-2 chosen by the user. Another account project is outside this task.
- Owner learner account is provisioned. User confirmed public signup disabled and saved
  on 2026-10-24 Malaysia. Actual password signin is a user browser check; no password requested.
- Hosted leaked-password protection is disabled and requires Supabase Pro or above per its
  documentation. Long unique passwords remain important; no paid upgrade is assumed.
- Calendar boundaries use Asia/Kuala_Lumpur; server timestamps stay UTC. Offline activity
  counts on the server receipt day. Durations are bounded reported time, not measured proof.
- A — Taman Bunyi was selected: jade/cream, Pipit, Nunito Sans and Noto Sans SC.
- Unit 0 remains mandatory. Early lessons are 1–3 minutes, with 3–5 pronunciation items,
  replay/slow audio, direct Malay notes and no speech-scoring claim.
- First 20 words use explicitly named HSK 2.0 legacy Level 1. The additional 280 general
  Mandarin words have null exam metadata. All 300 text entries passed teacher review;
  audio remains unverified and clearly dependent on device zh-CN voices/network.
- The eight agent roles, tier mapping and one-review/one-fix-pass phase workflow are in
  AGENTS.md. Their file scopes are instruction-level, not independent runtime sandboxes.
- Desktop account model access/remaining Plus allowance cannot be verified here. No API
  subscription, AI provider key or extra paid plan is required by this app.
- Client public URL/publishable key are configured in ignored .env.local. Service-role keys
  and passwords never enter source, browser bundles or chat. Env variables on Vercel will
  use only the same public configuration.
- Local practice remains separate from account progress. Canonical RPCs grade actual answers,
  enforce prerequisites and derive XP/reviews/streaks; retries retain original event IDs.
- Offline owner practice is bounded to a prior verified tab session and original 12-hour
  deadline. No private analytics/API responses enter CacheStorage. Exact queue and purge
  behavior is in docs/OFFLINE_SYNC.md and must pass final verification before deployment.
- Personal CSV/JSON export covers seven own-record tables. Pagination is a short collection
  window rather than an atomic backup. Topic/tone detail excludes old test-out receipts that
  lack per-item versions; aggregate XP/accuracy still includes accepted test-out sessions.
- Local test results do not establish hosted GitHub Actions success. Workflow status and
  actual deployment/headers are recorded separately in docs/DEPLOYMENT.md.
