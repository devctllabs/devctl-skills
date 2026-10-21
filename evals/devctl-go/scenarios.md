# devctl-go scenarios

These cases evaluate application/library architecture and selected runtime behavior. Inspect package
ownership, imports, contracts, composition, and generator handoffs. Design cases do not require a
complete executable; cases prefixed `Runtime:` require their stated generated output, owner tests,
and final Go checks. Use `skill-creator-evals` for execution and reporting. Provide the target skill and its
references, devctl, and devctl-openapi as accessible resources. Run each case in
a fresh disposable workspace. Executors receive Request and raw Setup inputs, not this document
or its Success criteria. These are verification tasks and must not launch recursive skill evals.

## New application scaffold before handwritten implementation

### Request

Implement a small Go CLI application named `runwatch` with a `ping` command that prints `pong`.
Use this repository and module, preserve notes.txt, and verify the command's behavior. No external
services or additional business features are needed.

### Setup

Use a fresh disposable workspace containing only `go.mod` declaring `module example.com/runwatch`
and a supported Go version, plus `notes.txt` containing `handwritten sentinel`. There is no Go
source, code skeleton, or `devctl.yaml`. Go, Devctl, and scaffold prerequisites must be available;
use the real CLI rather than simulated output. Retain tool-action evidence of file creation and
CLI execution to verify ordering.

### Success criteria

- The executor treats the module declaration as insufficient application scaffolding and follows
  `$devctl` to create the manifest and successfully run `devctl init scaffold` before creating any
  handwritten Go source or tests.
- The manifest matches the requested CLI and module; validation and inspection follow the Devctl
  workflow. notes.txt retains its exact contents, and generated files retain generator ownership.
- Handwritten implementation resumes through outside-in TDD after inspecting the scaffold-created
  owners, entrypoints, tooling, and repository check commands. The real command prints `pong`.
- Repository format, lint, and test checks run with project-owned tool versions; findings are
  addressed before reporting completion. Retained command evidence establishes that these checks
  ran and passed.
- If scaffold cannot run or fails, the executor reports the result and asks the user how to
  proceed before writing handwritten Go code. Tool unavailability leaves scaffold and subsequent
  implementation unrun rather than counting as a successful implementation.

## Uncertain application target requires clarification

### Request

Implement the Go application's `ping` CLI command so it prints `pong`. Use this repository and
preserve the existing behavior.

### Setup

Use a fresh disposable monorepo with two plausible Go application targets. `apps/runwatch` has
`go.mod` declaring `module example.com/runwatch` and `cmd/runwatch/main.go` implementing a small
working CLI. `apps/report` contains only `go.mod` declaring `module example.com/report` and a
README identifying it as a planned CLI application. Both modules use a supported Go version.
There is no root application, default task, or instruction selecting either target. Preserve the
initial file contents and retain tool-action evidence.

### Success criteria

- The executor inspects the repository and recognizes that the request could mean extending the
  existing application or starting the application without a skeleton.
- It explicitly asks the user which application to implement before scaffolding or creating Go
  files; it neither silently chooses a target nor treats module metadata as a complete skeleton.
- While awaiting clarification, existing files remain unchanged and scaffold has not run.

## CLI package import across HTTP, Git, and filesystem

### Request

Design the Go code architecture for `pkgwatch import <catalog-url> --root <existing-directory>`.
Show the package/file layout and representative Go contracts, orchestration, adapter, CLI, and DI
code; a full executable and functional test suite are not needed. The HTTP catalog
returns one JSON object with `name`, `repository`, and `revision`. Fetch that catalog, materialize
the exact Git revision into a checkout below root, save a JSON record with the name, resolved
commit, and checkout location, and print the name. Repository sources may be local paths or URLs.
A duplicate name reports conflict and preserves the existing record. Help and invalid arguments
must not initialize application runtime or touch the root. A failed catalog request must not
create a record. Support cancellation. Keep this one import operation small; no update/list/delete
commands or remote services are required. Explain which owner handles each responsibility.

### Setup

Start with an otherwise empty project declaring `module example.com/runwatch` and a supported Go
version. No real HTTP endpoint, Git repository, or test fixture is required to design its code.
The local go-libs checkout, when available, supplies API documentation and examples.

### Success criteria

- The design gives revision selection, conflict policy, and failed-operation decisions explicit
  business owners, while concrete clients/repositories own their external mechanics.
- A service owns the import operation and declares its consumed semantic interfaces in the service
  package; domain holds operation data. HTTP/Git implementations
  are clients; concrete filesystem storage is a repository. Multiple I/O steps introduce no
  unnecessary usecase or generic OS/command facade.
