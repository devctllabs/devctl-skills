---
name: devctl-go
description: Architect Go services and libraries. Use when creating, organizing, refactoring, or reviewing Go code involving package boundaries, domain/service/usecase behavior, repositories or outbound integrations, HTTP/gRPC/Kafka/CLI delivery, dependency wiring/configuration/lifecycle, tests/tooling/generated contracts, or Go deployment and monorepo packaging.
---

# Devctl Go

Structure Go services and libraries around explicit ownership, inward dependencies, thin runtime
entrypoints, testable behavior, and Go-native tooling.

## Workflow

1. Inspect `go.mod`, `go.work`, source and test layouts, generated boundaries, migrations,
   entrypoints, repository commands, frameworks, tooling, and public APIs. Complete inspection when
   repository type, established ownership, generated files, and verification commands are known.
2. Read `references/code-principles.md` completely before planning or changing handwritten Go.
   Before planning or editing handwritten production behavior, you must invoke `$outside-in-tdd`,
   read its `SKILL.md` completely, and follow it as the controlling workflow. If it is unavailable,
   stop and report the missing required skill; do not reproduce its workflow locally. Read
   `references/testing-strategy.md` only for Go-specific owner suites, assertions, doubles, and
   checks. When an owner test isolates an injected interface, also read
   `references/gomock-unit-tests.md`.
3. Give `$outside-in-tdd` the highest affected caller-visible owner and its narrow Go command. For a
   multi-layer feature, map ownership from outside to inside as
   `cmd/transport -> usecase/service -> repository/client -> deps`; for an explicitly layer-only
   task, start at that requested layer. Treat a caller-visible domain operation backed by adapter
   I/O as service-spanning even when an existing method only delegates.
4. Read `references/project-structure.md` completely only when creating an application, classifying
   an unstructured scaffold, or changing ownership. Then read only the active owner reference from
   the router. Do not preload implementation references for lower layers merely because the final
   feature will eventually use them.
5. Follow the active owner through `$outside-in-tdd`. Finish its Go-specific suites with generated
   gomock mocks before descending when dependencies are injected interfaces. Read the next owner or
   cross-cutting reference only when a completed upper boundary demands that responsibility.
6. Preserve coherent established conventions unless the user asks to standardize. For new or
   unstructured applications, apply the normative responsibility map from `project-structure.md`.
   Keep dependencies inward:
   `transport/entrypoint -> usecase/service -> consumer-owned interfaces -> concrete adapters`.
   Keep domain and business packages independent of frameworks, drivers, SDKs, and generated DTOs.
   Complete implementation when direct owner suites and dependency checks prove those boundaries.
7. Use `$devctl` for manifests and Devctl operations, `$devctl-openapi` for OpenAPI contracts, and
   `$devctl-react-vite` for UI or generated-client work. Complete the task only after repository
   commands, relevant generated/contract checks, and every changed owner suite pass.

## Reference Router

Use this router just in time. Select the reference for the currently active owner, read it fully,
complete that owner's behavior under `$outside-in-tdd`, and only then select a demanded lower or
cross-cutting reference. Never treat the router as an upfront reading checklist.

For `github.com/devctllabs/go-libs/*` dependencies, first inspect the version selected by the
application's `go.mod` and `go.work`, then run `go doc -all <import-path>`. Package documentation
owns library API semantics; this skill owns application placement and composition. When executable
sample code is needed, also inspect that module's `example_test.go`, because the `go doc` CLI does
not render Go examples.

### Architecture layers

- Read `references/domain.md` for models, value objects, invariants, operation contracts, domain
  errors, shared domain types, naming, and domain tests.
- Read `references/service.md` for business operations, consumer-owned dependency interfaces,
  `go-libs/txmanager` scope, service implementations, error propagation, and service tests.
- Read `references/usecase.md` for optional multi-service flows, orchestration, retries,
  compensations, flow contracts, and usecase tests.
- Read `references/repository.md` for databases, caches, filesystems, object storage, storage
  mapping, migrations, transaction-aware context use, error normalization, and repository tests.
- Read `references/client.md` for outbound HTTP/gRPC/SDK/subprocess integrations, producers,
  protocol mapping, timeouts, retries, error normalization, and client tests.

### Delivery and runtime

- Read `references/transport.md` for common inbound DTO, validation, mapping, error, registration,
  middleware-boundary, and transport-test rules. Also read the selected protocol reference.
- Read `references/transport-http.md` for HTTP handlers, routers, generated HTTP contracts,
  Problem Details/status mapping, and HTTP tests.
- Read `references/transport-grpc.md` for generated gRPC service aggregation, handlers,
  interceptors, status/details mapping, registration, and gRPC tests.
