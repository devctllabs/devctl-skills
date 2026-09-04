# Usecase Layer

## Contents

- Decision Rule
- Package and Contract Shape
- Dependencies and Transactions
- Testing
- Review Checklist

## Decision Rule

Use `internal/usecase/<flow>` for product flows that coordinate multiple services, have multiple
steps or branches, own retries or compensations, or must be reused across transports. Do not add a
usecase around one ordinary service operation unless it creates a real stable process API.

## Package and Contract Shape

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

Expose short flow-level contracts and reuse domain operation contracts through aliases:

```go
package checkout

import (
    "context"

    domorder "<module>/internal/domain/order"
    dompay "<module>/internal/domain/payment"
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

type OrderCreator interface {
    // Create creates an order from cmd.
    Create(ctx context.Context, cmd CreateOrderCommand) (CreateOrderResult, error)
}

type PaymentAuthorizer interface {
    // Authorize authorizes the payment described by cmd.
    Authorize(ctx context.Context, cmd AuthorizePaymentCommand) (AuthorizePaymentResult, error)
}

type CheckoutUc struct {
    orders  OrderCreator
    payment PaymentAuthorizer
}

func New(orders OrderCreator, payment PaymentAuthorizer) *CheckoutUc {
    return &CheckoutUc{orders: orders, payment: payment}
}
```

Do not copy domain fields into parallel flow DTOs. Keep internal validation helpers in the flow
package. Export the concrete flow type with the exact `Uc` suffix and return it from `New`, such as
`CheckoutUc` or `DispatchUc`; do not introduce a provider-owned `UseCase` interface or names such as
`UseCase`, lowercase `...Uc`, or `UseCaseImpl`. Preserve an established public API unless the task
explicitly changes it.

## Dependencies and Transactions

- Declare narrow service capability interfaces in the usecase package; do not import repositories,
  clients, or transports.
- Accept the narrowest needed `github.com/devctllabs/go-libs/txmanager.Manager` or `Managers`
  contract only when the complete flow owns the transaction boundary. Do not redeclare it locally.
- Keep orchestration order, retries, compensation, and partial-failure policy in the usecase.
- Keep service-local business invariants in services rather than duplicating them in the flow.
- Construct usecases in `internal/deps` and pass explicit capabilities to transports.

## Testing

Keep unit tests beside the flow:

```text
internal/usecase/checkout/checkout_test.go
```

Test the usecase as a black box with generated gomock service-interface and imported
`txmanager.Manager`/`Managers` mocks. Cover step order, branches, retries, compensation,
cancellation, result
aggregation, and
domain error preservation. Transport tests must cover only protocol mapping, not repeat the flow.
Apply the active owner scenario and the Go assertion policy from `testing-strategy.md`.

## Review Checklist

- Does the flow justify a layer above service?
- Does it depend only on service/flow contracts and optional shared capabilities?
- Does `New` return an exported flow-specific `...Uc` concrete type?
- Are domain contracts reused instead of copied?
- Do direct tests prove orchestration and failure recovery?
