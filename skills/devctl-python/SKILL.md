---
name: devctl-python
description: Use when creating, organizing, refactoring, or reviewing Python projects, services, reusable libraries, packages, and CLI apps, including pyproject.toml, src-layout packages, package API design, multi-package repos, domain/service/usecase/repository/client/platform boundaries, generated-code boundaries, HTTP/gRPC/message transport adapters, CLI entrypoints, dependency wiring, configuration, secrets, migrations, validation, auth/access control, error handling, observability, pytest strategy, uv/ruff defaults when no repo convention exists, existing devctl.yaml project context, graceful shutdown, Python plus UI monorepo layout, Dockerfile placement, Docker Compose local infrastructure, Helm charts, and Kubernetes deployment packaging.
---

# Devctl Python

Use this skill to structure Python projects around explicit package boundaries, inward dependency direction, thin entrypoints, testable services, and packaging conventions that fit Python instead of copying Go or Rust mechanically.

## Workflow

1. Inspect the existing Python project before recommending changes: `pyproject.toml`, lockfiles, `src/`, package names, `tests/`, generated-code directories, `api/`, `ui/`, migrations, entrypoints, CI, task scripts, current framework/tooling, and public library APIs.
2. Preserve coherent local conventions. Apply these references when the project lacks a clear convention or when the user asks to standardize around this structure.
3. Keep dependency direction inward: `transport/entrypoint -> usecase/service -> repository/client Protocols`, with domain contracts independent of framework, ORM, SDK, and generated DTO types.
4. Keep construction and process lifecycle in entrypoint or `deps` modules. Business code receives explicit dependencies and typed config; adapters normalize infrastructure errors before service-facing boundaries.
5. Use `$devctl` for creating or editing `devctl.yaml`, running the Devctl CLI, enabling components, or regenerating Devctl-managed artifacts. This skill only consumes manifest context for Python implementation.
6. Use `$devctl-openapi` for OpenAPI contract authoring and `$devctl-react-vite` for UI-side generated client integration.
7. Load only the references needed for the task. Do not load every reference by default.
8. Validate changed Python code with the repo's existing commands first, usually `uv run pytest`, `pytest`, `ruff check`, `ruff format --check`, and the detected type checker when present.

## References

- Read `references/overview-and-naming.md` for the architecture model, default Python project layout, package/module split rules, naming conventions, type sharing rules, and compact order example.
- Read `references/code-principles.md` when writing, refactoring, or reviewing handwritten Python code, especially when choosing functions vs classes, dataclasses, Protocols, helper placement, typing level, or abstraction level.
- Read `references/library-packages.md` when designing, reviewing, or refactoring reusable Python libraries, public package APIs, distribution metadata, package layout, dependency seams, optional extras, state, import side effects, or multi-package repos.
- Read `references/devctl-yaml-integration.md` when a repo has `devctl.yaml` or when Python package identity, generated directories, config fields, runtime components, contract inputs, generated output, custom codegen paths, or compatibility may come from a Devctl manifest or codegen config.
- Read `references/domain.md` when adding or changing domain models, commands, queries, views, shared domain types, errors, validation issues, import rules, or `domain/common`.
- Read `references/service-and-usecase.md` when implementing business operations, dependency Protocols, transactions, service tests, or optional usecase flows.
- Read `references/adapters-and-transport.md` when adding repositories, migrations, storage schema changes, outbound clients, HTTP/gRPC handlers, message consumers, DTO mappers, generated Python code, or transport error mapping.
- Read `references/validation-and-crosscutting.md` for validation ownership, middleware, service/usecase wrappers, idempotency, cache, helpers, and wrapper composition.
- Read `references/runtime-and-wiring.md` when adding or changing CLI apps, `[project.scripts]`, `__main__.py`, command modules, config loading, dependency wiring, secrets, shutdown, command parsing, process lifecycle, or error presentation.
- Read `references/auth-and-access-control.md` when adding authentication, authorization, actor/principal handling, tenant/resource access checks, policy dependencies, repository scoping, or auth-related service/usecase signatures.
- Read `references/testing-strategy.md` when adding or reviewing Python tests, pytest structure, fixtures, fakes, mocks, repository integration tests, contract/generated drift checks, or CI verification.
- Read `references/observability-and-health.md` when adding logging, metrics, tracing, health checks, readiness/liveness, debug endpoints, profiling, or observability wrappers.
- Read `references/deployment-and-packaging.md` when placing or reviewing root `Dockerfile`, `.dockerignore`, local `docker-compose.yml`, `deploy/local`, Helm charts, Kubernetes server/worker/job workloads, image args, deployment config, secret references, probes, resources, or packaging layout.
- Read `references/monorepo-and-ui.md` when a Python backend lives beside `api/` contracts, a React/Vite `ui/`, root package scripts, generated TypeScript clients, UI build output, or monorepo Docker build-context decisions.

