"""Filesystem-backed run persistence."""

import json
import shutil
from contextlib import AbstractContextManager, nullcontext
from pathlib import Path

from hotspot_app.domain import RunState


class FilesystemRunRepository:
    """Store run state and publish accepted output files."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def locked(self, run_id: str) -> AbstractContextManager[None]:
        """Return the run transition lock."""
        return nullcontext()

    def load_state(self, run_id: str) -> RunState:
        """Load and validate one persisted run state."""
        if not run_id or "/" in run_id or "\\" in run_id:
            raise ValueError("run ID must be a safe segment")
        raw: object = json.loads((self._root / run_id / "state.json").read_text())
        if not isinstance(raw, dict):
            raise ValueError("state must be an object")
        unknown = set(raw) - {"schema_version", "run_id", "status", "attempts"}
        if unknown:
            raise ValueError("state contains unknown fields")
        if raw.get("schema_version") != 1:
            raise ValueError("schema version must equal one")
        if raw.get("run_id") != run_id:
            raise ValueError("state run ID must match its path")
        status = raw.get("status")
        attempts = raw.get("attempts")
        if not isinstance(status, str):
            raise ValueError("status must be a string")
        if status not in {"active", "blocked", "complete"}:
            raise ValueError("status is invalid")
        if not isinstance(attempts, int):
            raise ValueError("attempts must be an integer")
        if isinstance(attempts, bool):
            raise ValueError("attempts must not be boolean")
        if attempts < 0:
            raise ValueError("attempts must be non-negative")
        if status == "active" and attempts == 0:
            raise ValueError("active run must have an attempt")
        if status == "complete" and attempts < 1:
            raise ValueError("complete run must have an attempt")
        return RunState(run_id, status, attempts)

    def save_state(self, state: RunState) -> None:
        """Persist one run state."""
        path = self._root / state.run_id / "state.json"
        path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "run_id": state.run_id,
                    "status": state.status,
                    "attempts": state.attempts,
                }
            )
        )

    def write_invocation(self, run_id: str, attempt: int, content: str) -> str:
        """Persist an invocation for one attempt."""
        path = self._root / run_id / f"attempt-{attempt}" / "invocation.md"
        path.parent.mkdir()
        path.write_text(content)
        return str(path)

    def load_result(self, run_id: str, attempt: int) -> str:
        """Load the control result for one attempt."""
        return (self._root / run_id / f"attempt-{attempt}" / "result.txt").read_text().strip()

    def write_diagnostic(self, run_id: str, attempt: int, message: str) -> None:
        """Persist one result-contract diagnostic."""
        (self._root / run_id / f"attempt-{attempt}" / "diagnostic.txt").write_text(message)

    def retain_outputs(self, run_id: str, attempt: int) -> tuple[str, ...]:
        """Retain accepted attempt outputs."""
        source = self._root / run_id / f"attempt-{attempt}" / "output"
        retained = self._root / run_id / "artifacts"
        shutil.copytree(source, retained)
        return tuple(path.name for path in retained.iterdir())

    def publish(self, state: RunState) -> None:
        """Publish all retained outputs transactionally."""
        artifacts = self._root / state.run_id / "artifacts"
        publish_root = self._root / "published"
        transaction = self._root / ".publish"
        backups = transaction / "backups"
        applied: list[tuple[Path, Path | None]] = []
        try:
            for index, source in enumerate(sorted(artifacts.iterdir())):
                applied.append(self._publish_one(source, publish_root, backups / str(index)))
        except OSError:
            self._rollback(applied)
            raise
        finally:
            shutil.rmtree(transaction, ignore_errors=True)

    def _publish_one(self, source: Path, publish_root: Path, backup: Path) -> tuple[Path, Path | None]:
        """Publish one artifact while retaining any replaced target."""
        if not source.exists():
            raise ValueError("artifact must exist")
        if source.is_symlink():
            raise ValueError("artifact must not be a symlink")
        if source.name in {"", ".", ".."}:
            raise ValueError("artifact must have a safe name")
        if source.name.startswith("."):
            raise ValueError("hidden artifacts cannot be published")
        if not publish_root.is_absolute():
            raise ValueError("publication root must be absolute")
        target = publish_root / source.name
        if not target.resolve().is_relative_to(publish_root.resolve()):
            raise ValueError("publication target escapes its root")
        retained_backup = None
        if target.exists():
            if target.is_symlink():
                raise ValueError("existing target must not be a symlink")
            backup.parent.mkdir(parents=True, exist_ok=True)
            target.replace(backup)
            retained_backup = backup
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target)
        elif source.is_file():
            shutil.copy2(source, target)
        else:
            raise ValueError("artifact must be a file or directory")
        return target, retained_backup

    def _rollback(self, applied: list[tuple[Path, Path | None]]) -> None:
        """Restore targets changed by the current publication."""
        for target, backup in reversed(applied):
            if target.is_dir():
                shutil.rmtree(target)
            else:
                target.unlink(missing_ok=True)
            if backup is not None:
                backup.replace(target)

    def list_run_ids(self) -> tuple[str, ...]:
        """List safe run directories."""
        return tuple(path.name for path in self._root.iterdir() if path.is_dir())
