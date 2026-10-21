# Database migrations

For new migration integrations, use `github.com/devctllabs/go-libs/dbmigrate` through an explicit
application `migrate` command with embedded SQL. Preserve an established migration tool unless
replacement is requested. This reference owns handwritten Go integration, SQL content, and schema
compatibility. Route `devctl migrate` operations and their Mise wrappers to `$devctl` and its
`references/migrations.md`; it also owns manifest migration paths and scaffolding. Devctl-created
migration SQL remains user-owned.

## Embedded source and selection

Keep source-controlled, ordered SQL with its database variant. Put an embedding package beside
the migration tree so `//go:embed` can include its descendants without parent-directory paths.
Preserve the repository's physical layout; new projects may use `migrations/<kind>/`. The built
binary supplies SQL through `embed.FS`, with `fs.Sub` selecting the root for a database kind.
Runtime execution requires neither `devctl.yaml` nor SQL files on disk. SQL creation remains a
development operation; shipping new SQL requires rebuilding the binary.

Composition explicitly maps each supported kind to its embedded root and selected database adapter.
Include only adapters the application needs; inspect the selected library's documentation for
driver registration, URL schemes, and driver settings. Reject an unsupported kind or incompatible
URL before opening a database.

Directories are relative to the selected kind's root. Require one or more explicit directories;
`.` selects that entire root, including all its subdirectories. Pass the selection to the library
rather than recursively collecting or parsing SQL again. Choose directory names for the project;
there is no required `common/dev/uat/prod` layout.

All selected directories form one history in the database's migration table, ordered by numeric
version. Keep selection stable for each database, preserve applied SQL, and assign new migrations
versions above its current version. Directory order does not order execution; adding a directory
later does not backfill versions below the database's current version.

## Application CLI contract

Use the command ownership and lazy construction rules in [CLI](cli.md):

```sh
app migrate up --kind postgres --url "$DB_URL" --dir common --dir dev
app migrate up --kind postgres --dir common,dev
app migrate down --kind sqlite --dir . --steps 1
app migrate status --kind sqlite --dir .
```

- `--kind` is required and selects the adapter and embedded root together.
- `--dir` is required and repeatable. With `urfave/cli/v3`, use `cli.StringSliceFlag` bound through
  `Destination`; retain its default comma separator so repetitions and comma-separated values both
  work. Show the repeated form in help and mention comma support; no custom splitter is needed.
- `--url` overrides the environment fallback. Use `DATABASE_URL` for a new integration without an
  established name. Resolve this command's CLI/env settings in deps without requiring application
  config files, a manifest, or unrelated API/worker configuration. Preserve explicit presence:
  an explicitly empty flag or environment value fails rather than selecting another source.
- `up` applies all pending migrations, or a positive `--steps N` when explicitly supplied. Treat
  `migrate.ErrNoChange` as success, retaining cleanup failures.
- `down` defaults to one step and accepts a positive `--steps N`.
- `status` reports version and dirty state; no applied version is a successful unset version.
  Dirty state is a successful status result and blocks `up` and `down`.

The CLI validates required selectors, directory syntax, and positive step counts before calling its
dependency factory. Deps resolves the URL and validates its presence and scheme before opening the
migration database. Help and CLI parsing errors skip the factory; invalid resolved configuration
may enter deps but acquires no database connection. Keep credentials and SQL out of error output.
Preserve the project's output conventions; report an observed version/dirty state as
unknown when it cannot be read after a failure. Recovery is an explicit operator decision rather
than an automatic force, retry, or compensating rollback.

## Composition and lifetime

Read [composition](runtime.md) before wiring the migration runtime. Implement an
`internal/deps.NewMigrate` scenario, or its coherent existing equivalent, that resolves migration
CLI/env settings, selects the embedded root and adapter, and constructs the owned migrator. The
CLI leaf passes its full public command options, with URL presence preserved, to its dependency
factory. The factory maps them to the constructor's typed selectors and optional URL override,
then returns a pointer to the command's capability-and-shutdown bundle. The leaf invokes that
infrastructure capability. Reuse common migration options and fresh flag bindings across leaves
according to [CLI](cli.md#shared-options-and-output). Keep configuration resolution and
resource construction in deps; no domain, service, usecase, or repository wrapper is needed solely
to invoke the library. The migrator may ship in the application binary, but API/worker scenarios
and repository constructors do not construct it or apply schemas.

The migration scenario owns the migrator and closes it on every completed path, joining operation
and cleanup failures. Reuse the existing one-shot lifecycle rules. The library owns its migration
database connection, separately from any application's normal database endpoint.

Inspect the selected API's cancellation and close guarantees. In the current library, cancellation
is checked before execution; a started upstream operation runs to completion, and close waits for
an active call. A shutdown deadline does not make that SQL cancellable; configure appropriate
driver connection and statement timeouts. `status` construction can create migration metadata and
a SQLite database file. Transaction and cross-process lock guarantees belong to the selected
adapter; ClickHouse migrations are non-transactional.

## Schema evolution and verification

When schema and repository behavior change together, update the migration, affected queries and
mappers, and repository integration tests together. Verify clean application to an empty database
and, when compatibility matters, a representative prior schema. Assert intended tables, columns,
indexes, and constraints. Where rollback is supported, verify actual schema/data reversal rather
than only a decreased migration version. For rolling deployments, plan compatible
expand/migrate/contract steps and preserve compatibility for the required window.

For a changed migration command, build the binary and invoke it outside the checkout without a
manifest or loose SQL files. Verify selected directories, the kind-scoped `.` selection, both
`--dir` forms, CLI/env precedence, `up/down/status`, repeated `up`, invalid inputs, and help without
database acquisition. Use disposable SQLite for economical runtime checks; use real selected
backends when their driver semantics are affected.
