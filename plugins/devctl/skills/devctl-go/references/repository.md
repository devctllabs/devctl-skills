# Repository Layer

## Contents

- Role and Package Shape
- Mapping and Errors
- Storage and Migrations
- Transactions
- Testing
- Review Checklist

## Execution Gate

Do not implement storage in anticipation of an upper feature. Enter this layer only after a GREEN
service/usecase boundary has defined a consumer-owned storage capability, unless the user explicitly
requested repository work. Change the repository integration test and observe useful RED before
editing repository production.

Implement the consumer-owned repository capability from service/usecase. Do not use the concrete
repository as the implementation of a command-, transport-, or dependency-container-level
application operation, even when the method signatures happen to match.

## Role and Package Shape

Implement service-owned storage capabilities in `internal/repository`. Repositories own SQL/NoSQL,
caches, filesystems, object storage, storage abstractions, and their concrete mapping/mechanics.
External HTTP/gRPC/SDK/subprocess integrations are clients; inbound messages are transport.

Implement typed query and aggregate contracts with backend-native plans, but keep allowed
filters/sorts, defaults, limits, metric meaning, and business decisions in service/domain. A cache
adapter that knows domain keys, values, or codecs is a repository; a shared domain-free cache
primitive may live in `internal/platform/cache`.

Filesystem/object-storage repositories own layout, traversal, serialization, locking, staging,
atomic publication, rollback, cleanup, containment, file-kind, and symlink checks. Expose
capabilities such as `Load`, `Save`, `Reserve`, `MaterializeInputs`, or `Publish`, not raw OS APIs.

```text
internal/repository/<entity>/
  repository.go
  get.go
  list.go
  upsert.go
  delete.go
  errors.go
  common.go
```

Keep one to three small operations together. Split operation files when independently readable.
Keep storage rows/projections local in operation files, `row.go`, or `mapper.go`.

Export the concrete adapter and return it from its constructor. Name it by backend or role with the
`Repo` suffix; keep fields private:

```go
type FilesystemRepo struct {
    root string
}

func New(root string) *FilesystemRepo {
    return &FilesystemRepo{root: root}
}
```

Use names such as `FilesystemRepo`, `PostgresRepo`, or `MemoryRepo`; never use `Repository`, a
lowercase `...Repo`, or `RepositoryImpl` for a new concrete adapter. The consuming service owns the
interface it accepts. Preserve an established public API unless the task explicitly changes it.

Use subpackages only for alternative backends:

```text
internal/repository/<entity>/
  postgres/
    repository.go
    get.go
    list.go
    upsert.go
    delete.go
    errors.go
  sqlite/
    repository.go
  memory/
    repository.go
```

- Keep the interface in the consuming service package.
- Let DI choose the implementation.
- Keep queries, codecs, layouts, path helpers, and driver helpers private unless several adapters
  genuinely share domain-free behavior.
- Map raw values to named service-facing contracts inside the repository.
- Keep business authorization and domain state transitions outside repositories.

## Mapping and Errors

```go
func classify(err error) error {
    switch {
    case errors.Is(err, context.Canceled):
        return fmt.Errorf("%w: %w", domain.ErrCanceled, err)
    case errors.Is(err, context.DeadlineExceeded):
        return fmt.Errorf("%w: %w", domain.ErrDeadlineExceeded, err)
    case isNoRows(err):
        return fmt.Errorf("%w: %w", domain.ErrNotFound, err)
    case isUniqueViolation(err):
        return fmt.Errorf("%w: %w", domain.ErrConflict, err)
    case isTimeout(err) || isConnReset(err):
        return fmt.Errorf("%w: %w", domain.ErrUnavailable, err)
    default:
        return fmt.Errorf("%w: %w", domain.ErrInternal, err)
    }
}
```

Classify only stable driver contracts such as sentinel errors, typed errors, SQLSTATE, and SQLite
codes; never guess from error text. The first `%w` guarantees the domain category and the second
retains the raw cause for internal diagnostics. Service/usecase code must branch only on domain or
context categories, never on retained driver types. Add no operation label here: the consuming
service wraps the failing call once as `field.Method: %w`. Transport maps the category to a safe
response and never serializes the internal error chain. Return typed domain errors only for stable
structured facts required by callers.

## Storage and Migrations

Change schemas through source-controlled migrations or the established schema tool. Discover the
path from repository conventions, `devctl.yaml`, generators, or docs; look for `migrations/` when no
convention exists. Never mutate schema from a repository constructor:

```go
func New(db DB) *PostgresRepo {
    db.Exec("ALTER TABLE orders ADD COLUMN approved_at timestamptz")
    return &PostgresRepo{db: db}
}
```

Keep migrations ordered, reproducible, deploy-safe, and reviewed with repository changes. For
destructive changes under uncertain deploy order, use expand/migrate/contract.

When schema and repository behavior change together:

- update migrations, queries, and mappers;
- preserve rolling-deploy compatibility when required;
- update repository integration tests;
- update generated config or the Devctl manifest only when project tooling requires it.

Migration checks:

```text
- apply migrations to an empty database
- optionally apply to a fixture/current schema
- verify expected tables, columns, indexes, and constraints
- verify rollback only if the project supports rollback migrations
```

## Transactions

Do not inject a transaction manager or call `WithinTx` in repository code. Service/usecase owns
transaction scope through `github.com/devctllabs/go-libs/txmanager`. Pass the received `ctx`
unchanged to the `sqlitedb`/`postgresdb` endpoint; the endpoint transparently executes against the
active transaction carried by that context or its pool when no transaction is active.

## Testing

Use real-backend integration tests for SQL, constraints, projections, pagination, locking,
transactions, filesystem layout, persisted formats, atomicity, rollback, cleanup, containment, and
symlink safety. Use unit tests only for pure mapping or generated gomock mocks of genuine injected
lower-level interfaces.

```text
- apply or reuse the test schema/migrations
- create isolated test data
- exercise real repository methods
- assert domain contracts, not storage rows
- assert driver/constraint errors are normalized
- clean up or use an isolated database/schema
```

Test filesystem repositories with `t.TempDir()`. For atomicity/rollback claims, fail after partial
application and assert restoration of every pre-existing target. Follow `testing-strategy.md`.

## Review Checklist

- Does the adapter implement a consumer-owned capability without business policy?
- Does its constructor return an exported backend/role-specific `...Repo` concrete type?
- Are storage details private and domain-facing values typed?
- Are driver failures classified as domain category plus retained cause without text matching?
- Does repository avoid transaction scope decisions and pass `ctx` unchanged to its endpoint?
- Do migrations and real-backend owner tests cover changed mechanics?
