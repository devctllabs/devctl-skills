# Deployment and Packaging

## Contents

- Role
- Default Layout
- Docker Image
- Local Infrastructure
- Helm Chart
- Configuration and Secrets
- Runtime Scenarios
- Devctl Boundary
- Review Checklist
- Related References

## Role

Use this reference when placing, creating, or reviewing deployment-facing files for a Go service:

- root `Dockerfile` and `.dockerignore`;
- local infrastructure `docker-compose.yml`;
- Helm charts for Kubernetes deployment;
- image entrypoints, command args, probes, resources, values, config, and secrets;
- deployment layout choices that need to align with `cmd/<app_name>`, `internal/deps`, `api/`, `ui/`, and `devctl.yaml`.

Keep this reference focused on packaging and deployment shape. Use `runtime-and-wiring.md` for in-process lifecycle and DI, `observability-and-health.md` for health endpoint behavior, and `monorepo-and-ui.md` for Go plus UI monorepo layout.

## Default Layout

Default repo layout:

```text
Dockerfile
.dockerignore

deploy/
  local/
    docker-compose.yml
  helm/
    <app_name>/
      Chart.yaml
      values.yaml
      templates/
        deployment.yaml
        service.yaml
        configmap.yaml
        secret.yaml          # only for references, not literal secrets
        serviceaccount.yaml
        ingress.yaml         # when the app exposes HTTP externally
        cronjob.yaml         # when cronjob scenarios exist
```

Use this layout when a repo has no stronger convention. Preserve an existing layout such as `charts/<app_name>`, `go/Dockerfile`, `services/<app>/Dockerfile`, or root `docker-compose.yml` when it is already used by CI/CD, release automation, or platform tooling.

File ownership:

- root `Dockerfile`: builds the application image from the intended Docker build context;
- root `.dockerignore`: controls the application build context;
- `deploy/local/docker-compose.yml`: runs local infrastructure dependencies;
- `deploy/helm/<app_name>`: deploys the application to Kubernetes.

Do not put the application `Dockerfile` inside the Helm chart. Helm consumes an image reference; it does not build the image.

## Docker Image

Place `Dockerfile` at the repo root by default because the build context usually needs the root Go module and may also need language-neutral contract sources, checked-in generated code, migrations, or embedded assets.

For Go plus UI monorepos, root context is the default when the image build needs:

- `go.mod`, `go.sum`, `cmd/`, `internal/`, and `gen/`;
- contract inputs under `api/`;
- checked-in generated Go code;
- migrations or embedded assets;
- root tool/version config;
- optional UI build output or static assets.

When an existing repo intentionally places the Go module under `go/` or `services/<app>`, choose the Docker build context from actual inputs:

- repo root when the backend build needs sibling `api/`, generated code outside the module, root tooling, or UI assets;
- the Go module directory when the backend is intentionally isolated and CI/CD already builds from that directory.

Default image rules:

- Use a multi-stage build unless the repo already has a simpler accepted pattern.
- Read the Go version from `go.mod` or existing tool/version config.
- Build one application binary by default, matching `cmd/<app_name>`.
- Keep the binary capable of running standard subcommands: `api`, `consumer <name>`, and `cronjob <job>`.
- Use Helm or runtime args to choose the scenario; do not build separate images only to switch subcommands.
- Run as a non-root user in the runtime image when the base image supports it.
- Keep runtime images small and avoid shipping source, tests, caches, VCS metadata, or local tooling.
- Do not bake secrets, DSNs, tokens, private keys, or environment-specific config into the image.
- Prefer CI to run tests before image build; do not rely on Dockerfile test stages unless the repo already uses that flow.

Typical command shape:

```text
ENTRYPOINT ["/app/<app_name>"]
```

Helm or Kubernetes workload args select the runtime:

```text
args: ["api"]
args: ["consumer", "orders"]
args: ["cronjob", "reconcile-orders"]
```

`.dockerignore` should usually exclude:

```text
.git
tmp
dist
coverage*
*.test
deploy/local
node_modules
ui/node_modules
ui/dist
```

Adjust exclusions for generated files and UI assets carefully. Do not exclude generated Go code, contracts, migrations, or UI build output when the Docker build expects them to be present.

## Local Infrastructure

Place local infrastructure compose files under:

```text
deploy/local/docker-compose.yml
```

Default purpose:

- run dependencies such as PostgreSQL, Redis, Redpanda/Kafka, MinIO/S3, LocalStack, or mail/test doubles;
- provide local ports, credentials, buckets, topics, and databases for development;
- match logical names from `devctl.yaml`, generated config, or existing local docs.

Do not include the Go application service in local compose by default. Local app execution should normally stay in `go run`, `air`, IDE run configs, or the repo's existing dev command so code changes do not require image rebuilds. Add the app to compose only when the user asks for full containerized local development or the repo already uses that model.

Compose service names should be stable and logical:

```text
postgres
redis
redpanda
minio
```

Use local-only credentials and ports. Keep production-like topology names where useful, but do not copy production secrets or managed-service endpoints into compose.

For S3-compatible local storage, include bucket initialization only when the app needs buckets to exist at startup. A separate one-shot init service is better than hidden application-side bucket creation unless the product explicitly owns bucket provisioning.