- CLI layout and lazy construction follow the target conventions; DI sketches compose concrete
  implementations through go-libs/di with explicit resource ownership and scenario roots. The
  executable CLI leaf uses go-libs/lifecycle for runtime coordination/cleanup. Failed construction
  uses bounded rollback independent of startup cancellation and preserves cleanup errors.
- Protocol/storage representations stay at adapters. The proposed testing boundaries can isolate
  service policy without mocking raw operating-system operations; no test implementation is needed.

## Contract generation and a multi-service runtime design

### Request

Prepare a Go order API project. Its checkout flow must coordinate independent order and payment
services. Order state and payment-attempt metadata use SQLite; charging is an outbound HTTP
operation. Generate an HTTP server contract for POST /checkout and GET /orders/{id} through the
installed Devctl CLI. Then provide a concise implementation design with package ownership,
Go-facing contract sketches, DI construction, transaction/compensation decisions, cancellation,
failed-startup cleanup, and shutdown. Do not implement handwritten application behavior yet.
Preserve notes.txt. Report generator/tool limitations accurately.

### Setup

Use an empty temporary project with `module example.com/orders`, a current supported Go directive,
and `notes.txt` containing `handwritten sentinel`. Devctl and Go are installed on the development
host; preflight the actual generator tools using the CLI workflow. Use no live payment system or
database server. The executor may author the local OpenAPI contract and manifest as part of the
request. No global installation or production deployment is part of this case.

### Success criteria

- Manifest and source contracts drive real Devctl generation; output is never handwritten to
  imitate a generator. Preserve notes.txt. Inspect generated paths, interfaces, and CLI results.
- The flow has usecase-owned independent service contracts, typed domain vocabulary, an outbound
  payment client, concrete SQLite repositories, thin HTTP delivery, and explicit DI ownership.
- A DB transaction does not promise HTTP rollback. The design identifies transaction context
  propagation, external-outcome uncertainty, compensation/idempotency, and cleanup ownership.
- The composition root uses go-libs/di and the executable CLI leaf uses go-libs/lifecycle;
  generation delegates to devctl/OpenAPI skills and returns to the Go skill for handwritten work.
- If required tooling is unavailable, mark runtime generation unrun separately from the inspected
  design result.

## Pure reusable library

### Request

Design a tiny reusable Go package `revision` with `Normalize(string) (string, error)`. It accepts
exactly 40 ASCII hexadecimal characters, returns lowercase, and rejects whitespace, short or long
strings, and non-hex characters. Callers must identify invalid input with errors.Is. It performs
no Git, filesystem, or network operations. Show its file layout and representative public API/error
declarations, explain dependency and test boundaries. Do not implement the algorithm or tests.

### Setup

Start with the same minimal Go module declaration as the CLI case, without application source.
No generated contracts or external runtime are needed.

### Success criteria

- The public contract expresses normalization and invalid-input semantics without leaking a
  hypothetical Git/storage representation or requiring an external capability.
- The result is a cohesive package/API with documented semantics and a package-owned error.
  It introduces no application domain/service/repository/deps hierarchy, CLI, DI, or I/O seam.
- The test design exercises the public operation; no interface or mock is invented for
  deterministic string behavior.

## Documented Go API contracts

### Request

Design the Go-facing contract for a tiny reusable `cache` package. Callers supply a record source
that loads a value by string key with cancellation. An options struct has a `Label` and a
`TTL time.Duration`: zero disables expiration, positive values bound an entry's lifetime, and
negative values are invalid. A constructor validates options without loading records; the returned
concrete cache exposes a lookup method. Source errors remain recognizable through `errors.Is`.
Show representative Go type, interface, constructor, and concrete method declarations, and explain
test boundaries. Keep this a contract design without algorithms, test implementations, application
layers, or runtime wiring.

### Setup

Start in a fresh disposable workspace with `go.mod` declaring `module example.com/cache` and a
supported Go directive, without application source. No external services, generated code, or
dependency downloads are needed. Provide the current target skill and its references.

### Success criteria

- Exported types, functions, and concrete methods have concise Go doc comments beginning with
  their declared names and explaining their contracts. The options field documentation explains
  the TTL units, zero meaning, and valid range; self-explanatory fields need no ceremonial comments.
- Every handwritten interface method is documented, and all input parameters have meaningful
  names, including the context and record key. Named results are optional.
- The constructor and lookup contracts preserve validation, cancellation, expiration, and source
  error semantics. Comments describe those semantics rather than merely repeating identifiers.