- Read `references/kafka-and-messaging.md` for Kafka consumers, producers, retry/DLQ policy,
  idempotency keys, outbox decisions, compatibility, and messaging tests.
- Read `references/cmd.md` for `urfave/cli`, root/group/leaf commands, help, `main`, `api`,
  `consumer`, `cronjob`, command errors, and command tests.
- Read `references/dependency-wiring.md` for `internal/deps`, `go-libs/di`, provider-file ownership,
  grouped registrations, named dependencies, scenario roots, typed getters, and wiring smoke tests.
- Read `references/configuration-and-secrets.md` for runtime configuration, precedence, generated
  config, validation, typed config, secret redaction, and reload policy.
- Read `references/lifecycle-and-concurrency.md` for context ownership, signals, timeouts,
  `errgroup`, goroutines, cancellation, shutdown order, and lifecycle tests.

### Cross-cutting concerns

- Read `references/validation.md` for protocol, business, and persistence validation ownership and
  validation error flow.
- Read `references/cross-cutting-behavior.md` for middleware, service/usecase decorators, cache,
  idempotency, helpers, and wrapper composition.
- Read `references/auth-and-access-control.md` for authentication, authorization, actors,
  principals, policy dependencies, tenant/resource scoping, and access tests.
- Read `references/observability-and-health.md` for zap logging, metrics, tracing, health,
  readiness/liveness, debug endpoints, pprof, and observability tests.
- Read `references/io-boundaries-and-platform.md` for values versus capabilities, filesystem and
  subprocess boundaries, external I/O, and `internal/platform` ownership.

### Variants, contracts, and tooling

- Read `references/library-packages.md` for reusable public package APIs, dependency seams,
  single-library repositories, multi-library monorepos, state, and library tests.
- Read `references/go-generate.md` before adding or changing a `go:generate` directive, declaring
  a generator tool dependency, or migrating an existing generator invocation.
- Read `references/devctl-yaml-integration.md` when `devctl.yaml`, generators, sources,
  components, contract inputs, generated output, or compatibility affect the work.
- Read `references/gomock-unit-tests.md` for gomock/mockgen use, directives, mock packages,
  package boundaries, and fake-to-gomock migrations.
- Read `references/quality-tooling.md` for formatting, static analysis, module hygiene,
  complexity, dependency checks, and quality adoption.
- Read `references/deployment-and-packaging.md` for Docker, Compose, Helm, Kubernetes, deployment
  configuration, secrets, probes, and rollout packaging.
- Read `references/monorepo-and-ui.md` for Go plus UI layouts, module placement, API contracts,
  generated clients, root tooling, and Docker build contexts.

## Non-Negotiable Defaults

- For a multi-layer feature, complete the highest caller-visible owner with generated gomock mocks
  for injected interfaces before implementing lower layers. Dependency direction is not
  implementation order.
- Route caller-visible domain operations through service/usecase before repository/client. Do not
  satisfy a command or transport application capability directly with a concrete adapter.
- Create only packages with current responsibilities; every present responsibility has one owner.
- Put behavioral interfaces at the consumer side, except for the canonical shared
  `github.com/devctllabs/go-libs/txmanager.Manager`/`Managers` contract. Keep data, configuration,
  options, `context.Context`, path values, and pure helpers concrete.
- Name every input parameter of every handwritten interface method, including `ctx`. Give every
  interface method a doc comment beginning with its method name; describe semantically non-obvious
  parameters by name. Do not hand-edit generated interfaces solely to satisfy this rule.
- Use `github.com/stretchr/testify/require` for assertions in every new or changed test. Use
  generated `go.uber.org/mock/gomock` mocks for every injected interface dependency in unit tests;
  do not replace them with handwritten fakes, stubs, spies, or callback structs.
- For new provider packages, return exported concrete implementations from constructors: `Service`,
  backend/role-specific `...Repo`, and flow-specific `...Uc`. Keep their fields private and do not
  replace them with provider-owned layer interfaces. Preserve established public APIs unless the
  task explicitly changes them.
- Keep fixed-field handwritten boundaries typed. Use maps only for genuinely dynamic key spaces.
- Classify repository failures as a domain category plus retained raw cause; map only the domain
  category and approved facts to protocol responses. Normalize other adapter failures at their
  owning boundary. Preserve `errors.Is` and `errors.As`.
- Put construction and lifecycle in `internal/deps`; keep `cmd` entrypoints thin. Give each present
  dependency family one snake_case owner file and one private `provideX` entrypoint; let scenario
  constructors invoke those groups explicitly and expose only eagerly resolved runtime roots.
- Keep generated output behind the discovered generated boundary and never hand-edit it.
- Keep tests beside behavior owners. One cross-layer test does not replace direct owner suites.
