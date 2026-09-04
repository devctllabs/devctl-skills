import json
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).parents[3] / "src"))

from package_discovery.client import CodexPluginClient
from package_discovery.errors import PluginClientError
from package_discovery.model import Plugin


class CodexPluginClientTests(unittest.TestCase):
    def test_maps_the_cli_contract(self) -> None:
        completed = subprocess.CompletedProcess(
            args=[],
            returncode=0,
            stdout=json.dumps(
                [
                    {"name": "alpha", "enabled": True},
                    {"name": "beta", "enabled": False},
                ]
            ),
            stderr="",
        )
        with patch("package_discovery.client.subprocess.run", return_value=completed) as run:
            plugins = CodexPluginClient("codex").list_plugins()

        self.assertEqual(plugins, (Plugin("alpha", True), Plugin("beta", False)))
        run.assert_called_once_with(
            ["codex", "plugin", "list", "--json"],
            check=True,
            capture_output=True,
            text=True,
        )

    def test_normalizes_process_failures(self) -> None:
        with patch(
            "package_discovery.client.subprocess.run",
            side_effect=subprocess.CalledProcessError(1, ["codex"]),
        ):
            with self.assertRaises(PluginClientError):
                CodexPluginClient("codex").list_plugins()


if __name__ == "__main__":
    unittest.main()