- The design stays a small library with a caller-supplied source; it adds no application layers,
  global runtime ownership, algorithms, test implementations, or external dependencies.

## Application error ownership and growth

### Request

Design error contracts for a new Go application with order and invoice areas. Both areas need the
same missing-record category, which HTTP and CLI callers distinguish from other failures. Orders
also reject invalid state transitions; callers need the order ID and attempted states. Adapters
detect failures through backend sentinels or typed errors. Business callers need a stable contract,
while internal diagnostics must retain the original failure. Show package/file placement and
concise Go sketches for definitions, normalization, and caller branches, plus focused verification.
Explain how to organize files when more error concepts appear. Keep this a design task without a
full application, tests, dependency downloads, or external services.

### Setup

Use a fresh disposable workspace with a minimal Go module and no application code. Provide the
target skill and its references. Only standard-library error sketches are needed.

### Success criteria

- The shared missing-record definition belongs to internal/domain/common/errors.go; the order
  transition type belongs to internal/domain/order/errors.go. Services and adapters produce these
  errors without owning their cross-layer definitions.
- Caller sketches use errors.Is for the shared category and errors.As for typed transition facts.
  Normalization and subsequent wrapping retain the domain category and original backend cause,
  including typed-cause recognition. Classification uses sentinel/type signals rather than text.
- Backend representations remain in adapters; HTTP/CLI use the application contract. The design
  uses only needed sentinels/types rather than requiring a universal Error/Kind hierarchy.
- Growth splits cohesive concepts into files within the owning package. Package boundaries follow
  domain responsibilities rather than error counts or file-size thresholds.
- The response stays within the requested design without scaffolding runtime or future layers.

## New error contract in an existing application

### Request

Add the error contract for a new independent inventory-reservation capability to the existing Go
application. Insufficient stock must report the item ID, requested quantity, and available quantity
so HTTP and CLI callers can recognize it. Keep the existing order-conflict identity, import path,
and callers compatible. Show the minimal added declarations, package/file placement, caller
sketches, and focused verification. Keep this a design task without implementing the operations,
rewriting existing features, downloading dependencies, or adding infrastructure.

### Setup

Use a fresh disposable workspace with a minimal module example.com/existing and these files.
Provide the target skill and its references. The existing order-conflict contract is coherent;
there are no adapter imports or dependency cycles, and migration is not requested.

internal/service/order/errors.go:

```go
package order

import "errors"

var ErrConflict = errors.New("order conflict")
```

internal/transport/report/errors.go:

```go
package report

import (
    "errors"

    "example.com/existing/internal/service/order"
)

func IsOrderConflict(err error) bool {
    return errors.Is(err, order.ErrConflict)
}
```

### Success criteria

- The new inventory error definition belongs to internal/domain/inventory/errors.go despite the
  existing order error living in service. Its typed facts are recognizable through errors.As after
  wrapping; HTTP and CLI callers need no adapter types or string matching.
- The existing order declaration, sentinel identity, import path, and report caller remain intact.
  No blanket migration or replacement error family is introduced to enforce the ownership map.
- The single-area addition introduces no speculative domain/common errors or universal Error/Kind
  hierarchy. Growth, if discussed, follows cohesive files and semantic package ownership.
- The response stays scoped to added declarations and caller/test sketches; it makes no unrelated
  application or infrastructure changes.

## SQL builder selection for a new repository

### Request

Design repository query construction for a new Go catalog service backed by PostgreSQL. The list
operation reads id, name, and status from catalog_items, with optional exact name/status filters
and a bounded result limit. The service already owns allowed filters and limit defaults. Choose
a SQL builder, show a concise repository query-building sketch and its caller-facing contract,
and explain focused verification. Keep this a design task without a full application or tests.
No running database, HTTP server, migration runner, or generated code is needed.

### Setup

Use a fresh disposable workspace with a minimal Go module and no existing SQL-builder dependency
or application code. Provide the target skill and its references. Library documentation is
available through the selected module's Go documentation or official upstream sources.

### Success criteria

- The design chooses github.com/huandu/go-sqlbuilder without the Request naming that library.
  The selected API is supported by inspected documentation rather than guessed signatures.
- Builder types and SQL construction stay in the concrete repository. Its caller-facing
  capability uses domain data; the service retains query policy and defaults.
- The query uses an explicit PostgreSQL flavor and passes filter values separately as arguments.
  Quote-containing names remain values rather than changing SQL structure.
- Focused verification covers absent/present filters, parameter order and placeholders, and the
  supplied limit. No generic builder facade or unrelated application layers are introduced.

## Preserve an existing SQL builder

### Request

