# Cross-Cutting Behavior

## Contents

- Middleware
- Service and Usecase Decorators
- Idempotency
- Cache
- Helpers
- Wrapper Composition
- Testing

## Middleware

Keep protocol middleware beside its transport:

```text
internal/transport/serverhttp/common
internal/transport/servergrpc/common
internal/transport/consumerkafka/common
```

Use middleware for request IDs, authentication handoff, coarse admission, rate limiting, recovery,
access logs, protocol metrics, tracing spans, body limits, CORS, and compression. Keep it protocol-
level; call application behavior through handlers and map domain errors through transport mappers.

## Service and Usecase Decorators

Use service decorators for operation-level logging, metrics, tracing, read caching, idempotency, or
resilience policy that belongs around a domain operation.

```text
internal/service/<entity>/metrics.go
internal/service/<entity>/tracing.go
internal/service/<entity>/logging.go
internal/service/<entity>/cache.go
```

The decorator implements the same service interface, accepts the wrapped service and explicit
dependencies, uses domain contracts, and returns domain errors. Construct it in `internal/deps`.
Use a `decorators` subpackage only when wrappers become numerous or heavy.

Use usecase decorators around a complete flow for end-to-end telemetry, semantically valid
retries/backoff, flow timeouts/limits, transaction scope, stage logging, or controlled concurrency.
Keep them in the flow package by default and above services.

## Idempotency

Pass a validated operation/idempotency key inward explicitly when it affects business guarantees.
Deduplicate concurrent repeats in service/usecase and persist domain results or domain errors rather
than protocol responses. Wire DB/Redis/memory mechanisms in DI. Read `kafka-and-messaging.md` for
message retry, DLQ, offset, and outbox policy.

## Cache

Separate mechanism from application policy:

- keep a shared domain-free Redis/memory primitive in `internal/platform/cache`;
- keep domain keys, value mapping, and codecs in a repository cache adapter;
- allow a transparently cached repository to receive operational TTL/config from DI only when
  freshness, invalidation, and cache failure do not change the application contract;
- put observable freshness, invalidation, fallback, and cache-aside order around the owning service
  operation or in a service decorator;
- put an external response cache around the owning client;
- do not pass raw cache keys, TTLs, or invalidation flags through repository methods.

Default to read-oriented `Query -> View` caching. Keep cache policy out of transport.

## Helpers

Keep helpers beside their consumer:

```text
validation.go
mapping.go
keys.go
errors.go
*_helpers.go
```

Move stable domain-free behavior used by independent packages into a topic-named platform package:

```text
internal/platform/telemetry
internal/platform/cache
internal/platform/clock
```

## Wrapper Composition

Compose middleware, base services/usecases, and decorators explicitly in `internal/deps`. Make the
order visible because construction order and invocation order run in opposite directions.

For operation telemetry, construct the chain from the base outward as `base -> metrics -> tracing`:

```go
base := NewBaseService(...)
metrics := NewMetricsService(meter, base)
service := NewTracingService(tracer, metrics)
```

Invocation is then `tracing -> metrics -> base`. The tracing decorator is outermost, so the active
operation span is present while metric instruments record and exemplars can correlate. Add logging,
cache, resilience, or idempotency wrappers only where their ownership and desired timing are
explicit; never rely on registration order that hides the final chain.

Prefer decorators for operation instrumentation. Inline tracing or metrics in a base
service/usecase only when instrumentation is inseparable from that implementation and a wrapper
would obscure the behavior. Inject official `trace.Tracer` and `metric.Meter` values from the
composition root, never global providers. Create metric instruments once in the decorator
constructor and return a construction error when instrument creation fails.

## Testing

Test each wrapper at its owned interface: delegation, order, success/error preservation, retry or
cache policy, idempotent repeats, and telemetry fields. Keep base business behavior in base owner
tests. Add DI smoke coverage for the final chain. Follow `testing-strategy.md`.
