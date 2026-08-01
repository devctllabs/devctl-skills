# Library Crates

## Contents

- General Principle
- Single Library Crate
- Multi-Library Monorepo
- Crate vs Module
- API: Functions, Types, Traits
- Constructors and Composition
- Features and Dependencies
- State and Runtime
- Async and Runtime
- Errors
- Review Checklist
- Related References

## General Principle

Design a Rust library from its public crate API, meaningful modules, and stable import paths. The structure should make it clear what the user imports from the crate and what capabilities the crate provides.

Name public modules by meaning: domain concept, capability, protocol, format, backend, or integration. Do not create a crate or module only because it mirrors an architecture layer. If a boundary is not useful to the library user, it usually should not be a separate public crate.

For application and service code, also read `code-principles.md`; this reference narrows those principles to public Rust crate APIs.

## Single Library Crate

For an ordinary library, start with one package and one library crate:

```text
Cargo.toml
src/
  lib.rs
  client.rs
  error.rs
  config.rs
```

If the library naturally has separate public API areas, split them into meaningful modules:

```text
src/
  lib.rs
  codec/
  retry/
  telemetry/
```

`lib.rs` is a curated public surface. Re-export only items that are part of the intended API. Keep implementation details private or `pub(crate)`.

A good Rust library does not have to use an application-style `core/service/domain` shape. For a simple library, prefer a small crate with clear types, functions, and modules.

## Multi-Library Monorepo

For a new multi-library repository, default to a Cargo workspace with library crates under `crates/`:

```text
Cargo.toml
Cargo.lock
crates/
  auth/
    Cargo.toml
    src/lib.rs
  config/
    Cargo.toml
    src/lib.rs
  telemetry/
    Cargo.toml
    src/lib.rs
```

Each directory under `crates/` is a separate package/library crate with its own `Cargo.toml`, public API, dependencies, features, and possible publish/version boundary.

The workspace root coordinates shared policy:

```toml
[workspace]
resolver = "2"
members = ["crates/auth", "crates/config", "crates/telemetry"]

[workspace.package]
edition = "2024"
rust-version = "1.96"
```

If libraries are published or versioned independently, they can still live in one workspace. Do not artificially couple versions, changelog policy, or release cadence just because the crates share a repository.

If a crate is only an implementation detail for one public crate, do not promote it into a workspace library without a real boundary.

For existing repositories, preserve the current workspace shape when it is coherent and used consistently. For new multi-library repositories, default to `crates/<library-name>/`.

## Crate vs Module

Create a separate crate only when there is a real boundary:

- separate public API or import path;
- separate dependencies or feature flags;
- separate publish/version policy;
- reuse by multiple crates or apps;
- compile-time isolation or optional heavy dependency;
- ownership boundary.

Use modules when the goal is only to organize code inside one library.

Do not create crates such as `domain`, `service`, `utils`, or `common` by default. Rust visibility and modules usually provide enough boundaries without adding package graph noise.

## API: Functions, Types, Traits

Plain functions are good Rust APIs when the operation is stateless, deterministic, and does not require caller-supplied behavior:

```rust
pub fn normalize_name(input: &str) -> String
pub fn parse_token(raw: &str) -> Result<Token, Error>
pub fn encode(value: &Value) -> Result<Vec<u8>, Error>
```

Do not turn pure helpers into traits only to satisfy a trait-first rule.

Use traits when the library depends on behavior supplied by the caller or when an implementation must be swappable: storage, clock, filesystem, HTTP transport, policy, plugin/backend behavior, randomness, or external systems.

For dependency seams, prefer generics by default:

```rust
pub struct Client<T> {
    transport: T,
}

impl<T> Client<T>
where
    T: Transport,
{
    pub fn new(transport: T) -> Self {
        Self { transport }
    }
}
```

Use `dyn Trait` only when runtime polymorphism or heterogeneous storage is needed:

```rust
pub struct Client {
    transport: Arc<dyn Transport + Send + Sync>,
}
```

Do not add `dyn`, `async_trait`, boxed futures, or object-safety ceremony without a concrete need.

## Constructors and Composition

Constructors accept explicit dependencies and configuration. Behavioral dependencies use traits/generics; data, config, and options use concrete typed values.

