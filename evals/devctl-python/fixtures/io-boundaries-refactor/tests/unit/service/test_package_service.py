import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).parents[3] / "src"))

from package_discovery.service import PackageService


class PackageServiceTests(unittest.TestCase):
    def test_discovers_enabled_local_packages(self) -> None:
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
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "alpha.toml").write_text("", encoding="utf-8")
            with patch("package_discovery.service.subprocess.run", return_value=completed):
                self.assertEqual(PackageService().discover(root, "codex"), ("alpha",))


if __name__ == "__main__":
    unittest.main()
