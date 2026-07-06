# Adapters and Transport

## Contents

- Repository Layer
- Storage and Migrations
- Client Layer
- Transport Layer
- gRPC Server Transport
- HTTP Server Transport
- Kafka Consumer Transport
- Messaging and Events
- Transport Rules
- Related References

## Repository Layer

`internal/repository` implements access to internal storage systems and realizes interfaces declared by services.

Storage systems include:

- SQL/NoSQL databases;
- caches;
- file and object storage;
- internal storage APIs that are storage abstractions for the service.

External HTTP/gRPC/SDK integrations are not repositories. Put them in `internal/client`. Inbound Kafka is transport. Outbound producers or external message APIs are clients.

Recommended structure:

```text
internal/repository/<entity>/
  repository.go
  get.go
  list.go
  upsert.go
  delete.go
  errors.go
  common.go
```

File roles:

- `repository.go`: constructor and exported adapter implementation.
- `get.go`, `list.go`, `upsert.go`, `delete.go`: operation implementations.
- `errors.go`: low-level error classifiers and mapping to domain categories.
- `common.go`: optional SQL fragments, shared local helpers, constants.

Keep a single `repository.go` when there are only 1-3 small operations. Split as soon as operations become independently readable.

Backend rule:

```text
internal/repository/<entity>/
  postgres/
    repository.go
    get.go
    list.go
    upsert.go
    delete.go
    errors.go
  sqlite/
    repository.go
  memory/
    repository.go
```

Rules:

- One concrete repository implementation uses one storage backend/driver.
- Alternative backends live in separate subpackages.
- The repository interface stays in `internal/service/<entity>/service.go`.
- DI chooses concrete implementations based on configuration.
- Repository code contains data access and mapping, not business rules.
- Storage row/projection structs are local to an operation file, `mapper.go`, or `row.go`; they are not exported as domain contracts.
- Convert `storage <-> domain/operation contracts` inside the repository.
- Never return raw driver errors as public behavior.

Error mapping:

```go
func classify(err error) error {
    switch {
    case isNoRows(err):
        return fmt.Errorf("order repo: %w", domain.ErrNotFound)
    case isUniqueViolation(err):
        return fmt.Errorf("order repo: %w", domain.ErrConflict)
    case isTimeout(err) || isConnReset(err):
        return fmt.Errorf("order repo: %w", domain.ErrUnavailable)
    default:
        return fmt.Errorf("order repo: %w: %v", domain.ErrInternal, err)
    }
}
```

The wrapped error must remain compatible with `errors.Is` / `errors.As`. Preserve the domain category for callers and keep low-level details local to logs or adapter context. If structured domain facts are needed, return a typed domain error that unwraps to the category; do not expose raw driver types or constraint names as service-facing behavior.

## Storage and Migrations

Storage schema is changed through source-controlled migrations or the repo's established schema-management tool.

Repository code owns data access and mapping. It does not secretly create, alter, or migrate schema at runtime.

Use the migration path from existing repo conventions, `devctl.yaml`, generator config, or docs. When none exists, `migrations/` is the default place to look before proposing a new path.

Migrations should be source-controlled, ordered, reproducible, reviewed with the repository code that depends on them, safe for the known deployment model, and tested by applying to a clean test database when practical.

Do not embed schema creation in repository constructors:

```go
func NewRepository(db DB) *Repository {
    db.Exec("ALTER TABLE orders ADD COLUMN approved_at timestamptz")
    return &Repository{db: db}
}
```

Repositories:

- implement service-owned interfaces;
- map storage rows to domain operation contracts;
- normalize driver/constraint errors into domain categories;
- handle backend-specific SQL, scans, and transactions;
- preserve tenant/resource scoping required by service/usecase.

Repositories do not decide business authorization, own domain state transitions, expose storage rows as domain contracts, or return raw driver errors as public behavior.

When changing schema and repository code together:

- add or update migrations;
- update repository queries/mappers;
- update repository integration tests;
- update generated config or devctl manifest only when the project requires it;
- preserve backward compatibility for rolling deploys when the repo has that requirement.

For destructive schema changes, prefer expand/migrate/contract when deployment order is uncertain.

Migration test checklist:

