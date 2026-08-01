# Service and Usecase Layers

## Contents

- Service Role
- Service Package Structure
- Service Interface and Dependencies
- Multiple Implementations
- Domain Types and Error Handling
- Transactions
- Service Assembly in DI
- Service Testing
- Optional Usecase Layer
- Usecase Testing

## Service Role

`internal/service` implements application business operations over domain contracts. It:

- receives `...Command` and `...Query` values;
- applies business rules and domain invariants;
- calls repositories and outbound clients through interfaces;
- returns domain `...Result` / `...View` values and domain error categories.

It must not contain SQL queries, direct filesystem/database/network/subprocess/clock/random/environment
access, protocol DTOs, transport logic, generated HTTP/gRPC message types, or driver-specific error
handling.

## Service Package Structure

Organize by entity/domain area:

```text
internal/service/
  order/
    service.go
    create.go
    get.go
    update.go
    *_test.go
  user/
    service.go
    get.go
    update.go
  stats/
    service.go
    recalc.go
    export.go
```

Rules:

- `service.go` is the package entrypoint. It defines `Service`, dependency interfaces, and `New`.
- For small services, keep 1-2 operations in `service.go`.
- For larger services, split one operation per file: `create.go`, `get.go`, `update.go`, `recalculate.go`, `validate.go`.
- Do not create a root `internal/service/services.go` by default. Service assembly belongs in `internal/deps/services.go`.
- Unit tests live next to code in the same package by default.

## Service Interface and Dependencies

Define the service interface in the entity service package, not in a global facade:

```go
package order

import (
    "context"

    domorder "<module>/internal/domain/order"
)

type Service interface {
    Create(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
    Get(ctx context.Context, q domorder.GetOrderQuery) (domorder.OrderView, error)
    Update(ctx context.Context, cmd domorder.UpdateOrderCommand) (domorder.UpdateOrderResult, error)
}
```

Reasons:

- the package owns the domain module contract;
- contract, dependencies, and implementation stay together;
- consumers can locally narrow the contract when they need only one method;
- the project avoids a god-interface in `internal/service`.

Declare dependency interfaces on the consumer side:

```go
type Repository interface {
    Insert(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
    Get(ctx context.Context, q domorder.GetOrderQuery) (domorder.OrderView, error)
    Update(ctx context.Context, cmd domorder.UpdateOrderCommand) (domorder.UpdateOrderResult, error)
}

type BillingClient interface {
    Charge(ctx context.Context, params billing.ChargeParams) (billing.ChargeResult, error)
}
```

Constructors accept individual dependencies, not layer bundles:

```go
type service struct {
    logger  *zap.Logger
    repo    Repository
    billing BillingClient
}

func New(logger *zap.Logger, repo Repository, billing BillingClient) Service {
    return &service{logger: logger, repo: repo, billing: billing}
}
```

Rules:

- Interfaces use domain commands, queries, results, views, and domain errors.
- Every application-affecting external behavior used by a service/usecase enters through an
  explicit consumer-owned interface. Keep `context.Context`, path values, data, config, options,
  and pure helpers concrete.
- Split interfaces when consumers need stable different capability subsets or operations have
  different lifecycle, transaction, or failure boundaries, not by method count alone.
- One concrete adapter may implement several consumer-owned interfaces when it coherently owns their
  shared external mechanics.
- Name methods for application capabilities rather than raw filesystem, SDK, or driver operations.
- Do not expose driver types such as `pgx.*`, `*sql.Row`, `redis.*`, or Kafka/HTTP DTOs.
- Do not expose decoded `map[string]any` values when a named command, query, result, view, or semantic
  map expresses the contract.
