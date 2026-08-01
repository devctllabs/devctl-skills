# Deployment and Packaging

## Contents

- Role
- Default Layout
- Docker Image
- Local Infrastructure
- Helm Chart
- Configuration and Secrets
- Runtime Scenarios
- Tauri Boundary
- Devctl Boundary
- Review Checklist
- Related References

## Role

Use this reference when placing, creating, or reviewing deployment-facing files for a Rust project:

- root `Dockerfile` and `.dockerignore`;
- local infrastructure `docker-compose.yml`;
- Helm charts for Kubernetes deployment;
- image entrypoints, command args, probes, resources, values, config, and secrets;
- deployment layout choices that need to align with Cargo workspaces, delivery crates, Tauri boundaries, and `devctl.yaml`.

Keep this reference focused on server/CLI container packaging and Kubernetes deployment shape. Use `runtime-and-wiring.md` for in-process lifecycle and delivery crate composition, `observability-and-health.md` for health endpoint behavior, and `tauri-and-monorepo.md` for Tauri desktop/mobile bundle packaging.

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
        cronjob.yaml         # when scheduled jobs exist
```

Use this layout when a repo has no stronger convention. Preserve an existing layout such as `charts/<app_name>`, `rust/Dockerfile`, or root `docker-compose.yml` when it is already used by CI/CD, release automation, or platform tooling.

File ownership:

- root `Dockerfile`: builds the deployable Rust server/CLI image from the intended Docker build context;
- root `.dockerignore`: controls the application build context;
- `deploy/local/docker-compose.yml`: runs local infrastructure dependencies;
- `deploy/helm/<app_name>`: deploys the server/CLI application image to Kubernetes.

Do not put the application `Dockerfile` inside the Helm chart. Helm consumes an image reference; it does not build the image.

## Docker Image

Place `Dockerfile` at the repo root by default because the build context often needs more than the Cargo workspace:

- root `Cargo.toml` or `rust/Cargo.toml`;
- `rust/crates/*`, `rust/tauri` only when a server/CLI image intentionally depends on it, and workspace metadata;
- contract sources such as `api/`, `proto/`, or `schemas/`;
- checked-in generated code;
- root scripts or config used by build/codegen.

For Rust-only repos, the repo root is usually also the Cargo workspace root. For repos shaped as `api/`, `ui/`, and `rust/`, keep the Docker build context at repo root when the image build needs files outside `rust/`. A `rust/Dockerfile` is acceptable when the build context is deliberately `rust/` and CI/CD already treats Rust as an isolated deployable workspace.

Default image rules:

- Use a multi-stage build unless the repo already has a simpler accepted pattern.
- Read Rust toolchain policy from `rust-toolchain.toml`, workspace `rust-version`, `.mise.toml`, CI, or existing Dockerfiles.
- Build only the shipped server/CLI binary by default, such as `<app>-server` or the product binary from `<app>-cli`.
- Use Kubernetes args or CLI subcommands to select server, worker, migration, seed, or admin modes; do not build separate images only to switch modes.
- Keep runtime images small and avoid shipping source, tests, Cargo registry cache, target cache, VCS metadata, or local tooling.
- Run as a non-root user in the runtime image when the base image supports it.
- Do not bake secrets, DSNs, tokens, private keys, or environment-specific config into the image.
- Prefer CI to run tests before image build; do not rely on Dockerfile test stages unless the repo already uses that flow.

Typical command shapes:

```text
ENTRYPOINT ["/app/<app_name>"]
CMD ["serve"]
```

or, for a dedicated server binary:

```text
ENTRYPOINT ["/app/<app_name>-server"]
```

Helm or Kubernetes workload args select the runtime when the shipped binary supports subcommands:

```text
args: ["serve"]
args: ["worker", "orders"]
args: ["migrate"]
args: ["job", "reconcile-orders"]
```

`.dockerignore` should usually exclude:

```text
.git
target
tmp
dist
coverage*
deploy/local
node_modules
```

Adjust exclusions for generated files carefully. Do not exclude checked-in generated Rust code, contract files, or embedded migration assets when the Docker build expects them to be present.

## Local Infrastructure

Place local infrastructure compose files under:

```text
deploy/local/docker-compose.yml
```

Default purpose:

- run dependencies such as PostgreSQL, SQLite support services, Redis, Redpanda/Kafka, MinIO/S3, LocalStack, or mail/test doubles;
- provide local ports, credentials, buckets, topics, and databases for development;
- match logical names from `devctl.yaml`, generated config, or existing local docs.

Do not include the Rust application service in local compose by default. Local app execution should normally stay in `cargo run`, `cargo watch`, IDE run configs, Tauri dev commands, or the repo's existing dev command so code changes do not require image rebuilds. Add the app to compose only when the user asks for full containerized local development or the repo already uses that model.

Compose service names should be stable and logical:

```text
postgres
redis
redpanda
minio
```

Use local-only credentials and ports. Keep production-like topology names where useful, but do not copy production secrets or managed-service endpoints into compose.

For S3-compatible local storage, include bucket initialization only when the app needs buckets to exist at startup. A separate one-shot init service is better than hidden application-side bucket creation unless the product explicitly owns bucket provisioning.

For Kafka-compatible local brokers, prefer logical consumer/producer names from `devctl.yaml` and config. Do not encode physical topic names into product CLI commands; topic selection belongs to delivery config and runtime wiring.

## Helm Chart

Place the default app chart under:

```text
deploy/helm/<app_name>/
```

The chart deploys the server/CLI application image and runtime scenarios to Kubernetes:

- server runtime: `Deployment` plus `Service`, optional `Ingress`;
- workers: one `Deployment` per logical worker/consumer or a templated list of worker deployments;
- scheduled jobs: Kubernetes `CronJob` resources for one-shot jobs;
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

For server workloads:

- set args to the server mode, such as `["serve"]`, when the binary uses subcommands;
- define ports from existing config or generated server defaults;
- add readiness and liveness probes only to endpoints the app actually exposes;
- keep liveness cheap and avoid required external dependency checks.

For worker workloads:

- set args to a logical worker mode, such as `["worker", "<worker-name>"]`;
- configure graceful shutdown through `terminationGracePeriodSeconds`;
- avoid HTTP service resources unless the worker exposes metrics or debug endpoints intentionally.

For scheduled jobs:

- use Kubernetes `CronJob`;
- set args to the intended one-shot command, such as `["job", "<job-name>"]` or `["migrate"]`;
- configure `restartPolicy`, deadlines, concurrency policy, and history limits explicitly.

Do not package local-only dependencies such as PostgreSQL, Kafka, or MinIO into the app chart by default. Real environments should usually provide dependencies externally or through platform-owned charts. Add chart dependencies only when the repo or platform deliberately owns those dependencies.

## Configuration and Secrets

Follow existing generated config and delivery crate loading rules.

Default placement:

- non-secret defaults: `values.yaml`;
- rendered non-secret runtime config: `ConfigMap`;
- secret references: `Secret`, `ExternalSecret`, sealed secrets, or the platform's existing secret mechanism;
- environment variable names: generated config names or established repo names, not ad hoc strings spread through templates.

When `devctl.yaml` exists, inspect:

- `components.*.env` and `env.custom` for generated config fields;
- `env.prefix` for environment naming policy;
- Rust component bindings for server, worker, CLI, Tauri, and generated config targets;
- storage, messaging, cache, and object-storage components for dependency names;
- `start` blocks for runtime activation toggles.

Delivery crates load env, CLI args, app paths, config files, and secrets, then pass typed values into `<app>-core`. Do not make core depend on Kubernetes, Helm, process env, or global runtime state by default.

Do not invent new manifest fields from this skill. If the task is to author or change `devctl.yaml`, route it through `$devctl`.

## Runtime Scenarios

Keep deployment commands aligned with the Rust delivery model:

```text
<app> serve
<app> worker <worker-name>
<app> migrate
<app> job <job-name>
```

or use a dedicated server binary:

```text
<app>-server
```

Use separate Kubernetes workloads when lifecycle or scaling differs:

- server replicas scale independently from workers.
- Each logical worker can have its own replica count and resource settings.
- Scheduled jobs should not run as long-lived deployments.
- Migration commands should be explicit one-shot jobs or CI/CD steps, not hidden server startup side effects, unless the repo already has that policy.

Do not split Rust binaries or images only because Kubernetes workloads differ. Split binaries when dependencies, lifecycle, deploy units, release artifacts, or CI checks materially differ.

## Tauri Boundary

Tauri packaging is separate from server/CLI Docker and Helm deployment.

Rules:

- Keep Tauri desktop/mobile bundle metadata, icons, `tauri.conf.json`, and Tauri CLI package setup under `rust/tauri` and related UI workspace files.
- Do not add `rust/tauri` to server Helm charts unless the chart deploys a separate server/CLI image that intentionally depends on Tauri outputs, which should be rare.
- Do not use Helm or Kubernetes guidance for Tauri desktop bundle distribution.
- If a repo has both Tauri and server delivery, package the server/CLI runtime separately from the Tauri bundle.

Use `tauri-and-monorepo.md` for Tauri-specific paths, app data directories, UI bridge boundaries, and desktop/mobile build commands.

## Devctl Boundary

`devctl-rust` documents preferred placement and review guidance for Rust deployment artifacts.

Source of truth split:

- `devctl` generator/templates own scaffold defaults and any generated deployment files.
- `devctl-rust` explains where files should live and how handwritten or reviewed Rust deployment artifacts should align with workspace and delivery-crate architecture.
- `devctl.yaml` is project context for enabled components, generated config, runtime activation, package bindings, and logical dependency names.

When generated deployment scaffolding appears in a repo, preserve the generated boundary and update the generator or manifest through `$devctl` instead of hand-editing generated files.

## Review Checklist

- Is `Dockerfile` at the intended build-context root, with `.dockerignore` excluding local noise but not required generated code, contract files, or migration assets?
- Does the image build only the shipped server/CLI binary and choose runtime mode through args when appropriate?
- Are Tauri bundle files kept separate from server/CLI Docker and Helm packaging?
- Are secrets absent from Docker layers, compose defaults, Helm values, and rendered ConfigMaps?
- Does `deploy/local/docker-compose.yml` contain local infrastructure only unless app-in-compose was explicitly requested?
- Do local service names and ports match `devctl.yaml`, generated config, or existing project docs?
- Is the Helm chart under `deploy/helm/<app_name>` unless the repo already has a platform convention?
- Are server, worker, migration, and scheduled-job workloads separated when lifecycle or scaling differs?
- Are readiness and liveness probes tied to real endpoints and appropriate dependency checks?
- Are image tags, resources, security contexts, and shutdown settings explicit enough for real Kubernetes deployment?

## Related References

- Read `runtime-and-wiring.md` for delivery crates, runtime composition, config loading, shutdown, and binary/subcommand shape.
- Read `devctl-yaml-integration.md` for manifest-driven packages, components, generated config, and runtime activation.
- Read `observability-and-health.md` for readiness, liveness, metrics, debug, and profiling behavior.
- Read `tauri-and-monorepo.md` for Rust-side Tauri packaging boundaries and monorepo scripts.
