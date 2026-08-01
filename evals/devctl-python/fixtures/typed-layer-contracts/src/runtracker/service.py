from pathlib import Path
from typing import Any

from runtracker.repository.codec import load_state, save_state


class RunService:
    """Dispatch ready operations from persisted state."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def dispatch(self, run_id: str, limit: int) -> dict[str, Any]:
        """Reserve at most limit operations and persist the dispatched state."""
        if limit < 1:
            raise ValueError("limit must be positive")
        state = load_state(self._root, run_id)
        operations = state["operations"][:limit]
        state["status"] = "dispatched"
        save_state(self._root, run_id, state)
        return {"operations": operations, "status": state["status"]}
