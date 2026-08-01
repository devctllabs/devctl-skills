"""Run contracts."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class DispatchResult:
    """Describe reserved coordinator operations."""

    operations: tuple[str, ...]
    status: str


@dataclass(frozen=True, slots=True)
class RunState:
    """Describe persisted run lifecycle state."""

    run_id: str
    status: str
    attempts: int
