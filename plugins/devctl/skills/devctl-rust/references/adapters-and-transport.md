# Adapters and Transport

## Contents

- Repository Layer
- Repository Adapter Example
- Storage and Migrations
- Client Layer
- Transport Layer
- Transport Handler Placement
- Error Mapper Placement
- HTTP Server Transport
- gRPC Server Transport
- Worker and Messaging Transport
- Generated Code Boundaries
- Build Scripts
- Transport Rules
- Related References

## Repository Layer

Put delivery-agnostic storage adapters in `<app>-core` when they are part of the reusable local application engine:

```text
crates/<app>-core/src/
  repository/
    sqlite/
    filesystem/
    object_store/
    memory/
```

Repository code owns data access and mapping. It does not own business rules, transport DTOs, CLI output, or runtime lifecycle.

Rules:

- service/usecase dependency traits stay where they are consumed;
- concrete repositories implement those traits;
- filesystem/object-storage repositories own layout, traversal, serialization, locking, staging,
  atomic publication, rollback, cleanup, and OS-backed containment/file-kind/symlink checks;
- service-facing traits expose capabilities such as `load`, `save`, `reserve`,
  `materialize_inputs`, or `publish`, not a copy of raw filesystem methods;
- map low-level driver errors into core error categories before returning;
- keep driver-specific classifiers near the concrete adapter, usually in the same module or `error.rs` submodule when the mapping grows;
- keep filesystem, query, codec, layout, and path helpers private to the concrete adapter unless
  several independent adapters genuinely share domain-free behavior;
- keep storage row/projection structs private to repository modules;
- keep raw decoded values inside the adapter until validated and mapped to named service-facing
  contracts;
- do not silently create or migrate schema from ordinary repository constructors.

## Repository Adapter Example

Keep the concrete driver private to the adapter and return core contracts/errors:

```rust
// crates/<app>-core/src/repository/sqlite/order.rs
use crate::{
    domain::order::{CreateOrderCommand, OrderId, OrderView},
    error::AppError,
    service::order::OrderRepository,
};
use sqlx::{Row, SqlitePool};

pub struct SqliteOrderRepository {
    pool: SqlitePool,
}

impl SqliteOrderRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl OrderRepository for SqliteOrderRepository {
    async fn insert(&self, command: CreateOrderCommand) -> Result<OrderView, AppError> {
        let row = sqlx::query(
            "INSERT INTO orders (customer_id) VALUES (?1) RETURNING id, customer_id",
        )
        .bind(&command.customer_id)
        .fetch_one(&self.pool)
        .await
        .map_err(map_sqlx_error)?;

        let id: i64 = row.try_get("id").map_err(map_sqlx_error)?;
        let customer_id = row.try_get("customer_id").map_err(map_sqlx_error)?;

        Ok(OrderView {
            id: OrderId(id.to_string()),
            customer_id,
        })
    }
}

fn map_sqlx_error(error: sqlx::Error) -> AppError {
    match error {
        sqlx::Error::Database(db) if db.is_unique_violation() => {
            AppError::Conflict { reason: db.to_string() }
        }
        other => AppError::Unavailable {
            source: Box::new(other),
        },
    }
}

fn map_order_lookup_error(error: sqlx::Error, requested_id: String) -> AppError {
    match error {
        sqlx::Error::RowNotFound => AppError::NotFound {
            entity: "order",
            id: requested_id,
        },
        other => map_sqlx_error(other),
    }
}
```

Adapter error mapping should preserve a typed core category and keep incidental driver details out of service-facing semantics. Use `#[source]` or adapter-local logging for diagnostics; delivery code should not branch on `sqlx`, SDK, or network error types. Map `NotFound` with the requested domain identity from the operation context; do not invent placeholder IDs.

For synchronous drivers, either keep the runtime synchronous or isolate blocking work explicitly. Do not hide blocking database calls inside an async service method by accident.

## Storage and Migrations

Use a module inside `<app>-core` for simple migrations:

```text
crates/<app>-core/src/migration/
migrations/
```

Use `<app>-migrator` when migration logic deserves a separate crate:

