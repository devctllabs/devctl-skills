# Auth and Access Control

## Contents

- Boundary
- Actor Shape
- Transport Responsibilities
- Service and Usecase Responsibilities
- Policy Dependencies
- Repository Scoping
- Examples
- Review Checklist

## Boundary

Authentication and authorization cross transport, service, and repository boundaries. Keep each responsibility explicit:

- transport authenticates or extracts credentials/session facts;
- service/usecase enforces business authorization decisions;
- policy dependencies answer reusable permission questions;
- repositories apply tenant/resource scoping when storage access requires it.

Do not bury authorization inside ORM filters only. Service/usecase code should make the business access decision visible.

## Actor Shape

Use a protocol-independent actor/principal shape:

```python
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Actor:
    subject_id: str
    tenant_id: str | None = None
    roles: tuple[str, ...] = ()
```

Add fields only when services actually need them. Do not pass raw JWTs, framework request objects, sessions, or header dictionaries into services.

## Transport Responsibilities

Transport may:

- read credentials from HTTP headers, cookies, gRPC metadata, CLI config, or message envelopes;
- verify token/session shape or delegate verification to an auth adapter;
- create an `Actor` or auth context;
- map auth failures to protocol responses;
- attach request IDs and auth diagnostics to logs/traces.

Transport must not decide domain-specific permissions unless the policy is purely protocol-level.

## Service and Usecase Responsibilities

Services/usecases should receive actor facts explicitly when authorization affects behavior:

```python
async def approve(self, actor: Actor, command: ApproveOrderCommand) -> OrderView:
    if not await self._policy.can_approve(actor, command.order_id):
        raise AppError("forbidden", "actor cannot approve this order")
    return await self._orders.approve(command)
```

Rules:

- pass actor, tenant, and resource identifiers explicitly;
- keep authorization decisions close to the operation they protect;
- return stable forbidden/not-found categories according to product policy;
- avoid relying on global request context for business-critical facts.

## Policy Dependencies

Policy implementations may query repositories, external policy engines, config, or caches. Keep the Protocol owned by the service/usecase that consumes it:

```python
class OrderPolicy(Protocol):
    async def can_approve(self, actor: Actor, order_id: OrderId) -> bool: ...
```

Concrete policy implementations live in `client`, `repository`, `platform`, or a dedicated auth adapter module when justified. Wire them in `deps`.

## Repository Scoping

Repositories may enforce tenant/resource scoping when the data access contract requires it:

- include tenant or actor-derived scope in repository methods when storage access must be constrained;
- avoid hidden global tenant context;
- ensure list/search queries cannot accidentally cross tenant boundaries;
- keep low-level storage errors mapped into application categories.

Do not use repository scoping as the only authorization layer when the service owns business permission rules.

## Examples

Good service signature:

```python
async def list_orders(self, actor: Actor, query: ListOrdersQuery) -> OrdersView: ...
```

Avoid:

```python
async def list_orders(self, request: Request) -> JSONResponse: ...
```

The second signature couples service code to HTTP and hides which actor facts the operation needs.

## Review Checklist

- Are actor/principal facts protocol-independent?
- Does transport extract auth facts without owning domain permissions?
- Does service/usecase enforce business authorization explicitly?
- Are policy Protocols small and consumer-owned?
- Is tenant/resource scoping visible in repository contracts when needed?
- Are forbidden/not-found semantics deliberate and consistent?
- Do tests cover denied access and cross-tenant/resource boundaries?
