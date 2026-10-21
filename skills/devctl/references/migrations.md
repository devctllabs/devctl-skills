# Database Migrations

Use this workflow for `devctl migrate` and project tasks that wrap it. Discover exact flags from
the installed CLI and read `references/cli.md` for general command execution.

## Resolve inputs

1. Inspect the manifest, SQL files, and relevant task wrappers. Use `devctl inspect --json` to
   resolve migration targets, paths, and effective environment keys without opening a database.
   Migration commands require a semantically valid manifest; `go.mod`, scaffold, generators, and
   unrelated application-readiness checks are not prerequisites.
2. Select the requested `connection:variant` among variants with a `migrations` block. Complete
   selection only when the request or unambiguous context identifies the target. If multiple
   candidates remain, list them and wait for the user's choice before any migration command,
   including `create` or `status`. Runtime database defaults do not select migration targets.
   Pass the resolved target explicitly for execution.
3. For database access, establish the intended environment and migration URL source without
   exposing credentials. Resolve `migrations.database_env` through the effective project prefix:
   process environment takes precedence over an explicit `--env-file`, then `database_default`.
   A present empty value fails rather than falling back. An explicit dotenv file must be valid
   even when the process environment supplies the value. `.env` is not loaded automatically and
   the application runtime DSN is not a fallback.
4. Resolve SQL paths relative to the selected manifest directory. Relative dotenv paths and
   SQLite URLs remain relative to the invoking working directory, even with `--file`.

## Authorization

`create` and `status` need no separate confirmation within the requested task. Explain relevant
initialization effects: `status` may create the migration metadata table and a SQLite database file.

`up` and `down` require explicit authorization for the operation and concrete database. An
unambiguous request or an already agreed plan provides it: “apply migrations to local SQLite”
is sufficient when context identifies that project's database. Proceed without asking again.
Authorization to apply does not imply authorization to roll back.

When a requested database update remains pending for authorization, finish preparation with a
reviewable operation: show the target, environment, command, and extent (all pending migrations or
the step count), with credentials omitted. End the response with a direct question to the user,
such as “Apply all pending migrations to `primary:sqlite` in the local database using this
command?” Adapt the question to the actual operation, target, environment, and extent; wait for
the answer before execution. “Add a field and a migration” authorizes preparing SQL; for an
identified database, finish that request with the concrete operation and confirmation question.
Applying it requires authorization even for an existing local development database. Tests that
apply migrations may run within an explicitly authorized test plan and its disposable database.

## Execute and verify

- `create <name>` creates a timestamped `.up.sql` / `.down.sql` pair and a missing SQL directory;
  it requires no database URL or connection. Treat these files as user-owned. Route SQL contents,
  schema compatibility, and affected Go queries/tests to `$devctl-go`.
- `status` reports the current `version` and `dirty` state; no applied version is `null`.
  It does not list applied or pending files and is not a preview of execution. Inspect SQL files
  to explain the intended changes. An absent source directory fails; an existing empty directory
  can still permit status initialization.
- Before an authorized `up` or `down`, run `status` for the same target and environment. Proceed
  only with a successful, clean result and the requested SQL present. Dirty state is a successful
  status result but blocks application and rollback.
- `up` applies all pending migrations by default; a positive `--steps N` limits the operation.
  A repeated successful unbounded `up` reports `no_change: true`; an empty SQL source fails.
- `down` rolls back one migration by default, or a positive requested step count. The CLI itself
  does not ask for confirmation. A database without an applied version cannot be rolled back.
- After execution, check `status` with the same inputs and report the target, operation, observed
  version, dirty state, and any no-change result. Distinguish created SQL from changes to the
  database. If state cannot be observed, report it as unknown.

## Failure and recovery

On error, stop further migration execution. Preserve the error and any partial result; check
`status` when possible to establish the observed state. A failed post-check does not erase the
original failure or establish that the database is unchanged.

Bounded `up` or `down` can execute available steps and then fail when fewer than requested exist.
ClickHouse migrations are non-transactional; multi-statement SQL needs appropriate driver URL
configuration, which Devctl does not add. Partial application can require manual recovery.

Recovery is a separate decision: Devctl provides no dry-run, force, or repair operation, and no
automatic rollback after failure. Report the state and required operator decision rather than
retrying, changing migration metadata, or running a compensating `down` without authorization.
When the installed CLI lacks the requested operation, report it as unrun rather than imitating it.