- migrations are embedded with `build.rs`;
- migrations are reused by CLI/server/Tauri;
- migration parsing/apply logic has its own tests;
- migration commands or tools need the same API;
- migration dependencies should stay isolated.

For Rust-owned local database migrations in a mixed repo, `rust/migrations` is a clear default:

```text
rust/
  migrations/
    sqlite/
      common/
      dev/
      uat/
      prod/
```

Keep migrations outside `tauri/` so CLI/server/tests can use them without depending on Tauri.

## Client Layer

`client` contains outbound integration adapters that are not delivery-specific:

```text
crates/<app>-core/src/client/
  billing/
  embeddings/
  codex_cli/
  object_store/
```

Rules:

- service/usecase traits describe the calls needed by the business operation;
- concrete clients normalize SDK/network errors into core categories;
- subprocess clients own command construction, execution, stdout/stderr parsing, exit status,
  timeout, and external contract validation;
- client-specific retryability or external status details stay in the client adapter unless they are intentionally modeled as core facts;
- request/response DTOs from external SDKs do not leak into service/domain signatures;
- if a client is only needed by a server runtime, keep it in the server crate until reuse appears.

When one operation combines an external command with stored resources, keep application
selection/orchestration policy in the service and use separate client and repository capabilities
when their protocols or failure modes differ.

## Transport Layer

Put delivery-specific protocol adapters in delivery crates:

```text
crates/<app>-server/src/transport/http/
crates/<app>-server/src/transport/grpc/
crates/<app>-server/src/transport/consumer/
rust/tauri/src/commands/
crates/<app>-cli/src/commands/
```

Transport code:

- validates protocol DTO format;
- maps DTOs to domain/usecase commands or queries;
- calls core services/usecases through explicit dependencies;
- maps core results/views to protocol DTOs;
- maps core errors to protocol or user-facing outputs.

## Transport Handler Placement

Use `handlers.rs` for protocol-level aggregation and `handler.rs` for feature-level adapter state. This keeps HTTP and gRPC layout symmetrical and avoids overloading `service.rs`, which is easy to confuse with the core business service layer or generated gRPC service traits.

Root-level `handlers.rs` files in protocol modules are transport aggregation points. They may build an HTTP router, group routes, bind middleware, aggregate generated gRPC service registration, or expose a protocol handler set consumed by runtime wiring. They must not create repositories or core services, read env/config, or choose concrete implementations.

Feature-level `handler.rs` contains the `Handler` struct and constructor. It receives explicit core service/usecase dependencies, usually through typed state or constructor parameters. Operation files contain request/response mapping and delegate to core:

```text
crates/<app>-server/src/transport/http/
  handlers.rs
  error_mapper.rs
  order/
    mod.rs
    handler.rs
    create_order.rs
    list_orders.rs
    error_mapper.rs      # optional, only for feature-specific response details

crates/<app>-server/src/transport/grpc/
  handlers.rs
  error_mapper.rs
  order/
    mod.rs
    handler.rs
    create_order.rs
    update_order.rs
    error_mapper.rs      # optional, only for feature-specific status details
```

For gRPC, `handler.rs` also contains the thin `#[tonic::async_trait]` implementation of the generated service trait for `Handler`. The trait methods should delegate to operation methods such as `handle_create_order` in operation files. Add `rpc.rs` only when an existing project uses that name or a generated trait implementation becomes too large for `handler.rs`; do not use it as the default.

Do not use `service.rs` for handwritten transport modules by default. Keep `service` for core business services and generated gRPC terminology.

## Error Mapper Placement

Use `error_mapper.rs` as the default searchable module name for delivery error presentation. The mapper belongs to the delivery crate or Tauri runtime crate, not to `<app>-core`.

Error mapper placement is two-level:

