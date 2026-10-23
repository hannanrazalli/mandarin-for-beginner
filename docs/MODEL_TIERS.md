# Model tiers

Edit ONLY the three rows below, then run `python3 scripts/configure_agents.py --sync`.
The script updates agent TOMLs; normal validation rejects drift.

| Tier | Model | Effort |
| --- | --- | --- |
| LOW | gpt-6-luna | low |
| MID | gpt-6.1-sol | medium |
| HIGH | gpt-6-astra | high |

Evidence: `codex debug models` (CLI 0.163.0, 2026-10-23) listed these models;
the current chat's spawn tool also advertises all three. The catalog additionally lists
gpt-6-sol, gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, two daybreak aliases, gpt-5.5 and
codex-auto-review. These extra entries are not selected.
This establishes environment support, NOT access or remaining limits on your desktop login.
Your desktop model picker is the final account check; no OpenAI API key or paid API setup needed.
Luna is the economy choice; no exact Plus-credit pricing or "cheapest" guarantee is available.
Only backend_security_engineer and security_reviewer use HIGH; code review uses MID.
If a selected model is unavailable, report it; do not silently upgrade the tier.
No strongest-model UI code, nested agents, or automatic delegation.
