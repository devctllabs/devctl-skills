# Validation and Cross-Cutting

## Contents

- Validation Principle
- Validation by Layer
- Validation Errors
- Middleware
- Service Wrappers
- Idempotency
- Usecase Wrappers
- Cache
- Helpers
- Wrapper Composition
- Related References

## Validation Principle

Each layer validates only what it owns. Validate early, but keep invariants protected inside the application even when transport already validated DTO shape.

Validation ownership:

- `transport`: protocol DTO shape, required fields, parseable IDs, content type, auth envelope.
- `service`: business rules and operation-level invariants.
- `domain`: value-object invariants and state transitions.
- `repository/client`: storage or integration-specific constraints and error normalization.

## Validation by Layer

Transport validation:

- validates request/message/IPC DTOs;
- returns protocol-appropriate validation errors;
- does not mutate domain state;
- maps valid DTOs into core commands/queries.

Service validation:

- rejects invalid business operations;
- returns core errors such as `AppError::Invalid` or domain-specific errors;
- stays independent from protocol status codes and UI wording.

Repository validation:

- handles database constraints, uniqueness, foreign-key violations, and malformed stored data;
- maps driver failures into core categories;
- does not replace service/domain validation.

## Validation Errors

Use core error categories for business validation. Prefer an enum variant on the shared core error type:

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("invalid: {0}")]
    Invalid(String),
    #[error("conflict: {reason}")]
    Conflict { reason: String },
    #[error("not found: {entity} {id}")]
    NotFound { entity: &'static str, id: String },
    #[error("unavailable")]
    Unavailable,
}
```

Use a richer `ValidationError` / `ValidationIssue` type only when UI, API, Tauri, or tests need field-level structured facts. Keep the issue shape protocol-independent: path, code, and params are core facts; HTTP Problem Details, gRPC status details, Tauri IPC DTOs, localized text, and UI labels stay outside core.

Do not use `anyhow::Error` for validation failures in service/domain APIs. Validation errors are part of the caller-visible contract and should be typed.

## Middleware

Use middleware for cross-cutting delivery concerns:

- request IDs and tracing spans;
- auth extraction and principal construction;
- timeout and body-size limits;
- CORS and compression;
- protocol-level validation helpers;
- metrics and access logs.

For `tower`/`axum`, middleware belongs in the server crate. It may enrich request extensions with delivery-owned values, but services should receive explicit typed parameters for facts that affect business behavior.

## Service Wrappers

Service wrappers add cross-cutting behavior around core operations without changing the implementation:

- instrumentation;
- caching;
- idempotency;
- authorization checks;
- feature flags;
- audit logging.

Prefer explicit wrapper structs over hidden globals:

```rust
pub struct InstrumentedOrderService<S> {
    inner: S,
}

impl<S> InstrumentedOrderService<S> {
    pub fn new(inner: S) -> Self {
        Self { inner }
    }
}
```

If a wrapper changes business guarantees, keep the changed behavior visible in the constructor or type name.

## Idempotency

Idempotency belongs at the boundary that owns the guarantee:

- transport may extract an idempotency key from headers, message metadata, or CLI args;
- service/usecase should receive the key explicitly when it affects business behavior;
- repository may store the key and result through a service-owned trait;
- do not store raw HTTP/gRPC responses as idempotency records inside core.

Default storage shape should be domain-oriented: key, operation identity, domain result/view, domain error category, expiration, and metadata needed for safe replay.

## Usecase Wrappers

Usecase wrappers work above services and around whole flows:

- orchestration-level tracing;
- flow-level idempotency;
- transaction boundaries;
- retries/compensation;
- audit events.

Do not wrap a usecase just to rename a service method. Use usecases for real flow coordination.

## Cache

Default cache shape is read-oriented:

```text
Query -> View
```

Rules:

- cache keys should be derived from explicit query fields;
- TTL and invalidation policy come from config/runtime wiring;
- cache adapters map driver errors into core categories;
- writes should invalidate or update cache deliberately.

Avoid hiding caches inside repositories when the service/usecase needs to reason about freshness or invalidation.

## Helpers

Keep helpers close to their owner:

- domain helpers in the domain module that owns the vocabulary;
- service helpers near the service/usecase;
- transport mappers in the transport module;
- repository mappers in the adapter module;
- reusable technical primitives in `platform` only when shared by multiple modules.

Do not create broad `utils`, `helpers`, or `common` modules without clear ownership.

## Wrapper Composition

Composition belongs in delivery runtime wiring:

```text
repository -> service -> wrapper(s) -> transport
```

Keep wrapper order explicit when behavior depends on it. For example, authorization before mutation, idempotency around replayable work, and metrics around the outer operation.

## Related References

- Read `runtime-and-wiring.md` for dependency construction and runtime ownership.
- Read `service-and-usecase.md` for service and usecase boundaries.
- Read `adapters-and-transport.md` for transport validation and DTO mapping.
