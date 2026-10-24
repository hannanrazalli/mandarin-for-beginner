# ADR 006 — Bounded offline owner practice

Accepted 2026-10-24. This records the implementation contract; tests must establish behavior.

Keep prior online owner verification in per-tab sessionStorage with the original 12-hour
absolute deadline and a shared owner epoch. Offline mode can queue provisional learning,
but exposes no canonical API client or private analytics. Cold offline browsers use local
practice. Reconnect must verify getUser and the RLS owner profile before dispatching.

Store bounded immutable owner/session/event intents in separate localStorage keys; persist
before first send, retain exact RPC IDs/answers/versions/duration, and write monotonic outcomes.
The server grades and awards once. Version/validation conflicts are terminal; transient
transport failures back off. Never rewrite a conflicting event into a fresh reward request.
A minimal sessionStorage curriculum/schedule snapshot permits bounded offline resumption.

Logout/expiry/denial seals adapters, rotates the shared epoch and purges owner queues,
snapshots, queries and pending exports before remote revocation. Every asynchronous commit
must retain the same live lease. Other tabs invalidate on epoch changes. Browser storage
failure and remote revocation while offline remain explicit limits. API/auth responses and
personal records never enter service-worker caches.

The exact schemas, transitions, integration sites and acceptance checks are in
[OFFLINE_SYNC.md](../OFFLINE_SYNC.md). Server receipt day determines queued activity dates.
Device TTS can require internet; it is not recorded or pronunciation-graded audio.
