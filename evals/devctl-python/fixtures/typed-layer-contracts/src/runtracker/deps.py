from pathlib import Path

from runtracker.service import RunService


def build_service(root: Path) -> RunService:
    """Build the run service for one project root."""
    return RunService(root)