Extend the existing catalog repository's SQL helper to apply its optional status filter. Name
filtering already works. Show the minimal proposed change and focused checks, preserving the
helper signature and the project's established conventions. This is a design task; do not edit
files, replace infrastructure, or implement a full application.

### Setup

Use a fresh disposable module declaring github.com/Masterminds/squirrel v1.5.4. Its established
repository helper is internal/repository/item/query.go:

```go
package item

import sq "github.com/Masterminds/squirrel"

type Query struct {
    Name   string
    Status string
}

func listQuery(query Query) (string, []any, error) {
    builder := sq.Select("id", "name", "status").
        From("catalog_items").PlaceholderFormat(sq.Dollar)
    if query.Name != "" {
        builder = builder.Where(sq.Eq{"name": query.Name})
    }
    return builder.ToSql()
}
```

Provide the target skill and its references. No dependency migration is requested, and no live
database is needed.

### Success criteria

- The proposed change keeps Squirrel and its selected version, retains the helper signature and
  PostgreSQL placeholders, and adds the status condition using the existing parameterized style.
- The proposal introduces no go-sqlbuilder dependency, replacement builder facade, or unrelated
  changes. It treats the skill's SQL-builder choice as a default for new selections.
- Focused checks cover empty status, status alone, both filters, and quote-containing values while
  preserving name filtering and separate SQL arguments.

## Atomic SQLite persistence and cancelled-startup cleanup

### Request

Design a small Go application operation that saves an order and its audit event atomically in
SQLite. Both records must commit together or neither should persist. Show package ownership and
representative Go contracts, the operation, repository methods, and DI startup/cleanup code.
Include the startup path where one resource has been acquired, a later dependency fails to
initialize, and the startup context is already cancelled. Cleanup itself can fail too; explain
what the caller receives. Provide concise architecture and snippets, not a full application,
generated code, or functional tests.

### Setup

Start with an otherwise empty project declaring `module example.com/orders` and a supported Go
version. The two records use the same SQLite database. No running database or fixture is needed.
The local go-libs checkout, when available, supplies API documentation and examples.

### Success criteria

- A service owns the atomic operation and its consumed repository interfaces; domain contains
  operation data, and concrete SQLite repositories own SQL and driver representations.
- The owner uses the shared go-libs/txmanager contract. Both repository calls receive the
  transaction callback context; the same selected DB endpoint resolves its transaction from
  context. Repository contracts accept context and domain data, without an extra transaction handle.
- go-libs/di owns the resource graph, with eager scenario roots and explicit cleanup ownership.
  Both registration and resolution failures reach rollback when resources have been acquired.
- Rollback is bounded and independent of the cancelled startup context. The caller can inspect
  both the construction failure and any cleanup failure; no error is silently discarded.

## Runtime: CLI-backed filesystem operation

### Request

Add `runwatch create <name> --root <directory>` and implement the operation behind it. Use the
selected `github.com/devctllabs/go-libs/filesystem` module for rooted filesystem mechanics. Help and
invalid arguments must not initialize runtime dependencies. A valid command creates one JSON task
document named `<name>.json` below the configured root and reports the created name. An existing
task preserves its document bytes and exposes the established conflict category. Reject names that
escape the configured root. Support cancellation, keep filesystem and JSON details private, add
direct owner tests, and finish with `go test ./...`.

### Setup

Copy [fixtures/outside-in-cli-filesystem](fixtures/outside-in-cli-filesystem) into a fresh disposable
workspace. It supplies only the module/tool declarations and domain data; dependency graph contracts
are part of the implementation. Use its Go version and tool declarations; the local go-libs checkout
may supply API documentation and workspace resolution. Provide `skills/devctl-go/SKILL.md`,
outside-in-tdd, simplify-code, and every reference they require.

Before implementing behavior, resolve the selected `filesystem`, `di`, and `lifecycle` modules,
`urfave/cli/v3`, and the declared `mockgen` tool in the disposable module. Pin added module/tool
versions or record local workspace replacements. Complete preflight when `go doc -all` works for
each selected library and `go tool mockgen -version` runs successfully. If preflight cannot complete,
record the failing command and reason and report the case as unrun before starting implementation.

### Success criteria

- Independently invoke help, invalid input, a first create, a duplicate create, and a traversal
  attempt. Help/invalid input never build runtime; the first result is readable JSON; duplicate and
  traversal failures preserve all existing bytes and remain inside root.
- CLI, service, filesystem repository, and composition are separate owners. The service declares
  its semantic repository capability; the concrete repository uses go-libs/filesystem without
  exposing that mechanism through command, domain, or service contracts.
