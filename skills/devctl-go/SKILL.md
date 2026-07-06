---
name: devctl-go
description: Use when creating, organizing, refactoring, or reviewing Go services, reusable libraries, and packages, including library package API design, multi-library monorepos, internal/domain, internal/service, optional internal/usecase, repositories, outbound clients, HTTP/gRPC/Kafka transport adapters, internal/deps dependency injection, configuration, secrets, migrations, observability, auth/access control, testing strategy, gomock/mockgen unit tests, contract compatibility, messaging, zap logging, cmd entrypoints, existing devctl.yaml project context, graceful shutdown, validation boundaries, cross-cutting decorators, package naming, generated-code boundaries, Go plus UI monorepo layout, Dockerfile placement, Docker Compose local infrastructure, Helm charts, and Kubernetes deployment packaging.
---

# Devctl Go

Use this skill to structure Go services and reusable libraries with explicit architectural layers, dependency direction, DI ownership, runtime entrypoints, and testable package boundaries.

## Workflow

1. Inspect the existing Go module before recommending changes: `go.mod`, `go.work`, `devctl.yaml` when present, `cmd/`, `internal/`, generated-code directories, `api/`, `ui/`, codegen config, config loading, DI, logging, transport adapters, tests, root scripts/tooling, current package naming, and public library APIs.
2. Preserve local conventions when they are consistent, actively used, and do not conflict with the requested change. Apply these references when the project has no established convention or when the user asks to standardize around this structure.
3. Keep dependency direction inward: `transport -> usecase/service -> repository/client interfaces`; concrete `repository`, `client`, and `platform` implementations are wired in `internal/deps`.
4. Keep business code free of runtime construction details. `cmd/` starts scenarios through `internal/deps`; services consume interfaces and domain contracts; repositories and clients normalize infrastructure errors into domain categories.
5. Use `$devctl` for creating or editing `devctl.yaml`, running `devctl` CLI commands, enabling components, or regenerating Devctl-managed artifacts. This skill only consumes manifest context for Go implementation.
6. Load only the references needed for the task. Do not load every reference by default.
7. Validate with `gofmt` and the Go tests/checks that exist in the repo for changed code. Do not update generated code unless the user asks.

## References

- Read `references/overview-and-naming.md` for the layer model, directory responsibilities, package split rules, operation type naming, import aliases, and compact `Order` example.
- Read `references/code-principles.md` when writing, refactoring, or reviewing handwritten Go code, especially when choosing interfaces, helpers, package boundaries, DI seams, or abstraction level.
- Read `references/library-packages.md` when designing, reviewing, or refactoring reusable Go libraries, public package APIs, constructor dependency seams, SOLID library boundaries, single-library repos, or multi-library monorepos.
- Read `references/devctl-yaml-integration.md` when a repo has `devctl.yaml` or when generated directories, config fields, runtime components, clients, consumers, producers, contract inputs, generated output, custom codegen paths, or API/message compatibility may come from a devctl manifest or codegen config.
- Read `references/domain.md` when adding or changing domain models, commands, queries, views, shared domain types, errors, import rules, or `internal/domain/common`.
- Read `references/service-and-usecase.md` when implementing business operations, service interfaces, dependency interfaces, transactions, DI-local service assembly, service tests, or optional usecase flows.
- Read `references/adapters-and-transport.md` when adding repositories, migrations, storage schema changes, outbound clients, producers, HTTP/gRPC handlers, Kafka consumers, message idempotency, retries, DLQ, outbox behavior, DTO mappers, or transport error mapping.
- Read `references/validation-and-crosscutting.md` for validation ownership, middleware, service/usecase decorators, idempotency, cache, helpers, and wrapper composition.
- Read `references/runtime-and-wiring.md` when changing `cmd/<app_name>`, CLI subcommands, `api`, `consumer`, `cronjob`, `internal/deps`, `samber/do`, generated config loading, `internal/config`, secrets, redaction, config reload, typed getters, provider split, lifecycle/shutdown, context propagation, timeouts, goroutine ownership, `errgroup`, cancellation, runtime errors, or dependency getters.
- Read `references/auth-and-access-control.md` when adding authentication, authorization, actor/principal handling, tenant/resource access checks, policy dependencies, or auth-related service/usecase signatures.
- Read `references/testing-strategy.md` when adding or reviewing tests across domain, service, usecase, repository, client, transport, generated contract checks, or concurrency-sensitive behavior.
- Read `references/gomock-unit-tests.md` when adding or migrating Go unit tests with generated gomock mocks, mockgen directives, `mocks/` packages, `_test` package boundaries, import-cycle handling, or fake-to-gomock migrations.
- Read `references/observability-and-health.md` when adding logging, zap logger construction/usage, metrics, tracing, health checks, readiness/liveness, debug endpoints, pprof, or observability decorators.
- Read `references/deployment-and-packaging.md` when placing or reviewing root `Dockerfile`, `.dockerignore`, local `docker-compose.yml`, `deploy/local`, Helm charts, Kubernetes workloads, image args, deployment config, secret references, probes, resources, or packaging layout.
- Read `references/monorepo-and-ui.md` when a Go backend lives beside `api/` contracts, a React/Vite `ui/`, root package scripts, generated TypeScript clients, UI build output, or monorepo Docker build-context decisions.

