# Offline sync implementation contract

Accepted 2026-10-24 **as an implementation contract**, not evidence of implemented behavior.
Supersedes ADR 002's blanket personal-record persistence prohibition only for the explicit
minimal snapshot and pending intents below. Server authorization and ADRs 003–005 remain.

**Auth contract.** Add `status: "ownerOffline"` alongside existing statuses. Keep `owner`
(`{id,email}`; offline email can be empty), expose `client` only for `status === "owner"`,
and add `canSync: boolean` and `ownerSession: VerifiedOwnerSession | null`:

```ts
type VerifiedOwnerSession = {
  v: 1; ownerId: string; sessionId: string; ownerEpoch: string;
  startedAt: number; verifiedAt: number; expiresAt: number;
}; // IDs/epoch are UUIDs; times are integer milliseconds.
```

Only successful online `getUser()` with confirmed email **and** the RLS-filtered matching
profile may create `bm-owner-verified:v1` in sessionStorage. Generate the application
`sessionId` on that verified login; it is not the auth access token or a secret. Reuse it
on same-session verification/reload. `startedAt` must match `bm-auth-started-at`;
`expiresAt = startedAt + MAX_APP_SESSION_MS` (12 hours), never extended by refresh, reload
or offline activity. Validate `startedAt <= verifiedAt <= now < expiresAt`; reject future
or malformed dates, owner mismatches and changed `ownerEpoch`. No email, token, password
or user metadata is stored in this marker. It records prior verification, not present auth.

Refactor `auth/owner.ts` to return a discriminated result: verified owner, definitive denial,
or transient unavailability. It currently conflates network and permission failures.
Only a transport failure/offline connection, timeout, 429 or 5xx may retain a valid marker
and enter `ownerOffline`; HTTP 401/403, missing/unconfirmed user, successful missing profile,
or owner mismatch must seal and purge. Other errors fail closed; never infer authority
from `getSession()` or `navigator.onLine`. Offline startup can use the valid prior marker
without a successful session refresh. Missing marker means ordinary local practice, even
if a cached SDK user exists. True `SIGNED_OUT`, expiry and account change always purge.
If token refresh fails transiently, retain only offline intent capability, not `client`.

`ownerOffline` may read its bounded snapshot and enqueue intents for that exact owner;
it cannot perform canonical queries, mutations, settings writes or private exports. On
online/foreground/retry, suspend dispatch, run `getUser` plus profile verification again,
then expose `owner`/`canSync` and drain. Check expiry on startup, timer, visibility, reads,
enqueue and every async commit. Hold an in-memory auth revision/lease across awaits; a
successful old verification must not revive a logged-out or replaced session. Browser
clock/storage manipulation is outside this local privacy mechanism; RLS/RPC checks remain
necessary even after UI verification. Remote revocation cannot be discovered while offline.

**Storage choice and exact records.** Use synchronous localStorage for small immutable
intent records, avoiding IndexedDB transactions and asynchronous deletion races. Do not
use one read/modify/write array: separate keys avoid losing another tab's event.

- Event key: `bm-owner-event:<ownerId>:<sessionId>:<eventId>`; strict schema
  `{v:1,ownerId,sessionId,ownerEpoch,expiresAt,createdAt,kind,args}`. `kind` is
  `"completion" | "review" | "testout"`. `args` is the **exact** corresponding typed
  `complete_lesson`, `review_word` or `test_out_unit` argument object, including a stable
  `p_event_id === eventId`. Reject unknown fields, malformed UUIDs, nonfinite values,
  duplicate item IDs and mismatched owner/session/expiry. Apply SQL bounds: 200 answers,
  2,000 characters/answer, 80-character IDs, 128 KiB answer JSON, duration 0–600,
  positive versions and hints 0–2. Persist once before the first request, even online;
  never rebuild answers, duration, expected version or ID during retry.
