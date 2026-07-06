# Overview and Naming

## Contents

- Architectural Goals
- Default Project Layout
- Package Split Rules
- Layer Naming Conventions
- Type Sharing Rules
- Import Alias Convention
- Compact Order Example

## Architectural Goals

Use explicit layers and inward dependencies:

```text
transport -> usecase/service -> repository/client interfaces
                         ^
                         |
                       domain
```

- `domain`: domain types, value objects, invariants, operation contracts, and domain error categories.
- `service`: application business operations over domain contracts.
- `usecase`: optional orchestration for product flows above services.
- `repository`: storage adapters for databases, caches, files, and object storage.
- `client`: outbound integrations with external HTTP/gRPC/SDK/message APIs.
- `transport`: inbound HTTP, gRPC, Kafka, cron, and other protocol adapters.
- `internal/deps`: composition root, dependency construction, lifecycle, shutdown, logger setup, and provider wiring.
- `internal/platform`: reusable internal technical packages without domain knowledge, such as logging, clock, tx, telemetry, cache, and id generation.
- `pkg`: only packages intentionally imported by other Go modules.
- `gen`: generated output. Source specs such as Proto, OpenAPI, config schemas, and codegen configuration are canonical inputs. Do not hand-edit generated files. Put manual extensions outside `gen/`, usually under `internal/`.

If `devctl.yaml` exists, use it to identify devctl-managed components and configured generator output directories before applying the default layout. The manifest controls project shape and generator settings; contract files still control API and message content.

Keep construction and lifecycle in `internal/deps`. Business code receives dependencies through interfaces and receives `*zap.Logger` directly as a pragmatic exception.

## Default Project Layout

```text
cmd/<app_name>/
  main.go
  internal/
    api.go
    consumer.go
    cronjob.go

internal/
  domain/
    common/
    <entity>/
  service/
    <entity>/
  usecase/                 # optional
    <flow>/
  repository/
    <entity>/              # or <entity>/<backend> for alternatives
  client/
    <system>/
  transport/
    servergrpc/
    serverhttp/
    consumerkafka/
  deps/
  platform/

gen/
pkg/                       # only for intentionally public packages
```

## Package Split Rules

- Split `service` and `repository` by entity or domain area: `internal/service/<entity>` and `internal/repository/<entity>`.
- In small packages, keep 1-2 operations in `service.go` or `repository.go`.
- As code grows, use one file per operation: `create.go`, `get.go`, `update.go`, `validate.go`, `list.go`, `upsert.go`, `delete.go`.
- Do not repeat the entity name in operation filenames; the package path provides the context.
- Put service dependency interfaces where they are consumed, usually in `internal/service/<entity>/service.go`.
- Put transport-local narrow interfaces in the handler package when a handler needs only a subset of a service. If an exported constructor accepts the interface, export the interface name.
- Do not create `internal/service/services.go` by default. DI-local service bundles belong in `internal/deps/services.go`.
- Use backend subpackages for alternative storage implementations: `repository/<entity>/postgres`, `sqlite`, `memory`.
- Use `usecase` only for flow/process modules, not as another name for service.

## Layer Naming Conventions

Domain operation contracts:

| Role | Name | Example |
| --- | --- | --- |
| Write input | `<Operation>Command` | `CreateOrderCommand` |
| Write output | `<Operation>Result` | `CreateOrderResult` |
| Read input | `<Operation>Query` | `ListOrdersQuery` |
| Read output | `<Entity>View` or `<Entities>View` | `OrderView`, `OrdersView` |
| Filter | `...Filter` | `ListOrdersFilter` |
| Parameter group | `...Params` | `OrderItemParams` |

Layer-specific names:

- `domain/<entity>` owns domain operation contracts, value objects, enums, and domain errors.
- `service/<entity>` exposes `type Service interface` and `func New(...deps) Service`.
- `usecase/<flow>` exposes short `Command`, `Result`, `Query`, or `View` types for the flow. Reuse domain operation contracts with type aliases.
- `repository/<entity>` or `repository/<entity>/<backend>` exposes constructors and concrete adapter implementations for service interfaces.
- `client/<system>` exposes concrete outbound integration implementations. Interfaces stay at the consuming service.
- `transport/<proto>/<controller>` exposes handlers/controllers and protocol mappers.

## Type Sharing Rules

- Domain operation contracts are shared inward-to-outward: services implement them, repositories/clients may receive or return them as required by service interfaces, and transport maps protocol DTOs to/from them.
- Do not share transport DTOs with `domain` or `service`.
- Do not share storage row/projection structs with `domain` or `service`.
- `usecase` should not copy domain operation contracts. Use type aliases and aggregate them into flow-level `Command` or `Query` when needed.
- Keep common domain types in `internal/domain/common` only when they are used by multiple independent domain packages.
- Do not turn `domain/common` or `internal/platform` into a dumping ground for random helpers.

## Import Alias Convention

Use stable aliases when package names repeat across layers:

```go
import (
    domorder "<module>/internal/domain/order"
    svcorder "<module>/internal/service/order"
    repoorder "<module>/internal/repository/order/postgres"
)
```

Suggested prefixes:

- `dom<entity>` for `internal/domain/<entity>`.
- `svc<entity>` for `internal/service/<entity>`.
- `repo<entity>` or `repo<entity><backend>` for repository implementations.
- `client<system>` for outbound client implementations.
- `gen` for generated protocol/API packages when the package name is not already clear.

Avoid aliases that hide the layer boundary.

## Compact Order Example

Domain:

```go
package order

type ID string
type Status string

const (
    StatusDraft    Status = "draft"
    StatusApproved Status = "approved"
)

type OrderItemParams struct {
    SKU       string
    Qty       int
    UnitPrice int64
}

type CreateOrderCommand struct {
    CustomerID string
    Items      []OrderItemParams
    Note       *string
}

type CreateOrderResult struct {
    Order OrderView
}

type GetOrderQuery struct {
    ID ID
}

type OrderView struct {
    ID         ID
    Status     Status
    TotalCents int64
}
```

Service:

```go
package order

import (
    "context"

    domorder "<module>/internal/domain/order"
)

type Repository interface {
    Insert(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
    Get(ctx context.Context, q domorder.GetOrderQuery) (domorder.OrderView, error)
}

type Service interface {
    Create(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
    Get(ctx context.Context, q domorder.GetOrderQuery) (domorder.OrderView, error)
}

func New(repo Repository) Service {
    return &service{repo: repo}
}
```

Optional usecase wrapper:

```go
package ordercreate

import (
    domorder "<module>/internal/domain/order"
    svcorder "<module>/internal/service/order"
)

type Command = domorder.CreateOrderCommand
type Result = domorder.CreateOrderResult

type UseCase struct {
    Orders svcorder.Service
}
```

Repository:

```go
package postgres

import "context"

type Repository struct {
    db DB
}

func NewRepository(db DB) *Repository {
    return &Repository{db: db}
}

func (r *Repository) Get(ctx context.Context, q domorder.GetOrderQuery) (domorder.OrderView, error) {
    // Query storage, map row to domain view, classify driver errors.
}
```

Transport:

```go
package order

type OrderCreator interface {
    Create(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
}

type Handler struct {
    orders OrderCreator
}

func NewHandler(orders OrderCreator) *Handler {
    return &Handler{orders: orders}
}
```

The key point is boundary ownership: `transport` maps DTOs, `service` enforces business rules, `repository` maps storage, and `internal/deps` chooses concrete implementations.
