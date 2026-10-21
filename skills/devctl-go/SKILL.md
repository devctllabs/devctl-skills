---
name: devctl-go
description: Architect Go services and libraries. Use when creating, organizing, refactoring, or reviewing Go code involving package boundaries, domain/service/usecase behavior, repositories, outbound integrations, delivery adapters, dependency wiring, runtime, tests, generated contracts, or deployment packaging.
---

# Devctl Go

Keep application meaning in business owners and external mechanics in concrete adapters. Use the
smallest implementation that preserves those boundaries.

## Workflow

1. Inspect the requested behavior, callers, `go.mod`/`go.work`, current owners, generated paths,
   migrations, entrypoints, repository commands, tooling, public APIs, and current changes. Finish
   inspection when the affected owner, established boundaries, generated files, and verification
   commands are known.
2. Identify the target application and its existing skeleton. When the request leaves multiple
   plausible application targets, or project status or scaffold applicability is uncertain,
   explicitly ask the user before scaffolding or creating Go files. Before creating handwritten
   Go files for a new application without a code skeleton, follow `$devctl` to prepare or reuse
   `devctl.yaml` and successfully run `devctl init scaffold`. A `go.mod`, documentation, or manifest
   alone is not a code skeleton. Existing application skeletons, reusable libraries, and
   architecture-only work do not require this bootstrap. If scaffold is unavailable or fails,
   report the result and ask how to proceed before writing handwritten Go code.
   After successful scaffold, re-inspect the generated owners, entrypoints, managed paths,
   tooling, and repository verification commands before starting handwritten work.
3. For handwritten behavior, read and follow `$outside-in-tdd` as the controlling process. Give it
   the highest affected caller-visible owner and a narrow Go test command. For a multi-layer feature,
   progress `cmd/transport -> usecase/service -> repository/client -> deps`, completing each owner
   before descending. If the required process skill is unavailable, stop and report it.
4. Read only the references whose branch is active. Finish the current owner before loading a
   lower-layer reference merely because the feature may eventually reach it.
5. Preserve coherent existing boundaries and public APIs unless migration or standardization is
   requested. Apply the ownership map normatively to new or unstructured applications; new
   independent application error contracts follow domain ownership in existing applications too.
6. Delegate manifests, sources, contract lint, scaffold, and generation to `$devctl`; OpenAPI
   content to `$devctl-openapi`; and UI implementation to `$devctl-react-vite`. Return here for
   handwritten Go placement, mapping, policy, and runtime work. Generated output remains owned by
   its source contract and generator.
7. Finish when every changed owner suite passes, applicable generation and contract drift checks
   pass, imports still point inward, runtime resources have explicit cleanup, and unavailable checks
   are reported separately.

## Reference router

- Read [boundaries](references/boundaries.md) before changing domain, service, usecase, repository,
  client, validation, transaction, error, or I/O ownership.
- Read [delivery](references/delivery.md) before adding or changing any HTTP endpoint, even when
  the request does not mention OpenAPI, or changing gRPC, Kafka, authentication, authorization,
  middleware, cache, idempotency, or protocol error behavior.
- Read [runtime](references/runtime.md) before changing configuration, secrets, dependency wiring,
  lifecycle, concurrency, logging, telemetry, health, or debug facilities.
- Read [CLI](references/cli.md) before designing or changing command trees, executable leaves,
  command dependency factories, or CLI tests.
- Read [migrations](references/migrations.md) before adding SQL migrations or implementing an
  application's migration command, embedded SQL selection, or schema compatibility changes.
- Read [stack and generation](references/stack-and-generation.md) before selecting `go-libs`
  modules or SQL builders, or changing Devctl-managed contracts, generators, or quality tooling.
- Read [libraries](references/libraries.md) for reusable public packages, multiple Go modules,
  caller-owned composition, or library lifecycle.
- Read [packaging and monorepos](references/packaging-and-monorepos.md) for Docker, Compose, Helm,
  Kubernetes, Go-plus-UI layout, build contexts, or deployment runtime scenarios.

For a selected `github.com/devctllabs/go-libs/*` dependency, inspect the version in `go.mod` and
`go.work`, run `go doc -all <import-path>`, and read its `example_test.go` when executable usage is
needed. Library documentation owns API semantics; these references own application decisions.

## Ownership

These responsibilities do not require every package in every project.

| Owner | Application placement | Owns |
| --- | --- | --- |
| Domain | `internal/domain/<area>` | Vocabulary, values, pure invariants, operation data, error categories |
| Service | `internal/service/<area>` | Business operations, policy, transitions, queries, adapter orchestration, transaction scope |
| Usecase | `internal/usecase/<flow>` | A cohesive flow coordinating independent service capabilities |
| Repository | `internal/repository/<area>` | DB/cache/files/object storage mechanics, layout, codecs, locking, atomic writes |
| Client | `internal/client/<system>` | Outbound HTTP/gRPC/Git/SDK/subprocess/message protocols |
| Transport | `internal/transport/<protocol>` | Inbound decoding, protocol validation/authentication, mapping, response/error encoding |
| CLI | `cmd/<app>/internal` | Command input/output and execution of one application capability |
| Composition | `internal/deps` | Config, concrete construction, resource ownership, runtime roots, cleanup |

