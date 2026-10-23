# Verified documentation and runtime limits

Checked 2026-10-23 before creating project files:
- [Subagents](https://developers.openai.com/codex/subagents)
- [Configuration reference](https://developers.openai.com/codex/config-reference)
- [AGENTS.md discovery](https://developers.openai.com/codex/guides/agents-md)

These official URLs currently redirect to ChatGPT Learn documentation.
Current documented custom agent fields include name, description, developer_instructions,
model and model_reasoning_effort. Files live in .codex/agents and match their name fields.
Current concurrency key: agents.max_concurrent_threads_per_session; max_threads is legacy.
We set 4 children. max_depth, job_max_runtime_seconds and nickname_candidates were not found
in the current reference and are omitted; no nesting and a 600-second budget are instructions.
Custom-file sandbox_mode does not override inherited permissions, so it is deliberately
omitted rather than misrepresented. Reviewer no-edit and writer directories are instructions.
Use appropriate parent permissions where the desktop app supports them; current hosted
spawn tools do not offer an independent child sandbox or named-agent loader argument.

CLI is 0.163.0. `codex debug models` succeeded and exposed the selected names. This is not
proof of the user's separate Plus login entitlement. `codex agents` browses sessions, not
custom agent definitions; do not claim it lists the eight TOMLs.
TOML parsing, role checks, model consistency and an explicit review smoke check can be
verified here. Native desktop discovery/loading remains a separate check; no automatic
activation of files is claimed. Existing tool-based children must receive the TOML brief
explicitly, with a fresh context and its tier settings when model overrides are needed.
