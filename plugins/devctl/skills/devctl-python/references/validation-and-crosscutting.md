# Validation and Cross-Cutting

## Contents

- Validation Principle
- Validation by Layer
- Validation Errors
- Middleware
- Service Wrappers
- Idempotency
- Cache
- Helpers
- Wrapper Composition
- Related References

## Validation Principle

Validate each fact at the boundary that owns it.

- Transport validates protocol shape, parsing, required fields, auth extraction, and DTO constraints.
- Domain validates invariants that must hold everywhere.
- Service/usecase validates business rules and cross-entity policies.
- Repository validates storage constraints only as a last defense and maps violations to application errors.
- Client validates outbound config and response shape at the integration boundary.

Do not rely only on HTTP/Pydantic/form validation for business invariants. The same service operation may be called from CLI, worker, tests, or another transport.

## Validation by Layer

Transport validation:

- request body/query/path/header shape;
- file/stdin/stdout format for CLI;
- message schema and envelope metadata;
- auth token/session extraction;
- protocol-specific field path formatting.

Domain/service validation:

- empty items, invalid state transitions, limits, ownership rules, idempotency semantics;
- structured validation issue codes and stable params;
- category-preserving application errors.

Repository/client validation:

- config completeness;
- external response sanity;
- storage constraint normalization;
- timeout/retry classification when owned by the adapter.

## Validation Errors

Use stable application categories and optional structured issues:

```python
@dataclass(frozen=True, slots=True)
class ValidationIssue:
    path: tuple[str, ...]
    code: str
    params: dict[str, str]
```

Rules:

- transport maps field paths into the protocol contract;
- domain/service emits protocol-independent paths and codes;
- do not use localized text as the only machine-readable contract;
- do not expose framework validation exception types outside transport.

## Middleware

Middleware belongs to transport or entrypoint layers.

HTTP middleware may:

- attach request IDs;
- extract auth context;
- start tracing spans;
- record metrics;
- enforce request limits;
- translate protocol exceptions.

Middleware should not implement business rules. Pass stable facts such as actor, tenant, idempotency key, or locale explicitly into service/usecase commands or method parameters.

## Service Wrappers

Service wrappers add cross-cutting behavior around operations without changing the implementation:

- logging;
- metrics;
- tracing;
- idempotency;
- caching;
- audit logging;
- authorization checks when the policy is service-level.

Use wrappers when the behavior must apply consistently across transports. Keep wrapper constructors explicit and wire them in `deps`.

## Idempotency

Idempotency ownership depends on the operation:

- transport reads idempotency keys from headers, messages, CLI args, or context;
- service/usecase decides semantic idempotency and conflict behavior;
- repository stores idempotency records or locks when persistence is required;
- transport maps duplicate/conflict outcomes into protocol responses.

Do not hide idempotency key extraction in global context or framework dependency injection if the service contract needs it.

## Cache

Cache policy belongs where the cached fact is owned:

- client: external response cache;
- repository: storage/query cache;
- service/usecase: business result cache;
- transport: protocol caching headers only.

Keep cache invalidation and key shape close to the owner. Do not put transport-specific cache policy in domain.

## Helpers

Place helpers by ownership:

- domain vocabulary helpers in `domain` or `domain/common`;
- technical primitives in `platform`;
- transport mappers in `transport/<protocol>/common`;
- test-only builders in tests or test support modules;
- integration-specific helpers next to the adapter.

Avoid `utils.py` as a default. If a helper has no clear owner, keep it local until repetition proves the boundary.

## Wrapper Composition

Compose wrappers in `deps` or entrypoint construction, not inside the service implementation.

Example order:

```text
authorization -> idempotency -> cache -> tracing -> metrics -> logging -> service
```

Choose the order deliberately for the behavior:

- auth should usually run before side effects;
- idempotency should wrap side-effecting operations;
- cache should avoid unnecessary inner calls;
- tracing/metrics/logging should observe the intended span of work.

## Related References

- Read `domain.md` for validation issue shapes and domain error categories.
- Read `service-and-usecase.md` for service-owned business validation.
- Read `adapters-and-transport.md` for transport validation and protocol error mapping.
