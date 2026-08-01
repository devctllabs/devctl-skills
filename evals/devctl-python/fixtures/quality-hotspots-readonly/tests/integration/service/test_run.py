import json
from pathlib import Path

from hotspot_app.repository.run import FilesystemRunRepository
from hotspot_app.service.run import RunService


def test_dispatches_one_run_through_the_filesystem(tmp_path: Path) -> None:
    run = tmp_path / "run-1"
    run.mkdir()
    (run / "state.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "run_id": "run-1",
                "status": "blocked",
                "attempts": 0,
            }
        )
    )

    result = RunService(FilesystemRunRepository(tmp_path)).dispatch("run-1", 1)

    assert result.status == "blocked"
    assert result.operations == ()
