---
name: devctl-rust
description: Use when creating, organizing, refactoring, or reviewing Rust projects, reusable libraries, library crates, and Cargo workspaces, including reusable core crates, minimal crate boundaries, multi-library workspaces, CLI/server/Tauri delivery crates, Rust module structure, domain/service/usecase/repository/client/platform boundaries, generated code, build.rs and OUT_DIR usage, migrations, configuration, async runtime boundaries, validation, auth/access control, error handling, observability, tests, CI checks, devctl.yaml context, Rust plus UI monorepo layout, Dockerfile placement, Docker Compose local infrastructure, Helm charts, and Kubernetes deployment packaging.
---

# Devctl Rust

Use this skill to structure Rust projects around a reusable application core, thin delivery crates, explicit Cargo workspace policy, and testable module boundaries.

## Workflow

1. Inspect the existing Rust project before recommending changes: `Cargo.toml`, workspace members, `rust/`, `crates/`, `src/`, `build.rs`, `api/`, `proto/`, generated directories, migrations, Tauri config, package-manager files, CI, tests, current module naming, and public library APIs.
2. Preserve coherent local conventions. Apply these references when the project lacks a clear convention or when the user asks to standardize around this structure.
3. Keep the reusable application engine free of delivery frameworks. `tauri`, `axum`, `tonic`, `clap`, process signal handling, and protocol DTO mapping belong in delivery crates unless the existing project deliberately centralizes them elsewhere.
4. Prefer the minimum useful crate graph: one reusable `<app>-core` crate plus only the delivery/support crates the repo actually ships. Use modules, not crates, for core boundaries such as `domain`, `service`, `repository`, `client`, and `platform`; keep transport modules inside delivery crates.
5. Treat repo-level `api/`, `proto/`, and schema folders as language-neutral contract sources. Rust generated output must live behind an explicit generated boundary or in Cargo `OUT_DIR`.
6. Use `$devctl-openapi` for OpenAPI contract authoring, `$devctl` for authoring or changing `devctl.yaml`, and `$devctl-react-vite` for React/Vite UI-side Tauri adapters. This skill owns Rust workspace, crates, modules, runtime, and Rust-side Tauri structure.
7. Load only the references needed for the task. Do not load every reference by default.
8. Validate changed Rust code with the repo's existing commands first, usually `cargo fmt`, `cargo check`, `cargo test`, and `cargo clippy` scoped through the detected manifest path.

## References

- Read `references/overview-and-naming.md` for the architecture model, workspace layout, crate-vs-module decisions, Cargo workspace policy, layer naming conventions, type sharing rules, and compact order example.
- Read `references/code-principles.md` when writing, refactoring, or reviewing handwritten Rust code, especially when choosing modules vs crates, functions vs traits, generics vs `dyn Trait`, helper placement, or abstraction level.
- Read `references/library-crates.md` when designing, reviewing, or refactoring reusable Rust libraries, public crate APIs, single library crates, multi-library Cargo workspaces, feature-gated dependencies, trait/generic dependency seams, async runtime ownership, or library state/error contracts.
- Read `references/devctl-yaml-integration.md` when a repo has `devctl.yaml` or when Cargo package inventory, component package bindings, generated directories, contract inputs, runtime components, config fields, generated output, custom codegen paths, or compatibility may come from a Devctl manifest or codegen config.
- Read `references/domain.md` when adding or changing domain models, identifiers, value objects, commands, queries, results, views, shared domain types, errors, typed config, visibility, or `domain/common`.
- Read `references/service-and-usecase.md` when implementing business operations, dependency traits, generic services, `impl Trait`/`dyn Trait` choices, transactions, service tests, or optional usecase flows.
- Read `references/adapters-and-transport.md` when adding repositories, migrations, storage schema changes, outbound clients, generated Rust code, `build.rs`, `OUT_DIR`, checked-in generated code, HTTP/gRPC handlers, workers, message consumers, DTO mappers, or transport error mapping.
- Read `references/validation-and-crosscutting.md` for validation ownership, middleware, service/usecase wrappers, idempotency, cache, helpers, and wrapper composition.
- Read `references/runtime-and-wiring.md` when adding or changing CLI apps, servers, workers, delivery crates, runtime composition, config loading, secrets, shutdown, command parsing, binary layout, async runtime ownership, or delivery error presentation.
- Read `references/auth-and-access-control.md` when adding authentication, authorization, actor/principal handling, tenant/resource access checks, policy dependencies, repository scoping, or auth-related service/usecase signatures.
- Read `references/testing-strategy.md` when adding or reviewing Rust tests, build-script tests, integration tests, generated drift checks, Tauri CI issues, cargo commands, rustfmt, clippy, or workspace verification.
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
- For new multi-library Rust repos, use a Cargo workspace with `crates/<library-name>/` and one `Cargo.toml` per library crate.
- Put the server/CLI application `Dockerfile` and `.dockerignore` at the repo build-context root by default; put local infrastructure compose files under `deploy/local/docker-compose.yml`; put the default application Helm chart under `deploy/helm/<app_name>`. Keep Tauri bundle packaging separate under `rust/tauri`.
- If `devctl.yaml` exists, treat explicit components, sources, Rust package bindings, generated output, env/config, and runtime activation values as project context. Do not author manifest settings or invent new Devctl options unless the user is explicitly editing `devctl.yaml`.
