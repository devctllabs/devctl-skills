import json
from pathlib import Path
from tempfile import TemporaryDirectory
import sys
import unittest


sys.path.insert(0, str(Path(__file__).parents[3] / "src"))

from runtracker.service import RunService


class RunServiceTests(unittest.TestCase):
    def test_dispatch_selects_operations_and_persists_status(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            run = root / "runs" / "run-1"
            run.mkdir(parents=True)
            state = {
                "status": "active",
                "operations": [
                    {"node": "build", "agent": "worker", "labels": {"attempt": "1"}},
                    {"node": "verify", "agent": "reviewer", "labels": {}},
                ],
            }
            (run / "state.json").write_text(json.dumps(state))

            result = RunService(root).dispatch("run-1", 1)

            self.assertEqual(
                result,
                {
                    "operations": [
                        {"node": "build", "agent": "worker", "labels": {"attempt": "1"}}
                    ],
                    "status": "dispatched",
                },
            )
            persisted = json.loads((run / "state.json").read_text())
            self.assertEqual(persisted["status"], "dispatched")

    def test_dispatch_rejects_non_positive_limit(self) -> None:
        with TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ValueError, "positive"):
                RunService(Path(temporary)).dispatch("run-1", 0)
