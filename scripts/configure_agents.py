"""Validate agent definitions; --sync applies the central model tier table (stdlib only)."""
from pathlib import Path
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
TIERS = {
    "uiux_specialist": "MID", "code_specialist": "MID",
    "code_reviewer": "MID", "uiux_reviewer": "MID",
    "backend_security_engineer": "HIGH", "security_reviewer": "HIGH",
    "mandarin_teacher": "MID", "content_bulk_writer": "LOW",
}


def main():
    if sys.argv[1:] not in ([], ["--sync"]):
        raise ValueError("Usage: python3 scripts/configure_agents.py [--sync]")
    rows = re.findall(
        r"^\| (LOW|MID|HIGH) \| ([\w.-]+) \| (low|medium|high) \|$",
        (ROOT / "docs/MODEL_TIERS.md").read_text(), re.MULTILINE,
    )
    mapping = {tier: (model, effort) for tier, model, effort in rows}
    assert len(rows) == len(mapping) == 3, "Exactly three unique model tiers required"
    paths = sorted((ROOT / ".codex/agents").glob("*.toml"))
    assert {p.stem for p in paths} == set(TIERS), "Exactly the eight requested roles required"
    names = set()
    for path in paths:
        source = path.read_text()
        model, effort = mapping[TIERS[path.stem]]
        if "--sync" in sys.argv:
            source = re.sub(r'^model = ".*"$', f'model = "{model}"', source, flags=re.MULTILINE)
            source = re.sub(r'^model_reasoning_effort = ".*"$',
                            f'model_reasoning_effort = "{effort}"', source, flags=re.MULTILINE)
            path.write_text(source)
        agent = tomllib.loads(source)
        required = {"name", "description", "developer_instructions", "model", "model_reasoning_effort"}
        assert set(agent) == required, f"{path.name}: unsupported/missing keys"
        assert all(isinstance(agent[k], str) and agent[k].strip() for k in required)
        assert agent["name"] == path.stem and agent["name"] not in names
        names.add(agent["name"])
        assert (agent["model"], agent["model_reasoning_effort"]) == (model, effort)
        instructions = agent["developer_instructions"]
        for section in ("Role:", "Scope:", "Inputs:", "Method:", "Quality bar:",
                        "Output format:", "Escalate to orchestrator when"):
            assert section in instructions, f"{path.name}: missing {section}"
        assert len(instructions.splitlines()) < 60
        assert "Do not spawn" in instructions
    config = tomllib.loads((ROOT / ".codex/config.toml").read_text())
    assert config == {"agents": {"enabled": True, "max_concurrent_threads_per_session": 4}}
    assert len((ROOT / "AGENTS.md").read_text().splitlines()) < 150
    print("PASS: config + 8 agent TOMLs parse; names, required sections, tiers and limits valid.")
    print("Roles: " + ", ".join(sorted(names)))
    print("Native desktop discovery and separate account entitlement require desktop verification.")


if __name__ == "__main__":
    main()
