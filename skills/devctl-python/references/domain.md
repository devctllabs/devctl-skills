# Domain

## Contents

- Role
- Module Layout
- Operation Contract Naming
- Identifiers and Value Objects
- Domain Errors
- Import Rules and Anti-Patterns
- `domain/common`

## Role

`domain` owns business vocabulary:

- identifiers, value objects, enums, state machines, and invariants;
- command/query/result/view types when they are application contracts;
- domain validation issue shapes;
- domain-level error categories or details;
- small deterministic domain behavior that does not require infrastructure.

Domain must not know about service, repository implementations, clients, transport, frameworks, ORMs, generated DTOs, environment variables, or process lifecycle.

## Module Layout

Default layout:

```text
src/<package_name>/domain/
  __init__.py
  common/
    __init__.py
    errors.py
    pagination.py
    sorting.py
  order.py
  customer.py
```

As an entity grows, split a folder:

```text
domain/
  order/
    __init__.py
    command.py
    query.py
    view.py
    error.py
```

Keep module paths meaningful. Do not repeat the entity name in every file when the folder already provides context.

## Operation Contract Naming

Use stable operation contracts:

| Role | Name | Example |
| --- | --- | --- |
| Identifier | `<Entity>Id` | `OrderId` |
| Write input | `<Operation>Command` | `CreateOrderCommand` |
| Write output envelope | `<Operation>Result` | `CreateOrderResult` |
| Read input | `<Operation>Query` | `ListOrdersQuery` |
| Read output | `<Entity>View` or `<Entities>View` | `OrderView`, `OrdersView` |
| Filter | `...Filter` | `ListOrdersFilter` |
| Parameter group | `...Params` | `OrderItemParams` |

Example:

```python
from dataclasses import dataclass
from typing import NewType

OrderId = NewType("OrderId", str)


@dataclass(frozen=True, slots=True)
class OrderItemParams:
    sku: str
    qty: int


@dataclass(frozen=True, slots=True)
class CreateOrderCommand:
    customer_id: str
    items: tuple[OrderItemParams, ...]


@dataclass(frozen=True, slots=True)
class CreateOrderResult:
    order: "OrderView"


@dataclass(frozen=True, slots=True)
class ListOrdersFilter:
    customer_id: str | None = None


@dataclass(frozen=True, slots=True)
class ListOrdersQuery:
    filter: ListOrdersFilter


@dataclass(frozen=True, slots=True)
class OrderView:
    id: OrderId
    customer_id: str
```

Returning `OrderView` directly from a write is fine when there is no envelope metadata. Use `<Operation>Result` when the operation needs multiple values, flags, warnings, timestamps, or pagination-like metadata.

## Identifiers and Value Objects

Prefer small typed identities and value objects:

```python
CustomerId = NewType("CustomerId", str)


@dataclass(frozen=True, slots=True)
class Money:
    amount_cents: int
    currency: str
```

Rules:

- keep parsing and validation explicit;
- avoid leaking database primary-key types when the domain identity is different;
- avoid making value objects depend on delivery or storage packages;
- prefer immutable values for domain contracts.

## Domain Errors

Use application error categories plus optional stable facts. Transport maps them to protocol-specific outputs.

Default shape:

```python
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    path: tuple[str, ...]
    code: str
    params: dict[str, str] = field(default_factory=dict)


class AppError(Exception):
    category: str

    def __init__(self, category: str, message: str, *, issues: tuple[ValidationIssue, ...] = ()) -> None:
        super().__init__(message)
        self.category = category
        self.issues = issues

    @classmethod
    def invalid(cls, message: str, issues: tuple[ValidationIssue, ...] = ()) -> "AppError":
        return cls("invalid", message, issues=issues)
```

Use stable categories such as `not_found`, `invalid`, `conflict`, `forbidden`, `unavailable`, and `internal`.

Add entity-specific exception classes only when callers need structured protocol-independent facts that a category cannot express.

Repository and client adapters translate low-level errors into these categories. Services decide based on categories and domain facts. Transport maps categories to HTTP status, gRPC status, message retry/drop policy, or CLI output.

Do not expose driver, SDK, ORM, HTTP, gRPC, or generated error types in service-facing contracts.

## Import Rules and Anti-Patterns

Domain modules should not import:

- FastAPI, Django, Flask, Starlette, Click, Typer, Celery, or other delivery frameworks;
- Pydantic request/response models unless the generated or serialized shape is intentionally the domain contract;
- SQLAlchemy, Django ORM, asyncpg, psycopg, Redis, SDK clients, or storage row/model types;
- generated transport DTOs unless the generated contract is intentionally the domain contract;
- environment access or process-global config.

Avoid:

- infrastructure fields in domain contracts;
- transport DTO leakage into domain;
- localized/user-facing messages as the only error contract;
- broad `Exception` branches in service/domain code;
- validation only at transport boundaries while domain invariants remain unprotected;
- broad `common` helper modules that hide ownership.

## `domain/common`

Use `domain/common` only for vocabulary reused by multiple independent domain areas:

- base error categories and validation issue shapes;
- pagination, sorting, range, and filter primitives;
- money, locale, time-range, and ID helpers that are genuinely cross-domain.

Do not turn `domain/common` into a dumping ground for generic string, date, or collection helpers. Put technical helpers in `platform` or keep them local.