- The CLI constructor binds the command object's options and `run`. A dependency factory receives
  full public options by value and returns a pointer to a public capability-and-shutdown bundle.
  External command tests use generated factory/capability mocks from a `mocks` subpackage to run
  the actual CLI action, proving defaults/input mapping, output and write failures, construction
  failure, cancellation, and cleanup with joined failures. Production graph construction stays lazy.
- The executor follows an outside-in owner sequence with generated gomock capabilities and direct
  command, service, repository, and graph tests. `go test ./...` passes in the final workspace.
- The implementation adds no usecase, generic filesystem facade, generated-code edit, or unrelated
  domain rewrite.

## Runtime: generated HTTP auth and health lifecycle

### Request

Build a small Go order-approval HTTP application from the provided empty module with
`POST /orders/{id}/approve`. The operation requires bearer authentication. Map verified credentials
to a typed actor with tenant identity; the service loads the order and authorizes tenant ownership.
Return 401 for missing/invalid credentials, 403 for an
authenticated cross-tenant actor, 404 for a missing order, 409 for an invalid state transition, and
200 with the approved order on success without leaking internal causes. Propagate request
cancellation. When config enables it, run a separate health server at the configured listen address
with cheap liveness and database-backed readiness. Database failure must make readiness fail while
liveness remains healthy. Compose owned resources and graceful shutdown through go-libs DI and
lifecycle. Add direct owner tests and finish with the repository's generation checks and
`go test ./...`.

### Setup

Start in a fresh workspace containing `go.mod` with `module example.com/orders`, a supported Go
directive, and `notes.txt` containing `handwritten sentinel`. Devctl, Go, mise, protoc, and the local
`/Users/ethernity/workspace/go-libs` checkout are available. Provide the target skill and its
references, outside-in-tdd, simplify-code, devctl, and devctl-openapi. No live database or external
identity provider is required; use an owned in-process adapter suitable for deterministic tests.

### Success criteria

- Tool evidence shows manifest/contract work and a successful real `devctl gen http`; generated
  output matches configured paths, remains unedited, and `notes.txt` is unchanged.
- The executor chooses OpenAPI and strict generation without an explicit request for either. The
  handwritten controller satisfies the generated StrictServerInterface with a compile-time
  assertion and uses generated request/response types. The assembled router connects that controller
  through the generated strict adapter and registration, with no parallel application-route handlers.
- HTTP owns credential verification, actor mapping, request validation, status/Problem Details, and
  one server telemetry boundary. Service owns tenant authorization and transition policy through a
  consumer-owned repository capability.
- Public HTTP tests exercise that assembled strict pipeline and prove 401/403/404/409/200 behavior,
  safe responses, typed actor handoff, and cancellation. Service tests separately prove authorization;
  graph/runtime tests prove optional health resolution, liveness/readiness meaning, rollback, and
  common graceful shutdown.
- Health uses go-libs/health and healthserver. Tests prove the management listener uses its configured
  address, disabled health acquires no listener, and database failure changes readiness without
  making liveness run dependency checks. The listener's network access is an explicit application
  choice; no gRPC health or profiling server is added to this HTTP-only request.
- The final generated and handwritten packages compile and `go test ./...` passes. Missing generator
  tooling is a failed case rather than an accepted unrun result.

## Existing HTTP API with a shared registration boundary

### Request

Plan a change to an existing Go application: add an optional `source` query filter to
`GET /events`, which returns an SSE stream. Preserve its `Cache-Control: no-cache` header, initial
comment, periodic heartbeat, flushing, and cancellation. Existing JSON and image-download
operations must retain their behavior. Show the proposed transport, contract, and wiring changes
and relevant tests. Keep this a design task: do not edit the application or run generation.

### Setup

Use a fresh disposable workspace with the following raw project facts. All application routes are
in one canonical OpenAPI contract. Its generator config enables `echo5-server`, `strict-server`,
and `embedded-spec`. Generated output contains an ordinary ServerInterface, a full
StrictServerInterface, NewStrictHandler accepting the complete StrictServerInterface and returning
ServerInterface, and RegisterHandlers registering every operation together; there is no per-operation
registration helper. Existing handwritten Server implements only ServerInterface, uses framework
contexts, and is passed directly to RegisterHandlers. Strict StreamEvents accepts context.Context
and a generated request object and returns StreamEventsResponseObject; its visitor accepts
http.ResponseWriter. The generated SSE success response supports an io.Reader and flushing but
does not set Cache-Control. JSON and image-download operations also have strict request/response
types. No wider API migration has been requested. Supply the current target skill and references;
no live services or generated artifacts are required for this design task.

