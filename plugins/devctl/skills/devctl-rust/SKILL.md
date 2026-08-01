---
name: devctl-rust
description: Use when creating, organizing, refactoring, or reviewing Rust projects, reusable libraries, crates, and Cargo workspaces, including reusable core crates, minimal crate boundaries, CLI/server/Tauri delivery, domain/service/usecase/repository/client/platform modules, filesystem and object-storage adapters, outbound HTTP/gRPC/SDK/subprocess clients, generated code, build.rs and OUT_DIR, migrations, configuration, async runtime boundaries, validation, auth/access control, error handling, observability, outside-in TDD, quality tooling, CI checks, devctl.yaml context, Rust plus UI monorepos, Dockerfiles, Docker Compose, Helm, and Kubernetes packaging.
---

# Devctl Rust

Structure Rust projects around a reusable application core, thin delivery crates, explicit Cargo
workspace policy, testable behavior, and Rust-native tooling.

## Workflow

1. Inspect `Cargo.toml`, workspace members, source and test layouts, generated boundaries, `build.rs`,
   migrations, delivery crates, CI/task commands, frameworks, tooling, and public APIs.
2. Preserve coherent repository conventions. Use this skill's defaults only when conventions are
   absent or the user asks to standardize.
3. Read `references/code-principles.md` completely before planning, writing, changing, or reviewing
   handwritten Rust. For production behavior, also read `references/testing-strategy.md` completely
   before planning or editing it.
4. Keep the reusable application engine free of delivery frameworks. Prefer the minimum useful
   crate graph and use modules for `domain`, `service`, `usecase`, `repository`, `client`, and
   `platform` until a real crate boundary appears.
5. Keep dependencies inward:
   `delivery -> usecase/service -> consumer-owned traits -> concrete adapters`. Define named
   operation contracts before implementing a layer; do not pass `serde_json::Value` or anonymous
   fixed-field maps across handwritten application boundaries.
6. Put construction, configuration, async runtime, and process lifecycle in delivery or
   `deps`/`runtime` modules. Inject application-affecting external capabilities into
   services/usecases; keep data, config, options, `Path`/`PathBuf`, and pure helpers concrete.
   Normalize infrastructure errors in adapters.
7. Treat repo-level `api/`, `proto/`, and schema folders as language-neutral contract sources.
   Generated output lives behind an explicit boundary or in `OUT_DIR`; never hand-edit it.
8. Use `$devctl-openapi` for OpenAPI, `$devctl` for `devctl.yaml`, and `$devctl-react-vite` for
   UI-side Tauri work. Load only task-relevant references. Validate with existing repository
   commands first; use the fallback baseline in `quality-tooling.md` only when no convention exists
   or standardization is requested.

## Production Behavior Gate

Use this state machine for every handwritten production behavior change:

```text
TEST -> useful RED -> minimum production -> GREEN -> simplify
```

- Advance one smallest coherent caller-visible scenario per cycle. RED must prove missing or wrong
  requested behavior, never unrelated compilation, configuration, fixture, or setup failure.
- For a new compiled API, a minimal declaration or skeleton may precede the first behavior test
  solely to make the owner crate compile. It must not implement requested behavior; `todo!`,
  `unimplemented!`, explicit unsupported errors, and equivalent placeholders never count as GREEN.
- Do not edit requested behavior or a lower adapter before its useful RED. After every production
  or simplification edit, rerun the same narrow owner check to GREEN before continuing.
- Begin bugs with the failing regression. Begin pure refactors with GREEN characterization. Never
  combine the initial behavior test and production change or hand-edit generated output.
- Work outside-in and let each upper RED demand only the next smallest named contract. Before final
  verification, require a direct suite for every changed behavior owner; one cross-layer test does
  not substitute for missing module/crate suites.

## References