```rust
pub struct ClientConfig {
    pub timeout: Duration,
    pub retry_limit: u32,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            timeout: Duration::from_secs(5),
            retry_limit: 3,
        }
    }
}

pub fn new<T>(transport: T, config: ClientConfig) -> Client<T>
where
    T: Transport,
{
    Client { transport, config }
}
```

For simple optional knobs, prefer struct update syntax over a builder:

```rust
let config = ServerConfig {
    port: 3000,
    tls: true,
    ..Default::default()
};
```

The library should not own the application composition root. It provides types, constructors, builders, options, and traits; the app, server, CLI, or Tauri crate assembles the concrete graph.

Use a builder when options are numerous, optional, need staged validation, or the public API needs to evolve without making call sites unreadable:

```rust
let client = Client::builder(transport)
    .timeout(Duration::from_secs(5))
    .retry_limit(3)
    .build()?;
```

A builder should not read environment variables, open network connections, create a runtime, start tasks, or create process-global state implicitly. Do not copy Go-style functional options as the Rust default; use typed config structs or builders.

Implement `Default` only for safe, meaningful defaults. Do not provide defaults for secrets, credentials, required endpoints, tenant IDs, or values that must come from the caller or runtime config.

## Features and Dependencies

Feature flags should represent real optional capabilities:

```toml
[features]
default = []
serde = ["dep:serde"]
tokio = ["dep:tokio"]
```

Do not include heavy runtime dependencies in default features without a clear reason. Backend integrations should usually be optional features or separate crates when they pull a large dependency graph.

In a workspace, do not depend on shared workspace dependencies only because they exist. Each crate should declare only dependencies required by its public API or implementation.

## State and Runtime

Runtime state must be instance-owned. Clients, registries, caches, config, workers, and handles belong to objects created by the caller.

Avoid process-global mutable state:

- `static mut`;
- global `OnceLock` or `LazyLock` for clients, config, registries, runtime handles, or dependency instances;
- hidden global subscribers or loggers;
- implicit plugin registration through global side effects.

Compile-time or immutable data is acceptable: `const`, `include_str!`, `include_bytes!`, generated lookup tables, and marker values. Use `LazyLock` or `OnceLock` only for immutable derived data, not runtime dependencies.

Rust has no Go-style `init()`, but equivalent hidden startup behavior is still wrong for reusable libraries: `ctor`, hidden global registration, lazy global initialization with I/O, background task startup, or environment reads during first access.

Library import/use should not read environment variables, open network connections, start tasks or threads, initialize a tracing subscriber, create a Tokio runtime, or mutate global process state.

## Async and Runtime

Do not force an async runtime unless the library truly needs async APIs. If an API is async, the caller/runtime crate owns Tokio, async-std, or another executor.

Good:

```rust
pub async fn fetch(&self, request: Request) -> Result<Response, Error>
```

Avoid as a default:

```rust
pub fn fetch_blocking(&self, request: Request) -> Result<Response, Error> {
    tokio::runtime::Runtime::new()?.block_on(self.fetch(request))
}
```

Blocking wrappers are acceptable only as explicit opt-in APIs or features for a real use case.

## Errors

Public library errors should be typed and stable:

```rust
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("invalid token")]
    InvalidToken,
    #[error("transport: {0}")]
    Transport(String),
}
```

Do not leak incidental dependency errors as the top-level public contract when that would bind users to an implementation detail. Keep the top-level enum meaningful for the library, and preserve sources with `#[source]` when useful.

## Review Checklist

- Does the crate expose a curated public API through `lib.rs` and meaningful modules?
- Is a new single library one package/crate unless a real boundary exists?
- Does a new multi-library repo use `crates/<library-name>/` under a Cargo workspace?
- Are separate crates justified by API, dependency, feature, reuse, versioning, compile, or ownership boundaries?
- Are plain functions used for stateless deterministic operations?
- Are traits/generics used for caller-supplied behavior and substitution seams?
- Is `dyn Trait` limited to runtime polymorphism or heterogeneous storage needs?
- Are features tied to real optional capabilities, with heavy dependencies kept out of defaults unless justified?
- Is runtime state instance-owned rather than process-global?
- Does the library avoid hidden startup behavior, runtime creation, env reads, network I/O, tasks, threads, and global tracing/logging setup?
- Are public errors typed, stable, and library-meaningful?

## Related References

- Read `code-principles.md` for KISS/SOLID defaults that apply to all handwritten Rust code.
