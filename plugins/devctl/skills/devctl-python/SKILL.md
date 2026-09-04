---
name: devctl-python
description: Use when creating, organizing, refactoring, or reviewing Python projects, services, reusable libraries, packages, and CLI apps, including pyproject.toml, src-layout packages, package API design, multi-package repos, domain/service/usecase/repository/client/platform boundaries, generated-code boundaries, HTTP/gRPC/message transport adapters, CLI entrypoints, dependency wiring, configuration, secrets, migrations, validation, auth/access control, error handling, observability, pytest strategy, uv/ruff defaults when no repo convention exists, existing devctl.yaml project context, graceful shutdown, Python plus UI monorepo layout, Dockerfile placement, Docker Compose local infrastructure, Helm charts, and Kubernetes deployment packaging.
---

# Devctl Python

Structure Python projects around explicit package boundaries, inward dependencies, thin
entrypoints, testable behavior, and Python-native packaging.

## Workflow

1. Inspect `pyproject.toml`, lockfiles, source and test layouts, generated boundaries, migrations,
   entrypoints, CI/task commands, frameworks, tooling, and public APIs.
2. Preserve coherent repository conventions. Use this skill's defaults only when conventions are
   absent or the user asks to standardize.
3. Read `references/code-principles.md` completely before planning, writing, changing, or reviewing
   handwritten Python. Before planning or editing handwritten production behavior, you must invoke
   `$outside-in-tdd`, read its `SKILL.md` completely, and follow it as the controlling workflow. If
   it is unavailable, stop and report the missing required skill; do not reproduce its workflow
   locally. Read `references/testing-strategy.md` only for Python-specific test ownership, doubles,
   and verification.
4. Keep dependencies inward:
   `transport/entrypoint -> usecase/service -> consumer-owned Protocols -> concrete adapters`.
   Domain and service code remain independent of frameworks, ORMs, SDKs, and generated DTOs.
5. Keep delivery, application behavior, and concrete I/O adapters separated in every application,
   even when each boundary is one module. Define typed operation contracts before implementing a
   layer; do not pass anonymous fixed-field dictionaries or `Any` across handwritten boundaries.
   In libraries, invert every caller-supplied behavioral dependency through a consumer-owned
   interface; pure code without such a dependency needs no ceremonial interface.
6. Put construction, configuration, and process lifecycle in entrypoints or `deps`. Inject
   side-effecting capabilities into services/usecases; keep data, config, options, `Path`, value
   objects, and pure helpers concrete. Normalize infrastructure errors inside adapters.
7. Use `$devctl` to author `devctl.yaml` or run Devctl operations, `$devctl-openapi` to author
   OpenAPI contracts, and `$devctl-react-vite` for UI/generated-client work.
8. Load only task-relevant references. Validate with existing repository commands first; use the
   full fallback in `quality-tooling.md` only when no convention exists or standardization is
   requested.

## References

- `overview-and-naming.md`: architecture, layout, naming, type sharing, and module splits.
- `code-principles.md`: KISS, DRY, SOLID, typing, abstractions, and documentation.
- `library-packages.md`: reusable APIs, distributions, extras, state, and multi-package repos.
- `devctl-yaml-integration.md`: manifest-derived identity, config, runtime, contracts, and generated
  boundaries.
- `domain.md`: models, operation contracts, value objects, errors, and import rules.
- `service-and-usecase.md`: business operations, consumer Protocols, transactions, and flows.
- `adapters-and-transport.md`: repositories, clients, migrations, HTTP/gRPC/messages, and mapping.
- `io-boundaries-and-platform.md`: values versus capability ports, external I/O, and platform
  ownership.
- `validation-and-crosscutting.md`: validation, middleware, wrappers, idempotency, cache, and helpers.
- `runtime-and-wiring.md`: CLI trees, scripts, configuration, DI, lifecycle, and error presentation.
- `auth-and-access-control.md`: actors, authorization policy, tenant/resource access, and scoping.
- `testing-strategy.md`: Python test ownership, pytest layout, doubles, integration boundaries, and
  verification.
- `quality-tooling.md`: formatting, lint, typing, complexity, dependency, and import-contract gates.
- `observability-and-health.md`: logging, metrics, tracing, health, debug, and profiling.
- `deployment-and-packaging.md`: images, Compose, Helm/Kubernetes, config, and secrets.
- `monorepo-and-ui.md`: Python/API/UI ownership, root tooling, generated clients, and build context.

## Default Decisions

- New packaged projects: `pyproject.toml` and `src/<package_name>/`. New projects without a tool
  convention: `uv`, Ruff, pytest, strict mypy, complexipy, deptry, and Import Linter. Never replace
  coherent Poetry/Hatch/PDM/pip-tools or existing lint/type tooling without a standardization request.
- Service applications: `domain`, `service`, optional `usecase`, `repository`, `client`,
  `transport`, `cli`, `deps`, optional `platform`, and `generated`. Keep delivery, application,
  and concrete I/O boundaries explicit; create only the layers the application actually uses.
- CLI: `[project.scripts]`, public `main(argv, deps)`, handlers on executable argparse leaves, and
  one command module per top-level nested group. Give every public parser and argument useful
  standard `--help`. Add `__main__.py` only for a supported `python -m` entrypoint.
- Keep transport framework types and generated DTOs out of domain/service. Put storage/resource
  capabilities in repositories, outbound APIs/SDKs/subprocesses in clients, and concrete shared
  domain-free primitives in optional platform modules.
- Use immutable structured contracts for fixed fields. Permit mappings across layers only when the
  keys are genuinely dynamic domain data and both key and value types are explicit.
- Make repositories concrete capability adapters behind service-owned Protocols. Keep repository
  codecs, layouts, queries, and other low-level helpers private to the adapter; never call them
  directly from service/usecase code.
- Give every library behavioral dependency a consumer-owned `Protocol`, ABC, callable contract, or
  coherent repository-native equivalent. Keep pure functions and concrete values concrete.
- Keep tests at behavior owners. Preserve a coherent existing test layout; use the type-first,
  behavior-owner-second default for new projects or an explicit standardization.
- Treat passing per-function complexity ceilings as a gate, not proof of simple design. Review
  clustered near-limit functions by ownership before extending the same module.
- Avoid import-time runtime behavior. Libraries expose meaningful functions/classes without
  application layers; multi-package repos split only on independent publish/release boundaries.
- Derive generated, runtime, and package context from existing configuration and `devctl.yaml`.
  Do not invent manifest options or hand-edit generated files.
- Default deployment placement is the build-context-root Dockerfile, `deploy/local/docker-compose.yml`,
  and `deploy/helm/<app_name>`.
