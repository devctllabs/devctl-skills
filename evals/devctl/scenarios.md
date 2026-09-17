# devctl scenarios

## Precise manifest change

### Request

Change this project's environment prefix to BILLING_ and preserve its HTTP contract path and
other settings. Validate the manifest and inspect resolved defaults when the local CLI is
available. This is a manifest-only change.

### Setup

In a disposable workspace create `devctl.yaml`:

```yaml
version: 1
project: {name: billing, language: go}
env: {prefix: OLD_}
paths: {}
sources: {}
exports: {}
components:
  http:
    server: {openapi: api/billing.yaml}
languages:
  go: {module: example.com/billing}
```

Create `go.mod` declaring `module example.com/billing` and `api/billing.yaml` containing a minimal
OpenAPI 3.1 document with info and empty paths. Provide `skills/devctl/SKILL.md` and its resources.
Record local CLI availability before dispatch; no dependency installation is part of this case.

### Success criteria

- Only the requested prefix changes; the non-default contract path remains explicit.
- When available, actual validate/inspect output supports the result. When unavailable, the
  executor makes the direct edit and explicitly reports CLI checks unrun instead of inventing them.
- No generation, installation, implementation or manifest schema invention occurs.

## Refresh a local contract source

### Request

Configure an HTTP client named `jobs` using the local contract source at `contracts/`, then
synchronize, lint and generate that client with the installed Devctl toolchain. Preserve the
handwritten `notes.txt`. Report unavailable tooling rather than substituting handwritten output.

### Setup

Use a disposable workspace with the manifest above but no HTTP server component. Create
`contracts/jobs.yaml` with a valid OpenAPI 3.1 `GET /health` returning 204, operationId `getHealth`.
Create `notes.txt` containing `handwritten sentinel`. Provide the target skill and resources.
This execution requires a real installed Devctl CLI and its HTTP generation/lint toolchain;
preflight their availability and mark the case unrun if unavailable. Do not create a fake CLI
that always succeeds. Local help defines supported source/path syntax.

### Success criteria

- The manifest declares the local source/client using the actual local CLI contract.
- Actual commands show source synchronization before dependent lint/generation; generated output
  comes from the configured generator, not manual imitation. Validate/inspect support the manifest.
- Handwritten sentinel stays unchanged and the report distinguishes generated artifacts from
  handwritten implementation. No network service or real publication is required.

## Reject an unsupported manifest language

### Request

Create a Devctl manifest for this existing Rust service and scaffold it. Use the locally installed
Devctl CLI when available.

### Setup

In a disposable workspace create `Cargo.toml` for package `ledger` and `src/main.rs`. Do not create
`devctl.yaml`. Provide `skills/devctl/SKILL.md` and its resources.

### Success criteria

- The executor establishes from the skill and local CLI that Devctl v1 supports Go projects only.
- It does not invent `languages.rust`, run scaffold, or create any manifest or generated files.
- It reports the unsupported boundary and routes generic Rust implementation work directly to the
  Rust skill only if such work was requested.

## Add ClickHouse with migrations

### Request

Add a ClickHouse database connection named `analytics` with the standard migration target. Validate
the manifest and inspect the resulting resource and runtime configuration. Do not apply migrations.

### Setup

In a disposable workspace create this complete manifest and a matching `go.mod`:

```yaml
version: 1
project: {name: analytics-api, language: go}
env: {}
paths: {}
sources: {}
exports: {}
components: {}
languages:
  go: {module: example.com/analytics-api}
```

Provide `skills/devctl/SKILL.md` and its resources. The case requires a real installed Devctl CLI;
mark it unrun if unavailable rather than simulating its output.

### Success criteria

- The executor reads current `devctl add db --help` and uses the supported ClickHouse operation.
- The manifest contains one `clickhouse` variant and its default migration declaration; validation
  and inspection evidence comes from the real CLI.
- No SQL is created or applied, and no unrelated component or generated output changes.
