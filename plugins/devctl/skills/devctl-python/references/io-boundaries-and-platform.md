# I/O Boundaries and Platform

## Contents

- Boundary Rule
- Paths Are Values, Not Ports
- Capability-Level Protocols
- Layer Ownership
- Filesystem Adapters
- Mixed External Integrations
- Dependency Wiring
- Review Checklist

## Boundary Rule

Keep service/usecase code deterministic except for behavior supplied through explicit
consumer-owned Protocols. Treat these as side effects when they observe or change external state:

- filesystem and object-storage access;
- database, cache, queue, or transaction access;
- HTTP, gRPC, SDK, or subprocess calls;
- wall clocks, random/ID sources, environment reads, telemetry, and other runtime handles.

Pass required side-effecting behavior through constructors. Wire concrete implementations in
entrypoints or `deps`; do not hide them behind module globals, first-use factories, or broad config
dictionaries.

Do not introduce Protocols for concrete data, config, options, domain values, or pure
transformations. The seam follows externally supplied behavior, not every imported type.

## Paths Are Values, Not Ports

Keep `pathlib.Path` concrete when a path is part of an input, output, config, or application
contract. Do not mock `Path` and do not define a Protocol that copies `exists`, `read_text`,
`write_text`, `mkdir`, `glob`, or other library methods.

Pure lexical operations such as joining a caller-visible relative path or checking `is_absolute`
may stay with the rule that owns them. Operations that consult or mutate the OS belong in a
filesystem adapter, including:

- `cwd`, `home`, `resolve`, `exists`, `stat`, `is_file`, and `is_dir`;
- `open`, `read_*`, `write_*`, `mkdir`, `unlink`, and rename/replace;
- directory traversal, globbing, copying, locking, and symlink checks.

Keep storage layout construction inside the filesystem repository. A service should not know that
run state lives at `runs/<id>/state.toml` merely because it receives a root `Path`.

## Capability-Level Protocols

Describe the smallest application capability the consumer needs:

```python
from pathlib import Path
from typing import Protocol


class PackageCatalog(Protocol):
    def load(self, source: Path) -> PackageBundle: ...


class RunWorkspace(Protocol):
    def load_result(self, run_id: str, node_id: str, attempt: int) -> ResultSpec: ...

    def accept_outputs(
        self,
        run_id: str,
        node_id: str,
        attempt: int,
        outputs: dict[str, str],
    ) -> AcceptedOutputs: ...
```

Prefer `load`, `save`, `reserve`, `materialize_inputs`, `accept_outputs`, or `publish` over a
generic filesystem port with `exists`, `read`, `write`, and `copy`. Capability-level methods:

- keep locking, atomicity, layout, and serialization in one adapter;
- let service tests use small fakes without reproducing `pathlib`;
- prevent service logic from depending on incidental I/O call order.

Do not move business policy into an adapter. Services still own state transitions, cross-resource
rules, selection policy, and the order of application operations. Adapters own external mechanics,
storage invariants, and low-level error normalization.

## Layer Ownership

| Layer | Owns |
| --- | --- |
| `domain` | values, invariants, operation contracts, application error categories |
| `service` / `usecase` | application policy, orchestration, state transitions, dependency calls |
| `repository` | database/cache/files/object-storage access, layout, serialization, locking, atomic writes |
| `client` | outbound HTTP/gRPC/SDK/subprocess calls and external response normalization |
| `platform` | optional shared domain-free primitives and concrete implementations of common ports |
| `deps` / entrypoint | config loading, concrete selection, construction, lifecycle, cleanup |

`platform` is not an escape hatch from service code to the OS. A service that needs the current
time depends on its own `Clock` Protocol; `platform` may contain `SystemClock`. A service that
needs telemetry depends on a narrow telemetry Protocol or a service wrapper; `platform` may
contain the concrete exporter.

Keep a pure codec or policy beside its owner first. Move it to `platform` only when independent
modules genuinely reuse it and it remains domain-free. Keep filesystem helpers used only by
filesystem repositories private to that adapter package.

## Filesystem Adapters

Filesystem repositories may use `Path`, TOML/YAML libraries, file locks, temporary directories,
and atomic replace directly. They should own:

- canonical path and symlink safety that depends on the real filesystem;
- format parsing/serialization and mapping to service-facing contracts;
- idempotent writes, transactions, locks, staging, rollback, and cleanup;
- normalization of `OSError`, parser, lock, and storage failures.

Keep validation ownership explicit:

- domain/service validates business names, states, relationships, and allowed transitions;
- repository validates storage existence, kind, containment, symlinks, persisted format, and
  atomicity constraints;
- pure lexical path rules may remain in domain/service when they do not inspect the OS.

Do not inject a second raw `Filesystem` Protocol into every filesystem repository by default.
Exercise the concrete adapter with `tmp_path`. Add another filesystem seam only when the project
has a real alternate backend or the adapter itself contains orchestration that cannot be tested
clearly against a temporary filesystem.

## Mixed External Integrations

Split a workflow by external boundary and policy. For plugin-backed package discovery:

1. a client invokes the external CLI and maps its JSON into typed plugin descriptors;
2. a filesystem repository loads provider metadata and package contents from candidate roots;
3. a service selects enabled providers, applies naming and uniqueness rules, and coordinates
   validation or installation.

Do not put filesystem scanning into a class named only as an external CLI client. Do not move
provider selection policy into a raw filesystem repository.

Keep one adapter facade when the behavior is truly one cohesive external contract and independent
substitution or testing would not improve clarity. Split components when they have different
failure modes, protocols, ownership, or useful test boundaries.

## Dependency Wiring

Prefer explicit constructors:

```python
plugin_client = CodexPluginClient(config.codex_executable)
package_catalog = FilesystemPackageCatalog(config.project_root)
packages = PackageService(plugin_client, package_catalog)
```

Do not introduce a DI framework merely to enforce the boundary. A small `deps/wiring.py`, factory,
or typed dependency dataclass is sufficient until construction becomes genuinely complex.

## Review Checklist

- Does service/usecase code call `Path` methods that consult or mutate the OS?
- Does it import `subprocess`, SDK clients, database drivers, storage libraries, or side-effectful
  platform helpers directly?
- Does every required side effect enter through a small consumer-owned Protocol and constructor?
- Do port methods describe application capabilities instead of mirroring a library API?
- Are layout, serialization, locking, atomicity, and OS-level path safety inside adapters?
- Does `platform` contain only genuinely shared domain-free code or concrete port implementations?
- Are mixed client/filesystem/application responsibilities separated at real ownership boundaries?
- Could a service unit test use a small fake without creating files or mocking `Path`?