```text
- apply migrations to an empty database
- optionally apply to a fixture/current schema
- verify expected tables, columns, indexes, and constraints
- verify rollback only if the project supports rollback migrations
```

Repository integration checklist:

```text
- run against real DB or test DB
- seed data through SQL or repository setup helpers
- assert domain results, not raw rows
- test constraint/error mapping
- test transaction/locking behavior when relevant
```

Transaction ownership:

- service/usecase describes the domain operation and calls `TxManager`;
- repository uses transaction from context or injected transaction handle;
- repository does not decide whether the business operation should be atomic.

## Client Layer

`internal/client` contains outbound integrations with external systems:

- HTTP or gRPC APIs;
- third-party SDKs;
- external message APIs or producer clients;
- retry, timeout, tracing, authentication, circuit breaker, and protocol details.

It does not contain:

- business rules;
- inbound request handling;
- internal storage access.

Recommended structure:

```text
internal/client/<system>/
  client.go
  types.go
  mapper.go
  errors.go
  grpc/
  http/
  sandbox/
```

Rules:

- One external system is one client package.
- Interfaces are declared by the consuming service.
- Concrete client implementations live in `internal/client`.
- Keep compact integrations in one file, such as `internal/client/billing/billing.go`.
- Split into `client.go`, `types.go`, `mapper.go`, and `errors.go` only when volume or complexity justifies it.
- Normalize external errors into categories expected by the service-facing interface.
- Do not expose raw HTTP statuses, gRPC codes, or SDK-specific errors as the service contract.
- Wire concrete clients in `internal/deps`.

Example:

```text
internal/service/billing/service.go     # type BillingClient interface { ... }
internal/client/billing/billing.go      # type Client struct { ... }
```

## Transport Layer

`internal/transport` handles inbound protocols and maps requests to service/usecase calls:

```text
internal/transport/
  servergrpc/
  serverhttp/
  consumerkafka/
```

When generated protocol packages exist, mirror their protocol-level boundary in handwritten transport code. For example, keep `gen/servergrpc` usage inside `internal/transport/servergrpc`, aggregate generated gRPC service interfaces in `handlers.go`, and split handwritten controllers by functional area under that protocol package.

Root-level `handlers.go` files in protocol packages are transport aggregation points, not DI layers. They may aggregate generated service interfaces, route groups, registration helpers, or a protocol handler set. They must not create services or repositories, read the DI container, accept `svcLayer`, or choose concrete implementations. DI builds concrete controller handlers with explicit service/usecase interfaces and passes those handlers into transport aggregation or registration.

If `devctl.yaml` or codegen config declares custom HTTP, gRPC, or Kafka output directories, use those generated packages instead of assuming default `gen/serverhttp`, `gen/servergrpc`, `gen/clienthttp`, `gen/clientgrpc`, `gen/consumerkafka`, or `gen/producerkafka` paths.

For contract inputs, generated output hygiene, compatibility, and drift checks, read `devctl-yaml-integration.md`.

Transport:

- validates protocol DTO format;
- maps DTOs to domain commands/queries or usecase commands/queries;
- calls service/usecase through explicit interfaces;
- maps domain results/views back to protocol responses;
- maps domain errors to protocol errors;
- owns protocol middleware such as auth, tracing, metrics, request ID, and recovery.

Transport must not contain business logic, repository calls, or storage/client implementation details.

## gRPC Server Transport

Shape:

```text
internal/transport/servergrpc/
  handlers.go
  common/
    middleware.go
    validator.go
    error_mapper.go
    dto_mapper.go
  echo/
    handler.go
    echo.go
    echo_test.go
  quickstats/
  advancedstats/
```

`handlers.go` aggregates generated gRPC service interfaces into a protocol-level value consumed by DI/runtime registration:

```go
package servergrpc

import (
    "context"

    gen "<module>/gen/servergrpc"
)

type EchoHandler interface {
    EchoServiceEcho(ctx context.Context, req *gen.EchoRequest) (*gen.EchoReply, error)
}

type StatsQueryHandler interface {
    StatsQueryServiceCampaignStats(ctx context.Context, req *gen.CampaignStatsRequest) (*gen.CampaignStatsReply, error)
}

type Handlers struct {
    EchoHandler
    StatsQueryHandler
}
```

