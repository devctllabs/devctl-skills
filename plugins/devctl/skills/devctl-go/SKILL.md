---
name: devctl-go
description: Use when creating, organizing, refactoring, or reviewing Go services, reusable libraries, and packages, including library package API design, multi-library monorepos, internal/domain, internal/service, optional internal/usecase, repositories, filesystem and object-storage adapters, outbound HTTP/gRPC/SDK/subprocess clients, transport adapters, internal/deps dependency injection, configuration, secrets, migrations, observability, auth/access control, outside-in TDD, quality tooling, gomock/mockgen tests, contract compatibility, messaging, zap logging, cmd entrypoints, existing devctl.yaml context, graceful shutdown, validation boundaries, generated code, Go plus UI monorepos, Dockerfiles, Docker Compose, Helm, and Kubernetes packaging.
---

# Devctl Go

Structure Go services and reusable libraries around explicit package boundaries, inward
dependencies, thin runtime entrypoints, testable behavior, and Go-native tooling.

## Workflow

1. Inspect `go.mod`, `go.work`, source and test layouts, generated boundaries, migrations,
   entrypoints, CI/task commands, frameworks, tooling, and public APIs.
2. Preserve coherent repository conventions. Use this skill's defaults only when conventions are
   absent or the user asks to standardize.
3. Read `references/code-principles.md` completely before planning, writing, changing, or reviewing
   handwritten Go. For production behavior, also read `references/testing-strategy.md` completely
   before planning or editing it.
4. Keep dependencies inward:
   `transport/entrypoint -> usecase/service -> consumer-owned interfaces -> concrete adapters`.
   Domain and service packages remain independent of frameworks, drivers, SDKs, and generated DTOs.
5. Keep delivery, application behavior, and concrete I/O adapters separated in every application,
   even when each boundary is one package. Define named operation contracts before implementing a
   layer; do not pass anonymous fixed-field `map[string]any` values across handwritten boundaries.
   In libraries, invert caller-supplied behavioral dependencies through consumer-owned interfaces;
   pure code without such a dependency needs no ceremonial interface.
6. Put construction, configuration, and process lifecycle in `cmd` or `internal/deps`. Inject
   application-affecting external capabilities into services/usecases; keep data, config, options,
   path values, `context.Context`, and pure helpers concrete. Normalize infrastructure errors in
   adapters.
7. Use `$devctl` to author `devctl.yaml` or run Devctl operations. Load only task-relevant
   references. Validate with existing repository commands first; use the fallback baseline in
   `quality-tooling.md` only when no convention exists or standardization is requested.

## Production Behavior Gate

Use this state machine for every handwritten production behavior change:

```text
TEST -> useful RED -> minimum production -> GREEN -> simplify
```

- Advance one smallest coherent caller-visible scenario per cycle. RED must prove missing or wrong
  requested behavior, never unrelated compilation, configuration, fixture, or setup failure.
- For a new compiled API, a minimal declaration or skeleton may precede the first behavior test
  solely to make the owner package compile. It must not implement requested behavior; `panic`,
  explicit unsupported errors, and equivalent placeholders never count as GREEN.
- Do not edit requested behavior or a lower adapter before its useful RED. After every production
  or simplification edit, rerun the same narrow owner check to GREEN before continuing.
- Begin bugs with the failing regression. Begin pure refactors with GREEN characterization. Never
  combine the initial behavior test and production change or hand-edit generated output.
- Work outside-in and let each upper RED demand only the next smallest named contract. Before final
  verification, require a direct suite for every changed behavior owner; one cross-layer test does
  not substitute for missing package suites.

## References

