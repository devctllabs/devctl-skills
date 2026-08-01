# Monorepo and UI

## Contents

- Role
- Default Layout
- Ownership Boundaries
- Go Module Placement
- API Contracts and Generated Code
- UI Package Boundary
- Root Tooling
- Docker Build Context
- Alternative Layouts
- Review Checklist
- Related Skills and References

## Role

Use this reference when a Go backend lives in the same repository as language-neutral API contracts and a React/Vite UI.

Default assumption: a single application repo with one Go backend service and one UI package should keep the Go module at the repo root, with `api/` and `ui/` as top-level siblings.

Use this reference for layout and ownership decisions only. Use `$devctl-react-vite` for UI implementation details, `$devctl-openapi` for OpenAPI authoring, and `$devctl` for manifest/scaffold decisions.

## Default Layout

Default single-app Go plus UI monorepo:

```text
go.mod
go.sum

cmd/<app_name>/
  main.go
  internal/
    api.go
    consumer.go
    cronjob.go

internal/
  domain/
  service/
  usecase/                 # optional
  repository/
  client/
  transport/
  deps/
  platform/

gen/                       # generated Go output when checked in

api/
  openapi/
  proto/
  schemas/

ui/
  package.json
  index.html
  vite.config.ts
  src/

deploy/
  local/
    docker-compose.yml
  helm/
    <app_name>/

Dockerfile
.dockerignore
```

Add only directories the project actually uses. Do not create `proto/`, `schemas/`, `consumer`, or `cronjob` paths only to satisfy the diagram.

## Ownership Boundaries

Go backend owns:

- `go.mod`, Go tool declarations, `cmd/`, `internal/`, `gen/`, migrations, backend tests, and backend runtime config;
- HTTP/gRPC/Kafka handlers and generated Go server/client integration;
- dependency wiring, config loading, graceful shutdown, and deployment runtime commands.

Language-neutral contracts own:

- `api/openapi`, `api/proto`, `api/schemas`, or the repo's configured contract source paths;
- public API/message semantics independent of Go or TypeScript generated output.

UI owns:

- `ui/package.json`, Vite config, TypeScript config, `ui/src`, UI tests, Storybook, generated TypeScript API clients, and UI runtime adapters.

Root owns:

- repository-level docs, CI, task runner config, shared tool version config, deployment artifacts, and optional root package scripts that coordinate `ui/` commands.

Do not put Go business code under `api/`. In this layout, `api/` means contracts, not backend implementation.

## Go Module Placement

Use a root Go module by default:

```text
go.mod
cmd/
internal/
gen/
```

Reasons:

- Go tooling works directly from repo root.
- `internal/` naturally protects backend implementation packages.
- `cmd/<app_name>` and `internal/deps` stay close to `go.mod`.
- Root `Dockerfile` can use one build context for Go sources, contracts, generated code, and deployment metadata.
- CI commands can stay simple: `go test ./...`, `go test ./internal/...`, or repo-specific wrappers.

Do not move Go code under `go/` just because `ui/` exists. Use `go/` only when the repository already uses language-isolated roots or when shared tooling requires it.

## API Contracts and Generated Code

Contracts are source inputs:

```text
api/openapi/
api/proto/
api/schemas/
```

Generated Go output is output:

```text
gen/serverhttp
gen/clienthttp
gen/servergrpc
gen/clientgrpc
gen/consumerkafka
gen/producerkafka
gen/config
```

Prefer explicit `devctl.yaml` or generator config paths over defaults. If `devctl.yaml` sets `languages.go.generators`, use those paths.

Generated TypeScript clients belong in `ui/`, following `$devctl-react-vite` guidance. Do not share Go generated DTOs with the UI, and do not make UI generated code a Go module concern.

When a contract changes:

- update the contract source first;
- run the repo's generator if the task requires regenerated output;
- inspect generated Go and TypeScript diffs as outputs;
- update handwritten Go transport/client mappers and UI platform service adapters separately.

## UI Package Boundary

Treat `ui/` as its own frontend package root:

```text
ui/
  package.json
  index.html
  vite.config.ts
  src/
```

Go code should not import, shell into, or depend on UI implementation modules during ordinary backend runtime. Keep coupling through API contracts and generated clients.

