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

Auth has two separate concerns:

- authentication: who is making the request;
- authorization: whether that actor may perform the operation now.

Transport authenticates protocol-specific credentials and maps them into a core actor/principal shape. Services/usecases authorize business operations using explicit actor and resource facts.

## Actor Shape

Keep actor/principal types protocol-neutral:

```rust
#[derive(Debug, Clone)]
pub struct Actor {
    pub subject: String,
    pub tenant_id: Option<String>,
    pub roles: Vec<String>,
}
```

Rules:

- do not pass raw JWTs, cookies, headers, or SDK claim structs inward;
- include only facts the application needs;
- keep tenant/account/resource scope explicit;
- avoid global actor context unless the existing project has a deliberate convention.

## Transport Responsibilities

Transport owns:

- extracting credentials from headers, cookies, mTLS, IPC session, or message metadata;
- verifying protocol-specific token/session format;
- mapping external claims into `Actor`;
- rejecting unauthenticated requests before service calls when appropriate;
- passing `Actor` explicitly into core commands/usecases.

Tauri commands may receive actor/session state from managed state or UI/runtime bootstrap, but should still pass explicit typed facts into core.

## Service and Usecase Responsibilities

Service/usecase answers: "Can this actor perform this operation on this resource now?"

Example:

```rust
pub struct ApproveOrderCommand {
    pub actor: Actor,
    pub order_id: OrderId,
}

impl<R, P> OrderService<R, P>
where
    R: OrderRepository,
    P: OrderPolicy,
{
    pub async fn approve(&self, command: ApproveOrderCommand) -> Result<OrderView, AppError> {
        self.policy
            .ensure_can_approve(&command.actor, &command.order_id)
            .await?;

        self.repo.approve(command.order_id).await
    }
}
```

Rules:

- keep authorization checks close to the business operation;
- pass actor/tenant/resource IDs explicitly;
- do not hide authorization only in HTTP middleware when CLI, worker, or Tauri can call the same core operation.

## Policy Dependencies

Use policy traits when authorization needs external data or complex decisions:

```rust
pub trait OrderPolicy: Send + Sync {
    async fn ensure_can_approve(&self, actor: &Actor, order_id: &OrderId) -> Result<(), AppError>;
}
```

Policy implementations may query repositories, external policy engines, or config. Keep the trait owned by the service/usecase that consumes it.

## Repository Scoping

Repository methods may enforce storage-level scoping when it is part of data safety:

```rust
async fn get_for_actor(&self, actor: &Actor, order_id: OrderId) -> Result<OrderView, AppError>;
```

Use this deliberately. Do not rely on repository scoping as the only authorization mechanism when the service needs to make business decisions.

## Examples

Good boundaries:

- HTTP middleware validates JWT and builds `Actor`.
- Handler maps request DTO plus `Actor` into `ApproveOrderCommand`.
- Service checks policy and calls repository.
- Repository maps missing or inaccessible rows into core error categories.

Bad boundaries:

- service parses `Authorization` headers;
- domain types depend on JWT claim structs;
- repository silently applies tenant scoping with no service-level policy;
- Tauri command exposes raw auth/session failures as driver errors.

## Review Checklist

- Actor/principal is protocol-neutral.
- Auth facts that affect behavior are explicit in command/query parameters.
- Services/usecases own authorization decisions.
- Transport does not leak credential formats into core.
- Repository scoping is deliberate and tested.