- `RepoLayer`-style bundles may exist inside DI, but do not leak into service constructors.
- `*zap.Logger` is allowed as a concrete dependency. Use `zap.NewNop()` or `zaptest/observer` in tests. Name loggers in `internal/deps`, not inside business code.
- Order constructor parameters as `ctx?`, `logger?`, then explicit dependencies and options. Service/usecase constructors usually should not take `context.Context`; if context-aware setup is justified, `ctx` is first and logger follows it.
- Use plain parameters for required dependencies. Use a small typed `Config` only for cohesive required values such as limits, timeouts, or policy settings. Do not make `opts ...Option` the default for internal services/usecases.
- Use `opts ...Option` in service/usecase constructors only when there are optional overrides with safe defaults and the call sites would otherwise repeat noise. Keep `Option` values pure: they should not read env, open connections, start goroutines, or mutate globals.
- Do not import concrete repositories/clients, codecs, storage layouts, sessions, drivers, or
  side-effecting platform helpers from service/usecase packages.

## Multiple Implementations

Keep one `Service` interface. Choose implementation in DI.

When implementations are small or similar:

```text
internal/service/order/
  service.go
  impl_default.go
  impl_experimental.go
  create.go
  get.go
```

Expose constructors such as `New` and `NewExperimental`; choose one in `internal/deps`.

When implementations differ significantly:

```text
internal/service/order/
  service.go
  default/
    service.go
    create.go
  experimental/
    service.go
    create.go
```

`internal/service/order` keeps the interface and optional factories. Subpackages implement that interface.

## Domain Types and Error Handling

Service method signatures use only domain contracts:

```go
type Service interface {
    Create(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
    List(ctx context.Context, q domorder.ListOrdersQuery) (domorder.OrdersView, error)
}
```

Service behavior:

- validate commands/queries for business invariants;
- call dependency interfaces;
- produce domain results/views;
- return domain error categories or typed domain errors, possibly wrapped with context.

Example:

```go
if err := s.repo.UpdateOrder(ctx, cmd); err != nil {
    return fmt.Errorf("update order %s: %w", cmd.OrderID, err)
}
```

Do not create a separate service error taxonomy. Avoid `internal/service/<entity>.ErrBadRequest`, `ErrRepositoryFailed`, or other service-local categories. If `internal/service/<entity>/errors.go` exists, it should hold wrappers/helpers, not new categories. New categories belong in `domain`.

Use sentinel domain categories for ordinary branching and typed domain errors only when the service owns structured facts such as validation issues, missing entity identity, conflict reason, or retry classification. Preserve category checks with `%w`, `errors.Is`, and `errors.As`.

## Transactions

Services may use transactions through abstractions, not drivers:

```go
type TxManager interface {
    WithinTx(ctx context.Context, fn func(ctx context.Context) error) error
}
```

`TxManager` may live locally in the service package or in `internal/platform/tx` if reused broadly.

Requirements:

- Implementation is wired in `internal/deps`.
- Service does not know whether the implementation uses `sql.Tx`, `pgx.Tx`, `gorm.DB`, or another mechanism.
- `WithinTx` supports re-entry: if `ctx` already has an active transaction, reuse it instead of creating a nested transaction.
- Services describe domain action order and atomicity needs, not driver-level begin/commit/rollback.

Example:

```go
func (s *service) ApproveOrder(ctx context.Context, cmd domorder.ApproveOrderCommand) error {
    return s.txm.WithinTx(ctx, func(txCtx context.Context) error {
        ord, err := s.repo.GetForUpdate(txCtx, cmd.OrderID)
        if err != nil {
            return err
        }
        if err := ord.ValidateApprove(cmd.ActorID); err != nil {
            return err
        }
        return s.repo.Save(txCtx, ord)
    })
}
```

Keep simple single-domain transactions in `service`. Move coordination to `usecase` when multiple services, multiple steps, retries, compensations, or long-lived processes appear.

## Service Assembly in DI

When DI needs a collected set of services, keep that bundle private to `internal/deps`:

```go
// internal/deps/services.go
type svcLayer struct {
    Orders order.Service
    Stats  stats.Service
    Users  user.Service
}
```

Use `svcLayer` only in `internal/deps` and composition root code:

- collect the explicit list of services;
- make DI assembly readable;
- select concrete fields and pass only needed dependencies to adapters.

Do not:

- put logic in `svcLayer`;
- export `svcLayer` or add `internal/service/services.go` by default;
- pass `svcLayer` to transport/consumer/cron constructors;
- pass `svcLayer` into service/usecase constructors;
- use `svcLayer` in repositories or `cmd`.

