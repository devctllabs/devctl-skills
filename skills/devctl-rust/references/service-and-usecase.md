# Service and Usecase

## Contents

- Service Role
- Service Module Structure
- Dependency Traits
- Generic Services and `impl Trait`
- Domain Types and Error Handling
- Transactions
- Optional Usecase Layer
- Service Testing
- Usecase Testing

## Service Role

`service` implements business operations over domain contracts. It should:

- validate business rules;
- call dependencies through traits;
- return core result types and errors;
- stay independent from protocol, UI, process, and storage-driver details.

`<app>-core` is the reusable application engine, not just a pure domain crate. It may contain services, usecases, delivery-agnostic repositories/clients, typed config, and platform primitives.

It must not depend on delivery frameworks by default:

- no `tauri`, `AppHandle`, webview, window, tray, or plugin setup;
- no `axum`, `tonic`, `hyper`, HTTP response/status mapping, or route registration;
- no `clap`, terminal color/progress output, or process exit policy;
- no process signal handling or deployment-specific runtime lifecycle.

## Service Module Structure

Default layout:

```text
crates/<app>-core/src/service/
  mod.rs
  order.rs
  customer.rs
```

As code grows, split an entity folder:

```text
service/
  order/
    mod.rs
    create.rs
    list.rs
    repository.rs
```

Keep dependency traits where they are consumed, usually in the service or usecase module.

## Dependency Traits

Declare consumer-owned traits:

```rust
use crate::{
    domain::order::{CreateOrderCommand, OrderView},
    error::AppError,
};

pub trait OrderRepository: Send + Sync {
    async fn insert(&self, command: CreateOrderCommand) -> Result<OrderView, AppError>;
}
```

Rules:

- traits describe what the service needs, not everything the adapter can do;
- repositories and clients map driver/network errors into core categories before returning;
- no SQL rows, SDK response types, or generated transport DTOs should leak into service signatures;
- dependency traits return typed core errors such as `AppError`, not `anyhow::Error`;
- delivery-specific protocol adapters belong in delivery crates.

## Generic Services and `impl Trait`

Prefer a concrete generic service by default:

```rust
pub struct OrderService<R> {
    repo: R,
}

impl<R> OrderService<R>
where
    R: OrderRepository,
{
    pub fn new(repo: R) -> Self {
        Self { repo }
    }

    pub async fn create(&self, command: CreateOrderCommand) -> Result<OrderView, AppError> {
        if command.items.is_empty() {
            return Err(AppError::Invalid("order must contain at least one item".into()));
        }

        self.repo.insert(command).await
    }
}
```

`impl Trait` in a function parameter is an anonymous generic parameter. It is not the same as the named `R` stored in `OrderService<R>`.

Do this for constructors:

```rust
pub fn new(repo: R) -> Self
```

Do not do this inside `impl<R> OrderService<R>`:

```rust
pub fn new(repo: impl OrderRepository) -> Self
```

That would introduce a new anonymous type unrelated to `R`, while `Self` still expects `OrderService<R>`.

Use `impl Trait` for one-off parameters where the concrete type is not stored:

```rust
pub async fn run_import(repo: impl OrderRepository) -> Result<(), AppError> {
    // ...
    Ok(())
}
```

Service/usecase constructors should keep required dependencies visible:

```rust
pub fn new(repo: R) -> Self
```

Use a typed config struct only for cohesive runtime values such as limits, timeouts, batch sizes, or policy settings. If validating those values can fail, use `try_new(config) -> Result<Self, AppError>` or a domain-specific constructor error. Do not use builders for ordinary internal services unless optional knobs or staged validation make the call sites clearer.

Use `dyn Trait` only when runtime polymorphism is needed:

```rust
pub struct OrderService {
    repo: Arc<dyn OrderRepository>,
}
```

With async trait methods, `dyn Trait` needs deliberate object-safety handling, usually `async_trait` or boxed futures. Do not add that ceremony by default.

## Domain Types and Error Handling

Service methods should use domain contracts:

```rust
impl<R> OrderService<R>
where
    R: OrderRepository,
{
    pub async fn create(&self, command: CreateOrderCommand) -> Result<OrderView, AppError> {
        self.repo.insert(command).await
    }
}
```

Service behavior:

- validate business rules even when transport already validates DTO shape;
- wrap or classify dependency failures without exposing driver types;
- keep idempotency keys, actor, tenant, and authorization facts explicit when they affect behavior;
- prefer typed parameters over hidden task-local context;
- return shared core error variants or domain-specific typed errors, not a service-local taxonomy.

Do not add `service::<entity>::Error` only to rename `AppError` categories. Add a service-local error type only when the service module owns a reusable public API with distinct business semantics, and convert it to the shared core error before crossing usecase or delivery boundaries.

Use `anyhow` only in runtime/bootstrap glue outside service/usecase contracts. Service and usecase methods should expose typed errors so tests and delivery mappers can match variants directly.

## Transactions

Services may use transactions through abstractions, not drivers:

```rust
use std::future::Future;

pub trait TxManager: Send + Sync {
    async fn run<F, Fut, T>(&self, f: F) -> Result<T, AppError>
    where
        F: FnOnce() -> Fut + Send,
        Fut: Future<Output = Result<T, AppError>> + Send,
        T: Send;
}
```

Keep the exact transaction trait small and project-specific. Service code should describe domain action order and atomicity needs, not driver-level begin/commit/rollback details.

## Optional Usecase Layer

Use `usecase` only for product flows that coordinate multiple services, steps, retries, compensations, or transaction boundaries. Do not use `usecase` as another name for service.

Default layout:

```text
crates/<app>-core/src/usecase/
  checkout.rs
  import_catalog.rs
```

Usecase rules:

- call services through explicit dependencies;
- do not import repository implementations, delivery transports, or generated protocol DTOs;
- use flow-level `Command`, `Query`, `Result`, or `View` only when the module path gives clear context;
- alias or aggregate domain operation contracts instead of copying field-by-field contracts.

## Service Testing

Service tests should assert business behavior and use the test-double strategy from `testing-strategy.md`:

- use the repo's existing convention first;
- for new projects, use `mockall` for trait dependencies;
- use handwritten fakes/spies only when they are clearer than mock expectations or need stateful behavior;
- choose scenarios with the ZOMBIES checklist before writing dependency expectations.

## Usecase Testing

Usecase tests should verify orchestration:

- service call order and compensation behavior;
- transaction boundaries;
- retry decisions;
- combined error behavior;
- actor/tenant propagation.

Transport tests should focus on DTO mapping and protocol error mapping, not the whole usecase scenario.
