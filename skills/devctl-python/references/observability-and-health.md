# Observability and Health

## Contents

- Ownership
- Logging
- Instrumentation Usage
- Metrics
- Tracing
- Health Checks
- Debug and Profiling
- Review Checklist

## Ownership

Observability is wired at entrypoint, transport, adapter, and service-wrapper boundaries.

- Domain: no logging, metrics, tracing, framework, or SDK observability dependencies.
- Service/usecase: may receive decorators/wrappers for logging, metrics, tracing, and audit.
- Repository/client: may log adapter diagnostics and record adapter metrics.
- Transport: owns request/message spans, protocol labels, status mapping, and middleware.
- Entry/deps: configures logging, metrics exporters, tracing providers, and health server wiring.

## Logging

Use the repo's existing logging convention first. For new projects, start with standard-library `logging` configured at entrypoint/deps. Use `structlog` or another structured logger when the repo already uses it or structured events are a real requirement.

Rules:

- configure logging once at process startup;
- do not configure global logging at import time;
- pass loggers or wrappers explicitly when code needs them;
- do not invent a custom logger Protocol unless there are multiple concrete logger backends to support;
- include stable fields such as request ID, operation, actor/tenant when safe, and entity IDs;
- never log raw secrets, tokens, DSNs, passwords, or private payloads.

Service code can log operation-level decisions through wrappers or explicit logger dependencies when useful. Domain code should not log.

## Instrumentation Usage

Use wrappers/decorators or middleware for cross-cutting instrumentation:

- transport middleware for request/message spans and protocol metrics;
- service wrappers for business operation metrics and audit;
- repository/client wrappers or adapter-local instrumentation for backend calls.

Do not scatter metrics and tracing setup through domain code.

## Metrics

Common metrics:

- request/message count and latency by protocol, route/message type, and status;
- service operation count and latency by operation and result category;
- repository/client latency and error category;
- queue lag, retry, drop, and DLQ counts for workers;
- resource pool health when available.

Choose label cardinality carefully. Do not label metrics by raw user input, unbounded IDs, error strings, or secret values.

## Tracing

Tracing should follow boundary ownership:

- transport creates request/message spans and extracts propagation context;
- services may create operation spans through wrappers;
- repositories/clients add backend spans when the project has tracing enabled;
- entrypoint/deps configures exporters and sampling.

Keep trace context technical. Do not use tracing context as the only carrier for business-critical actor, tenant, or idempotency facts.

## Health Checks

Health/readiness belongs to server transport and dependency wiring:

- liveness: process is running and event loop/server can respond;
- readiness: required dependencies are reachable enough to serve traffic;
- startup: optional gate for migrations, config, or warmup when needed.

Health endpoints should not run expensive business flows. Keep checks bounded with timeouts.

For workers, expose health through the platform the project uses: metrics, heartbeat records, process supervisor checks, or a small HTTP endpoint if the deployment convention requires it.

## Debug and Profiling

Debug/profiling endpoints are deployment-sensitive.

Rules:

- keep debug endpoints disabled or protected by default;
- do not expose profiling endpoints publicly;
- configure sampling, log level, and debug toggles through typed config;
- avoid adding debug dependencies to domain/service modules.

## Review Checklist

- Is logging configured only at process startup?
- Are secrets redacted?
- Are metrics labels bounded?
- Does tracing stay out of domain?
- Are health checks cheap, bounded, and deployment-appropriate?
- Are service/repository/client errors recorded with stable categories instead of raw strings?
- Are observability wrappers wired in `deps` or transport rather than hidden in constructors?
