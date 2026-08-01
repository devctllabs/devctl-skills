# I/O Boundaries and Platform

## Contents

- Boundary Rule
- Paths Are Values
- Capability-Level Interfaces
- Layer Ownership
- Filesystem Adapters
- Mixed External Integrations
- Dependency Wiring
- Review Checklist

## Boundary Rule

Keep service/usecase behavior deterministic except for behavior supplied through explicit
consumer-owned interfaces. Treat these as external capabilities when they observe or change state:

- filesystem, object storage, database, cache, queue, or transactions;
- HTTP, gRPC, SDK, message producer, or subprocess calls;
- wall clocks, random/ID sources, environment reads, audit sinks, and business-significant
  telemetry.

Pass required capabilities through constructors and accept `context.Context` on blocking or I/O
operations. Wire concrete implementations in `internal/deps`; do not hide them behind package
globals, first-use factories, `Config`, or functional options.

Keep data, config, options, domain values, path strings, `context.Context`, and pure transformations
concrete. The seam follows externally supplied behavior, not every imported type. Ordinary
diagnostic logging may continue to use the skill's concrete `*zap.Logger` policy.

## Paths Are Values

Keep path strings or small named path values concrete when they are part of config, input, output,
or an application contract. Do not define an interface that copies `os`, `filepath`, or `io/fs`
methods.

Pure lexical work such as joining or cleaning a caller-visible relative path may remain with the
rule that owns it. Operations that inspect or mutate the operating system belong in an adapter:

- working-directory, home-directory, canonicalization, existence, stat, and file-kind checks;
- open, read, write, create, remove, rename, replace, traversal, globbing, and copying;
- locking, permissions, containment checks, and symlink handling.

Keep storage layout inside the filesystem repository. A service should not know that state is stored
at `runs/<id>/state.json` merely because it receives a root directory.

## Capability-Level Interfaces

Describe the smallest application capability the consumer needs:

```go
type PackageCatalog interface {
    Load(ctx context.Context, source SourcePath) (PackageBundle, error)
}

type RunWorkspace interface {
    LoadResult(ctx context.Context, runID RunID, nodeID NodeID, attempt int) (ResultSpec, error)
    PublishOutputs(ctx context.Context, params PublishOutputsParams) (PublishedOutputs, error)
}
```

Prefer operations such as `Load`, `Save`, `Reserve`, `MaterializeInputs`, or `Publish` over a
generic filesystem interface with `Exists`, `Read`, `Write`, and `Copy`. Capability-level methods
keep layout, locking, atomicity, and serialization together and let service tests use small fakes
without reproducing `os`.

Do not move application policy into the adapter. Services own state transitions, selection policy,
cross-resource rules, and application operation order. Adapters own external mechanics, storage
invariants, and low-level error normalization.

## Layer Ownership

| Layer | Owns |
| --- | --- |
| `domain` | values, invariants, named operation contracts, application error categories |
| `service` / `usecase` | application policy, orchestration, transitions, capability calls |
| `repository` | database/cache/files/object-storage access, layout, serialization, locking, atomic writes |
| `client` | outbound HTTP/gRPC/SDK/subprocess/message calls and response normalization |
| `platform` | optional shared domain-free primitives and concrete implementations of common ports |
| `internal/deps` / `cmd` | config loading, concrete selection, construction, lifecycle, cleanup |

`platform` is not an escape hatch from service code to the OS. A service needing time owns a narrow
`Clock` interface; `internal/platform` may contain `SystemClock`. Keep helpers used by one adapter
private to that adapter package.

## Filesystem Adapters

Filesystem repositories may use `os`, `filepath`, `io/fs`, locks, temporary directories, and atomic
rename/replace directly. They own:

- canonical path and symlink safety based on the real filesystem;
- parsing/serialization and mapping to named service-facing contracts;
- idempotent writes, locks, staging, rollback, cleanup, and atomic publication;
- normalization of filesystem, parser, lock, and storage errors.

Domain/service validates business names, states, relationships, and transitions. Repository code
validates storage existence, kind, containment, symlinks, persisted format, and atomicity
constraints.

Do not inject a second raw filesystem interface into every repository. Test the concrete adapter
against `t.TempDir()`. Accept `fs.FS` or another lower seam only when the project has a real alternate
backend or the adapter itself coordinates behavior that a temporary filesystem cannot test clearly.

## Mixed External Integrations

Split workflows by external boundary and application policy. For plugin-backed discovery:

1. a client runs the external command and maps output into named plugin descriptors;
2. a filesystem repository loads metadata and resources from candidate roots;
3. a service selects enabled providers and applies naming, uniqueness, or installation policy.

Keep one adapter facade only when the behavior is one cohesive external contract. Split components
when their protocols, failure modes, ownership, or useful test boundaries differ.

## Dependency Wiring

Use direct constructors or a small explicit dependency struct. Build concrete repositories, clients,
and platform implementations in `internal/deps`, then inject them into services. Do not add a DI
framework solely to enforce this boundary.

## Review Checklist

- Does service/usecase code call `os`, `io/fs`, `exec`, SDK, driver, environment, clock, or random APIs directly?
- Does every application-affecting external behavior enter through a consumer-owned interface?
- Do interface methods describe application capabilities instead of copying a library API?
- Are layout, serialization, locking, atomicity, and OS-level path safety inside adapters?
- Are subprocess calls clients and filesystem/object-storage access repositories?
- Does `platform` contain only genuinely shared domain-free code or concrete port implementations?
- Can a service test use a small fake without creating files or mocking the standard library?
