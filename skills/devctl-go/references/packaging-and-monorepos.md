# Packaging and monorepos

Packaging follows the deployable unit and its real runtime scenarios. Preserve established CI/CD,
chart, and build-context conventions; use these defaults for new projects only when deployment is
in scope.

## Go plus UI

Keep one authoritative API contract and explicit module/build boundaries. A new combined repository
may place the Go module at the root with `cmd`, `internal`, generated Go, migrations, and `api/`, plus
a separate `ui/` package; use a nested Go module only when isolation, release ownership, or existing
tooling requires it.

Backend code owns business behavior and server-side mapping. `$devctl-openapi` owns OpenAPI content,
`$devctl` owns configured server/client generation, and `$devctl-react-vite` owns frontend structure
and generated client integration. Generated TypeScript and Go code consume the same contract source
and remain inside their configured boundaries.

Root tooling coordinates cross-package checks without duplicating package-owned commands. Choose
the Docker build context from actual inputs: use repository root when the backend build consumes
sibling contracts, generated code, migrations, or UI assets; otherwise use the isolated module
directory already supported by CI.

## Container image

Keep a Dockerfile with the deployable unit and a `.dockerignore` at its build-context root. Use a
multi-stage build when it reduces the runtime image without fighting an established pattern. Read
the Go version and build command from repository sources, build the intended binary, run as a
non-root user when supported, and ship only runtime files.

One application image may select API, consumer, and cronjob subcommands through runtime args when
they share code and dependencies. Split binaries or images only when lifecycle, dependencies,
release ownership, or security boundaries materially differ. Keep secrets and environment-specific
configuration out of image layers.

Do not exclude contracts, checked-in generated code, migrations, embedded assets, or deliberate UI
output required by the build. Exclude VCS data, local caches, tests, and package-manager artifacts
that the build does not consume.

## Local infrastructure

Use Compose for required local dependencies such as a database, cache, broker, or object store.
Keep stable logical names aligned with `devctl.yaml` and generated config. Local-only credentials
are acceptable; production secrets and managed-service endpoints are not.

Run the application through its normal development command unless the project or user requires a
fully containerized workflow. Provision buckets, topics, or databases explicitly through owned
one-shot tooling rather than hidden application startup side effects.

## Helm and Kubernetes

Package the application under the repository's chart convention; for a new standalone service,
default to `deploy/helm/<app>`. The chart consumes an image reference and does not build it.

- API: Deployment, Service, optional Ingress, `api` args, and probes that target real endpoints.
- Consumer: independently scalable Deployment per logical consumer or a clear templated list, with
  graceful termination and no public Service unless one is intentionally exposed.
- Cronjob: Kubernetes CronJob with explicit schedule, deadlines, concurrency, restart, and history
  policies.

Expose immutable image tags/digests, resources, security context, service account/RBAC only when
needed, and a termination grace period consistent with application shutdown. Put non-secret config
in ConfigMaps and reference the platform's Secret/ExternalSecret mechanism for credentials. Do not
bundle production databases, brokers, or object stores into the application chart unless the
platform deliberately gives the application that ownership.

Startup and liveness probes may share the cheap process-local liveness endpoint with different
Kubernetes timing policies. Readiness may include only dependencies required to accept work. A
probe is valid only when the selected runtime actually exposes it.

## Verification

Build the image from the same context CI uses, inspect its entrypoint/user/runtime contents, and run
the repository's container checks. Render and lint the chart with representative API, consumer, and
cronjob values that exist. Verify args, ports, probes, config/secret references, resource ownership,
and graceful shutdown against the Go runtime graph. For combined repositories, also prove that
contract and generated-client drift checks cross the module boundary without copying sources.