- `transport/<protocol>/error_mapper.rs` maps protocol-wide core categories into the protocol contract.
- `transport/<protocol>/common/error_mapper.rs` is an equivalent fallback location when the protocol already has a `common` module for middleware, validators, and DTO mappers.
- `transport/<protocol>/<feature>/error_mapper.rs` is optional. Add it only for feature-specific typed error details, response extensions, status details, or policy overrides.
- Feature mappers handle feature-specific details first, then delegate fallback category mapping to the protocol mapper.
- Adapter-local mappers still live next to concrete repositories/clients and normalize `sqlx`, SDK, filesystem, or network errors into core errors before delivery code sees them.

Typical shapes:

```text
crates/<app>-server/src/transport/http/
  handlers.rs
  error_mapper.rs        # AppError -> status, headers, Problem Details/body
  <feature>/
    mod.rs
    handler.rs
    <operation>.rs
    error_mapper.rs      # optional, only for feature-specific response details

crates/<app>-server/src/transport/grpc/
  handlers.rs
  error_mapper.rs        # AppError -> tonic::Status and optional details
  <feature>/
    mod.rs
    handler.rs
    <operation>.rs
    error_mapper.rs      # optional, only for feature-specific status details

crates/<app>-server/src/transport/consumer/
  error_mapper.rs        # AppError/infrastructure error -> ack/retry/drop/DLQ
  <message_flow>/
    handler.rs
    error_mapper.rs      # optional, only for flow-specific retry/DLQ policy

rust/tauri/src/commands/
  error_mapper.rs        # AppError -> serializable app/domain error DTO
  <feature>/
    command.rs
    error_mapper.rs      # optional, only for feature-specific IPC details
```

For workers, `error_policy.rs` is acceptable when the project already names ack/retry/DLQ decisions as policy objects. Otherwise prefer `error_mapper.rs` for consistency with HTTP, gRPC, Tauri, and searchability across the codebase.

Domain, service, and repository traits must not import protocol mapper types, status codes, Problem Details, `tonic::Status`, generated response DTOs, Tauri IPC DTOs, or queue policy objects.

## HTTP Server Transport

Keep HTTP DTOs in the server crate:

```rust
use std::sync::Arc;

use app_core::{
    domain::order::{CreateOrderCommand, OrderItemParams, OrderView},
    repository::sqlite::SqliteOrderRepository,
    service::order::OrderService,
};
use axum::{extract::State, Json};

#[derive(Clone)]
struct AppState {
    orders: Arc<OrderService<SqliteOrderRepository>>,
}

#[derive(serde::Deserialize)]
struct CreateOrderRequest {
    customer_id: String,
    sku: String,
    qty: u32,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateOrderResponse {
    id: String,
    customer_id: String,
}

async fn create_order(
    State(state): State<AppState>,
    Json(request): Json<CreateOrderRequest>,
) -> Result<Json<CreateOrderResponse>, HttpError> {
    let order = state
        .orders
        .create(CreateOrderCommand {
            customer_id: request.customer_id,
            items: vec![OrderItemParams {
                sku: request.sku,
                qty: request.qty,
            }],
        })
        .await
        .map_err(HttpError::from)?;

    Ok(Json(CreateOrderResponse::from(order)))
}

impl From<OrderView> for CreateOrderResponse {
    fn from(order: OrderView) -> Self {
        Self {
            id: order.id.0,
            customer_id: order.customer_id,
        }
    }
}
```

HTTP Problem Details belongs at HTTP boundaries. Do not put HTTP status codes or problem response shapes into core unless HTTP is itself the domain.

HTTP error mappers should match typed core variants first, then render status, headers, and body. Controller-local mappers are appropriate for feature-specific typed details or Problem Details extensions; shared fallback mapping belongs near the server protocol boundary.

HTTP `handlers.rs` should own router construction, route groups, and middleware binding when that aggregation is non-trivial. Feature `handler.rs` should own feature adapter state and constructors; operation files should hold concrete route handlers or `Handler` methods.

## gRPC Server Transport

For `tonic` services:

- keep generated protobuf types behind `generated` or a focused transport module;
- keep handwritten feature adapters in `handler.rs`, not `service.rs`;
- map request messages into core commands/queries;
- map core errors into `tonic::Status`;
- keep feature-specific status detail mapping in the feature module and shared fallback mapping near the gRPC protocol boundary;
- keep reflection, health, interceptors, and server registration in the server crate.

