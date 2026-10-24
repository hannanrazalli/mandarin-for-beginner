# ADR 005 — Own-record analytics and export

Accepted 2026-10-24. Daily XP/time/accuracy comes from accepted study_sessions, grouped in
Asia/Kuala_Lumpur. No study time is invented for historical zero-duration reviews/test-outs.
A mastered word means at least three successful repetitions and a six-day interval in one
modality, counted once per word. This is a stated learning heuristic, not certification.

The owner-only learning_insights RPC reads private canonical completion receipts against
their preserved content_version keys. It returns aggregated item/review counts, never answer
keys or another user's data. Explicit confirmed-owner authorization, fixed empty search_path
and authenticated-only EXECUTE protect the required SECURITY DEFINER capability. SQL tests
cover anonymous/nonowner denial, actual/wrong counts and no private-key output. Test-out item
details lack historical per-item key versions, so they are excluded from item/topic/tone detail;
their actual aggregate accuracy/XP/time still contributes. UI discloses this coverage. Tone
figures describe correctness of Unit 0 items containing those tones, not pronunciation scoring.

Export uses an explicit seven-table own-record allowlist with ownership filters/RLS, stable
ordering, exact-count pagination and cancellation. It refuses incomplete reads or >50,000
records in one table rather than silently truncating. Separate paginated reads cover a short
collection window, not an atomic database backup; concurrent activity may require a fresh
export. Logout/expiry cancels queries and invalidates any pending download. Local practice is
exported separately and never merges into an owner export. No auth session, token or password
is queried. JSON is versioned; CSV preserves record columns and table names with quotes,
UTF-8 BOM and formula-leading character neutralization. Nested values remain JSON cells.

The migration filename was generated with Supabase CLI 2.122.0. This ephemeral authoring tool
is not an app dependency. SUPABASE_HOME points to a writable task cache; telemetry is disabled.
Official function/privilege docs were checked via Supabase search_docs; direct changelog.md
fetch was blocked by the environment proxy. No claimed review of inaccessible changelog text.
