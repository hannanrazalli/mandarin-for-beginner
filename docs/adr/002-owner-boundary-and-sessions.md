# ADR 002 — One owner, trusted writes, bounded sessions

Accepted 2026-10-24. Applies to the hosted app; preview has no hosted persistence.

**Choice.** All twelve public tables and the private owner registry use RLS. A private,
manual singleton allowlist gates every authenticated read and profile settings write.
Authentication alone confers no application access. Profile initialization requires the
allowlisted, email-confirmed auth user; there is no public bootstrap RPC or auth signup
trigger. User-editable metadata is never an authorization source. Clients can change only
locale, daily goal, sound and motion preferences. Timezone changes require trusted support
and a documented streak transition. Supabase's privileged SQL/service roles bypass RLS;
keep them entirely outside the SPA. Helpers have an empty search path, qualified names,
and explicit EXECUTE grants; trigger helpers have no client EXECUTE. Trusted migrations
own curriculum and rewards. Approval checks reject publishing unreviewed lesson words.

**Mutation contract reserved for later phases.** Completion RPC input is a bounded event:
`{client_event_id: UUID, lesson_id: UUID, content_version: positive integer,
answers: [{item_id: string, answer: bounded string}], duration_seconds: integer}`.
Require a confirmed allowlisted `auth.uid()`; reject unknown fields, duplicate/missing
item IDs, >200 answers, >3600 seconds, unsupported versions, unpublished lessons and
unapproved content. Never accept user ID, score, XP, due date, achievement or streak claims.
The trusted answer key and server receipt time determine canonical rewards. Atomically
persist the unique `(user_id, client_event_id)` result and rewards; retries return that
result, and conflicting reuse of an event ID must fail. Lock affected user/review rows;
review RPC additionally checks the expected schedule version. Client clocks are advisory,
offline events are provisional, and receipt-day attribution prevents backdated streak
awards. Freeze consumption is at most once per stored local date; timezone is fixed for
existing activity until a trusted migration defines a transition. No reward RPC exists
in this migration; UI must not claim server validation until it is implemented and tested.

**SPA sessions.** Use per-tab `sessionStorage`, automatic token refresh, and an explicit
application maximum session age (12 hours). Expiry, auth failure and sign-out clear the
session, query cache, persisted state and queued personal events. Use Supabase global
sign-out for logout-all; remove local state even on remote failure and report that remote
revocation could not be confirmed. Global sign-out revokes refresh sessions; previously
issued access JWTs can remain valid until their expiry. Configure short hosted JWT expiry
(e.g. 15 minutes) and hosted session limits where supported; client timers are UX, not
server enforcement. New tabs need login. Cache static application/curriculum assets only;
never cache auth/API responses, tokens or personal records in a service worker.

SDK BroadcastChannel names are unique per page/client; a supported storage adapter maps
each SDK key to stable per-tab slots. Logout seals old adapters against pending refresh
writes, removes persisted credentials/private data immediately, then bounds remote token
revocation to four seconds. New login rotates to a fresh SDK instance. Browsers may clone
sessionStorage for opener/duplicate tabs: cloned sessions still undergo independent server
owner verification and the original absolute deadline; ongoing events are isolated.

The hosted security advisor's [RLS-no-policy information](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
for private.app_owner is intentional: clients have neither table privileges nor policies;
only the trusted security-definer membership helper reads the singleton. Its denied access
is covered by database tests. Foreign-key lookup indexes were added after the hosted
[index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

**Operations and alternatives.** Public signup and automatic metadata-based provisioning
were rejected: they would violate the single-owner boundary. Manually create and confirm
the owner, then run the provisioning template in `supabase/README.md`. In hosted Auth,
disable new signups and anonymous sign-ins, enable email confirmation, require a long
unique password (at least 12 characters, preferably a password-manager-generated 16+),
enable leaked-password protection if available, set authentication rate limits and
restrict site/redirect URLs to the real HTTPS app. Verify actual login/reset rate limits
and session/logout behavior against the hosted project. SQL does not configure these
Auth/dashboard controls. Local PostgreSQL tests simulate `auth.uid()`; they establish
SQL grants/RLS, not JWT validation, GoTrue behavior, dashboard configuration or deployment.
