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
- User requested no CI/CD; the GitHub Actions Quality workflow was removed. Code remains
  in GitHub and local verification commands remain available.
- Offline owner work requires a prior verified tab and its original 12-hour session. Flush
  before logout/expiry/tab closure; cold offline browsers use local practice. Analytics and
  account export require online verification. Queued activity uses the server receipt day.
- Build reports a roughly 618KB auth/curriculum chunk and a deferred import also reachable
  statically. Previous release mobile performance met the >=90 target; this update was not re-scored. Further splitting is an
  optional optimization, not a suppressed warning.
- Deployment status, exact URL and protection policy are in docs/DEPLOYMENT.md. The automatic
  approval review rejected a proposed preview-only protection change; existing protection
  remains unchanged. Do not weaken it or work around it without explicit authorization.

Further product improvements, with effort and benefit: docs/IMPROVEMENTS.md.

## Interactive learning update (2026-10-25)

- Read `docs/CONTENT_AUDIT.md`: 370 original items were compared with pinyin-pro; differences
  and polyphonic readings require contextual review. No existing answers or versions were
  silently corrected. Machine-checked status is not a translation/audio certificate.
- All five new dialogues and ten sound contrasts remain unverified; ask a capable teacher
  to check text and audio before using them for pronunciation assessment. No actual static
  recordings are bundled yet; device TTS is labelled. See `docs/AUDIO.md` for recordings.
- Check optional microphone record/playback once on your own phone browser; it is explicit,
  browser-local, bounded and ungraded. No API provider/account setup is needed for practice.
- Extra dialogue/listening practice has no canonical XP/streak/goal-time contribution or
  account sync. Existing lessons and SM-2 reviews retain their prior verified contracts.
- Adaptive leech history, canonical review caps, reminders, speech scoring, free-form AI
  and paid audio generation are deliberately deferred; priorities: docs/IMPROVEMENTS.md.
