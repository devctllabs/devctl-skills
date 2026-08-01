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

Keep this reference focused on packaging and deployment shape. Use `runtime-and-wiring.md` for in-process entrypoints, config loading, dependency construction, and shutdown. Use `observability-and-health.md` for health endpoint behavior.

## Default Layout

For a deployable Python application:

```text
pyproject.toml
uv.lock                  # when uv is used
Dockerfile
.dockerignore
src/
tests/
api/
deploy/
  local/
    docker-compose.yml
  helm/
    <app_name>/
```

Put the application `Dockerfile` and `.dockerignore` at the repo build-context root by default. Use `services/<app>/Dockerfile` or `python/Dockerfile` only when an existing repo convention or real multi-service boundary justifies it.

## Docker Image

Default image goals:

- install only runtime dependencies in the final image;
- copy lockfiles and metadata before source where that improves caching;
- run as a non-root user when practical;
- expose only required ports;
- keep generated files either checked in or generated as an explicit build step, not silently at runtime;
- make the container command match the installed script or project command.

For projects using `uv`, prefer using the lockfile for reproducible installs. For other tools, preserve the existing Poetry/Hatch/PDM/pip-tools/pip convention.

Do not add tool migration as part of ordinary deployment work unless the user asks.

## Local Infrastructure

Put local infrastructure under:

```text
deploy/local/docker-compose.yml
```

Use it for dependencies such as Postgres, Redis, object storage, Kafka-compatible brokers, and observability backends.

Rules:

- keep application source bind mounts only when the compose file is explicitly for local dev;
- keep secrets empty, redacted, or loaded from local env files;
- do not make local compose the production deployment contract.

## Helm Chart

For Kubernetes packaging, prefer:

```text
deploy/helm/<app_name>/
```

Workloads should match runtime scenarios:

- server deployment for HTTP/gRPC APIs;
- worker deployment for long-running consumers;
- job/cronjob for one-shot jobs;
- migrations job when the project runs migrations separately.

Use typed config and generated env names when Devctl owns config generation.

## Configuration and Secrets

Rules:

- keep config values in env, files, or generated config according to repo convention;
- do not bake secrets into images;
- render examples with empty or redacted secret values;
- pass secret references through deployment values, not source code;
- align ports, probes, and runtime toggles with actual entrypoints.

## Runtime Scenarios

Common command shapes:

```text
myapp serve
myapp worker <name>
myapp cronjob <job>
myapp migrate
```

Use one image for server/worker/job scenarios when dependencies and release artifact are the same. Split images only when dependencies, lifecycle, security policy, or deployment units materially differ.

## Devctl Boundary

`devctl.yaml` may define components, generated config, env names, and runtime activation toggles. Use `$devctl` for manifest edits, default resolution, generation, and source materialization.

This skill explains where deployment files should live and how handwritten or reviewed Python deployment artifacts should align with package and entrypoint architecture.

## Review Checklist

- Is the Docker build context rooted where all needed package files are available?
- Does the image install dependencies reproducibly using the project's chosen tool?
- Are generated files handled explicitly?
- Are server, worker, and job commands aligned with `[project.scripts]` or the project's command runner?
- Are local compose files scoped to local dependencies?
- Are Helm workloads split by real runtime scenario?
- Are probes, ports, env vars, and secret references aligned with config/deps code?

## Related References

- Read `runtime-and-wiring.md` for command and process lifecycle.
- Read `observability-and-health.md` for probes and metrics endpoints.
- Read `devctl-yaml-integration.md` for generated config and manifest context.