Allowed integration points:

- CI/root scripts orchestrating UI checks or builds;
- optional Docker build steps that copy already-built UI static assets into a Go image when the product deliberately serves the UI from the Go binary or container;
- local development proxy config from UI to Go API;
- generated TypeScript clients produced from the same `api/` contract source.

If the Go binary embeds UI assets, keep the asset pipeline explicit. Do not hide a full UI build inside normal `go test`, service constructors, or runtime startup.

## Root Tooling

Root tooling may coordinate both backend and UI, but should not blur ownership:

```text
package.json          # optional root workspace scripts for UI orchestration
pnpm-workspace.yaml   # optional when ui/ participates in a JS workspace
Makefile              # optional repo task runner
justfile              # optional repo task runner
.mise.toml            # optional tool versions and tasks
```

For Go tasks, prefer the existing repo-native command source:

- `go test ./...`;
- `go test ./internal/...`;
- `make test`;
- `just test`;
- `.mise.toml` tasks;
- CI workflow commands.

For UI tasks, follow `$devctl-react-vite` and the detected package manager in `ui/`.

Root scripts should be convenience wrappers, not the only source of truth for backend package boundaries.

## Docker Build Context

For Go plus UI monorepos, keep `Dockerfile` at the repo build-context root by default.

Root context is useful when the image build needs:

- `go.mod`, `go.sum`, `cmd/`, `internal/`, and `gen/`;
- contract inputs under `api/`;
- checked-in generated code;
- migrations or embedded assets;
- root tool/version config;
- optional UI build output or static assets.

If the image only builds the Go service and does not need UI files, the root `Dockerfile` is still the default because the Go module is at repo root. Use `.dockerignore` to keep `ui/node_modules`, `ui/dist`, caches, local compose data, and test artifacts out of the image context unless explicitly needed.

Do not place the application `Dockerfile` under `ui/` or `deploy/helm`. Use `ui/` Dockerfiles only for UI-specific images when the product intentionally ships UI separately.

## Alternative Layouts

Use `go/` only when the repo already isolates languages:

```text
go/
  go.mod
  cmd/
  internal/
api/
ui/
```

In that layout, decide Docker context from actual build inputs:

- repo root when the Go build needs `api/`, generated code outside `go/`, root tooling, or UI assets;
- `go/` when the backend is intentionally isolated and CI/CD already builds with `go/` as context.

Use `services/<app>` only for true multi-service repositories:

```text
services/
  orders/
    go.mod
    cmd/
    internal/
  billing/
    go.mod
    cmd/
    internal/
api/
ui/
deploy/
```

Do not use `services/<app>` as the default shape for a single Go backend plus UI app. It adds path noise and complicates generated-code, Docker, and CI conventions before there is a real service boundary.

## Review Checklist

- Is the default single-app layout a root Go module with sibling `api/` and `ui/` directories?
- Is `api/` used for language-neutral contracts instead of Go handlers or business logic?
- Are generated Go outputs under the configured Go boundary and generated TypeScript outputs under `ui/`?
- Are `$devctl-react-vite`, `$devctl-openapi`, and `$devctl` used for their respective UI, contract, and manifest scopes?
- Is `Dockerfile` at the intended repo build-context root, with `.dockerignore` excluding UI/build caches that are not needed?
- Does local development keep Go service execution and UI dev server concerns separate unless the repo intentionally wraps them?
- Is `go/` or `services/<app>` preserved only when the repo already has that convention or a real multi-service need?
- Are root scripts convenience wrappers rather than hidden ownership of Go package boundaries?

## Related Skills and References

- Use `$devctl-react-vite` for React/Vite UI structure, generated TypeScript clients, routing, Storybook, UI services, and tests.
- Use `$devctl-openapi` for OpenAPI structure, shared schemas, operation design, and review.
- Use `$devctl` for `devctl.yaml`, scaffold defaults, generated project shape, and CLI-driven generation.
- Read `deployment-and-packaging.md` for Dockerfile, local compose, Helm, Kubernetes workloads, image args, config, and secrets.
- Read `devctl-yaml-integration.md` for manifest-driven Go components, generated boundaries, config, and runtime activation.
