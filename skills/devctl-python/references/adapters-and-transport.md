# Adapters and Transport

## Contents

- Repository Layer
- Storage and Migrations
- Client Layer
- Transport Layer
- HTTP Server Transport
- gRPC Server Transport
- Worker and Messaging Transport
- Generated Code Boundaries
- Transport Rules
- Related References

## Repository Layer

Repositories are storage adapters. They map between storage-specific data and service-facing domain contracts.

Default layout:

```text
src/<package_name>/repository/
  postgres/
    order.py
  memory/
    order.py
```

Repository code owns:

- SQL, ORM queries, row mapping, and storage projections;
- storage transaction/session handling details;
- constraint and driver error mapping into application error categories;
- backend-specific pagination/sorting behavior;
- storage-specific tests.

Repository code must not own business rules, transport DTOs, CLI output, or process lifecycle.

## Storage and Migrations

Put migrations where the existing project expects them. For new services, prefer:

```text
migrations/
```

or a framework-native equivalent when the project uses Django, Alembic, or another migration tool.

Rules:

- keep migration files outside generated-code directories;
- keep migration execution in CLI/deps tooling or framework-native commands;
- test non-trivial repository mapping against real or temporary storage when practical;
- map storage constraint failures into stable application errors.

## Client Layer

`client` contains outbound integrations:

```text
src/<package_name>/client/
  stripe.py
  inventory_api.py
  producer.py
```

Clients own:

- SDK or HTTP/gRPC request construction;
- authentication headers or credentials from typed config;
- timeout/retry behavior when owned by the client;
- external error normalization;
- response mapping into service-facing domain contracts.

External HTTP/gRPC/SDK integrations are not repositories. Outbound message producers or external message APIs are clients. Inbound consumers are transport.

## Transport Layer

`transport` handles inbound protocols and maps requests/messages to service/usecase calls:

```text
src/<package_name>/transport/
  http/
  grpc/
  consumer/
```

Transport owns:

- request/message DTOs;
- route/service/message registration;
- protocol validation and parsing;
- auth actor extraction handoff;
- mapping DTOs to domain commands/queries;
- mapping domain views/results to protocol responses;
- mapping application errors to protocol errors;
- protocol-specific middleware/interceptors.

Transport should receive explicit service/usecase dependencies or narrow Protocols. It should not construct repositories, clients, config, or services.

## HTTP Server Transport

Keep HTTP framework code in `transport/http`:

```text
transport/http/
  app.py                  # app/router factory or protocol aggregation
  common/
    error_mapper.py
    dto_mapper.py
    validation.py
  order/
    handler.py
    create.py
    list.py
```

Use the project's active HTTP framework. Do not choose FastAPI, Django, Flask, or another framework by default when the repo has no explicit decision.

HTTP-specific rules:

- request/response models belong in transport;
- HTTP status codes and Problem Details belong at HTTP boundaries;
- common error mapper converts shared application categories into HTTP responses;
- feature error mapper handles feature-specific typed details before delegating fallback to common;
- route registration and handler composition stay in transport/entrypoint wiring, not service;
- concrete service selection stays in `deps`;
- service/domain code must not import framework request, response, route, or dependency injection types.

If the framework already has standard names such as `routers.py`, `views.py`, `blueprints.py`, or Django apps, preserve them.

## gRPC Server Transport

Keep generated protobuf/grpc types behind generated and transport modules:

```text
transport/grpc/
  handlers.py
  common/
    error_mapper.py
  order/
    handler.py
    create.py
```

Rules:

- generated request/reply types stay in generated or transport modules;
- map request messages into domain commands/queries;
- call services/usecases through explicit dependencies;
- map domain views/results into reply messages;
- map application errors into gRPC status codes/details in transport;
- do not expose generated protobuf types in domain/service contracts by default.

## Worker and Messaging Transport

Inbound consumers are transport because they receive external messages and initiate business work.

Default layout:

```text
transport/consumer/
  common/
    error_mapper.py
  order_events/
    handler.py
    record_created.py
```

Rules:

- keep topic, queue, subscription, and retry policy in config/deps/transport;
- map message DTOs to domain/usecase commands;
- make idempotency and retry/drop/DLQ policy explicit;
- do not make CLI command names equal physical topic names unless the project deliberately exposes that operational detail;
- do not encode Kafka, queue, or scheduler policy into domain errors.

Outbound producers are clients unless they are part of an inbound protocol adapter.

## Generated Code Boundaries

Generated code may live in:

```text
src/<package_name>/generated/
gen/
api/generated/
```

Follow existing project configuration first. Use `src/<package_name>/generated/` only when no project-specific boundary exists.

Rules:

- do not hand-edit generated files;
- keep generated DTOs at adapter boundaries;
- wrap noisy generated clients behind handwritten clients or service-owned Protocols;
- update generated code only when the user asks or when generation is part of the requested task.

## Transport Rules

- Validate transport DTO shape at the boundary, but keep business invariants in services/domain.
- Match application error categories in delivery mappers; do not parse error strings.
- Keep delivery-specific error mappers in transport or CLI modules, not domain/service.
- Keep route registration, middleware, interceptors, consumers, and server setup out of services.
- Do not pass broad service bundles into handlers when a narrow Protocol or explicit service is enough.
- Do not import repository implementations directly from handler modules unless the file is explicitly part of dependency wiring.

## Related References

- Read `runtime-and-wiring.md` for CLI entrypoints, dependency construction, config loading, and process lifecycle.
- Read `testing-strategy.md` for repository, client, and transport test scope.
- Read `observability-and-health.md` for logging, metrics, tracing, and health endpoints.
