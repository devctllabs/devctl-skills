# Validation and Cross-Cutting Behavior

## Contents

- Validation Principle
- Validation by Layer
- Validation Errors
- Middleware
- Service Decorators
- Idempotency
- Related References
- Usecase Decorators
- Cache
- Helpers
- Wrapper Composition

## Validation Principle

Each layer validates only what it owns. Validate early, but keep invariants protected inside the application even when transport already validated DTO shape.

- `transport`: format and protocol-level DTO validity.
- `service` / `domain`: domain invariants and business rules.
- `usecase`: scenario-specific conditions and process context.
- `repository`: storage integrity and concurrency guarantees.

Errors are normalized as data moves inward.

## Validation by Layer

Transport validation:

- checks required fields, types, UUID/email/date/enum formats, ranges, lengths, and simple cross-field constraints such as `from <= to`;
- validates transport DTOs, not domain models;
- returns protocol errors such as HTTP `400` or gRPC `InvalidArgument`;
- does not use domain errors for pure format problems.

Domain/service validation:

- checks entity invariants;
- checks valid states and transitions;
- checks forbidden value combinations;
- protects rules that must be true no matter which entrypoint calls the operation;
- returns domain errors such as `ErrInvalid`, `ErrConflict`, or `ErrInvalidState`;
- uses a typed domain validation error only when callers need structured domain facts such as issue path, code, or params.

Usecase validation:

- checks scenario context, permissions, related entity existence, and flow-specific constraints;
- may perform preliminary uniqueness checks for diagnostics/UX, but actual uniqueness must be enforced by storage constraints;
- returns domain errors;
- belongs in `internal/usecase` when the scenario is complex, or in `service` when no usecase layer exists.

Repository validation:

- enforces `NOT NULL`, `UNIQUE`, `CHECK`, foreign keys, optimistic locking, and race/concurrency integrity;
- does not implement business validation;
- maps constraint/driver errors into domain categories;
- is the final integrity barrier.

## Validation Errors

Format/field errors:

- live at transport level;
- identify field/path, code, and optional message/params;
- are intended for API clients.

Domain errors:

- live in domain/service/usecase/repository boundaries;
- are protocol-independent;
- use sentinel categories by default;
- may use typed errors for structured domain facts while preserving `errors.Is` category checks;
- are mapped by transport to status codes or gRPC codes.

Avoid:

- business validation in transport;
- syntax/format validation in service;
- raw driver/network errors escaping repository/client adapters;
- HTTP Problem Details, gRPC status details, API-generated validation DTOs, or localized UI labels in domain validation errors;
- assuming service/domain checks are unnecessary because transport validated DTOs.

## Middleware

Transport middleware lives near the protocol:

```text
internal/transport/serverhttp/common
internal/transport/servergrpc/common
internal/transport/consumerkafka/common
```

Examples:

- request ID;
- auth;
- rate limit;
- recovery;
- access log;
- protocol metrics such as RPS, latency, status codes;
- tracing span for request/RPC/message;
- HTTP body size limits, CORS, compression.

Rules:

- Middleware does not contain business logic.
- Middleware does not call repositories directly.
- Middleware works at protocol level.
- Domain errors are mapped to protocol responses by transport error mappers.

For authentication, coarse admission checks, business authorization, actor passing, and tenant/resource policy, read `auth-and-access-control.md`.

## Service Decorators

Service decorators add cross-cutting behavior around domain operations without changing the core implementation.

Use for:

- operation-level metrics, tracing, and logging;
- read caching;
- timeouts, rate limits, retries, circuit breakers, fallback;
- idempotency wrappers when appropriate.

Default placement:

```text
internal/service/<entity>/metrics.go
internal/service/<entity>/tracing.go
internal/service/<entity>/logging.go
internal/service/<entity>/cache.go
```

Use `internal/service/<entity>/decorators` only when wrappers become numerous or heavy.

Rules:

- The decorator implements the same `internal/service/<entity>.Service` interface.
- The decorator receives dependencies; it does not perform DI or create infrastructure clients.
- `*zap.Logger` is acceptable as a direct dependency.
- If a decorator constructor receives logger, order parameters as `ctx?`, `logger?`, wrapped service, then other dependencies and options.
- Other system dependencies use interfaces.
- The decorator uses domain contracts and returns domain errors.
- Build the wrapper chain explicitly in `internal/deps`.

## Idempotency

Idempotency for write operations belongs in `service` or `usecase`, not in transport.

Rules:

- Transport extracts and validates the `operation-id` / idempotency key format, then passes it inward.
- If the key affects business guarantees, prefer an explicit field in the `Command` or an explicit operation parameter.
- Do not rely on `context.Context` as the only carrier for a business-significant key.
- Deduplication and concurrent repeat handling happen in service/usecase.
- Store a domain `Result` and, if needed, a domain error. Do not store raw HTTP/gRPC responses.
- Storage for idempotency state, such as Redis, DB, or memory, is wired in `internal/deps`.

For message idempotency, retries, DLQ, and outbox decisions, read `adapters-and-transport.md`.

## Usecase Decorators

Usecase decorators wrap a whole flow, usually around `Run(...)`.

Use for:

- end-to-end tracing and metrics;
- flow timeouts and limits;
- flow retries/backoff when semantically valid;
- transaction wrapper if the usecase owns transaction scope;
- logging flow stages/results;
- controlled concurrency policies.

Placement:

- default: same flow package, `internal/usecase/<flow>`;
- use `internal/usecase/<flow>/decorators` only when wrappers become numerous or heavy.

Rules:

- Usecase decorators work above services.
- They do not import repository implementations.
- If a usecase wraps only one service call, a service decorator is usually enough.

## Cache

Separate mechanism from application:

- mechanism: `internal/platform/cache` for Redis/memory, TTL, codecs;
- application: decorator/wrapper around the interface that owns the caching decision.

Where to apply:

- domain read operation cache: service decorator, usually `internal/service/<entity>/cache.go`;
- external response cache: client wrapper near `internal/client/<system>`.

Rules:

- Default cache shape is read-oriented: `Query -> View` with TTL.
- Business-driven invalidation belongs in `service` or `usecase`.
- Transport does not contain caching logic.

## Helpers

Default: keep helper code in the package that uses it.

Examples:

```text
validation.go
mapping.go
keys.go
errors.go
*_helpers.go
```

Move helper code to a common package only when:

- it is used by at least two independent places;
- it does not depend on domain/service/usecase/transport in a way that makes it part of a business layer.

Common helpers should be organized by topic, not `utils`:

```text
internal/platform/telemetry
internal/platform/cache
internal/platform/clock
```

## Wrapper Composition

Compose middleware, decorators, and cross-cutting chains in `internal/deps`.

`internal/deps` should make visible:

- infrastructure dependencies;
- base services/usecases;
- wrappers applied to them;
- wrapper order, for example `logging -> metrics -> tracing -> cache`.

Do not hide wrapper chains inside business packages. The composition root must show the runtime behavior.

## Related References

- Read `observability-and-health.md` for metrics, tracing, readiness/liveness, and pprof boundaries.
- Read `runtime-and-wiring.md` for timeout, cancellation, goroutine, and shutdown ownership.
