# Tauri and Rust plus UI Monorepos

## Contents

- Role
- Default Monorepo Layout
- `rust/tauri` Boundary
- Tauri Config
- Commands
- Command Example
- App Paths and Local State
- UI Bridge
- Validation

## Role

Use this reference for Rust-side Tauri structure and monorepo wiring. UI-side service adapters, React providers, and frontend error handling stay in `devctl-react-vite`.

Tauri is a delivery shell over `<app>-core`, not the place for the whole application.

## Default Monorepo Layout

```text
project-root/
  api/
    openapi/
  ui/
    package.json
    src/
  rust/
    Cargo.toml
    crates/
      <app>-core/
      <app>-migrator/
    migrations/
    tauri/
      Cargo.toml
      package.json
      tauri.conf.json
      build.rs
      src/
        main.rs
        lib.rs
        commands/
  package.json
  pnpm-workspace.yaml
```

`rust/tauri` is both:

- a Cargo package for the Tauri shell;
- a package-manager workspace package when the Tauri CLI is installed through npm/pnpm.

Root scripts should coordinate UI and Tauri commands:

```json
{
  "scripts": {
    "dev:ui": "pnpm --dir ui dev",
    "build:ui": "pnpm --dir ui build",
    "dev:tauri": "pnpm --dir rust/tauri dev",
    "build:tauri": "pnpm --dir rust/tauri build",
    "check:rust": "cargo check --manifest-path rust/Cargo.toml",
    "test:rust": "cargo test --manifest-path rust/Cargo.toml"
  }
}
```

## `rust/tauri` Boundary

The Tauri crate owns:

- `tauri::Builder` setup;
- plugins;
- windows, menus, tray, and app lifecycle;
- `#[tauri::command]` handlers;
- `AppHandle`, `Manager`, and app path resolution;
- Tauri-specific error mapping;
- bundle metadata and Tauri CLI package metadata.

It should call core services/usecases instead of implementing business logic inline.

The core crate owns:

- domain and application behavior;
- local storage repositories;
- migration APIs;
- delivery-agnostic filesystem abstractions;
- typed app errors;
- testable application services.

## Tauri Config

In a repo with `ui/` beside `rust/`, Tauri config usually points back to the UI package:

```json
{
  "build": {
    "frontendDist": "../../ui/dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "pnpm --dir ../.. dev:ui",
    "beforeBuildCommand": "pnpm --dir ../.. build:ui"
  }
}
```

Rules:

- keep paths relative to `rust/tauri`;
- keep UI build/dev commands routed through root scripts when the root owns workspace orchestration;
- keep app identity in `tauri.conf.json` and package metadata in `Cargo.toml`;
- avoid duplicating UI package-manager state inside Rust crates.

Manual window creation is acceptable when the app needs bootstrap, routing, splash, or custom startup sequencing. Otherwise prefer the simpler Tauri config-driven window behavior already used by the project.

## Commands

Tauri commands are transport handlers:

```rust
#[tauri::command]
fn bootstrap(app: tauri::AppHandle) -> Result<BootstrapResult, DomainError> {
    // Resolve Tauri runtime inputs, call core, map errors.
}
```

Rules:

- keep command args/results serializable and stable for the UI contract;
- call core services/usecases for business behavior;
- keep repeated command wiring in `commands/` modules as the command set grows;
- map core errors to the app's serialized Tauri error shape;
- keep unknown IPC failures handled on the UI side as a fallback.

Do not expose raw database, filesystem, or driver errors across IPC.
Do not return `anyhow::Error` from Tauri commands. Tauri commands should return serializable success values and a stable serialized app/domain error shape.

## Command Example

Build reusable state during Tauri setup, then keep commands as thin transport handlers:

```rust
use std::{path::PathBuf, sync::Arc};

use app_core::{
    domain::order::{CreateOrderCommand, OrderItemParams, OrderView},
    error::AppError,
    repository::sqlite::SqliteOrderRepository,
    service::order::OrderService,
};
use tauri::{AppHandle, Manager};

pub struct AppState {
    orders: Arc<OrderService<SqliteOrderRepository>>,
}

pub async fn build_state(app: &AppHandle) -> Result<AppState, DomainError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(map_tauri_error)?;

    build_deps(data_dir).await.map_err(map_core_error)
}

async fn build_deps(data_dir: PathBuf) -> Result<AppState, AppError> {
    let repository = open_sqlite_repository(data_dir).await?;
    let orders = Arc::new(OrderService::new(repository));

    Ok(AppState { orders })
}

#[derive(serde::Deserialize)]
pub struct CreateOrderArgs {
    customer_id: String,
    sku: String,
    qty: u32,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderDto {
    id: String,
    customer_id: String,
}

#[tauri::command]
pub async fn create_order(
    state: tauri::State<'_, AppState>,
    args: CreateOrderArgs,
) -> Result<OrderDto, DomainError> {
    let order = state
        .orders
        .create(CreateOrderCommand {
            customer_id: args.customer_id,
            items: vec![OrderItemParams {
                sku: args.sku,
                qty: args.qty,
            }],
        })
        .await
        .map_err(map_core_error)?;

    Ok(OrderDto::from(order))
}

impl From<OrderView> for OrderDto {
    fn from(order: OrderView) -> Self {
        Self {
            id: order.id.0,
            customer_id: order.customer_id,
        }
    }
}
```

Register `AppState` with `Builder::manage(...)` or after async setup according to the project's Tauri version and plugin setup. Keep `AppHandle` and Tauri path resolution out of `<app>-core`.

## App Paths and Local State

Tauri owns runtime path resolution:

- app data dir;
- cache/log dirs;
- platform-specific storage roots;
- mobile/desktop runtime profile.

Pass resolved typed paths or config into core. Do not make core depend on `AppHandle`.

For local databases, keep migration sources outside `tauri/` and call migration APIs from Tauri setup or bootstrap commands.

## UI Bridge

Keep the split explicit:

- Rust Tauri command implements runtime behavior and returns serializable values/errors.
- UI `platform/tauri/invoke.ts` wraps IPC and maps unknown failures.
- UI `platform/services/<feature>/tauri/*Service.ts` adapts feature service contracts to command names.
- Features remain backend/runtime agnostic.

HTTP Problem Details belongs at HTTP boundaries. Tauri can use a serialized internal app/domain error shape instead of pretending to be HTTP.

The Tauri error mapper should match core `AppError` variants and copy only stable facts into the serialized error contract, such as message/category, retryability, validation issues, entity, or entity ID. Tauri runtime failures such as path resolution or plugin setup errors are delivery/runtime errors; map them before returning across IPC.

## Validation

Useful checks for Tauri monorepos:

```bash
cargo check --manifest-path rust/Cargo.toml
cargo test --manifest-path rust/Cargo.toml
pnpm --dir rust/tauri info
pnpm --dir rust/tauri build
```

Run only commands that are relevant and available in the repo. For Linux CI failures, inspect the actual workflow and failing native crate messages before adding system packages.