- Separate retry key `bm-owner-retry:<ownerId>:<sessionId>:<eventId>` stores only
  `{attempts,nextAttemptAt,errorKind}`. Separate monotonic outcome keys
  `bm-owner-outcome:<ownerId>:<sessionId>:<eventId>` store `{state:"accepted"|"rejected",
  reason,expiresAt,ownerEpoch}`. Write outcome before removing an event; retry metadata
  cannot recreate an event or override an outcome. No raw server error/body is retained.
- Bound all intent/outcome records to 1,000 per owner and 2 MiB serialized storage total
  (conservatively count UTF-16 storage bytes). Refuse a new durable enqueue on quota,
  unavailable storage, or limit failure; explain that the answer is not saved for sync.
  Keep in-memory practice available. Never silently evict unacknowledged events. Outcomes
  last until the original expiry; garbage-collect expired event/retry/outcome namespaces.
- Snapshot key in **sessionStorage**: `bm-owner-snapshot:<ownerId>:<sessionId>`, strict
  `{v:1,ownerId,sessionId,ownerEpoch,expiresAt,savedAt,completed,reviews}`. `completed`
  contains `{lessonSlug,contentVersion}` from successful validated canonical reads;
  `reviews` contains only `{wordId,wordSlug,modality,version,dueAt}`. Bound completed to
  2,000 entries, reviews to 1,200 and the snapshot to 256 KiB of serialized UTF-8 JSON
  (at most approximately twice that for browser UTF-16 storage). Resolve word teaching text
  from bundled public curriculum. Write only while the same verified owner lease is live;
  compare IDs, versions and deadline on restore. Do not persist sessions, analytics,
  email, XP/streak/badge totals, profile responses or complete query caches.

A cold/new tab with no prior verified marker is local practice; there is no automatic
queue import into another session or account. Browsers may copy sessionStorage when
explicitly duplicating a tab; copied sessions remain deadline-bound and server-checked.
Closing the tab loses its marker: stale localStorage alone cannot restore owner mode.

**Offline learning and replay.** Keep owner scope during `ownerOffline` (never convert an
owner event into `practice`). `useLearningProgress` must not block on an intentionally
disabled query's `isPending` or an earlier network error. Restore canonical completed
slugs from the validated snapshot so existing lessons work after offline reload. Overlay
locally graded queued completion/test-out passes only as **provisional unlocks**; use SQL's
normalization and thresholds, disclose pending status, and never award canonical XP,
streaks, badges or schedule changes. Recompute this overlay from pending intents, not
from an editable completed flag. A failed parent event removes its provisional unlock;
dependent events stay blocked for explicit resolution, never promoted automatically.
Keep accepted completion slugs from a validated receipt in the snapshot if its version
matches the submitted curriculum; do not replace current aggregates with an old retry
receipt. Refresh canonical progress/reviews after draining to reconcile current state.

Reviews can queue only from the last verified schedule snapshot. Allow at most one
pending event per `(wordId,modality,expectedVersion)`; extra repetitions are local practice.
Do not predict new schedule versions. Test-out retains every lesson/item answer and its
original unit version; locally finishing Unit 0 does not bypass the server prerequisite.

One foreground dispatcher per live session drains oldest intents first; a Web Lock named
`bm-owner-sync:<ownerId>:<sessionId>` reduces duplicate dispatch where supported. Correctness
must not depend on that lock: concurrent tabs can submit identical immutable events and
the server's unique receipt/owner lock prevents duplicate rewards. Recheck the lease,
owner epoch and durable outcome before dispatch and after every await. Only exact matching,
validated RPC results acknowledge an event. A mismatched/invalid response pauses that
intent for inspection; never silently accept it or create a fresh ID. A lost response or
crash after commit resends the same event and retrieves its canonical receipt.