Keep `servergrpc/handlers.go` as the default when generated gRPC services exist. It owns the generated gRPC service surface and registration shape; controller packages own only their `Handler` constructors and method implementations.

Controller structure:

```text
internal/transport/servergrpc/<controller>/
  handler.go
  <operation>.go
  error_mapper.go     # optional, only for controller-specific error details
  *_test.go
```

`handler.go` contains only the struct and constructor. Export narrow interface names when they appear in exported constructor signatures:

```go
type StatsQuerier interface {
    Query(ctx context.Context, q domstats.AdvancedStatsQuery) (domstats.AdvancedStatsView, error)
}

type Handler struct {
    logger *zap.Logger
    stats  StatsQuerier
}

func NewHandler(logger *zap.Logger, stats StatsQuerier) *Handler {
    return &Handler{logger: logger, stats: stats}
}
```

DI selects the needed service fields from its private `svcLayer` and passes them explicitly. The handler does not receive the bundle:

```go
services := c.services()

handler := statsgrpc.NewHandler(
    logger,
    services.Stats,
)
```

Each operation file implements one gRPC method:

```go
func (h *Handler) AdvancedStatsQueryServiceQuery(
    ctx context.Context,
    req *gen.QueryRequest,
) (*gen.QueryReply, error) {
    // Validate DTO, map to domain query, call service, map domain view to proto.
}
```

Use `common/` for protocol middleware, validators, shared DTO mappers, and shared error mappers.

Error mapper placement is two-level:

- `internal/transport/<protocol>/common/error_mapper.go` maps protocol-wide domain categories with `errors.Is`, such as not found, invalid, conflict, forbidden, unavailable, and internal.
- `internal/transport/<protocol>/<controller>/error_mapper.go` is optional. Add it only when the controller has feature-specific typed domain errors, contract extensions, or response details that require `errors.As`.
- One operation may keep a private local helper instead of a controller-level `error_mapper.go` when the mapping is used only once.
- Controller-level mappers handle feature-specific details first, then delegate fallback category mapping to `common`.
- Domain and service packages must not import protocol mapper types, status codes, Problem Details, gRPC status details, or generated response DTOs.

## HTTP Server Transport

Use the same shape as gRPC:

```text
internal/transport/serverhttp/
  handlers.go
  common/
    middleware.go
    validator.go
    error_mapper.go
    dto_mapper.go
  <controller>/
    handler.go
    <operation>.go
    error_mapper.go   # optional, only for controller-specific response details
```

Use `serverhttp/handlers.go` when HTTP has meaningful transport aggregation: router construction, route groups, middleware binding, or a handler set consumed by the HTTP server provider. A tiny HTTP transport may keep registration in a package-local helper or server provider, but service construction still belongs in `internal/deps`.

HTTP-specific differences:

- common error mapper converts shared domain categories into HTTP status codes;
- controller error mapper handles feature-specific typed domain details before delegating fallback to common;
- typed domain error details may become response extensions only when they are safe, stable, and part of the API contract;
- DTO validation errors map to `400 Bad Request` or the project's validation error contract;
- route registration and handler composition stay in transport/runtime wiring, not service;
- concrete service selection stays in `internal/deps`; HTTP controller packages receive explicit service/usecase interfaces.

## Kafka Consumer Transport

Kafka consumers are inbound transport because they receive external messages and initiate business work.

Split by logical consumer/subscription, not necessarily by physical topic:

```text
internal/transport/consumerkafka/
  impressionrecorder/
    consumer.go
    error_mapper.go   # optional, only for consumer-specific retry/DLQ policy
    consumer_test.go
  common/
```

Rules:

- One package equals one logical consumer/subscription.
- Each package has one entrypoint: `consumer.go`.
- A concrete `Consumer` implements a runtime interface registered in DI.
- DI registers consumers with `do.ProvideNamed("<consumer-name>")`.
- CLI starts a consumer with `c.GetConsumer(name).Consume(ctx)`.

Example:

```go
type RunnableConsumer interface {
    Consume(ctx context.Context) error
}

type ImpressionRecorder interface {
    Record(ctx context.Context, cmd domimpression.RecordCommand) (domimpression.RecordResult, error)
}

type Consumer struct {
    logger *zap.Logger
    record ImpressionRecorder
}

func NewConsumer(logger *zap.Logger, record ImpressionRecorder) *Consumer {
    return &Consumer{logger: logger, record: record}
}

func (c *Consumer) Consume(ctx context.Context) error {
    // Loop, decode messages, call service operations, log, exit on ctx.Done().
    return nil
}
```

