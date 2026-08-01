# Runtime and Wiring

## Contents

- Runtime Boundaries
- Default Delivery Shapes
- CLI Model
- CLI Handler Example
- Server Runtime
- Runtime Composition
- Configuration and Secrets
- Shutdown and Concurrency
- Multi-Binary Wiring
- Error Presentation

## Runtime Boundaries

Delivery crates adapt external inputs and outputs to the reusable core:

```text
delivery input -> core command/query -> core result/error -> delivery output
```

They own runtime dependencies and lifecycle. They should be thin wrappers around core services/usecases.

## Default Delivery Shapes

CLI-only app:

```text
rust/
  crates/
    <app>-core/
    <app>-cli/
```

Server app:

```text
rust/
  crates/
    <app>-core/
    <app>-server/
```

Tauri app:

```text
rust/
  crates/
    <app>-core/
  tauri/
```

Full repo:

```text
rust/
  crates/
    <app>-core/
    <app>-migrator/
    <app>-cli/
    <app>-server/
  tauri/
```

Add only the delivery crates the repo ships.

Combining CLI and server is acceptable when one binary is the intended runtime wrapper:

```text
<app> serve
<app> migrate
<app> seed
```

Split CLI and server when dependencies, lifecycle, deploy units, release artifacts, or CI checks materially differ.

## CLI Model

CLI delivery owns:

- `clap` or the existing argument parser;
- command tree and subcommands;
- terminal input/output;
- file/stdin/stdout conventions;
- exit codes;
- human-readable error formatting;
- one-shot command lifecycle.

Suggested modules:

```text
crates/<app>-cli/src/
  main.rs
  cli.rs
  commands/
  deps.rs
  output.rs
```

The delivery package can be named `<app>-cli` to clarify its workspace role, while the shipped binary should usually use the product command name:

```toml
[package]
name = "<app>-cli"

[[bin]]
name = "<app>"
path = "src/main.rs"
```

Keep server startup as a `serve` subcommand only when this single binary is the shipped artifact.

## CLI Handler Example

Replace `app_core` with the Rust crate import name for `<app>-core`.

```rust
use app_core::domain::order::{CreateOrderCommand, OrderItemParams};
use clap::{Parser, Subcommand};

#[derive(Parser)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    CreateOrder {
        customer_id: String,
        sku: String,
        qty: u32,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let deps = build_deps().await?;

    match cli.command {
        Command::CreateOrder {
            customer_id,
            sku,
            qty,
        } => {
            let order = deps
                .orders
                .create(CreateOrderCommand {
                    customer_id,
                    items: vec![OrderItemParams { sku, qty }],
                })
                .await?;

            println!("{}", order.id.0);
        }
    }

    Ok(())
}
```

CLI should not implement business logic. It parses args, builds config/dependencies, calls core, formats output, and returns an exit code.

## Server Runtime

Server delivery owns:

- `axum`, `tonic`, `hyper`, `tower`, Kafka consumers, or other protocol runtimes;
- route/service registration;
- request/response DTOs;
- protocol error mapping;
- listener binding and graceful shutdown;
- health/readiness endpoints;
- long-running task ownership.

Suggested modules:

```text
crates/<app>-server/src/
  main.rs
  runtime.rs
  deps.rs
  config.rs
  transport/
    http/
    grpc/
    consumer/
```

Server transports should call core services/usecases through explicit dependencies. They should not import repository internals unless they are part of runtime composition.

Keep route/service registration in server delivery modules. Transport `handlers.rs` modules receive already-built deps/state from runtime composition and register HTTP route groups or gRPC generated service adapters; they should not construct repositories, core services, or runtime config themselves.

## Runtime Composition

Delivery crates own the composition root:

- load and validate delivery config;
- create tracing/metrics infrastructure;
- create database pools, filesystem roots, clients, repositories, services, and usecases;
- register shutdown hooks or own resource drop order;
- pass narrow dependencies to transport handlers or CLI command handlers.

Use a simple explicit struct before introducing a DI framework:

```rust
use app_core::{repository::sqlite::SqliteOrderRepository, service::order::OrderService};

pub struct AppDeps {
    pub orders: OrderService<SqliteOrderRepository>,
}
```

If construction gets large, split by provider modules such as `storage`, `services`, `transport`, and `observability`.

## Configuration and Secrets

Delivery crates should load:

- CLI flags and args;
- env vars;
- config files;
- server listen addresses;
- Tauri app paths and runtime profile;
- secrets and integration endpoints.

Then pass typed config values into core. Core may normalize typed config but should not depend on env/global runtime state by default.

Runtime config loading is separate from constructor config and builders. Delivery crates choose env/CLI/file/path precedence and validate it; core constructors receive typed values that are already explicit.

Avoid direct `std::env::var` reads inside service, repository, and domain modules. If core must normalize config values, make the raw input explicit and testable.

Log secret presence, source name, or redacted form only when useful. Do not log raw secret values.

Validate config before starting long-running runtime components.

## Shutdown and Concurrency

Long-running delivery owns shutdown:

- create the root cancellation source;
- listen for process signals or runtime close events;
- run servers, consumers, and workers under owned tasks;
- cancel siblings when one critical task fails;
- stop resources in a predictable order;
- return or log combined run/shutdown errors.

Use the project's established async runtime. For new Tokio projects, `tokio::select!`, `JoinSet`, and `tokio_util::sync::CancellationToken` are common building blocks. Keep the exact abstraction simple until the project needs more.

One-shot CLI commands should usually run sequentially and return the operation result. Do not add a task supervisor for simple one-shot work.

Core should not spawn background tasks unless core also owns their shutdown contract.

## Multi-Binary Wiring

Prefer one delivery package per shipped artifact:

- `<app>-cli` for user/admin command binaries;
- `<app>-server` for long-running network/message runtimes;
- `rust/tauri` for desktop/mobile shell delivery.

Use one binary with subcommands when it is the intended product/runtime wrapper. Split binaries when dependencies, lifecycle, deploy units, or release artifacts differ materially.

## Error Presentation

Core errors are application facts. Delivery crates decide presentation:

- CLI maps to message plus exit code;
- HTTP maps to status, headers, and response body;
- gRPC maps to `Status`;
- Kafka/worker delivery maps to ack/retry/DLQ policy;
- Tauri maps to serialized app errors or fallback IPC errors.

Do not put protocol-specific error details in core unless the protocol is itself the domain.

`anyhow::Result` is acceptable for binary `main`, CLI/bootstrap glue, setup orchestration, and one-off runtime commands where the error is logged or presented immediately. Do not expose `anyhow::Error` from core service/domain/repository trait contracts or public library APIs.

Before an error crosses a stable boundary, map it into an explicit contract:

- core boundary: typed `AppError` or domain-specific error enum;
- HTTP boundary: status, headers, and response body such as Problem Details;
- gRPC boundary: `tonic::Status` and optional status details;
- Tauri boundary: serialized app/domain error shape;
- worker boundary: ack/retry/drop/DLQ policy.

Delivery mappers should match core enum variants and structured payloads. Do not parse error display strings.
