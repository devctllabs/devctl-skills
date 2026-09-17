# Business and adapter boundaries

Use these rules when placing application behavior, defining contracts, or connecting storage and
outbound systems. Add only owners that have a current responsibility.

## Domain contracts

Keep domain packages independent of frameworks, drivers, SDKs, generated DTOs, environment access,
and runtime construction. They own vocabulary, values, pure invariants, operation inputs/results,
views, and stable error categories.

- Use `<Operation>Command` and `<Operation>Result` for writes, `<Operation>Query` and a result or
  `...View` for reads, `...Filter` for selection, and `...Params` for cohesive nested inputs.
- Put shared types in `domain/common` only when they are one domain concept used by multiple areas;
  similarity of fields alone is insufficient.
- Keep protocol and persistence tags on adapter-owned representations. Share domain types between
  application owners rather than copying parallel field sets.
- Represent caller-actionable failures with stable categories discoverable through `errors.Is` or
  `errors.As`. Typed errors may retain safe facts such as an identifier or attempted transition;
  wrap the underlying category or cause.

Validation follows ownership. Transport validates protocol shape and credentials; domain validates
pure values and invariants; service/usecase validates business state and permissions; repositories
enforce storage containment, format integrity, and race-safe constraints. Normalize a backend
constraint into a domain category while retaining the original cause.

## Service and usecase

A service owns each caller-visible application operation in its domain area, including a read that
initially delegates to one repository. It owns decisions, ordering, transaction scope, business
retry/compensation, query defaults, freshness, and adapter orchestration.

Declare consumed capabilities in the service package and use domain types at those seams:

```go
type Catalog interface {
    // Lookup resolves source into a candidate revision.
    Lookup(ctx context.Context, source dompackage.Source) (dompackage.Candidate, error)
}

type Checkout interface {
    // Materialize checks out the selected revision and returns its location.
    Materialize(ctx context.Context, candidate dompackage.Candidate) (dompackage.Location, error)
}

type Store interface {
    // Save publishes record, returning ErrConflict when its name already exists.
    Save(ctx context.Context, record dompackage.Record) error
}
```

Several I/O steps remain one service operation. Introduce `usecase/<flow>` only when a cohesive flow
coordinates independently meaningful service capabilities. The usecase declares narrow service
contracts, owns their ordering and cross-service compensation, and does not import repositories or
clients or repeat service invariants.

Put safe protocol retry in the client that owns the protocol. Put retry based on business outcomes
in the service or usecase that owns the operation. When an external outcome is uncertain, make the
product decision explicit through idempotency, reconciliation, or compensation rather than
pretending a local transaction rolled it back.

## Repositories and clients

Repositories own databases, caches, filesystems, and object storage. They own queries, row/file
mapping, paths and keys, codecs, locking, atomic publication, backend constraint detection, and
native transaction mechanics. Services own allowed filters, ordering, limits, aggregation meaning,
and observable cache policy; repositories may execute those choices efficiently.

Clients own outbound HTTP, gRPC, SDK, Git, subprocess, and producer protocols. They own wire DTOs,
arguments, encoding, protocol timeouts, cancellation mechanics, safe protocol retries, and mapping
external failures into domain categories. Capture subprocess output deliberately and avoid leaking
commands, credentials, stderr, or remote payloads through application errors.

Split a mixed integration by external responsibility: an HTTP catalog and Git checkout are separate
clients, while filesystem metadata is a repository. Adapters do not call each other; the service
coordinates their semantic capabilities.

Paths are legitimate values when meaningful to the caller. A pure path calculation can remain with
its rule, but observing files, environment, clocks, randomness, or processes is a capability.
Filesystem adapters must define rooted containment, traversal and symlink behavior, atomicity, and
conflict guarantees. Avoid generic `Filesystem.Read/Write/Exists` and raw `exec.Command` facades.

For a new application with filesystem persistence, inspect the selected
`github.com/devctllabs/go-libs/filesystem` API first and use its concrete rooted `*filesystem.OS`
inside the repository when its operations provide the required guarantees. Keep the service-facing
interface semantic; do not mirror the library's `Writer`, `Copier`, or raw file methods through the
application boundary. If the operation needs a guarantee the selected library does not provide,
such as cross-process create-if-absent, keep the smallest supplemental mechanism in the concrete
repository and preserve the stronger application guarantee rather than weakening it.

Use `internal/platform` only for a genuinely shared, domain-free primitive such as a clock or raw
cache mechanism. Domain-aware keys, codecs, and selection remain in repository; business packages
must not use platform as a route to concrete infrastructure.

## Transactions

The service/usecase that requires atomicity receives the narrowest shared
`github.com/devctllabs/go-libs/txmanager.Manager` or `Managers` directly. Do not redeclare that
canonical contract. Pass the transaction callback context unchanged to every participating
repository; its selected DB endpoint resolves the native transaction from context. Repository
interfaces accept context and domain data, without a transaction handle.

```go
return s.transactions.WithinTx(ctx, func(txCtx context.Context) error {
    if err := s.orders.Save(txCtx, order); err != nil {
        return fmt.Errorf("orders.Save: %w", err)
    }
    if err := s.events.Append(txCtx, event); err != nil {
        return fmt.Errorf("events.Append: %w", err)
    }
    return nil
})
```

One transaction covers only resources that actually participate. HTTP, Git, subprocess, and broker
effects do not roll back with a database transaction. Use an outbox only when committing state
without publishing the corresponding message would violate correctness.

## Errors and tests

Add operation context at each boundary with `%w`. Preserve cancellation and deadline categories.
Protocol adapters map domain categories and approved facts; raw SQL, paths, credentials, broker
metadata, and stderr remain internal. When work and cleanup independently fail, preserve both with
`errors.Join`.

Classify adapter failures only through stable contracts: sentinels, typed errors, and documented
protocol or driver codes such as SQLSTATE or SQLite codes. Never infer a category from error text.
Retain both the caller-actionable category and raw cause so `errors.Is` and `errors.As` recognize
each; service/usecase code branches on domain or context categories, not retained adapter types.
When normalizing cancellation or deadline failures, preserve both the matching domain category and
the original context sentinel.

Service/usecase tests prove decisions, ordering, transaction context propagation, retry, and
compensation through generated capability mocks. Repository/client tests use the real economical
mechanism: a temporary directory, actual selected database, `httptest.Server`, helper process, or
local Git repository. Prove atomicity, containment, cancellation, error normalization, and cleanup
where the adapter owns them, including classification through stable sentinel, type, or code
signals.
