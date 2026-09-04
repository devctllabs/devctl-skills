# Project Structure

## Contents

- Responsibility Map
- Service and Repository Boundary
- Default Layout
- Package Split Rules
- Type Flow
- Review Checklist

## Responsibility Map

For a new or unstructured service application, use these package names normatively. Map every
present responsibility to its named package and omit a package only when the application has no
corresponding responsibility. Preserve coherent equivalent ownership in an established repository
unless the user asks to standardize.

```text
transport -> usecase/service -> consumer-owned repository/client interfaces
                         ^
                         |
                       domain
```

This diagram specifies dependency direction, not implementation order. For a feature spanning
several layers, follow `testing-strategy.md`: make the caller-visible `cmd` or transport boundary
GREEN with generated gomock mocks for injected interfaces, then descend through service/usecase,
concrete adapters, and final wiring only as upper contracts demand them. Start at a lower layer only
for an explicitly lower-layer task.

- `domain`: domain types, value objects, invariants, operation contracts, and error categories.
- `service`: application business operations over domain contracts.
- `usecase`: optional orchestration for product flows above services.
- `repository`: internal storage adapters for databases, caches, files, and object storage.
- `client`: outbound HTTP/gRPC/SDK/subprocess/message integrations.
- `transport`: inbound HTTP, gRPC, Kafka, cron, and other delivery adapters.
- `internal/deps`: construction, configuration, provider wiring, lifecycle, and shutdown.
- `internal/platform`: optional shared domain-free capabilities such as clocks, IDs, logging,
  telemetry, and cache mechanisms.

A caller-visible domain command or query that reaches repository/client I/O is a service
responsibility, even when its first implementation delegates without additional policy. Do not omit
that boundary by exposing a concrete adapter through `cmd`, transport, or `internal/deps`.
- `pkg`: packages intentionally imported by other Go modules.
- `gen`: generated output. Keep manual extensions outside `gen/` and never hand-edit generated
  files.

If `devctl.yaml` exists, inspect its components and generator output directories before applying
the default layout. The manifest controls project shape; contract inputs control API/message
content.

For example, put SQLite run storage in `repository`, a Codex subprocess integration in `client`,
HTTP server adaptation in `transport/serverhttp`, and their construction in `deps`.

## Service and Repository Boundary

Use backend substitution as the placement test: application meaning that must survive a change
from PostgreSQL to SQLite, memory, or files belongs to service/domain; code that changes only to
execute the same contract on that backend belongs to repository. A caller-visible command or query
still enters through service when the current method only delegates.

| Concern | Service owns | Repository owns |
| --- | --- | --- |
| Operations | application command/query and call order | implementation of the demanded storage capability |
| Queries | allowed filters/sorts, defaults, limits, and result meaning | SQL/query plans, pagination mechanics, rows, and mapping |
| Aggregates | metric/grouping/ranking semantics | efficient backend-native count/sum/group execution |
| Constraints | product checks and decisions | race-safe storage enforcement and violation classification |
| Transactions | whether work is atomic and the `txmanager` role/isolation | executing each query with the received transaction-aware `ctx` |
| Cache | observable freshness, invalidation, and failure policy | transparent domain-specific cache access, keys, and codecs |
| Errors | dependency-call context and decisions from domain categories | raw failure classification into a domain category while retaining its cause |

Keep a shared domain-free Redis/memory primitive in `internal/platform/cache`; keep a cache adapter
that knows domain keys, values, or codecs in repository. Do not pass raw cache keys, TTLs, or
invalidation flags through repository methods merely to move policy out of service.

## Default Layout

```text
cmd/<app_name>/
  main.go
  internal/
    api.go
    consumer.go              # top-level executable leaf
    cronjob.go
    config/
      config.go              # `config` namespace group
      path.go                # `config path` executable leaf
      validate.go            # `config validate` executable leaf

internal/
  domain/
    common/
    <entity>/
  service/
    <entity>/
  usecase/                 # optional; product flows only
    <flow>/
  repository/
    <entity>/              # or <entity>/<backend> for alternatives
  client/
    <system>/
  transport/
    servergrpc/
    serverhttp/
    consumerkafka/
  deps/
  platform/                # optional; shared domain-free capabilities

gen/
pkg/                       # intentionally public packages only
```

## Package Split Rules

- Split domain, service, and repository code by entity or domain area.
- Keep one or two small operations in the package entrypoint. Split one operation per file when it
  becomes independently readable; do not repeat the entity name in operation filenames.
- Put service dependency interfaces where the service consumes them. Put transport-local narrow
  interfaces in the handler package.
- Return exported concrete provider types from new constructors: `Service`, backend/role-specific
  `...Repo`, and flow-specific `...Uc`. Keep fields private; consumers own behavioral interfaces.
- Put DI registration groups in their `internal/deps` owner files; do not create service or
  repository layer bundles merely to aggregate dependencies.
- Use backend subpackages such as `repository/order/postgres` only for real alternatives.
- Add `usecase` only for multi-step flows, cross-service orchestration, retries, compensations, or
  scenarios reused across transports.
- Add `platform` only for a shared domain-free capability, not as a generic service-to-OS layer.

## Type Flow

- Share domain operation contracts outward through services and consumer-owned adapter interfaces.
- Map transport DTOs and storage rows at their owning adapters; do not share them with domain or
  service packages.
- Reuse domain contracts in usecases through aliases or aggregation instead of field-by-field copies.

## Review Checklist

- Does every present responsibility have one owner?
- Are optional packages justified by current behavior?
- Do dependencies point inward without concrete adapter imports in business packages?
- Does service own application meaning while repository owns only backend-specific execution?
- Are construction, protocol, storage, and generated boundaries explicit?