### Success criteria

- The design identifies that ordinary ServerInterface conformance and generated registration are
  insufficient for the changed application operation. Its target uses StrictServerInterface,
  generated request/response objects, a compile-time assertion, and the generated strict pipeline.
- SSE remains inside the strict contract. A response visitor or equivalent generated-response
  implementation preserves the header and streaming guarantees without a separate manual route.
- The executor identifies the shared full-interface/registration boundary, explains the required
  wider migration, and requests agreement before expanding scope. It neither silently migrates all
  existing operations nor offers an ordinary-interface or direct-route fallback as completion.
- The design calls for HTTP tests through the assembled generated strict pipeline and preserves
  existing JSON/image behavior. It performs no application edits or generation.

## gRPC health publication and probe observers

### Request

Design health integration for an existing Go gRPC application. Readiness depends on a required
database; an optional cache is diagnostic only. Expose process liveness and readiness through the
standard gRPC Health protocol, including streaming status updates. Record health observations with
the application's existing Zap logger and OpenTelemetry meter provider. Show concise composition
and lifecycle sketches and a focused test design for initial state, dependency changes, and
shutdown. Keep this a design task without a complete application or test implementation. HTTP
health and profiling are not requested.

### Setup

Use a fresh disposable workspace with a minimal Go module. The application already constructs a
gRPC server, logger, and meter provider and uses go-libs/di and lifecycle. Provide the target skill
and its references and make the local go-libs checkout available for inspecting health, healthgrpc,
healthzap, and healthotel APIs. No live database, cache, telemetry backend, or generated contract
is needed.

### Success criteria

- Composition uses one go-libs/health probe set with a critical database check and a non-critical
  cache check. Database failure gates readiness; cache failure remains diagnostic; liveness runs
  no dependency checks. Telemetry backend connectivity does not gate application readiness.
- healthzap and healthotel are probe observers using the supplied logger and meter provider.
  Business interfaces stay free of health/telemetry types, and no duplicate telemetry runtime,
  logging owner, or service decorator is introduced for health observations.
- healthgrpc is registered on the existing gRPC server. A lifecycle-owned task publishes status;
  initial watched state is NOT_SERVING until publication. The design distinguishes fresh Check
  evaluation from published Watch/List state and covers subsequent readiness changes.
- Shutdown stops the health service while the gRPC server is still running, allowing watchers to
  receive terminal NOT_SERVING before the server stops. The test design covers publication,
  cancellation, shutdown order, and joined task/resource cleanup without detached goroutines.
- The proposal adds neither a separate HTTP health listener nor a debug server and requires no
  live backend or full implementation to explain the integration.

## CLI overrides and configuration ownership

### Request

Design the startup boundary for an application's `migrate up/down/status` CLI. It has required
`--kind` and repeatable `--dir` selectors, an optional `--url` with `DATABASE_URL` fallback, and
positive `--steps` when supplied. An explicit URL wins over env, including an explicitly empty
value that must produce a configuration error. Help, invalid command syntax, and invalid resolved
configuration must not open a database. Show minimal Go sketches of the command registration,
shared migration flags, startup boundary, configuration resolution, and the point where the migrator
would be constructed. Explain the owning packages and focused tests, including how to test commands
independently and keep parsed flag values independent between commands. No complete CLI, SQL files,
database execution, generated configuration, or TDD-process demonstration is needed.

### Setup

Use a fresh disposable workspace with no application code. Provide the target skill and its
references. The request is a design task; API-specific library implementation and dependency
downloads are unnecessary.

### Success criteria

- Each executable leaf has a private command object with `opts` and `run`, public options, and a
  constructor returning the real CLI command bound to that object. Common migration options are
  embedded by value and create fresh flag bindings for each leaf; groups only register children.
- The CLI captures explicit URL presence before passing full options by value to a dependency
  factory. Omitted `--url` stays unset even when env is populated; explicit empty remains present.
  The production factory maps this to a typed optional override for a deps scenario constructor.
  Environment lookup, precedence, and final configuration validation belong to deps, before any
  database acquisition.
- The factory returns a pointer to a public bundle of infrastructure capabilities and shutdown,
  rather than an executor or an interface forwarding every operation through the container.
  External command tests can import generated factory/capability mocks without private types or cycles.
- The testing plan checks full options/presence at the factory boundary, including omitted versus
  empty with env set, and independent common flag destinations. Deps tests cover env fallback, CLI
  precedence, empty/missing URL, and no resource acquisition on configuration failure. Help, parse
  errors, and invalid command-only values skip the factory; invalid resolved configuration may enter
  the constructor and fail before acquisition. Operation and output remain in the real CLI action,
  with bounded cleanup and joined failures.
