# Observability and Health

## Contents

- Ownership
- Tracing and Logging
- Instrumentation Usage
- Metrics
- Health Checks
- Debug and Profiling
- Examples
- Review Checklist

## Ownership

Delivery crates own observability setup:

- `tracing_subscriber` initialization;
- log format and filter config;
- metrics exporter setup;
- health/readiness routes;
- debug/profiling endpoints;
- runtime-specific shutdown and flush behavior.

Core code may emit spans/events and return typed errors, but it should not initialize global subscribers or exporters.

## Tracing and Logging

Use `tracing` as the default Rust observability API unless the existing project has another active convention.

Rules:

- initialize subscribers once in delivery runtime;
- pass no logger object by default when `tracing` spans/events are sufficient;
- avoid global mutable config and hidden side effects in core;
- include operation, entity IDs, actor/tenant IDs, and error categories when useful;
- do not log raw secrets, tokens, or sensitive payloads.

Example:

```rust
#[tracing::instrument(skip(self, command), fields(customer_id = %command.customer_id))]
pub async fn create(&self, command: CreateOrderCommand) -> Result<OrderView, AppError> {
    self.repo.insert(command).await
}
```

Use `skip(...)` for large, sensitive, or non-debuggable values.

## Instrumentation Usage

Prefer spans around operations and concise events for important transitions:

- service/usecase operation start/failure when useful;
- repository/client adapter failures after error classification;
- transport request IDs and protocol metadata;
- shutdown and lifecycle transitions.

Do not add noisy logs for every trivial branch. Observability should make failure diagnosis easier, not produce an unbounded trace dump.

## Metrics

Metrics usually belong in delivery wrappers or middleware:

- request/response duration and status;
- queue lag and message handling result;
- external client latency and error category;
- repository query latency when useful;
- background task lifecycle.

Keep metric labels bounded. Avoid raw user IDs, paths with unbounded parameters, SQL text, or error strings as labels.

## Health Checks

Server delivery should expose health/readiness when it is deployed as a service:

- liveness: process/runtime is alive;
- readiness: required dependencies are usable enough to receive traffic;
- startup: optional, useful for slow initialization.

Health checks should call narrow dependency checks, not full business flows. Keep them cheap and bounded by timeouts.

Tauri apps usually do not need HTTP health endpoints, but can expose diagnostics through app-specific debug UI or logs when useful.

## Debug and Profiling

Debug/profiling endpoints are delivery concerns:

- keep them behind config;
- disable or protect them in production;
- avoid exposing secrets, request bodies, or user data;
- document the exact runtime command or feature flag when adding them.

For Tokio runtime issues, prefer targeted tracing and task instrumentation before adding broad debug surfaces.

## Examples

Delivery setup:

```rust
pub fn init_tracing(filter: &str) -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .try_init()?;

    Ok(())
}
```

Adapter error logging:

```rust
let order = repository
    .load(order_id.clone())
    .await
    .map_err(|error| {
        tracing::warn!(%order_id.0, error = %error, "failed to load order");
        error
    })?;
```

## Review Checklist

- Subscriber/exporter setup is in delivery runtime.
- Core emits spans/events but does not initialize globals.
- Metrics labels are bounded.
- Health checks are cheap and dependency-focused.
- Sensitive data is redacted or skipped.
