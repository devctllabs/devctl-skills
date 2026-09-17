# devctl-go scenarios

These cases evaluate application/library architecture and selected runtime behavior. Inspect package
ownership, imports, contracts, composition, and generator handoffs. Design cases do not require a
complete executable; cases prefixed `Runtime:` require their stated generated output, owner tests,
and final Go checks. Use `skill-creator-evals` for execution and reporting. Provide the target skill and its
references, devctl, and devctl-openapi as accessible resources. Run each case in
a fresh disposable workspace. Executors receive Request and raw Setup inputs, not this document
or its Success criteria. These are verification tasks and must not launch recursive skill evals.

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
workspace. Use its Go version and tool declarations; the local go-libs checkout may supply API
documentation and workspace resolution. Provide `skills/devctl-go/SKILL.md`,
outside-in-tdd, simplify-code, and every reference they require. Dependency availability is a
preflight requirement.

### Success criteria

- Independently invoke help, invalid input, a first create, a duplicate create, and a traversal
  attempt. Help/invalid input never build runtime; the first result is readable JSON; duplicate and
  traversal failures preserve all existing bytes and remain inside root.
- CLI, service, filesystem repository, and composition are separate owners. The service declares
  its semantic repository capability; the concrete repository uses go-libs/filesystem without
  exposing that mechanism through command, domain, or service contracts.
- The executor follows an outside-in owner sequence with generated gomock capabilities and direct
  command, service, repository, and graph tests. `go test ./...` passes in the final workspace.
- The implementation adds no usecase, generic filesystem facade, generated-code edit, or unrelated
  domain rewrite.

## Runtime: generated HTTP auth and health lifecycle

### Request

Build a small Go order-approval HTTP application from the provided empty module. Define a canonical
OpenAPI contract for `POST /orders/{id}/approve`, configure it in `devctl.yaml`, and run the installed
Devctl generator rather than writing generated server code by hand. The operation requires bearer
authentication. Map verified credentials to a typed actor with tenant identity; the service loads
the order and authorizes tenant ownership. Return 401 for missing/invalid credentials, 403 for an
authenticated cross-tenant actor, 404 for a missing order, 409 for an invalid state transition, and
200 with the approved order on success without leaking internal causes. Propagate request
cancellation. When config enables it, run a separate health server with cheap liveness and
database-backed readiness. Compose owned resources and graceful shutdown through go-libs DI and
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
- HTTP owns credential verification, actor mapping, request validation, status/Problem Details, and
  one server telemetry boundary. Service owns tenant authorization and transition policy through a
  consumer-owned repository capability.
- Public HTTP tests prove 401/403/404/409/200 behavior, safe responses, typed actor handoff, and
  cancellation. Service tests separately prove authorization; graph/runtime tests prove optional
  health resolution, liveness/readiness meaning, rollback, and common graceful shutdown.
- The final generated and handwritten packages compile and `go test ./...` passes. Missing generator
  tooling is a failed case rather than an accepted unrun result.

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