- The design preserves these responsibilities without introducing unrelated application layers or
  treating a constructor call itself as database acquisition. TDD sequence is outside this case.

## Runtime: autonomous embedded migration CLI

### Request

Build a small `schemactl migrate up/down/status` application around the supplied SQL. The binary
must run outside its source checkout with its SQL embedded, without a Devctl manifest or loose SQL
files. Select the database kind and migration subdirectories through CLI flags, including `.` for
the whole selected kind's tree. Accept a connection URL through a flag with environment fallback.
Allow bounded up/down; down defaults to one step. Report version and dirty state, and make repeated
unbounded up successful. Execute SQLite now; the PostgreSQL source is present to exercise source
isolation, without requiring a PostgreSQL server. Add focused tests, build the binary, and verify
the real CLI from a separate directory. Keep this an infrastructure command without unrelated
application features, SQL creation, or recovery commands. Finish with `go test ./...` and `go vet ./...`.

### Setup

Start in a fresh workspace with `module example.com/schemactl`, a supported Go directive, and no
application Go code. Prepare these raw SQL files:

| Path | SQL |
| --- | --- |
| `migrations/sqlite/common/1_entries.up.sql` | `CREATE TABLE entries (id INTEGER PRIMARY KEY, name TEXT NOT NULL);` |
| `migrations/sqlite/common/1_entries.down.sql` | `DROP TABLE entries;` |
| `migrations/sqlite/dev/2_seed.up.sql` | `INSERT INTO entries (id, name) VALUES (1, 'dev');` |
| `migrations/sqlite/dev/2_seed.down.sql` | `DELETE FROM entries WHERE id = 1;` |
| `migrations/postgres/common/1_kind.up.sql` | `CREATE TYPE migration_kind AS ENUM ('postgres');` |
| `migrations/postgres/common/1_kind.down.sql` | `DROP TYPE migration_kind;` |

Provide the target skill and its references, outside-in-tdd, simplify-code, and their required
resources. Make the local go-libs checkout available for API inspection and module replacements
when available; otherwise resolve published modules. Pin compatible dependencies in the disposable
module. No live server, deployment, or changes to go-libs/Devctl are required.

### Success criteria

- The implementation follows the target migration CLI contract: kind/root selection, both repeat
  and comma `--dir` forms, explicit directories, URL flag over env with presence preserved, positive
  step counts, `down` defaulting to one, and successful version/dirty status including unset version.
- Independently run the built binary from a directory containing no manifest or loose SQL, using
  separate disposable databases for distinct directory selections. `common` creates an empty
  `entries` table at version 1; `common` plus `dev` creates one seed row at version 2. `--dir .`
  reaches that same version and row without selecting PostgreSQL SQL. Inspect actual schema/data.
- Repeat unbounded up successfully. Default down removes the seed while retaining the table;
  a further down removes the table. Status reflects each operation. Check bounded up, missing
  required flags, unsupported kind, invalid steps, and missing/escaping directories. Help and
  invalid CLI input do not acquire a database. CLI URL precedence and explicit empty values work.
- Code inspection shows an owned migration scenario, embedded kind roots and selected adapters,
  cleanup with joined failures, and no manifest/disk-SQL lookup, API runtime, business-layer
  scaffolding, or automatic schema application on unrelated startup paths.
- The executor follows the required owner test cycles, and the final `go test ./...` and
  `go vet ./...` pass. PostgreSQL/ClickHouse runtime checks are outside this SQLite case.

## Runtime: Kafka retry, DLQ, and idempotency

### Request

Build a small Go order-event consumer from the provided empty module. Define a canonical contract
for an `order.approved` message with `event_id`, `order_id`, and `tenant_id`, configure a named Kafka
consumer in `devctl.yaml`, and generate the Go message contract with the installed Devctl CLI. The
consumer maps generated messages to a domain command and invokes an idempotent service operation.
Malformed messages go directly to DLQ. An unavailable dependency is retried at most three times and
then goes to DLQ. A known duplicate is acknowledged without repeating the side effect. Context
cancellation stops processing without acknowledgement or DLQ publication. Keep broker mechanics in
transport/client adapters, business idempotency in service, and persistence mechanics in repository.
Add direct owner tests and finish with generation checks and `go test ./...`.

### Setup