## Default Decisions

- For new packaged projects, prefer `pyproject.toml` with a `src/<package_name>/` layout. Preserve flat or framework-specific layouts in existing repos when they are coherent and actively used.
- For new projects with no tool convention, prefer `uv` for environment/dependency/lock/run workflow, `ruff` for lint/format, and `pytest` for tests. Do not migrate Poetry, Hatch, PDM, pip-tools, or ad hoc tooling unless the user asks or the project already chose to migrate.
- Use `domain`, `service`, optional `usecase`, `repository`, `client`, `transport`, `deps`, `platform`, and `generated` as default package modules for service applications.
- Keep CLI entrypoints under `cli/`, with command modules such as `serve.py`, `worker.py`, and `cronjob.py` when the app ships those scenarios. CLI is not transport.
- Use `[project.scripts]` for installed commands. Add `__main__.py` only when `python -m <package>` is a useful supported entrypoint.
- Keep HTTP framework-neutral by default. Transport owns router/app construction, DTOs, validation/error mapping, and protocol contracts; domain/service/usecase must not import FastAPI, Django, Flask, Pydantic request models, SQLAlchemy ORM models, or generated protocol DTOs by default.
- Use `typing.Protocol` for behavior seams consumed by services/usecases. Keep data, config, options, value objects, and pure helpers concrete.
- Add `usecase` only for multi-step product flows, cross-service orchestration, retries/compensations, or reusable scenarios across transports.
- Keep repositories for storage systems only. Put outbound HTTP/gRPC/SDK integrations and producers in `client`.
- Map low-level repository/client failures into application error categories before they leave the adapter layer; transport maps application errors to HTTP/gRPC/message/CLI outputs.
- Avoid import-time runtime behavior: no global clients, hidden env reads, network connections, task startup, logging setup, or implicit plugin registration from package import.
- For reusable libraries, design around the public package API and meaningful modules. Plain functions are valid public API for stateless deterministic operations; use classes when state, lifecycle, or cohesive behavior requires them.
- For new multi-package Python repos, use `packages/<dist-name>/` with one `pyproject.toml` per independently publishable distribution when separate release/API boundaries exist. Otherwise keep one distribution with internal modules.
- Put the application `Dockerfile` and `.dockerignore` at the repo build-context root by default; put local infrastructure compose files under `deploy/local/docker-compose.yml`; put the default application Helm chart under `deploy/helm/<app_name>`.
- If `devctl.yaml` exists, treat explicit `components`, `languages.python.package`, generator output, env/config, and runtime activation values as project context. Do not author manifest settings or invent new Devctl options unless the user is explicitly editing `devctl.yaml`.
- Keep generated output under the boundary identified by existing generated directories, `devctl.yaml`, codegen configuration, repo docs, or generation scripts. Use `generated/` inside the Python package when no project-specific boundary exists. Do not hand-edit generated files.