Use handwritten mappers when generated types are noisy or unstable. Do not pass generated protobuf messages into domain/service APIs by default.

For generated gRPC traits, put the thin generated trait implementation in feature `handler.rs`:

```rust
#[tonic::async_trait]
impl generated::order_service_server::OrderService for Handler {
    async fn create_order(
        &self,
        request: tonic::Request<generated::CreateOrderRequest>,
    ) -> Result<tonic::Response<generated::CreateOrderReply>, tonic::Status> {
        self.handle_create_order(request).await
    }
}
```

Put `handle_create_order`, `handle_update_order`, and similar operation methods in operation files. This keeps `handler.rs` as the constructor and generated-trait entrypoint without concentrating all operation mapping in one file.

## Worker and Messaging Transport

Workers and consumers are delivery adapters:

- deserialize message DTOs;
- validate envelope and payload shape;
- map to core commands/usecases;
- choose ack/retry/DLQ policy based on core and infrastructure errors;
- keep topic names, groups, subscriptions, and retry policy in config/runtime wiring.

Worker error policy should match core error variants and infrastructure failures explicitly. Keep retry/drop/DLQ decisions in the worker delivery crate; do not encode Kafka, queue, or scheduler policy into core error types.

Do not make CLI subcommand names equal to physical topic names unless the project deliberately exposes that operational detail.

## Generated Code Boundaries

Generated Rust code must have an explicit boundary. Do not scatter generated files among handwritten modules.

Source contracts are language-neutral inputs:

```text
api/openapi/
proto/
schemas/
codegen/
```

Rust generated output belongs in one of:

- Cargo `OUT_DIR` for build-time generated code;
- `src/generated/` inside the consuming crate for checked-in generated modules;
- a generated crate only when generated Rust code is shared beyond one consuming crate.

Never hand-edit generated output.

Use checked-in generated code when the repo needs reviewable generated contracts, codegen outside Cargo, downstream language/tool compatibility, CI drift checks, or generators that are not appropriate for `build.rs`.

Default placement:

```text
crates/<app>-core/src/generated/
crates/<app>-server/src/generated/
```

Do not add a generated crate by default. Add one only when generated Rust code is shared by multiple crates, imported by external consumers, or treated as a stable contract boundary. Prefer naming that states the contract boundary, such as API types or protobuf types, instead of a vague catch-all generated package.

Wrap noisy generated APIs behind handwritten adapters or facades before exposing them broadly to core services.

## Build Scripts

Use `build.rs` for code generated during `cargo build`.

Rules:

- write generated Rust files to `OUT_DIR`;
- include them with `include!(concat!(env!("OUT_DIR"), "/file.rs"))` or the generator's supported include mechanism;
- emit `cargo:rerun-if-changed=...` for every source input that should trigger regeneration;
- do not write generated files into `src/` or other checked-in paths from `build.rs`;
- keep traversal sorted for stable output;
- avoid network access and environment-sensitive behavior unless explicitly required.

Example boundary:

```rust
mod generated {
    include!(concat!(env!("OUT_DIR"), "/embedded_migrations.rs"));
}
```

## Transport Rules

- No domain models as external protocol DTOs when protocol shape is independently versioned.
- No storage row/projection structs outside repository modules.
- No protocol response/status mapping in services/usecases.
- Validate transport DTO shape at the boundary, but keep business invariants in services/domain.
- Match core error enum variants in delivery mappers; do not parse error strings.
- Keep delivery-specific error mappers in delivery crates, not in `<app>-core`.
- Keep route registration, middleware, interceptors, consumers, and server setup in delivery crates.

## Related References

- Read `service-and-usecase.md` for dependency trait ownership and transaction boundaries.
- Read `io-boundaries-and-platform.md` for filesystem repositories, subprocess clients, mixed
  external workflows, and platform ownership.
- Read `runtime-and-wiring.md` for composition, runtime activation, config, and shutdown.
- Read `tauri-and-monorepo.md` for Tauri IPC transport and Rust plus UI monorepos.