- Read `references/overview-and-naming.md` for the architecture model, workspace layout, crate-vs-module decisions, Cargo workspace policy, layer naming conventions, type sharing rules, and compact order example.
- Read `references/code-principles.md` for KISS, DRY, SOLID, named contracts, documentation, and abstraction defaults.
- Read `references/library-crates.md` when designing, reviewing, or refactoring reusable Rust libraries, public crate APIs, single library crates, multi-library Cargo workspaces, feature-gated dependencies, trait/generic dependency seams, async runtime ownership, or library state/error contracts.
- Read `references/devctl-yaml-integration.md` when a repo has `devctl.yaml` or when Cargo package inventory, component package bindings, generated directories, contract inputs, runtime components, config fields, generated output, custom codegen paths, or compatibility may come from a Devctl manifest or codegen config.
- Read `references/domain.md` when adding or changing domain models, identifiers, value objects, commands, queries, results, views, shared domain types, errors, typed config, visibility, or `domain/common`.
- Read `references/service-and-usecase.md` when implementing business operations, dependency traits, generic services, `impl Trait`/`dyn Trait` choices, transactions, service tests, or optional usecase flows.
- Read `references/adapters-and-transport.md` when adding repositories, migrations, storage schema changes, outbound clients, generated Rust code, `build.rs`, `OUT_DIR`, checked-in generated code, HTTP/gRPC handlers, workers, message consumers, DTO mappers, or transport error mapping.
- Read `references/io-boundaries-and-platform.md` for path values versus capability traits, filesystem repositories, subprocess clients, external I/O, and platform ownership.
- Read `references/validation-and-crosscutting.md` for validation ownership, middleware, service/usecase wrappers, idempotency, cache, helpers, and wrapper composition.
- Read `references/runtime-and-wiring.md` when adding or changing CLI apps, servers, workers, delivery crates, runtime composition, config loading, secrets, shutdown, command parsing, binary layout, async runtime ownership, or delivery error presentation.
- Read `references/auth-and-access-control.md` when adding authentication, authorization, actor/principal handling, tenant/resource access checks, policy dependencies, repository scoping, or auth-related service/usecase signatures.
- Read `references/testing-strategy.md` for outside-in TDD, scenario order, behavior ownership, doubles, adapter integration tests, build scripts, generated drift, and workspace verification.
- Read `references/quality-tooling.md` for formatting, Clippy, dependency hygiene, complexity review, dependency direction, and adoption in existing projects.
- Read `references/observability-and-health.md` when adding tracing, logging, metrics, health checks, readiness/liveness, debug endpoints, profiling, or observability wrappers.
- Read `references/tauri-and-monorepo.md` when working on Tauri apps, `rust/tauri`, `tauri.conf.json`, Rust plus UI monorepos, root package scripts, app data paths, Tauri commands, or UI-to-Rust bridge boundaries.
- Read `references/deployment-and-packaging.md` when placing or reviewing root `Dockerfile`, `.dockerignore`, local `docker-compose.yml`, `deploy/local`, Helm charts, Kubernetes server/worker/job workloads, image args, deployment config, secret references, probes, resources, or packaging layout.

## Default Decisions

- Use a reusable `<app>-core` crate as the default application engine. It may contain domain, service, usecase, repository, client, platform, error, typed config, and delivery-agnostic adapter modules.
- Keep `<app>-core` free of delivery frameworks such as `tauri`, `axum`, `tonic`, and `clap`. Delivery crates map their inputs and outputs to core commands, queries, services, and errors.
- Add delivery crates only when the repo ships that delivery surface: `<app>-cli` for command-line delivery, `<app>-server` for long-running network/message runtimes, and `tauri/` for Tauri delivery. The CLI package may be named `<app>-cli`, but the shipped binary should usually be named `<app>`.
- Combine CLI and server delivery only when the CLI is the shipped runtime wrapper, such as `<app> serve`, `<app> migrate`, and `<app> seed`. Split them when dependencies, lifecycle, deploy units, or artifacts materially differ.
- Do not create layer crates such as `<app>-domain`, `<app>-service`, `<app>-repository`, `<app>-transport`, or `<app>-platform` by default. Use modules inside `<app>-core` for core boundaries and inside delivery crates for transports unless a real reuse, compilation, or ownership boundary appears.
- Add `<app>-migrator` only when migrations have their own API, tests, `build.rs`, embedded assets, or reuse across CLI/server/Tauri. Otherwise keep migrations as a core module.
- Do not add a generated crate by default. Keep generated modules inside the consuming crate, usually `<app>-core`, or generate to `OUT_DIR`; add a generated crate only for a stable shared contract boundary.
- In a Rust plus UI monorepo, prefer a repo-level shape with `api/`, `ui/`, and `rust/`. Keep `api/openapi` language-neutral and keep UI-side Tauri service adapters under the React/Vite structure.
- For Cargo workspaces under `rust/`, centralize `edition`, `rust-version`, and shared package policy in `rust/Cargo.toml` when the workspace supports it; member crates inherit with `edition.workspace = true` and `rust-version.workspace = true`.
- For reusable libraries, design around the public crate API, meaningful modules, curated `lib.rs` re-exports, and explicit dependency/config inputs. Use plain functions for stateless deterministic operations and traits/generics for behavior seams.
- Keep databases, caches, filesystems, and object storage in repositories. Put outbound
  HTTP/gRPC/SDK/subprocess integrations and producers in clients.
- Make repositories concrete capability adapters behind service-owned traits. Keep queries, codecs,
  layouts, filesystem mechanics, and driver helpers private to the adapter.
- Use named structs, enums, and newtypes for fixed fields. Use maps only for genuinely dynamic key
  spaces with explicit key and value types.
- Keep tests at behavior owners. Preserve coherent existing layouts; do not count one integration
  test as direct coverage for every crossed module or crate.
- Treat passing local complexity limits as a gate, not proof of simple ownership. Review clusters
  of near-limit functions before adding more behavior to the module.
- For new multi-library Rust repos, use a Cargo workspace with `crates/<library-name>/` and one `Cargo.toml` per library crate.
- Put the server/CLI application `Dockerfile` and `.dockerignore` at the repo build-context root by default; put local infrastructure compose files under `deploy/local/docker-compose.yml`; put the default application Helm chart under `deploy/helm/<app_name>`. Keep Tauri bundle packaging separate under `rust/tauri`.
- If `devctl.yaml` exists, treat explicit components, sources, Rust package bindings, generated output, env/config, and runtime activation values as project context. Do not author manifest settings or invent new Devctl options unless the user is explicitly editing `devctl.yaml`.