## Default Decisions

- Use `internal/domain`, `internal/service`, `internal/repository`, `internal/client`, `internal/transport`, `internal/deps`, and `internal/platform` as the default service layout.
- Add `internal/usecase` only for multi-step product flows, cross-service orchestration, retries/compensations, or reusable scenarios across transports.
- Put interfaces at the consumer side: service dependency interfaces live in `internal/service/<entity>`, transport handlers may declare narrow local interfaces, and concrete implementations are wired in `internal/deps`.
- Keep `domain` free of SQL, JSON DTO, driver, protocol, and transport tags unless an existing project has a deliberate exception.
- Keep repositories for storage systems only. Put outbound HTTP/gRPC/SDK integrations and producers in `internal/client`.
- Map low-level repository/client failures into domain error categories before they leave the adapter layer; transport maps domain errors to HTTP/gRPC protocol responses.
- Use `*zap.Logger` as the practical concrete logger dependency. Do not introduce a custom logger interface by default.
- Order constructor parameters as `ctx?`, `logger?`, then explicit dependencies and options. Do not add `context.Context` to constructors by default; when it is justified, keep it first.
- Do not use global loggers, global config singletons, or `zap.ReplaceGlobals`.
- Prefer one service binary with subcommands: `api`, `consumer <name>`, and `cronjob <job>`. Split binaries only when lifecycle, dependencies, or deploy units materially differ.
- Put the application `Dockerfile` and `.dockerignore` at the repo root by default; put local infrastructure compose files under `deploy/local/docker-compose.yml`; put the default application Helm chart under `deploy/helm/<app_name>`.
- For single-app Go plus UI monorepos, keep the Go module at repo root by default with sibling `api/`, `ui/`, and `deploy/` directories. Use `go/` or `services/<app>` only when an existing repo convention or real multi-service boundary justifies it.
- For reusable libraries, choose package and directory names by user-facing meaning. Constructors accept interfaces for behavioral dependencies; data, config, and options may stay concrete.
- For new multi-library Go repos, use `libs/<library-name>/` with one `go.mod` per library and optional `go.work` for local multi-module development.
- If `devctl.yaml` exists, treat explicit `components`, `languages.go.generators`, `sources`, `env`, and `start` values as project context. Do not validate the full YAML schema, author manifest settings, or invent new devctl options unless the user is explicitly editing `devctl.yaml`.
- Keep generated output under the boundary identified by existing generated directories, `devctl.yaml`, codegen configuration, repo docs, or generation scripts. Use `gen/` when no project-specific boundary exists. Do not hand-edit generated files.
