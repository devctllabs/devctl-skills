from contextlib import AbstractContextManager
from typing import Protocol

from hotspot_app.domain import DispatchResult, RunState


class RunRepository(Protocol):
    def locked(self, run_id: str) -> AbstractContextManager[None]: ...

    def load_state(self, run_id: str) -> RunState: ...

    def save_state(self, state: RunState) -> None: ...

    def write_invocation(self, run_id: str, attempt: int, content: str) -> str: ...

    def load_result(self, run_id: str, attempt: int) -> str: ...

    def write_diagnostic(self, run_id: str, attempt: int, message: str) -> None: ...

    def retain_outputs(self, run_id: str, attempt: int) -> tuple[str, ...]: ...

    def publish(self, state: RunState) -> None: ...

    def list_run_ids(self) -> tuple[str, ...]: ...


class RunService:
    def __init__(self, repository: RunRepository) -> None:
        self._repository = repository

    def dispatch(self, run_id: str, limit: int) -> DispatchResult:
        if limit < 1:
            raise ValueError("limit must be positive")
        with self._repository.locked(run_id):
            state = self._repository.load_state(run_id)
            if state.status in {"complete", "blocked"}:
                return DispatchResult((), state.status)
            if state.attempts >= limit:
                blocked = RunState(run_id, "blocked", state.attempts)
                self._repository.save_state(blocked)
                return DispatchResult((), "blocked")
            attempt = state.attempts + 1
            invocation = self._repository.write_invocation(run_id, attempt, "execute")
            self._repository.save_state(RunState(run_id, "active", attempt))
            return DispatchResult((invocation,), "active")

    def finish(self, run_id: str, attempt: int) -> str:
        with self._repository.locked(run_id):
            state = self._repository.load_state(run_id)
            if state.status != "active":
                raise ValueError("run is not active")
            if attempt != state.attempts:
                raise ValueError("attempt is not current")
            result = self._repository.load_result(run_id, attempt)
            if result == "invalid":
                self._repository.write_diagnostic(run_id, attempt, "invalid result")
                raise ValueError("invalid result")
            if result == "blocked":
                updated = RunState(run_id, "blocked", state.attempts)
            else:
                self._repository.retain_outputs(run_id, attempt)
                updated = RunState(run_id, "complete", state.attempts)
                self._repository.publish(updated)
            self._repository.save_state(updated)
            return updated.status