Concrete transport, consumer, cron, and job constructors list explicit dependencies. When an adapter needs a whole service, pass the exported service interface:

```go
func NewHandler(logger *zap.Logger, orders order.Service, stats stats.Service) *Handler
```

When a handler uses one operation, prefer a local narrow interface owned by the handler package. If the interface appears in an exported constructor signature, export the interface name too:

```go
type OrderCreator interface {
    Create(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
}

type Handler struct {
    logger *zap.Logger
    orders OrderCreator
}

func NewHandler(logger *zap.Logger, orders OrderCreator) *Handler {
    return &Handler{logger: logger, orders: orders}
}
```

Private narrow interfaces are acceptable only behind private constructors or helpers.

DI selects fields from `svcLayer` and passes only those fields to adapters:

```go
services := c.services()

handler := ordergrpc.NewHandler(
    logger,
    services.Orders,
)
```

## Service Testing

Unit tests:

- live beside service code;
- usually use the same package (`package order`);
- mock repository/client interfaces;
- test validation, state transitions, calculations, and domain error handling.

Example:

```go
func TestService_Create_Success(t *testing.T) {
    repo := newMockRepository(t)
    txm := newMockTxManager(t)
    svc := order.New(zap.NewNop(), repo, txm)

    res, err := svc.Create(ctx, domorder.CreateOrderCommand{})
    require.NoError(t, err)
    require.NotNil(t, res)
}
```

Integration tests may use real repositories over a test database, swap service implementations through DI, or test adapters with mocks for explicit service/usecase interfaces.

Test `svcLayer` only as DI assembly, not as a transport contract.

Read `io-boundaries-and-platform.md` when a service calls files, external commands, SDKs, clocks,
random sources, environment, or business-significant telemetry directly.

## Optional Usecase Layer

`internal/usecase` represents product flows, not simple entity operations. Add it only when the scenario needs orchestration.

Use `usecase` when:

- one scenario coordinates several services;
- the flow has multiple steps, branches, retries, or compensations;
- the same sequence must be reused from HTTP, gRPC, Kafka, and cron;
- the concept is a product process, not a local entity operation.

Avoid `usecase` when:

- one service method plus 1-2 repositories is enough;
- business logic stays local to one domain area;
- transport adapters are not accumulating process logic.

Structure:

```text
internal/usecase/
  checkout/
    checkout.go
    validate.go
    *_test.go
  reconciliation/
    reconciliation.go
    *_test.go
```

Flow packages expose short flow-level types:

```go
package checkout

import (
    domorder "<module>/internal/domain/order"
    dompay "<module>/internal/domain/payment"
    svcorder "<module>/internal/service/order"
    svcpay "<module>/internal/service/payment"
)

type CreateOrderCommand = domorder.CreateOrderCommand
type CreateOrderResult = domorder.CreateOrderResult
type AuthorizePaymentCommand = dompay.AuthorizePaymentCommand
type AuthorizePaymentResult = dompay.AuthorizePaymentResult

type Command struct {
    CreateOrder      CreateOrderCommand
    AuthorizePayment AuthorizePaymentCommand
}

type Result struct {
    CreateOrder      CreateOrderResult
    AuthorizePayment AuthorizePaymentResult
}

type UseCase struct {
    Orders  svcorder.Service
    Payment svcpay.Service
}
```

Rules:

- Usecases call services through service interfaces.
- Usecases do not import repositories, repository implementations, clients, or transport packages.
- Usecases may accept `TxManager` when the flow owns transaction boundaries.
- Flow-level `Command` / `Query` aggregates domain operation contracts through aliases; do not copy field-by-field contracts.
- Internal helper functions such as `validateCheckout` stay in the flow package.

If a usecase wraps one service operation only, it is usually unnecessary unless it creates a stable process API used by multiple entrypoints.

## Usecase Testing

Unit tests live beside the flow:

```text
internal/usecase/checkout/checkout_test.go
```

Test as a black box:

- input: flow/domain command;
- output: flow/domain result or domain error;
- dependencies: mocked service interfaces and optional no-op `TxManager`.

Transport tests should then focus on DTO mapping and protocol error mapping, not the scenario itself.
