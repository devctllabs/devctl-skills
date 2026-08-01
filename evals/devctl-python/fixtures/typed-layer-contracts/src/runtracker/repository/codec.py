import json
from pathlib import Path
from typing import Any


def load_state(root: Path, run_id: str) -> dict[str, Any]:
    """Load one persisted run state."""
    return json.loads((root / "runs" / run_id / "state.json").read_text())


def save_state(root: Path, run_id: str, state: dict[str, Any]) -> None:
    """Persist one run state."""
    (root / "runs" / run_id / "state.json").write_text(json.dumps(state, sort_keys=True))