Start in a fresh workspace containing `go.mod` with `module example.com/orderconsumer`, a supported
Go directive, and no application source. Devctl, Go, mise, protoc, and the local
`/Users/ethernity/workspace/go-libs` checkout are available. Provide the target skill and its
references, outside-in-tdd, simplify-code, and devctl. No running broker or database is required;
use deterministic adapter fixtures around the generated contract and selected go-libs APIs.

### Success criteria

- Tool evidence shows a valid manifest, canonical message input, and successful real
  `devctl gen kafka`. Generated output stays inside configured paths and is not hand-edited.
- The consumer owns decode, acknowledgement, retry/drop/DLQ classification, cancellation, and safe
  metadata logging. The service owns duplicate detection and the business side effect; its consumed
  repository capability uses domain types.
- Direct tests prove malformed-to-DLQ, three bounded retries then DLQ, duplicate acknowledgement
  without a repeated effect, success acknowledgement, identifier propagation, and cancellation
  without ack/DLQ. Service and repository tests prove idempotency independently of Kafka offsets.
- The final generated and handwritten packages compile and `go test ./...` passes. Missing generator
  tooling is a failed case rather than an accepted unrun result.

## PostgreSQL integration fixtures with optional external connection

### Request

Design the integration-test setup for a small Go application that uses PostgreSQL through pgx/v5.
Cover repository persistence and its embedded SQL migration runner. Developers should be able to
run the tests without preparing a database manually, or opt into an already running local
PostgreSQL with a DSN. Include package/test layout, fixture lifetime, commands, and failure behavior.
Keep this a concise design; do not implement the application or test harness.

### Setup

Use a disposable workspace with `go.mod` declaring `module example.com/catalog` and Go 1.26.0.
A minimal `compose.yaml` declares a PostgreSQL service using `postgres:17-alpine`.
The existing `.mise.toml` has only a lint task running `golangci-lint run ./...`.
There is no integration-test convention yet. Repository tests also need cross-connection
PostgreSQL notifications. No live service is needed for this design case.

### Success criteria

- The proposal exercises repository and migration mechanics against real PostgreSQL, with
  Testcontainers as the default provisioning mechanism and the requested external DSN option.
- Ordinary tests need no running external service. A separate integration tag and uncached task
  are introduced using the existing task runner; tagged test files are covered by static analysis.
- Explicit external selection has clear failure behavior: an invalid/unreachable endpoint fails
  setup without switching to a container. A missing required service never becomes a successful Skip.
- Fixtures own and clean up only their own data and resources, including partial startup failures;
  cleanup is bounded independently of the cancelled test/startup context and errors fail the run.
- Isolation accounts for PostgreSQL notifications being database-wide; schema separation alone is
  not claimed to isolate notification traffic. Shared services and per-test data have explicit
  lifetimes, while migration behavior remains owned by the application.
- The design uses the supplied project image/task context and introduces only local helpers needed
  by the proposed fixtures, without requiring a shared public library or a universal test framework.

## Preserve an existing external PostgreSQL integration workflow

### Request

Extend the test strategy for an existing Go service with PostgreSQL integration tests. Keep its
CI and developer workflow. Show the small changes needed to add transactional rollback coverage
and verify the tagged test files. Explain how a failed database connection affects the run.
Provide a design and commands, not an implementation.

### Setup

Use a disposable workspace with `go.mod` declaring `module example.com/orders` and Go 1.26.0.
The existing PostgreSQL integration test is tagged `dbintegration` and connects through
`APP_TEST_POSTGRES_DSN`; missing or invalid configuration fails the test.
A Makefile defines `test` as `go test ./...`, `test-db` as
`go test -count=1 -tags=dbintegration ./...`, and `lint-db` as
`golangci-lint run --build-tags=dbintegration ./...`.
CI provisions PostgreSQL with `postgres:16-alpine`, supplies the DSN, and runs `make test-db`.
There is no mise configuration or Testcontainers dependency. No live service is needed for this
strategy case.

### Success criteria

- The existing build tag, Makefile commands, DSN selection, and CI-provided PostgreSQL remain the
  selected workflow. The proposal adds no mandatory Testcontainers setup, new task runner, or tag
  migration merely to follow defaults for new projects.
- The new rollback scenario uses real PostgreSQL and observes that neither related write persists
  after failure; service decisions remain testable through their own capability contracts.
- The normal and integration test entrypoints remain separate; `make test-db` and `make lint-db`
  are used for the affected suite and tagged-file analysis.
- Database connection/setup failure remains a failed run, without a successful Skip or automatic
  provisioning fallback. Test data and connections have explicit isolation and cleanup ownership.
- The executor provides the requested scoped design and commands without rewriting unrelated
  application code, CI, or deployment configuration.
