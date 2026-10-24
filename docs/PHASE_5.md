# Phase 5 brief

1. Replace statistics placeholder with truthful owner/local analytics using existing verified records.
2. Show Malaysia-day calendar, XP trend, time studied, mastered-word criterion and topic accuracy.
3. Show weak words/tones only when supported by canonical item-level attempts; disclose coverage.
4. Export only current-scope personal records as versioned JSON or spreadsheet-safe UTF-8 CSV.
5. Validate query responses and exports; use bounded/paginated reads, clear loading/error/empty states.
6. Purge analytics on logout/expiry; local practice must never appear as synced owner progress.
7. Accessible charts include text/table equivalents, keyboard controls and reduced-motion support.
8. Check CSV formula injection, scope isolation and one critical export/browser flow.
9. Run phase-end code/UX reviewers once and one consolidated fix pass, then continue to Phase 6.

## Verification and one review/fix pass

Typecheck/lint/build pass; 42 unit tests include CSV safety, Malaysia midnight, distinct mastery
and a logout-during-export regression. Six Playwright/axe flows pass, including mobile export
and isolation from unrelated browser storage. PostgreSQL 17.11 passes 206 assertions.
Code reviewer found no issues. UX calendar month/date visibility, selected-range styling and
44px data-table disclosure were improved in one parent fix pass. A suspected literal CSV escape
issue was not reproduced: runtime tests confirm a real U+FEFF BOM and CRLF row separators.
No second review. Two reviewer runs, no implementation agent; trim optional charts if credits
are low. Hosted RPC and final deployed owner-login checks remain for publication.

Hosted migration applied and verified using the provisioned owner's database role in a
read-only transaction: zero fabricated attempt groups, anon EXECUTE denied. This verifies
the deployed SQL boundary; a real password browser login is still not claimed. Final CSS
lint is clean and the rebuilt mobile export/axe flow passes after the UX fixes.
