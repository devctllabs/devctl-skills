# Overview and Naming

## Contents

- Architectural Goals
- Default Project Layout
- Crate and Module Split Rules
- Cargo Workspace Policy
- Layer Naming Conventions
- Type Sharing Rules
- Compact Order Example
- Existing Projects

## Architectural Goals

Use explicit layers and inward dependencies:

```text
delivery -> usecase/service -> repository/client traits
                         ^
                         |
                       domain
```

- `domain`: domain types, identifiers, value objects, invariants, operation contracts, and domain error details.
- `service`: application business operations over domain contracts.
- `usecase`: optional orchestration for product flows above services.
- `repository`: storage adapters for databases, caches, files, and object storage.
- `client`: outbound integrations with external HTTP, gRPC, SDK, subprocess, or message APIs.
- `platform`: reusable domain-free primitives and concrete common-port implementations such as
  clocks, IDs, transactions, cache primitives, telemetry, and deterministic test helpers.
- delivery crates: inbound CLI, HTTP, gRPC, worker, Tauri, and other runtime adapters.
- `deps` or `runtime` modules: composition roots, dependency construction, config loading, lifecycle, shutdown, tracing, and metrics setup.
- `generated`: generated Rust output behind an explicit boundary. Source specs such as OpenAPI, Proto, schemas, and codegen config are canonical inputs. Do not hand-edit generated files.

Keep construction and lifecycle in delivery crates. Business code receives dependencies through
consumer-owned traits and returns core contracts/errors. `platform` is not a direct
service-to-OS helper layer.

## Default Project Layout

When Rust is one part of a larger repo, prefer a `rust/` Cargo workspace:

```text
project-root/
  api/
    openapi/
  ui/
  rust/
    Cargo.toml
    crates/
      <app>-core/
      <app>-migrator/      # optional
      <app>-cli/           # optional
      <app>-server/        # optional
    tauri/                 # optional Tauri delivery crate
```

When the repo is Rust-only, the same layout may start at the repo root:

```text
Cargo.toml
crates/
  <app>-core/
  <app>-cli/
  <app>-server/
```

Default `<app>-core` module layout:

```text
crates/<app>-core/src/
  lib.rs
  domain/
    mod.rs
    common.rs
    <entity>.rs
  service/
    mod.rs
    <entity>.rs
  usecase/
    mod.rs
    <flow>.rs
  repository/
    mod.rs
    sqlite/
    memory/
  client/
    mod.rs
    <system>.rs
  platform/
    mod.rs
    clock.rs
    id.rs
    fs.rs
    tx.rs
  config.rs
  error.rs
  generated/
```

Do not force every project into every folder. Add only crates and directories that match the project being shipped.

## Crate and Module Split Rules

Default to few crates:

- `<app>-core`: reusable application engine.
- `<app>-cli`: command-line delivery, when shipped.
- `<app>-server`: network/message daemon delivery, when shipped separately.
- `tauri`: Tauri delivery, when shipped.
- `<app>-migrator`: optional support crate when migration logic deserves a separate API or `build.rs`.

Default to modules inside `<app>-core` for core boundaries:

- `domain`, `service`, `usecase`, `repository`, `client`, `platform`, `config`, `error`, and `generated`.
- Small projects may start with one file per module before splitting folders.
- Split `service` and `repository` by entity or domain area when files become noisy.
- Use backend submodules for alternative storage implementations, such as `repository/sqlite` and `repository/memory`.
- Use `usecase` only for flow/process modules, not as another name for every service method.

Do not create these layer crates by default:

```text
crates/<app>-domain/
crates/<app>-service/
crates/<app>-repository/
crates/<app>-transport/
crates/<app>-platform/
```

Layer crates increase visibility friction, feature management, dependency cycles, and naming noise. Add one only when it is independently reused, versioned, compiled, or owned.

## Cargo Workspace Policy

Use a virtual workspace root when the root only coordinates crates:

```toml
[workspace]
resolver = "2"
members = [
  "crates/<app>-core",
  "crates/<app>-cli",
]

[workspace.package]
edition = "2024"
rust-version = "1.96"
```

Member crates inherit workspace package policy:

```toml
[package]
name = "<app>-core"
version = "0.1.0"
edition.workspace = true
rust-version.workspace = true
```

Rules:

- Keep `resolver = "2"` unless an existing workspace intentionally uses another resolver.
- Treat `edition` as language/Cargo semantics and `rust-version` as the MSRV promise.
- Do not invent or bump MSRV casually. Follow repo policy, CI, dependencies, and user intent.
- Verify workspace inheritance with `cargo metadata --manifest-path rust/Cargo.toml --no-deps` when changing workspace package policy.
- Put profile settings at the workspace root when they apply to all members.

Use clear crate names:

- `<app>-core` for the reusable app engine.
- `<app>-cli` for command-line delivery packages when the workspace needs an explicit delivery package role.
- `<app>-server` for long-running network/message delivery.
- `<app>-migrator` for migration support.
- a dedicated generated/API/proto crate only when generated output is a stable crate boundary shared beyond one consuming crate.
- `tauri` directory with package name `<app>-tauri` for Tauri delivery in a mixed UI/Rust repo.

The package/crate name and the user-facing binary name do not have to match. If the delivery package is named `<app>-cli`, prefer the product command name for the binary:

```toml
[package]
name = "<app>-cli"

[[bin]]
name = "<app>"
path = "src/main.rs"
```

## Layer Naming Conventions

Core operation contracts:

| Role | Name | Example |
| --- | --- | --- |
| Identifier | `<Entity>Id` | `OrderId` |
| Write input | `<Operation>Command` | `CreateOrderCommand` |
| Write output envelope | `<Operation>Result` | `CreateOrderResult` |
| Read input | `<Operation>Query` | `ListOrdersQuery` |
| Read output | `<Entity>View` or `<Entities>View` | `OrderView`, `OrdersView` |
| Filter | `...Filter` | `ListOrdersFilter` |
| Parameter group | `...Params` | `OrderItemParams` |
| Core error | `AppError` or `<Domain>Error` | `AppError`, `OrderError` |

Returning `<Entity>View` directly from a write is acceptable when the created or updated view is the only output. Use `<Operation>Result` when the operation returns multiple values, status flags, warnings, or additional metadata.

Layer-specific names:

- `domain/<entity>` owns operation contracts, value objects, enums, invariants, and domain error details.
- `service/<entity>` exposes concrete services such as `<Entity>Service<R>` and consumer-owned dependency traits such as `<Dependency>Repository` or `<System>Client`.
- `usecase/<flow>` exposes `<Flow>Usecase` or `<Flow>Service` for orchestration flows; use short `Command`, `Result`, `Query`, or `View` only when the module path gives clear context.
- `repository/<backend>/<entity>` or `repository/<entity>/<backend>` exposes concrete adapters such as `<Backend><Entity>Repository`, for example `SqliteOrderRepository`.
- `client/<system>` exposes concrete outbound clients such as `<System><Purpose>Client`, for example `StripeBillingClient`.
- server delivery uses `<Operation>Request` and `<Operation>Response` for protocol DTOs.
- Tauri delivery uses `<Operation>Args` and `<Entity>Dto` for IPC contracts.
- CLI delivery may use `Cli` and `Command` for the parser tree.
- delivery composition uses `AppState` for shared runtime state and `AppDeps` for constructed dependencies.

## Type Sharing Rules

- Core operation contracts are shared outward: services/usecases consume them, adapters may receive or return them through service-owned traits, and delivery crates map protocol DTOs to and from them.
- Do not share transport DTOs with `domain`, `service`, or `usecase`.
- Do not share storage row/projection structs with `domain`, `service`, or delivery crates.
- Keep generated DTOs behind `generated/` modules, `OUT_DIR`, or handwritten facades. Do not expose noisy generated APIs broadly unless they are the intentional public contract.
- Usecases should alias or aggregate domain operation contracts instead of copying field-by-field contracts.
- Keep common domain types only when they are used by multiple independent domain areas. Do not turn `domain/common` or `platform` into a helper dump.

## Compact Order Example

```rust
// crates/<app>-core/src/domain/order.rs
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OrderId(pub String);

#[derive(Debug, Clone)]
pub struct CreateOrderCommand {
    pub customer_id: String,
    pub items: Vec<OrderItemParams>,
}

#[derive(Debug, Clone)]
pub struct OrderItemParams {
    pub sku: String,
    pub qty: u32,
}

#[derive(Debug, Clone)]
pub struct OrderView {
    pub id: OrderId,
    pub customer_id: String,
}
```

```rust
// crates/<app>-core/src/service/order.rs
use crate::{
    domain::order::{CreateOrderCommand, OrderView},
    error::AppError,
};

pub trait OrderRepository: Send + Sync {
    async fn insert(&self, command: CreateOrderCommand) -> Result<OrderView, AppError>;
}

pub struct OrderService<R> {
    repo: R,
}

impl<R> OrderService<R>
where
    R: OrderRepository,
{
    pub fn new(repo: R) -> Self {
        Self { repo }
    }

    pub async fn create(&self, command: CreateOrderCommand) -> Result<OrderView, AppError> {
        if command.items.is_empty() {
            return Err(AppError::Invalid("order must contain at least one item".into()));
        }

        self.repo.insert(command).await
    }
}
```

## Existing Projects

Before restructuring:

- inspect all `Cargo.toml` files and workspace members;
- inspect existing root scripts, package-manager workspaces, CI, and codegen commands;
- identify checked-in generated code and source contracts;
- preserve active conventions that are coherent;
- avoid moving files only to match this reference unless the user asks for standardization.