- Read `references/overview-and-naming.md` for the layer model, directory responsibilities, package split rules, operation type naming, import aliases, and compact `Order` example.
- Read `references/code-principles.md` for KISS, DRY, SOLID, named contracts, documentation, and abstraction defaults.
- Read `references/library-packages.md` when designing, reviewing, or refactoring reusable Go libraries, public package APIs, constructor dependency seams, SOLID library boundaries, single-library repos, or multi-library monorepos.
- Read `references/devctl-yaml-integration.md` when a repo has `devctl.yaml` or when generated directories, config fields, runtime components, clients, consumers, producers, contract inputs, generated output, custom codegen paths, or API/message compatibility may come from a devctl manifest or codegen config.
- Read `references/domain.md` when adding or changing domain models, commands, queries, views, shared domain types, errors, import rules, or `internal/domain/common`.
- Read `references/service-and-usecase.md` when implementing business operations, service interfaces, dependency interfaces, transactions, DI-local service assembly, service tests, or optional usecase flows.
- Read `references/adapters-and-transport.md` when adding repositories, migrations, storage schema changes, outbound clients, producers, HTTP/gRPC handlers, Kafka consumers, message idempotency, retries, DLQ, outbox behavior, DTO mappers, or transport error mapping.
- Read `references/io-boundaries-and-platform.md` for path values versus capability interfaces, filesystem repositories, subprocess clients, external I/O, and platform ownership.
- Read `references/validation-and-crosscutting.md` for validation ownership, middleware, service/usecase decorators, idempotency, cache, helpers, and wrapper composition.
- Read `references/runtime-and-wiring.md` when changing `cmd/<app_name>`, CLI subcommands, `api`, `consumer`, `cronjob`, `internal/deps`, `samber/do`, generated config loading, `internal/config`, secrets, redaction, config reload, typed getters, provider split, lifecycle/shutdown, context propagation, timeouts, goroutine ownership, `errgroup`, cancellation, runtime errors, or dependency getters.
- Read `references/auth-and-access-control.md` when adding authentication, authorization, actor/principal handling, tenant/resource access checks, policy dependencies, or auth-related service/usecase signatures.
- Read `references/testing-strategy.md` for outside-in TDD, scenario order, behavior ownership, doubles, integration tests, generated checks, and concurrency-sensitive behavior.
- Read `references/quality-tooling.md` for formatting, static analysis, module hygiene, complexity review, dependency direction, and adoption in existing projects.
- Read `references/gomock-unit-tests.md` when adding or migrating Go unit tests with generated gomock mocks, mockgen directives, `mocks/` packages, `_test` package boundaries, import-cycle handling, or fake-to-gomock migrations.
- Read `references/observability-and-health.md` when adding logging, zap logger construction/usage, metrics, tracing, health checks, readiness/liveness, debug endpoints, pprof, or observability decorators.
- Read `references/deployment-and-packaging.md` when placing or reviewing root `Dockerfile`, `.dockerignore`, local `docker-compose.yml`, `deploy/local`, Helm charts, Kubernetes workloads, image args, deployment config, secret references, probes, resources, or packaging layout.
- Read `references/monorepo-and-ui.md` when a Go backend lives beside `api/` contracts, a React/Vite `ui/`, root package scripts, generated TypeScript clients, UI build output, or monorepo Docker build-context decisions.

## Default Decisions

- Use `internal/domain`, `internal/service`, `internal/repository`, `internal/client`, `internal/transport`, `internal/deps`, and `internal/platform` as the default service layout.
- Add `internal/usecase` only for multi-step product flows, cross-service orchestration, retries/compensations, or reusable scenarios across transports.
- Put interfaces at the consumer side: service dependency interfaces live in `internal/service/<entity>`, transport handlers may declare narrow local interfaces, and concrete implementations are wired in `internal/deps`.
- Keep `domain` free of SQL, JSON DTO, driver, protocol, and transport tags unless an existing project has a deliberate exception.
- Keep databases, caches, filesystems, and object storage in repositories. Put outbound
  HTTP/gRPC/SDK/subprocess integrations and producers in `internal/client`.
- Make repositories concrete capability adapters behind service-owned interfaces. Keep queries,
  codecs, layouts, filesystem mechanics, and driver helpers private to the adapter.
- Use named structs, enums, and domain types for fixed fields. Use maps only for genuinely dynamic
  key spaces with explicit key and value types.
- Map low-level repository/client failures into domain error categories before they leave the adapter layer; transport maps domain errors to HTTP/gRPC protocol responses.
- Use `*zap.Logger` as the practical concrete logger dependency. Do not introduce a custom logger interface by default.
- Order constructor parameters as `ctx?`, `logger?`, then explicit dependencies and options. Do not add `context.Context` to constructors by default; when it is justified, keep it first.
- Do not use global loggers, global config singletons, or `zap.ReplaceGlobals`.
- Prefer one service binary with subcommands: `api`, `consumer <name>`, and `cronjob <job>`. Split binaries only when lifecycle, dependencies, or deploy units materially differ.
- Put the application `Dockerfile` and `.dockerignore` at the repo root by default; put local infrastructure compose files under `deploy/local/docker-compose.yml`; put the default application Helm chart under `deploy/helm/<app_name>`.
- For single-app Go plus UI monorepos, keep the Go module at repo root by default with sibling `api/`, `ui/`, and `deploy/` directories. Use `go/` or `services/<app>` only when an existing repo convention or real multi-service boundary justifies it.
- For reusable libraries, choose package and directory names by user-facing meaning. Constructors accept interfaces for behavioral dependencies; data, config, and options may stay concrete.
- Keep tests beside behavior owners. Preserve coherent existing layouts; do not count one
  integration test as direct coverage for every crossed package.
- Treat passing local complexity limits as a gate, not proof of simple ownership. Review clusters
  of near-limit functions before adding more behavior to the package.
- For new multi-library Go repos, use `libs/<library-name>/` with one `go.mod` per library and optional `go.work` for local multi-module development.
- If `devctl.yaml` exists, treat explicit `components`, `languages.go.generators`, `sources`, `env`, and `start` values as project context. Do not validate the full YAML schema, author manifest settings, or invent new devctl options unless the user is explicitly editing `devctl.yaml`.
- Keep generated output under the boundary identified by existing generated directories, `devctl.yaml`, codegen configuration, repo docs, or generation scripts. Use `gen/` when no project-specific boundary exists. Do not hand-edit generated files.
