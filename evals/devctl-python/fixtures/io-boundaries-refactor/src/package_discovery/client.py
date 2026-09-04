import json
import subprocess

from package_discovery.errors import PluginClientError
from package_discovery.model import Plugin


class CodexPluginClient:
    """Load plugin descriptors from the Codex CLI JSON contract."""

    def __init__(self, executable: str) -> None:
        self._executable = executable

    def list_plugins(self) -> tuple[Plugin, ...]:
        try:
            completed = subprocess.run(
                [self._executable, "plugin", "list", "--json"],
                check=True,
                capture_output=True,
                text=True,
            )
            payload = json.loads(completed.stdout)
            return tuple(
                Plugin(name=item["name"], enabled=item["enabled"])
                for item in payload
            )
        except (OSError, subprocess.SubprocessError, json.JSONDecodeError, KeyError, TypeError) as error:
            raise PluginClientError("could not load plugins") from error
