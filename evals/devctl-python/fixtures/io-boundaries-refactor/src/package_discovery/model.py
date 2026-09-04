from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Plugin:
    """A plugin reported by the external plugin manager."""

    name: str
    enabled: bool
