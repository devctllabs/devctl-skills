# Service and Usecase

## Contents

- Service Role
- Service Module Structure
- Dependency Protocols
- Async and Sync Boundaries
- Domain Types and Error Handling
- Transactions
- Optional Usecase Layer
- Service Testing
- Usecase Testing

## Service Role

Services implement application business operations over domain contracts. They own business rule ordering, dependency calls, domain error decisions, transaction intent, and returned domain views/results.

Services should not own:

- HTTP/gRPC/CLI DTO parsing or response formatting;
- ORM model definitions or SQL rows;
- SDK-specific request/response objects;
- dependency construction;
- environment parsing;
- process lifecycle.

## Service Module Structure

Default module:

```text
src/<package_name>/service/
  __init__.py
  order.py
```

Small services may keep operations in one file. As code grows, split by operation or domain subarea:

```text
service/order/
  __init__.py
  service.py
  create.py
  list.py
```

Do not create a `services.py` bundle by default. Dependency bundles belong in `deps` when they are needed for construction.

## Dependency Protocols

Declare dependency Protocols where they are consumed:

```python
from typing import Protocol


class OrderRepository(Protocol):
    async def insert(self, command: CreateOrderCommand) -> OrderView: ...


class Clock(Protocol):
    def now(self) -> datetime: ...
```

Rules:

- keep Protocols small and behavior-focused;
- name Protocols by role, such as `OrderRepository`, `PaymentClient`, `Policy`, or `Clock`;
- avoid broad facade Protocols that expose every service method;
- keep concrete adapter classes in `repository`, `client`, or `platform`;
- wire concrete implementations in entrypoint or `deps` modules.

Use concrete values for data, config, options, and value objects. Do not wrap config dictionaries or pure data in Protocols.

## Async and Sync Boundaries

Match the dependency style:

- If repositories/clients are async, service methods that call them should be async.
- If all dependencies are synchronous and the project is not async, keep the service synchronous.
- Do not block an async event loop with synchronous database/network calls.
- Do not introduce async only for pure domain logic.

Avoid mixing sync and async variants of the same service unless the repo has a deliberate adapter strategy.

## Domain Types and Error Handling

Services accept domain commands/queries and return domain results/views:

```python
class OrderService:
    def __init__(self, orders: OrderRepository) -> None:
        self._orders = orders

    async def create(self, command: CreateOrderCommand) -> OrderView:
        if not command.items:
            raise AppError.invalid("order must include at least one item")
        return await self._orders.insert(command)
```

Rules:

- validate business invariants in services/domain, not only in transport;
- preserve low-level diagnostics in adapter logs or `__cause__`, but expose stable categories to callers;
- do not branch on SQLAlchemy, SDK, HTTP, or generated exceptions in service code;
- do not return transport DTOs from services.

## Transactions

Services describe transaction intent, not driver details. Use a small project-specific transaction Protocol when a service needs atomicity:

```python
class TransactionManager(Protocol):
    async def __aenter__(self) -> None: ...
    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> None: ...
```

Prefer a repository or unit-of-work abstraction that fits the project. Keep `begin`, `commit`, `rollback`, SQL session details, and retry policy out of domain contracts.

## Optional Usecase Layer

Add `usecase` only for flows above one service:

- multi-step product flows;
- orchestration across services;
- retries and compensation;
- long-running workflow steps;
- reusable scenarios across HTTP, CLI, worker, or cronjob entrypoints.

Default layout:

```text
src/<package_name>/usecase/
  checkout.py
  import_orders.py
```

Usecases may depend on services and policies. They should still use domain contracts and stable application errors.

Do not use `usecase` as another name for every service method.

## Service Testing

Service tests should focus on business behavior:

- valid command returns expected domain view/result;
- invalid command raises expected application error category;
- dependency errors map or propagate correctly;
- repository/client/policy calls happen when they are part of the behavior;
- transaction and compensation behavior is observable.

Use lightweight fakes or spies first. Use `unittest.mock` only when expectations are clearer than a small fake.

## Usecase Testing

Usecase tests should verify flow order, branching, retries, compensation, and cross-service policy. They should not retest repository SQL behavior or HTTP DTO mapping.

When a flow has no single source-file owner, keep tests in a usecase-focused test module such as:

```text
tests/unit/usecase/test_checkout.py
```
