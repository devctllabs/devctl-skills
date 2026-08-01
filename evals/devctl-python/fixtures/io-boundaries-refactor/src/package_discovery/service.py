import json
import subprocess
from pathlib import Path


class PackageService:
    """Discover enabled packages from the Codex CLI and filesystem."""

    def discover(self, root: Path, executable: str) -> tuple[str, ...]:
        """Return enabled package names that have local package metadata."""
        completed = subprocess.run(
            [executable, "plugin", "list", "--json"],
            check=True,
            capture_output=True,
            text=True,
        )
        enabled = {
            item["name"]
            for item in json.loads(completed.stdout)
            if item.get("enabled", False)
        }
        available = {path.stem for path in root.glob("*.toml")}
        return tuple(sorted(enabled & available))