For Kafka-compatible local brokers, prefer logical consumer/producer names from `devctl.yaml` and config. Do not encode physical topic names into Go CLI commands; topic selection belongs to DI/config.

## Helm Chart

Place the default app chart under:

```text
deploy/helm/<app_name>/
```

The chart deploys the application image and runtime scenarios to Kubernetes:

- API server: `Deployment` plus `Service`, optional `Ingress`;
- consumers: one `Deployment` per logical consumer or a templated list of consumer deployments;
- cronjobs: Kubernetes `CronJob` resources for one-shot jobs;
- config: `ConfigMap` for non-secret values and references to `Secret` or `ExternalSecret` for secret material;
- service account and RBAC only when the app needs Kubernetes API permissions;
- probes, resources, security context, labels, and annotations.

The chart should expose image values rather than hardcoding tags:

```yaml
image:
  repository: example/<app_name>
  tag: ""
  pullPolicy: IfNotPresent
```

Use immutable image tags or digests in real deployments. Avoid defaulting production deployments to `latest`.

For API workloads:

- set args to `["api"]`;
- define ports from existing config or generated server defaults;
- add readiness and liveness probes only to endpoints the app actually exposes;
- keep liveness cheap and avoid required external dependency checks.

For consumer workloads:

- set args to `["consumer", "<consumer-name>"]`;
- configure graceful shutdown through `terminationGracePeriodSeconds`;
- avoid HTTP service resources unless the consumer exposes metrics or debug endpoints intentionally.

For cronjob workloads:

- use Kubernetes `CronJob`;
- set args to `["cronjob", "<job-name>"]`;
- configure `restartPolicy`, deadlines, concurrency policy, and history limits explicitly.

Do not package local-only dependencies such as PostgreSQL, Kafka, or MinIO into the app chart by default. Real environments should usually provide dependencies externally or through platform-owned charts. Add chart dependencies only when the repo or platform deliberately owns those dependencies.

## Configuration and Secrets

Follow existing generated config and `internal/deps` loading rules.

Default placement:

- non-secret defaults: `values.yaml`;
- rendered non-secret runtime config: `ConfigMap`;
- secret references: `Secret`, `ExternalSecret`, sealed secrets, or the platform's existing secret mechanism;
- environment variable names: generated config names or established repo names, not ad hoc strings spread through templates.

When `devctl.yaml` exists, inspect:

- `components.*.env` and `env.custom` for generated config fields;
- `env.prefix` for environment naming policy;
- `components.db`, `components.kafka`, `components.redis`, and `components.s3` for dependency names;
- `start` blocks for runtime activation toggles.

Do not invent new manifest fields from this skill. If the task is to author or change `devctl.yaml`, route it through `$devctl`.

## Runtime Scenarios

Keep deployment commands aligned with the Go runtime model:

```text
<app_name> api
<app_name> consumer <consumer-name>
<app_name> cronjob <job>
```

Use separate Kubernetes workloads when lifecycle or scaling differs:

- API replicas scale independently from consumers.
- Each logical consumer can have its own replica count and resource settings.
- Cronjobs should not run as long-lived deployments.

Do not split Go binaries or images only because Kubernetes workloads differ. Split binaries only when the Go runtime dependencies, lifecycle, or deploy ownership materially differ.

## Devctl Boundary

`devctl-go` documents preferred placement and review guidance for Go application deployment artifacts.

Source of truth split:

- `devctl` generator/templates own scaffold defaults and any generated deployment files.
- `devctl-go` explains where files should live and how handwritten or reviewed Go deployment artifacts should align with architecture.
- `devctl.yaml` is project context for enabled components, generated config, runtime activation, and logical dependency names.

When generated deployment scaffolding appears in a repo, preserve the generated boundary and update the generator or manifest through `$devctl` instead of hand-editing generated files.

## Review Checklist

- Is `Dockerfile` at the build-context root, with `.dockerignore` excluding local noise but not required generated code?
- Does the image run one app binary and choose `api`, `consumer`, or `cronjob` through args?
- Are secrets absent from Docker layers, compose defaults, Helm values, and rendered ConfigMaps?
- Does `deploy/local/docker-compose.yml` contain local infrastructure only unless app-in-compose was explicitly requested?
- Do local service names and ports match `devctl.yaml`, generated config, or existing project docs?
- For Go plus UI monorepos, does the Docker build context include required `api/`, generated Go code, migrations, and deliberate UI static assets without including local UI caches?
- Is the Helm chart under `deploy/helm/<app_name>` unless the repo already has a platform convention?
- Are API, consumer, and cronjob workloads separated when lifecycle or scaling differs?
- Are readiness and liveness probes tied to real endpoints and appropriate dependency checks?
- Are image tags, resources, security contexts, and shutdown settings explicit enough for real Kubernetes deployment?

## Related References

- Read `runtime-and-wiring.md` for `cmd/<app_name>` subcommands, DI, lifecycle, shutdown, and runtime args.
- Read `devctl-yaml-integration.md` for manifest-driven components, config, generated boundaries, and runtime activation.
- Read `observability-and-health.md` for readiness, liveness, metrics, debug, and profiling behavior.
- Read `monorepo-and-ui.md` for Go plus UI monorepo layout, `api/` contract ownership, `ui/` package boundaries, and root build-context decisions.
