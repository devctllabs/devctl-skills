# Domain

## Contents

- Role
- Module Layout
- Operation Contract Naming
- Identifiers and Value Objects
- Domain Errors
- Config and Public API
- Import Rules and Anti-Patterns
- `domain/common`

## Role

`domain` owns business vocabulary:

- identifiers, value objects, enums, state machines, and invariants;
- command/query/result/view types when they are core application contracts;
- domain validation issue shapes;
- domain-level error categories or details.

Do not put delivery or infrastructure details in domain:

- no HTTP status codes, gRPC codes, Tauri command names, SQL rows, generated DTOs, request/response DTOs, environment variables, or filesystem paths tied to a runtime.

## Module Layout

Default layout:

```text
crates/<app>-core/src/domain/
  mod.rs
  common.rs          # optional shared vocabulary
  order.rs
  customer.rs
```

As a domain grows, split an entity folder:

```text
domain/
  order/
    mod.rs
    command.rs
    query.rs
    view.rs
    error.rs
```

Keep the module path meaningful. Do not repeat the entity name in every file if the folder already provides context.

## Operation Contract Naming

Use stable operation contracts:

| Role | Name | Example |
| --- | --- | --- |
| Write input | `<Operation>Command` | `CreateOrderCommand` |
| Write output envelope | `<Operation>Result` | `CreateOrderResult` |
| Read input | `<Operation>Query` | `ListOrdersQuery` |
| Read output | `<Entity>View` or `<Entities>View` | `OrderView`, `OrdersView` |
| Filter | `...Filter` | `ListOrdersFilter` |
| Parameter group | `...Params` | `OrderItemParams` |

Example:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OrderId(pub String);

#[derive(Debug, Clone)]
pub struct OrderItemParams {
    pub sku: String,
    pub qty: u32,
}

#[derive(Debug, Clone)]
pub struct CreateOrderCommand {
    pub customer_id: String,
    pub items: Vec<OrderItemParams>,
}

#[derive(Debug, Clone)]
pub struct CreateOrderResult {
    pub order: OrderView,
}

#[derive(Debug, Clone)]
pub struct ListOrdersQuery {
    pub filter: ListOrdersFilter,
}

#[derive(Debug, Clone)]
pub struct ListOrdersFilter {
    pub customer_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct OrderView {
    pub id: OrderId,
    pub customer_id: String,
}
```

Returning `OrderView` directly from a write is fine when there is no envelope metadata. Use `CreateOrderResult` when the operation needs multiple values, flags, warnings, or pagination-like metadata.

## Identifiers and Value Objects

Prefer small newtypes for domain identifiers and constrained values:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CustomerId(pub String);
```

Rules:

- keep parsing/validation explicit;
- avoid leaking database primary-key types when the domain identity is different;
- derive serialization only when the type is intentionally part of a public contract;
- avoid making value objects depend on delivery or storage crates.

## Domain Errors

Prefer typed enum errors with `thiserror` for core Rust APIs. The shared application error usually lives in `crates/<app>-core/src/error.rs` as `AppError` or `<App>Error`. Entity-specific error detail types live in `domain/<entity>/error.rs` only when the shared category loses important business meaning.

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("not found: {entity} {id}")]
    NotFound { entity: &'static str, id: String },
    #[error("invalid: {0}")]
    Invalid(String),
    #[error("conflict: {reason}")]
    Conflict { reason: String },
    #[error("forbidden")]
    Forbidden,
    #[error("unavailable")]
    Unavailable {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("unexpected")]
    Unexpected {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

#[derive(Debug, Clone)]
pub struct ValidationError {
    pub issues: Vec<ValidationIssue>,
}

#[derive(Debug, Clone)]
pub struct ValidationIssue {
    pub path: Vec<String>,
    pub code: String,
    pub params: std::collections::BTreeMap<String, String>,
}
```

Use enum variants as categories for branching. Use variant payloads for stable protocol-independent facts such as entity kind, ID, validation issues, conflict reason, retry-safe classification, or diagnostic code. Delivery code should match variants instead of parsing error strings.

Keep `Invalid(String)` for simple business validation. Use `ValidationError` only when callers need field/path/code/params facts; in that case either change the invalid variant to `Invalid(ValidationError)` or add a separate validation variant consistently across the project.

Use `#[source]` only for diagnostics when the low-level cause is useful and not part of the public semantic contract. Do not make driver, network, filesystem, or SDK error types the reason callers branch. Prefer `Box<dyn std::error::Error + Send + Sync>` or adapter-local logging when exposing the concrete source type would couple the core API to an incidental dependency.

Do not use `anyhow::Error` in domain, service, repository trait, or public core contracts. `anyhow` is acceptable in binary/runtime glue where errors are immediately logged or mapped before crossing into core, API, IPC, or library boundaries.

Delivery crates map core errors to delivery outputs:

- CLI message and exit code;
- HTTP status/problem response;
- gRPC status;
- Tauri serialized app error.

Serialize core errors directly only when the serialized shape is intentionally shared across deliveries, such as a UI/runtime `DomainError` contract. HTTP Problem Details, gRPC status details, Tauri IPC DTOs, and localized messages belong to delivery/UI layers, not core error fields.

## Config and Public API

Core may define typed config structs:

```rust
pub struct AppConfig {
    pub database_path: PathBuf,
    pub log_level: String,
}
```

Delivery crates should load environment variables, CLI flags, config files, app handles, or platform paths, validate them, and pass typed values to core constructors.

Default to private or `pub(crate)` module items. Export only what other crates need through `lib.rs` or module `mod.rs` files.

Rules:

- make service/usecase constructors and core contract types public when delivery crates need them;
- keep adapter internals private;
- avoid broad prelude modules until the public API stabilizes;
- keep generated modules behind a narrow manual facade when generated APIs are noisy.

## Import Rules and Anti-Patterns

Domain modules should not import:

- `axum`, `tonic`, `hyper`, `tauri`, `clap`, `tower`, or delivery framework crates;
- `sqlx`, `diesel`, `rusqlite`, `redis`, SDK clients, or storage row types;
- generated transport DTOs unless the generated contract is intentionally the domain contract;
- process-global config or environment access.

Avoid:

- infrastructure fields in domain contracts;
- transport DTO leakage into domain;
- protocol details such as HTTP Problem Details, gRPC status details, Tauri command DTOs, or generated API error DTOs in core errors;
- broad `anyhow::Error` or `Box<dyn Error>` return types in domain/service contracts;
- broad `common` helper modules that hide ownership;
- validation only at transport boundaries while domain invariants remain unprotected.

## `domain/common`

Use shared domain modules only for concepts reused by multiple independent domain areas:

- actor/principal;
- tenant/account identity;
- pagination and cursors;
- domain clock value types;
- sorting/filter primitives that are actual domain contracts.

Do not turn `domain/common` into a helper dump. If a type is only used by one domain area, keep it local to that module.
