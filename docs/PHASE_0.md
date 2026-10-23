# Phase 0 brief and checkpoint

1. Goal: a small, reviewable setup pack for BelajarMandarin, with no app scaffold.
2. Read current official Codex configuration, custom-agent and AGENTS.md documentation.
3. Create exactly eight named agent definitions; use user's revised tiers and ownership.
4. Keep model mapping editable in one place, instructions concise and scope explicit.
5. Record inherited sandbox limits and unsupported requested configuration keys honestly.
6. Propose folder, database/RLS and versioned lesson schema including audio-first Unit 0.
7. Supply linked beginner account/software checklist and non-secret return values.
8. Verify TOMLs/role mapping/schema, then one pair of diff-scoped setup reviews.
9. At most one review-fix pass, conventional checkpoint, stop for user "continue".

## Verification (5 lines)
1. PASS: config and all eight agent TOMLs parse; unique names, sections, tier mapping and limits validated.
2. PASS: central tier synchronization is idempotent; AGENTS.md is 91 lines; env files ignored; staged diff has no whitespace errors.
3. PASS: Draft 2020-12 metaschema, 3 accepted and 8 rejected content cases, including Unit 0 bounds and reviewed-audio paths.
4. PASS: two explicit MID reviewer runs returned; code review had no findings; UX fixes applied in ONE pass; no second review or security review.
5. LIMIT: native desktop custom-agent listing and separate Plus model entitlement remain unverified; no app means no app typecheck/lint/tests/build/UI or live RLS checks.

## Review disposition

- code_reviewer: no actionable findings in its supplied configuration/schema diff.
- uiux_reviewer: enforced Unit 0 60–180 seconds and 3–5 prompts; allowed untoned initials/finals
  while requiring tone metadata for syllable/tone drills and two tones for tone-pair drills.
- Rejected reported audio extension-regex defect: direct validation accepts `/audio/tones.mp3`
  and rejects `/audio/tonesXmp3`; the existing JSON escaping was correct. No regex change.
- No actionable review findings remain. External verification is listed in NEXT_STEPS.md.
- First reviewer invocation also verified tool-based spawning/return; it does not prove native
  named-TOML loading or provide a separate child sandbox.

## Runs and checkpoint

Two subagent runs total: code_reviewer for setup/schema correctness plus spawn smoke evidence;
uiux_reviewer for beginner setup and Unit 0/design gates. Both MID, parallel, changed-file only.
No extra smoke run, HIGH run, implementation delegation or bulk content generation.
If credits are low, say "low credits mode" to perform these checklists solo in future phases.
Checkpoint commit: `chore: prepare BelajarMandarin phase zero setup`.
STOP here; Phase 1 begins only after user says "continue" and pauses for the visual choice.
