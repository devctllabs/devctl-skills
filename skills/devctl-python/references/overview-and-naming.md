# Overview and Naming

## Contents

- Architectural Goals
- Default Project Layout
- Package and Module Split Rules
- Layer Naming Conventions
- Type Sharing Rules
- Compact Order Example
- Existing Projects

## Architectural Goals

Use explicit boundaries and inward dependencies:

```text
entrypoint/transport -> usecase/service -> consumer-owned Protocols -> concrete adapters
                                     ^
                                     |
                                   domain
```

- `domain`: business vocabulary, identifiers, value objects, operation contracts, validation issue shapes, and application error categories.
- `service`: application business operations over domain contracts.
- `usecase`: optional orchestration for product flows above services.
- `repository`: persistence and resource adapters for databases, caches, filesystems, and object storage.
- `client`: outbound integrations with external HTTP, gRPC, SDK, subprocess, or message APIs.
- `transport`: inbound protocol adapters such as HTTP, gRPC, and message consumers.
- `cli`: command-line entrypoints, command parsing, terminal output, and scenario startup.
- `deps`: config loading, dependency construction, concrete adapter selection, lifecycle, and shutdown hooks.
- `platform`: optional reusable technical primitives and concrete implementations without domain knowledge, such as clocks, IDs, codecs, telemetry, transaction primitives, and deterministic test helpers.
- `generated`: generated Python output behind an explicit boundary. Source specs such as OpenAPI, Proto, schemas, and codegen config are canonical inputs. Do not hand-edit generated files.

Keep construction and process concerns out of domain and service modules. Business code receives explicit dependencies, typed config, and domain contracts. Services/usecases perform external side effects only through consumer-owned Protocols; `platform` is not a direct service-to-OS helper layer.

## Default Project Layout

For new packaged applications, prefer a `src/` layout:

```text
pyproject.toml
uv.lock                    # when uv is the chosen tool
src/
  <package_name>/
    __init__.py
    __main__.py            # optional, for python -m <package_name>
    cli/
      main.py
      commands/
        serve.py
        worker.py
        cronjob.py
    domain/
      common/
      order.py
    service/
      order.py
    usecase/               # optional
      checkout.py
    repository/
      postgres/
      filesystem/
      memory/
    client/
      stripe.py
    transport/
      http/
      grpc/
      consumer/
    deps/
      config.py
      wiring.py
      logging.py
      lifecycle.py
    platform/
      clock.py
      ids.py
      telemetry.py
    generated/
tests/
  unit/
    domain/
    service/
    usecase/
    repository/
    client/
    platform/
    transport/
    cli/
  integration/
    repository/
    client/
    platform/
    transport/
    deps/
  contract/
  e2e/
    cli/
migrations/
deploy/
  local/
  helm/
```

Do not force every project into every folder. Add directories only when the project ships that
surface or owns that boundary. Tests use a type-first, layer-second layout; see
`testing-strategy.md` for Python-specific placement and boundary rules.

For a CLI-only library or small tool, a smaller shape is fine:

```text
pyproject.toml
src/
  <package_name>/
    __init__.py
    cli.py
    core.py
tests/
  unit/
    cli/
    core/
```

## Package and Module Split Rules

- Use one importable package for a single application by default: `src/<package_name>/`.
- Split modules by domain vocabulary or capability, not by arbitrary technical buckets.
- Use modules before creating additional distributions. A second package/distribution needs a real public API, dependency, release, ownership, or reuse boundary.
- Split `service` and `repository` by entity or domain area when files become noisy.
- Use backend subpackages for alternative storage implementations, such as `repository/postgres` and `repository/memory`.
- Put service dependency Protocols where they are consumed, usually in `service/<entity>.py` or a nearby service module.
- Keep `Path` concrete as a value, but keep OS access and storage layout inside filesystem repositories. Do not create a Protocol that mirrors `pathlib`.
- Put transport-local narrow Protocols in the handler module when a handler needs only a subset of service behavior.
- Do not put CLI command parsing under `transport`. CLI is an entrypoint, not a protocol transport.
- Do not create broad `common`, `utils`, or `helpers` modules without ownership. Prefer `domain/common` or `platform` only when several independent modules use the concept.

