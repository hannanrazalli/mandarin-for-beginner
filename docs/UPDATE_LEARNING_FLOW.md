# Learning flow and language update

1. Show actual word/sample meaning immediately, including early pinyin examples.
2. Expose Next directly; revealing explanations must never gate lesson progress.
3. Keep all interface and explanatory content in the selected BM/English language.
4. Preserve Chinese/pinyin teaching targets and canonical Malay server answer contracts.
5. Teacher owns a complete semantic translation overlay; frontend owns display/mapping.
6. Verify language switching, direct progression, wrong-answer preservation and queue payloads.
7. One scoped code/UX review pair, at most one fix pass; push and manually deploy, no CI/CD.

Scope remains the current three units (0–2), 95 lessons and 300 words. This update does not
claim a complete Malaysian school syllabus or a standalone route to conversational fluency.

Verification: teacher-reviewed overlay covers all 95 lesson titles, 370 item meanings/notes
and 13 topics. Both content validators pass and canonical Malay vocabulary meanings are
unchanged. Typecheck/lint/build pass; 77 unit tests and nine browser/axe flows pass, including
direct Next and English mode. The final English alias tweak passed all unit tests, and the
parent rebuilt and reran the English browser flow successfully. Code/UX reviewers ran once,
scoped to changed files, with no findings; no fix pass was needed. Four specialist runs
(teacher, implementation, two reviews); small future copy changes can be handled solo.
