# Monorepo and UI

## Contents

- Role
- Default Layout
- Ownership Boundaries
- Python Package Placement
- API Contracts and Generated Code
- UI Package Boundary
- Root Tooling
- Docker Build Context
- Alternative Layouts
- Review Checklist
- Related Skills and References

## Role

Use this reference when a Python backend lives beside API contracts, UI code, deployment files, generated clients, or root tooling.

For frontend structure, use `$devctl-react-vite`. This reference only covers Python/backend placement and cross-repo boundaries.

## Default Layout

For a single Python backend plus UI repo, prefer:

```text
api/
  openapi/
pyproject.toml
uv.lock                  # when uv is used
src/
  <package_name>/
ui/
deploy/
  local/
  helm/
Dockerfile
.dockerignore
```

`api/` is a language-neutral contract source. `src/<package_name>/` is the Python package. `ui/` is the frontend package. `deploy/` owns deployment artifacts.

## Ownership Boundaries

- Python backend owns server/worker/job behavior, domain/service/repository/client code, and backend-generated server/client adapters.
- UI owns pages, routes, components, UI services, generated TypeScript clients, and browser/Tauri adapters.
- `api/` owns source contracts, not backend implementation.
- `deploy/` owns packaging and deployment.
- Root scripts may orchestrate tasks but should not hide package-specific commands.

## Python Package Placement

For one backend, keep Python at the repo root with `pyproject.toml` and `src/` by default. Use `python/`, `backend/`, or `services/<app>/` only when:

- the repo has multiple backend services;
- the existing repo already uses that convention coherently;
- build contexts or ownership boundaries require it;
- another language already owns the root package metadata.

Do not add an extra directory only to mirror language names when the repo has one Python application.

## API Contracts and Generated Code

Keep source contracts language-neutral:

```text
api/openapi/
api/proto/
```

Generated Python code should live under the configured generated boundary, often:

```text
src/<package_name>/generated/
```

Generated TypeScript clients belong to the UI structure, not the Python package.

Do not hand-edit generated files. Use `$devctl-openapi` for contract authoring and `$devctl` for source sync, linting, and generation when Devctl manages the flow.

## UI Package Boundary

Keep UI code under `ui/`:

```text
ui/
  package.json
  src/
```

Do not put React/Vite code under the Python package. Do not put Python domain/service code under `ui/`.

For UI service adapters, generated client usage, routing, forms, i18n, Storybook, and tests, use `$devctl-react-vite`.

## Root Tooling

Root scripts may coordinate:

- backend tests/lint/typecheck;
- UI tests/lint/build;
- contract lint/generation;
- Docker build;
- local compose startup.

Keep package-specific commands visible and reproducible. If root scripts call `uv`, `pytest`, `pnpm`, or `devctl`, they should be thin wrappers around real package commands.

## Docker Build Context

For a single backend plus UI repo, root `Dockerfile` is the default build context when it needs:

- `pyproject.toml` and lockfiles;
- `src/`;
- generated code;
- `api/` contracts;
- optional UI build output;
- deployment metadata.

Use a service-local Dockerfile only when a real multi-service boundary exists.

## Alternative Layouts

Preserve coherent existing alternatives:

```text
backend/
  pyproject.toml
  src/
frontend/
```

```text
services/
  api/
    pyproject.toml
    src/
  worker/
    pyproject.toml
    src/
ui/
```

Do not migrate layout solely for style. Migrate only when it simplifies real ownership, build, or package boundaries.

## Review Checklist

- Is `api/` treated as contract source rather than backend implementation?
- Does the Python package live at the simplest coherent root?
- Are UI-generated clients kept in the UI boundary?
- Are Python-generated modules behind the Python generated boundary?
- Are root scripts thin and discoverable?
- Is Docker build context chosen based on files actually needed?
- Are deployment artifacts under `deploy/`?

## Related Skills and References

- Use `$devctl-openapi` for OpenAPI contract changes.
- Use `$devctl-react-vite` for React/Vite UI structure and generated client integration.
- Read `deployment-and-packaging.md` for Docker, compose, Helm, Kubernetes workloads, image args, config, and secrets.
