# Auth and Access Control

## Contents

- Boundary
- Actor Shape
- Transport Responsibilities
- Service and Usecase Responsibilities
- Policy Dependencies
- Repository Scoping
- Examples
- Testing
- Review Checklist

## Boundary

Authentication belongs at the transport boundary. Business authorization belongs in `service` or `usecase`.

Transport answers: "Who is calling, and is the credential acceptable for this protocol?"

Service/usecase answers: "Can this actor perform this operation on this resource now?"

Use transport for coarse admission checks only:

- authentication required;
- static endpoint scope such as `orders:write`;
- internal-only route or mTLS service identity;
- request body/header size and format checks;
- credential-to-actor mapping.

Do not use transport middleware as the only resource-level authorization gate.

## Actor Shape

Default service/usecase shape:

```go
Approve(ctx context.Context, actor common.Actor, cmd ApproveOrderCommand) error
```

Keep command/query focused on operation input:

```go
type Actor struct {
    ID       ActorID
    TenantID TenantID
    Roles    []Role
    Scopes   []Scope
}

type ApproveOrderCommand struct {
    OrderID ID
    Reason  string
}
```

Use an explicit actor parameter by default because actor data is trusted principal data, not client payload.

Put actor inside a command only when the project treats commands as full application operation envelopes or when actor identity is persisted/audited as part of the domain fact.

Never source actor fields from request body, query, or path. Transport derives actor from authenticated credentials.

## Transport Responsibilities

Transport middleware:

- verifies JWT, session, API key, mTLS, or signature;
- rejects missing/invalid credentials as protocol errors;
- maps credential claims to a typed application actor/principal;
- stores request-scoped metadata in `context.Context` if needed for propagation;
- maps authentication failures to HTTP `401` or gRPC `Unauthenticated`.

Transport handlers:

- pass the typed actor explicitly to service/usecase operations;
- do not pass raw JWTs, cookies, raw headers, or protocol-specific claim structs inward;
- do not call repositories or policy stores directly.

## Service and Usecase Responsibilities

Service/usecase code:

- checks business permissions using actor, domain state, tenant boundary, and policy dependencies;
- performs resource ownership checks after loading the resource when needed;
- returns domain error categories such as forbidden/invalid/conflict;
- keeps authorization checks reusable across HTTP, gRPC, Kafka, cron, and internal callers.

Usecase authorization fits flow-level scenarios that coordinate multiple services. Service authorization fits intrinsic domain operations reused across entrypoints or flows.

## Policy Dependencies

External policy engines such as OPA, Casbin, Zanzibar-style services, or custom authorization services are dependencies of service/usecase code.

Declare policy interfaces at the consumer side:

```go
type OrderPolicy interface {
    // CanApprove reports whether actor may approve order.
    CanApprove(ctx context.Context, actor common.Actor, order domorder.OrderView) error
}
```

Concrete policy clients/adapters are wired in `internal/deps`.

## Repository Scoping

Repositories do not decide business permission. They support safe enforcement by accepting scoped queries and updates.

Good:

```go
GetByTenant(ctx context.Context, tenantID common.TenantID, orderID domorder.ID) (domorder.OrderView, error)
```

Avoid unscoped repository calls when tenant/user scoping is required by the operation.

Database row-level security can be defense in depth, but it does not replace service/usecase authorization policy.

## Examples

Preferred service call:

```go
func (s *Service) Approve(ctx context.Context, actor common.Actor, cmd domorder.ApproveOrderCommand) error {
    ord, err := s.repo.GetByTenant(ctx, actor.TenantID, cmd.OrderID)
    if err != nil {
        return err
    }
    if err := s.policy.CanApprove(ctx, actor, ord); err != nil {
        return err
    }
    return s.repo.MarkApproved(ctx, cmd.OrderID, actor.ID)
}
```

Avoid as the only business authorization input:

```go
actor := auth.ActorFromContext(ctx)
```

`context.Context` can carry request metadata, but business-significant actor and tenant data should be explicit service/usecase input.

## Testing

Test credential/actor extraction at transport, authorization and policy dependencies at
service/usecase, and tenant/resource scoping at repository integration boundaries. Cover missing
actors, cross-tenant denial, policy failures, and safe error mapping without repeating one scenario
through every layer. Follow `testing-strategy.md` and the affected layer reference.

## Review Checklist

- Does transport authenticate and map credentials to a typed actor?
- Does resource-level authorization happen in service/usecase?
- Is actor passed explicitly by default?
- Are raw protocol auth types kept out of domain/service/usecase contracts?
- Are repository queries safely tenant/resource scoped where required?
- Are policy dependencies declared as interfaces at the consumer side?