Kafka topics, consumer groups, and retry policies come from configuration inside DI/provider/constructor code, not from the CLI API.

Transport-level decode errors are not domain errors. Business errors come from service/usecase.

## Messaging and Events

Inbound consumers are transport. Outbound producers and external message APIs are clients.

Default placement:

- `internal/transport/consumerkafka/<consumer>` for inbound consumers;
- `internal/client/<system>` or `internal/client/<broker>` for outbound producer adapters;
- service/usecase decides when to publish as part of business behavior;
- `internal/deps` wires consumers, producers, and retry/DLQ infrastructure.

Producer interfaces are declared where they are consumed:

```go
type EventProducer interface {
    PublishOrderApproved(ctx context.Context, event domorder.OrderApprovedEvent) error
}
```

Concrete producer adapters:

- map domain events to protocol messages;
- apply configured topic/routing;
- normalize broker errors;
- do not contain business rules;
- do not expose broker-specific errors to service contracts.

Consumers:

- decode and validate message format;
- map message DTOs to domain/usecase commands;
- call service/usecase interfaces;
- separate decode/validation/business errors;
- honor `ctx.Done()`;
- log with message metadata that is safe to record.

Idempotent processing belongs in service/usecase when it affects business guarantees.

Transport can extract and validate message IDs, operation IDs, offsets, or idempotency keys, then pass them inward explicitly.

Do not rely on Kafka offsets alone for business idempotency.

Retry and DLQ policy belongs in runtime adapter/config, not domain.

Classify errors before retrying:

- decode/schema errors usually go to DLQ or are dropped according to policy;
- transient infrastructure errors may retry;
- business conflicts/invalid states should follow product policy;
- context cancellation should stop processing.

Use `consumerkafka/common` for protocol/runtime-wide classification. Add a consumer-local error mapper only when a specific message flow needs different retry, drop, log, or DLQ behavior for typed domain details. Keep the policy transport-local; do not push Kafka retry/DLQ decisions into domain errors.

Use a transactional outbox when a database state change and message publish must be atomic/recoverable.

Outbox decision rule:

```text
If losing the message after committing DB state breaks correctness,
write an outbox record in the same transaction and publish asynchronously.
```

Do not add outbox complexity for best-effort notifications unless correctness requires it.

Message contracts follow Proto/JSON Schema/topic compatibility rules.

For breaking message changes:

- version the topic, schema, or message package;
- keep old consumers/producers during migration when needed;
- update generated code from contract inputs;
- update mapper tests.

Producer adapter shape:

```go
func (p *Producer) PublishOrderApproved(ctx context.Context, event domorder.OrderApprovedEvent) error {
    msg := mapOrderApproved(event)
    if err := p.writer.WriteMessages(ctx, msg); err != nil {
        return classifyProducerError(err)
    }
    return nil
}
```

## Transport Rules

- No business logic.
- No domain models as external protocol DTOs.
- No direct repository or client implementation calls.
- Dependencies are explicit service/usecase interfaces or narrow local interfaces.
- `svcLayer` is private to `internal/deps`; adapters receive selected service/usecase interfaces.
- Prefer one operation per file in large controllers.
- Keep controller constructors in `handler.go`; put operation methods elsewhere.
- Centralize shared domain-error-to-protocol mapping per transport under `common`.
- Use controller-local error mappers only for feature-specific typed details, contract extensions, or policy overrides.
- Map domain categories with `errors.Is`; extract optional typed details with `errors.As` before delegating to common fallback.
- Keep generated protocol types in transport and mappers; do not push them into domain or service.

## Related References

- Read `auth-and-access-control.md` for authentication middleware, actor extraction, and service/usecase authorization boundaries.
- Read `devctl-yaml-integration.md` for contract inputs, generated output boundaries, and manifest-controlled paths.
- Read `runtime-and-wiring.md` for DI registration, runtime activation, shutdown hooks, and named consumer getters.
- Read `testing-strategy.md` for repository, client, and transport test scope.