Classify structured SDK/PostgREST errors, preserving status/code internally rather than
`throw new Error("Unavailable")`: transport/timeout/429/5xx retry with bounded exponential
backoff (1, 2, 4…60 seconds plus jitter; honor bounded Retry-After), persisting the retry
clock; stop while offline/hidden/expired. 401/403/42501 pause all sends and reverify owner;
definitive denial purges. 22023 validation/version/payload conflicts are terminal,
including stale review versions, changed curriculum, withdrawn content and unavailable
prerequisites after earlier pending events resolve. Mark rejected, show a concise reason,
and offer a **new practice attempt** after refresh; never mutate the failed event. A
server-version conflict must not be retried by rewriting `p_expected_version`. Accepted
and terminal outcomes survive reload until original expiry. Unknown nontransient errors
pause for explicit retry after revalidation rather than retry forever. No background-sync
service worker receives tokens or flushes owner work while the app is closed.

**Purge barrier and integration sites.** Use `bm-owner-epoch:<ownerId>` in localStorage
(UUID initialized after online verification) as the shared revocation marker. On logout,
expiry, owner denial or account change: synchronously increment the auth revision, seal
auth and offline-storage adapters, rotate that epoch, stop dispatcher/timers, and remove
that owner's event/retry/outcome keys and this tab's marker/snapshot before awaiting remote
revocation. Register offline cleanup with `registerAccountPurger`; extend
`createTabAuthStorage.seal()` to clear the marker/snapshot. Every store operation compares
the captured epoch/session/deadline, and adapters cannot write after sealing. Late retries
may neither recreate deleted events nor snapshot data. React state setters, TanStack
cache writes, acknowledgments and downloads all require the same live lease.

Notify other tabs using the storage event/BroadcastChannel with only `{ownerId,ownerEpoch}`,
never tokens. Local privacy purge applies to this owner's data across this browser even
when remote sign-out uses `scope=local`; remote global logout remains explicit. Other tabs
cannot have their sessionStorage physically removed synchronously by this tab: the shared
epoch immediately invalidates reads/commits, and each tab seals and purges on notification
or visibility before rendering private content. Retain the epoch tombstone; deleting it
would allow stale metadata to match an earlier default. Failed physical deletion is
reported; logical sealing still denies reuse, and the app cannot promise deletion from a
browser whose storage API failed.

Update `AuthProvider` expiry/verification transitions; `auth/owner`, `session`, `tab-storage`
and purger; learning cloud/store/player scope logic; reviews cloud/Reviews/TestOut; and
analytics ready/export gates. Existing learning purger must keep cancelling queries,
clearing QueryClient and player state. Abort exports, invalidate their epoch and revoke
outstanding Blob URLs; a finished browser download cannot be recalled. Do not persist
private analytics offline. General local-practice stores remain separate and may survive
logout; owner intents must never enter those stores. Service-worker precache stays limited
to app shell, bundled curriculum/fonts/strokes and licensed local audio. No Supabase/auth
URL, authenticated response, POST body, token or personal snapshot enters CacheStorage.

**Acceptance and honest limits.** Test verified-online → completed lesson → offline reload
with unlock retained; stable queued ID/payload through reload, timeout and server-commit
response loss; exact-once reward after reconnect; cold offline/session-only spoof does not
become owner; revoked/unconfirmed owner denied on reconnect; expired/backdated metadata,
owner switch, corrupt/oversized stores and quota failures; logout during verification,
RPC response, snapshot write and export; concurrent duplicate sends and stale review
conflicts; no API responses in SW caches. Test re-verification before any network drain,
expiry while hidden, cross-tab epoch invalidation and terminal-parent dependent unlocks.
Queued activity uses **server receipt day**, not the offline calendar date. Browser TTS
may require network or lack Chinese voices; provide readable practice and honest audio
fallback. Pending learning can be lost on tab closure, session expiry, logout or browser
storage eviction; communicate this before discard and do not extend the 12-hour boundary.

References checked through Supabase search_docs: [sessions](https://supabase.com/docs/guides/auth/sessions),
[getUser](https://supabase.com/docs/reference/javascript/auth-getuser), and
[sign-out](https://supabase.com/docs/reference/javascript/auth-signout). Access JWTs can remain
valid until expiry after logout; local purge does not revoke them. Changelog fetch returned
HTTP 403 in this environment; no review of inaccessible changelog content is claimed.
