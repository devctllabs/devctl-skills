# I/O Boundaries and Platform

## Contents

- Boundary Rule
- Paths Are Values
- Capability-Level Traits
- Layer Ownership
- Filesystem Adapters
- Mixed External Integrations
- Dependency Wiring
- Review Checklist

## Boundary Rule

Keep service/usecase behavior deterministic except for behavior supplied through explicit
consumer-owned traits. Treat these as external capabilities when they observe or change state:

- filesystem, object storage, database, cache, queue, or transactions;
- HTTP, gRPC, SDK, message producer, or subprocess calls;
- wall clocks, random/ID sources, environment reads, audit sinks, and business-significant
  telemetry.

Pass required capabilities through constructors. Prefer generic service dependencies; use
`dyn Trait` only for real runtime polymorphism. Wire concrete implementations in delivery or
`deps`/`runtime` modules instead of hiding them behind globals, first-use factories, or broad config
objects.

Keep data, config, options, domain values, `Path`/`PathBuf`, and pure transformations concrete. The
seam follows externally supplied behavior, not every imported type. Ordinary diagnostic spans and
events may continue to use the skill's native `tracing` policy.

## Paths Are Values

Keep `Path` and `PathBuf` concrete when a path is part of config, input, output, or an application
contract. Do not define a trait that copies `std::fs`, `tokio::fs`, or `Path` methods.

Pure lexical work such as joining a caller-visible relative path may remain with the rule that owns
it. Operations that inspect or mutate the operating system belong in an adapter:

- current/home directory, canonicalization, metadata, existence, and file-kind checks;
- open, read, write, create, remove, rename, traversal, globbing, and copying;
- locking, permissions, containment checks, and symlink handling.

Keep storage layout inside the filesystem repository. A service should not know that state is stored
at `runs/<id>/state.json` merely because it receives a root path.

## Capability-Level Traits

Describe the smallest application capability the consumer needs:

```rust
pub trait PackageCatalog {
    async fn load(&self, source: &SourcePath) -> Result<PackageBundle, AppError>;
}

pub trait RunWorkspace {
    async fn load_result(
        &self,
        run_id: &RunId,
        node_id: &NodeId,
        attempt: u32,
    ) -> Result<ResultSpec, AppError>;

    async fn publish_outputs(
        &self,
        params: PublishOutputsParams,
    ) -> Result<PublishedOutputs, AppError>;
}
```

Prefer operations such as `load`, `save`, `reserve`, `materialize_inputs`, or `publish` over a
generic filesystem trait with `exists`, `read`, `write`, and `copy`. Capability-level methods keep
layout, locking, atomicity, and serialization together and let service tests use small fakes without
reproducing the standard library.

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
| delivery / `deps` / `runtime` | config loading, concrete selection, construction, lifecycle, cleanup |

`platform` is not an escape hatch from service code to the OS. A service needing time owns a narrow
`Clock` trait; `platform` may contain `SystemClock`. Keep helpers used by one adapter private to that
adapter module.

## Filesystem Adapters

Filesystem repositories may use `std::fs`, `tokio::fs`, locks, temporary directories, and atomic
rename/replace directly. They own:

- canonical path and symlink safety based on the real filesystem;
- parsing/serialization and mapping to named service-facing contracts;
- idempotent writes, locks, staging, rollback, cleanup, and atomic publication;
- normalization of filesystem, parser, lock, and storage errors.

Domain/service validates business names, states, relationships, and transitions. Repository code
validates storage existence, kind, containment, symlinks, persisted format, and atomicity
constraints.

Do not inject a second raw filesystem trait into every repository. Test the concrete adapter with
`tempfile::TempDir` or the repository's existing temporary-directory convention. Add a lower seam
only for a real alternate backend or adapter orchestration that a temporary filesystem cannot test
clearly.

## Mixed External Integrations

Split workflows by external boundary and application policy. For plugin-backed discovery:

1. a client runs the external command and maps output into named plugin descriptors;
2. a filesystem repository loads metadata and resources from candidate roots;
3. a service selects enabled providers and applies naming, uniqueness, or installation policy.

Keep one adapter facade only when the behavior is one cohesive external contract. Split components
when their protocols, failure modes, ownership, or useful test boundaries differ.

## Dependency Wiring

Use explicit constructors and a small composition struct. Build concrete repositories, clients, and
platform implementations in delivery or `deps`/`runtime`, then inject them into generic services.
Do not add a DI framework solely to enforce this boundary.

## Review Checklist

- Does service/usecase code call filesystem, process, SDK, driver, environment, clock, or random APIs directly?
- Does every application-affecting external behavior enter through a consumer-owned trait?
- Do trait methods describe application capabilities instead of copying a library API?
- Are layout, serialization, locking, atomicity, and OS-level path safety inside adapters?
- Are subprocess calls clients and filesystem/object-storage access repositories?
- Does `platform` contain only genuinely shared domain-free code or concrete port implementations?
- Can a service test use a small fake without creating files or mocking the standard library?