## Layer Naming Conventions

Core operation contracts:

| Role | Name | Example |
| --- | --- | --- |
| Identifier | `<Entity>Id` | `OrderId` |
| Write input | `<Operation>Command` | `CreateOrderCommand` |
| Write output envelope | `<Operation>Result` | `CreateOrderResult` |
| Read input | `<Operation>Query` | `ListOrdersQuery` |
| Read output | `<Entity>View` or `<Entities>View` | `OrderView`, `OrdersView` |
| Filter | `...Filter` | `ListOrdersFilter` |
| Parameter group | `...Params` | `OrderItemParams` |
| Application error | `AppError` or `<Domain>Error` | `AppError`, `OrderError` |

Layer-specific names:

- `domain/<entity>.py` owns operation contracts, value objects, enums, invariants, and domain error details.
- `service/<entity>.py` exposes operations such as `OrderService` and consumer-owned Protocols such as `OrderRepository`.
- `usecase/<flow>.py` exposes flow orchestration such as `CheckoutUsecase`.
- `repository/<backend>/<entity>.py` exposes concrete adapters such as `PostgresOrderRepository`.
- `client/<system>.py` exposes concrete outbound clients such as `StripeBillingClient`.
- `transport/http/<feature>/` exposes route handlers, DTO mappers, and error mappers.
- `cli/commands/<scenario>.py` owns command parsing and scenario startup for that command.
- `deps/wiring.py` or `deps/<area>.py` owns concrete dependency construction.

## Type Sharing Rules

- Domain operation contracts are shared outward: services/usecases consume them, adapters may receive or return them through service-owned Protocols, and transport maps protocol DTOs to and from them.
- Represent a fixed set of fields with a named command, query, result, view, value object, or
  boundary DTO. A mapping is not a substitute for a structured contract merely because all fields
  can be annotated as `object`.
- Permit mappings only when their keys are runtime domain data rather than field names. Use
  explicit key/value types and document ownership or mutability when it is not obvious.
- Do not share transport request/response DTOs with `domain`, `service`, or `usecase`.
- Do not share ORM models, row objects, SDK responses, or generated protocol DTOs with `domain` or `service`.
- Keep generated DTOs behind `generated/` modules or handwritten facades. Do not expose noisy generated APIs broadly unless they are the intentional public contract.
- Domain and service modules may use standard-library typing and dataclasses. They should not need FastAPI, Django, Flask, SQLAlchemy, Celery, generated protocol packages, or SDK client types.
- `Path` may appear in a service-facing contract when a caller-visible path is meaningful, but service code must not use it for direct filesystem I/O.

## Compact Order Example

Domain:

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
class OrderView:
    id: OrderId
    customer_id: str
    total_cents: int
```

Service:

```python
from typing import Protocol


class OrderRepository(Protocol):
    async def insert(self, command: CreateOrderCommand) -> OrderView: ...


class OrderService:
    def __init__(self, repository: OrderRepository) -> None:
        self._repository = repository

    async def create(self, command: CreateOrderCommand) -> OrderView:
        if not command.items:
            raise AppError.invalid("order must include at least one item")
        return await self._repository.insert(command)
```

HTTP transport maps request DTOs into `CreateOrderCommand` and maps `OrderView` into a protocol response. Repository adapters map rows into `OrderView`.

A result with fixed fields must stay structured:

```python
@dataclass(frozen=True, slots=True)
class DispatchResult:
    operations: tuple[DispatchOperation, ...]
    status: RunStatus
```

Do not replace it with `dict[str, Any]`. A field such as
`outputs: Mapping[OutputName, ArtifactPath]` remains a valid semantic map because output names are
runtime domain values.

## Existing Projects

When an existing repo already has a coherent framework shape, keep it unless it conflicts with the requested change:

- Django projects may keep app modules and management commands.
- FastAPI projects may keep their existing router/app organization.
- Flask projects may keep blueprints.
- Data packages may keep flat layout when packaging and tests already work.

Apply the defaults only when the repo has no stronger convention or when the user asks to standardize.