**Policy follows meaning.** Rules that survive an HTTP, Git, SQL, or filesystem replacement belong
in domain/service/usecase. Adapters execute those rules using backend mechanics. Services own query
defaults, allowed selection, aggregation meaning, freshness, and business validation; adapters own
protocol shape, storage integrity, containment, and race-safe enforcement.

**Orchestration follows the operation.** A service may coordinate several repositories and clients.
Steps, retries, and compensation alone do not require a usecase. Add a usecase when one flow
coordinates independently meaningful service capabilities; it consumes service contracts rather
than repositories or clients.

**A seam is a capability.** Put narrow behavioral interfaces in the calling package and domain data
in domain packages. Name capabilities such as `LoadPackage`, `Checkout`, or `Publish`; keep raw OS,
SQL, SDK, driver, and generated contracts inside concrete adapters. Keep configuration, paths,
`context.Context`, data values, and pure helpers concrete.

**Dependencies point inward.** Domain imports no application layers. Business owners import no
concrete adapters, delivery, DI, drivers, SDKs, or generated protocol DTOs. Transports consume
business capabilities. Repository and client implementations do not import each other. Wiring may
import concrete implementations to compose the graph.

## Go contracts

- Keep commands, queries, results, views, and filters in `domain/<area>`. Use named fixed-field
  types and maps only for genuinely dynamic keys.
- Keep caller-actionable application error contracts (sentinels, typed errors, stable categories)
  in domain packages; follow [error contracts](references/boundaries.md#error-contracts) for
  placement and growth.
- Map transport DTOs, storage rows, SDK types, and generated messages at their adapter boundary.
- Normalize adapter failures into caller-actionable domain categories while retaining causes and
  preserving `errors.Is`/`errors.As`. Add useful call context with `%w`; expose only approved facts
  at protocol boundaries and log each returned error once at its highest outcome boundary.
- Constructors return exported concrete implementations with private fields. Required behavioral
  dependencies are explicit constructor parameters; cohesive values use typed config; options are
  for real optional overrides. Preserve established public APIs.
- Name every handwritten interface input, including `ctx`. Give each interface method its own
  Go doc comment immediately above its declaration, starting with the method name and explaining
  non-obvious guarantees, parameters, side effects, or stable errors.
- In new or changed handwritten code, document exported types, functions, and concrete methods
  with concise Go doc comments starting with the declared name and explaining their contract.
  Document fields and unexported declarations when their semantics need explanation, such as
  units, zero values, invariants, side effects, resource ownership, or concurrency guarantees.
- Pass cancellation through blocking operations. Give each goroutine a lifetime and join owner.

## Go verification

Use `testify/require` for new or changed assertions and generated `go.uber.org/mock/gomock` mocks
when isolating injected interfaces. Keep mocks under the consumer's `mocks` package and change
generator inputs rather than generated output. Test business decisions through capability mocks,
adapter mechanics through real economical fixtures, and DI through a real graph.

Run applicable repository format, lint, and test commands with project-owned tool versions before
completion; available checks must pass. When no repository commands exist, format changed
handwritten files and run `go test ./...`. Run standalone `go vet ./...` when configured static
analysis does not already cover its checks. Add focused race checks for concurrency changes and
run applicable module, contract, and generation drift checks. Existing tests count; passive types
and absent layers do not need symmetry tests.

### Integration tests

- Preserve established tags, commands, and infrastructure. For a new container-backed suite, use
  Testcontainers and `//go:build integration`. Take image versions and endpoints from project configuration.
- Keep ordinary `go test ./...` independent of running external services. An explicit integration
  run fails when a required service cannot be reached or provisioned.
- Support external endpoints when the project needs them. An explicitly supplied endpoint selects
  that service; connection failure ends setup rather than falling back to a container.
- Isolate test-owned data using backend-appropriate schemas, databases, or collections. PostgreSQL
  schemas leave advisory locks and notification channels database-wide: namespace keys/channels,
  filter events by test identity, or use separate databases where needed.
- Give fixtures explicit resource ownership and bounded cleanup independent of test/startup
  cancellation, including partial setup. Surface cleanup failures as test failures.
- Consolidate repeated setup in project-local helpers. Match shared fixtures to their required
  lifetime, using `TestMain` for package resources and `t.Cleanup` for test resources.
- Provide uncached integration-test and tagged-file static-analysis commands; connect them to
  the project's task runner when present, including in test designs. Run the affected commands
  when implementing.
