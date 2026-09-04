# Service Layer

## Contents

- Role and Package Shape
- Service and Dependency Contracts
- Construction and Implementations
- Domain Contracts and Errors
- Transactions
- Testing
- Review Checklist

## Execution Gate

Enter this layer only after the caller-visible boundary is GREEN and has demanded a service
contract, unless the user explicitly requested a service-only change. Change the service owner test
and observe useful RED before editing service production or any concrete adapter. A caller-visible
domain operation that requires repository/client I/O demands this boundary even if the initial
method only delegates; keep the outbound capability consumer-owned here.

## Role and Package Shape

Implement application business operations in `internal/service/<entity>`. Receive domain commands
or queries, enforce business rules and invariants, call external behavior through interfaces, and
return domain results, views, and error categories.

Own the application meaning of query defaults, allowed filters and sorts, selection, aggregation,
operation order, transaction scope, and observable cache behavior. Let repositories execute those
typed contracts efficiently without moving their meaning into storage code.

Do not put SQL, direct filesystem/database/network/subprocess/environment access, protocol DTOs,
generated messages, transport logic, or driver-specific error handling in a service.

```text
internal/service/
  order/
    service.go
    create.go
    get.go
    update.go
    *_test.go
```

Keep one or two small operations in `service.go`; split operations when independently readable.
Define the exported concrete `Service`, its dependency interfaces, and `New` in the package
entrypoint. Do not create a root `internal/service/services.go`; register concrete services
individually through `internal/deps/services.go`.

## Service and Dependency Contracts

Expose application operations as methods on `*Service`; use domain commands, queries, results,
views, and error categories in those method signatures. Return the concrete type from `New`. Let
transport, usecase, job, and other consumers declare the narrow interfaces they accept instead of
declaring a provider-owned `Service` interface here.

Declare behavioral dependencies on the consumer side:

```go
type Repository interface {
    // Insert persists a new order and returns its created representation.
    Insert(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
    // Get loads the order selected by q.
    Get(ctx context.Context, q domorder.GetOrderQuery) (domorder.OrderView, error)
    // Update persists the state transition described by cmd.
    Update(ctx context.Context, cmd domorder.UpdateOrderCommand) (domorder.UpdateOrderResult, error)
}

type BillingClient interface {
    // Charge submits the billing operation described by params.
    Charge(ctx context.Context, params billing.ChargeParams) (billing.ChargeResult, error)
}
```

- Use domain contracts and errors, not driver, SDK, protocol, storage-row, or generated types.
- Name methods for application capabilities rather than raw filesystem, SDK, or driver operations.
- Split interfaces when consumers need different stable capabilities or lifecycle/failure boundaries,
  not by method count alone.
- Keep `context.Context`, data, config, options, paths, and pure helpers concrete.
- Do not pass repository/service layer bundles into constructors.

## Construction and Implementations

```go
type Service struct {
    logger       *zap.Logger
    repo         Repository
    billing      BillingClient
    transactions txmanager.Manager
}

func New(
    logger *zap.Logger,
    repo Repository,
    billing BillingClient,
    transactions txmanager.Manager,
) *Service {
    return &Service{
        logger: logger, repo: repo, billing: billing, transactions: transactions,
    }
}
```

For a new package, name the primary implementation `Service`. Add an exported role suffix only for
a real alternative, such as `ExperimentalService`; never use `service`, `ServiceImpl`, or a
provider-owned interface merely to hide the concrete type. Keep fields private. Preserve an
established public API unless the task explicitly changes it.

Order constructor parameters as `ctx?`, `logger?`, dependencies, then config/options. Do not add
constructor context by default. Use plain required parameters; use typed config for cohesive runtime
values and functional options only for real optional overrides with safe defaults. Options must not
read env, open resources, start goroutines, or mutate globals.

For similar implementations, expose constructors such as `New` and `NewExperimental` returning
`*Service` and `*ExperimentalService`. Use implementation subpackages only when implementations
differ substantially. Choose implementations in DI.

```text
internal/service/order/
  service.go
  experimental.go
  create.go
  get.go
```

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

## Domain Contracts and Errors

```go
// Declared by a consumer that needs only these operations.
type OrderReader interface {
    // Get loads the order selected by q.
    Get(ctx context.Context, q domorder.GetOrderQuery) (domorder.OrderView, error)
}

type OrderCreator interface {
    // Create creates an order from cmd.
    Create(ctx context.Context, cmd domorder.CreateOrderCommand) (domorder.CreateOrderResult, error)
}
```

Validate business invariants, call dependencies, and wrap failures without destroying categories:

```go
if err := s.repo.UpdateOrder(ctx, cmd); err != nil {
    return fmt.Errorf("repo.UpdateOrder: %w", err)
}
```

Do not create a service-local error taxonomy. Put categories and structured domain facts in domain;
preserve them with `%w`, `errors.Is`, and `errors.As`. Add dependency-call context once at the
service call site in `field.Method` form so the failing call is searchable. Do not log an error and
then return it; the highest operation boundary owns the single error log.

## Transactions

Use `github.com/devctllabs/go-libs/txmanager` for atomic business work; do not redeclare a local
transaction interface. Inject `txmanager.Manager` when the service always needs one role. Inject
`txmanager.Managers` only when service operations must choose between `Reader()` and `Writer()`.
Inspect the selected module version with `go doc -all` before using options or relying on re-entry
semantics.

```go
func (s *Service) ApproveOrder(ctx context.Context, cmd domorder.ApproveOrderCommand) error {
    return s.transactions.WithinTx(ctx, func(txCtx context.Context) error {
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

Pass `txCtx` unchanged to every repository call inside the callback. The selected database endpoint
routes each query to the active transaction. Keep a single-domain transaction in service; move
multi-service steps, retries, or compensation to a usecase.

## Testing

Keep service unit tests beside the package. Use generated gomock mocks for injected repository,
client, policy, publisher, and `txmanager.Manager`/`txmanager.Managers` interfaces. Generate mocks
from the imported shared interfaces; do not recreate a local transaction port. Test validation,
calculations, state transitions, demanded calls, transaction behavior, and domain error
propagation. Use
`zap.NewNop()` or `zaptest/observer` for logging.

```go
func TestService_Create_Success(t *testing.T) {
    ctrl := gomock.NewController(t)
    repo := mocks.NewMockRepository(ctrl)
    billing := mocks.NewMockBillingClient(ctrl)
    transactions := mocks.NewMockManager(ctrl)
    svc := order.New(zap.NewNop(), repo, billing, transactions)

    res, err := svc.Create(ctx, domorder.CreateOrderCommand{})
    require.NoError(t, err)
    require.NotNil(t, res)
}
```

Do not use a real repository as a substitute for service owner tests. Test service construction and
selection only in the DI smoke test. Follow `testing-strategy.md` and `gomock-unit-tests.md`.

## Review Checklist

- Does the service own business policy and nothing protocol- or driver-specific?
- Does `New` return `*Service` while consumers own any narrower interfaces they require?
- Are external capabilities explicit and consumer-owned except for the shared `txmanager` contract?
- Does service own transaction scope while repository calls receive the callback context unchanged?
- Are fixed-field boundaries typed and errors category-compatible?
- Do direct owner tests prove behavior independently of concrete adapters?
