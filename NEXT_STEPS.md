# Next steps and verified limits

All planned app phases are implemented. Final review findings were fixed in one pass per
phase; no unresolved code/security BLOCKER remains after local verification.

- Complete the real learner browser check on PC and phone: sign in, finish one short lesson,
  refresh the second device and confirm progress. Tests use synthetic auth/network fixtures;
  no real password was requested or fabricated hosted learning history inserted.
- User confirmed public signup disabled and saved. Hosted password policy, JWT expiry and
  rate-limit values still need a Dashboard check. Leaked-password protection is disabled;
  Supabase documents it as Pro-and-above, so no paid upgrade was assumed. Use a long unique
  password. Guidance: https://supabase.com/docs/guides/auth/password-security.
- Native listening review/recordings remain desirable: every TTS request retains its audio
  review flag. Text was teacher-reviewed; no native audio or speech-scoring claim is made.
- Confirm hosted GitHub Actions independently. Connector workflow lookup returned no runs;
  local quality checks passed. A manual Run workflow trigger is now included.
- Offline owner work requires a prior verified tab and its original 12-hour session. Flush
  before logout/expiry/tab closure; cold offline browsers use local practice. Analytics and
  account export require online verification. Queued activity uses the server receipt day.
- Build reports a roughly 603KB auth/curriculum chunk and a deferred import also reachable
  statically. Measured mobile performance meets the >=90 target; further splitting is an
  optional optimization, not a suppressed warning.
- Deployment status, exact URL and protection policy are in docs/DEPLOYMENT.md. The automatic
  approval review rejected a proposed preview-only protection change; existing protection
  remains unchanged. Do not weaken it or work around it without explicit authorization.

Further product improvements, with effort and benefit: docs/IMPROVEMENTS.md.
