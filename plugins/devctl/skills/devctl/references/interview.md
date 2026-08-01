# Interview

Use this reference when project requirements are incomplete. Ask only for decisions that affect `devctl.yaml`, CLI generation, or routing.

## Decision Order

1. Project identity.
2. Language and package/module identity.
3. Components and contracts.
4. Runtime activation.
5. Generation mode.
6. Implementation routing.

## Project Identity

Collect:

- project name in lowercase kebab-case, such as `user-service`;
- primary language: `go`, `python`, `rust`, or another explicit value;
- optional description;
- new repo vs existing repo;
- expected deployment unit if multiple binaries/services are possible.

Defaults:

- If the repo name is clear, use it as `project.name`.
- If one language is obvious from files such as `go.mod`, `Cargo.toml`, `pyproject.toml`, or `package.json`, use it.
- For existing repos, preserve established module/package/crate names.

## Language Settings

Ask for language-specific identity only when not discoverable:

- Go: module path for `languages.go.module`.
- Python: package name for `languages.python.package`.
- Rust: workspace root for `languages.rust.workspace`, crate/import prefix for `languages.rust.crate`, and package prefix for `languages.rust.package_prefix`.

For Rust, ask for explicit `languages.rust.packages[]` only when the repo already has a non-standard Cargo layout, multiple possible packages, or the user wants a self-documenting manifest. Do not ask for a full package list when Devctl can infer standard packages from `package_prefix` and enabled components.

For Go generator defaults, prefer:

```yaml
languages:
  go:
    module: github.com/acme/myapp
    generators:
      http: { tool: oapi-codegen, server_out: gen/serverhttp, client_out: gen/clienthttp }
      grpc: { tool: buf, server_out: gen/servergrpc, client_out: gen/clientgrpc }
      kafka: { lib: segmentio/kafka-go, consumers_out: gen/consumerkafka, producers_out: gen/producerkafka }
      migrations: { tool: golang-migrate, path: migrations }
```

For Rust generator defaults, prefer flexible package targets over fixed package roles:

```yaml
languages:
  rust:
    workspace: rust
    crate: myapp
    package_prefix: myapp
    generation: { mode: checked-in }
    application:
      package: app
    packages:
      - { id: app, name: myapp-core, path: crates/myapp-core, lib: myapp_core }
      - { id: api, name: myapp-server, path: crates/myapp-server, bins: [myapp-server] }
    components:
      http:
        server: { package: api, framework: axum, module: transport/http }
    generators:
      http:
        server: { package: api, module: generated/http }
        clients: { package: app, module: generated/http }
```

For new Rust projects, default Devctl-managed generated code to checked-in generated modules. Use `build-rs` only when the generator is intentionally part of `cargo build`.

## Components

Ask which components the project needs:

- HTTP server and local OpenAPI path.
- HTTP clients and their contract sources.
- gRPC server and local proto path.
- gRPC clients and their contract sources.
- Kafka consumers: name, topic, schema format, schema source/path, message, encoding, group env override.
- Kafka producers: name, topic, schema format, schema source/path, message, encoding, topic env override.
- DB connections: logical name, default backend, alternative backends, per-backend DSN env names, and migration path only when schema-managed.
- Redis instances.
- S3 logical buckets. Ask for shared S3 connection names only when the project has multiple endpoints, accounts, regions, or credential modes.
- Metrics, logging, pprof, or other singleton infrastructure capabilities.

Defaults:

- HTTP server contract: `api/openapi/swagger.yaml`.
- gRPC server contract: `api/proto/grpc`.
- Kafka proto schema: `api/proto/kafka/<topic>.proto`.
- Kafka JSON schema: `api/json/kafka/<topic>.json`.
- ENV prefix: `UPPERCASE(project.name with - replaced by _) + "_"`.
- Kafka consumer group env: `KAFKA_<NAME>_GROUP`, default `<project.name>-<name>-group`.
- Kafka producer topic env: `KAFKA_<NAME>_TOPIC`, default the declared topic.
- S3 default connection: `default`.
- A single S3 bucket uses or creates `default`; do not ask for a connection name in the simple single-connection case.
- S3 bucket env: `S3_<NAME>_BUCKET`.
- S3 prefix env: `S3_<NAME>_PREFIX` when a per-bucket object prefix matters.

Do not ask about default contract paths when the repo has no conflicting convention. Ask about paths only when existing files suggest multiple candidates, paths are non-standard, or the user asks for an explicit self-documenting manifest.

For S3, do not ask about IAM policies, bucket provisioning, CORS, lifecycle, encryption, CDN, or public access by default. Those belong outside `devctl.yaml` unless the user explicitly scopes Devctl into infrastructure provisioning.

## Contract Sources

For external contracts, collect:

- source name in kebab-case;
- type: `devctl`, `git`, `url`, or `local`;
- required fields for that type;
- optional consumer-side `export` when the source type is `devctl`;
- explicit path only when defaults do not apply.

Do not ask for source details when the contract is local and already exists in the expected path.

## Runtime Activation

Ask whether runtime components are toggleable or always active when it matters.

Defaults:

- HTTP/gRPC servers, Kafka consumers, metrics, pprof, and workers may use `start`.
- Kafka producers do not use `start`; they are outbound adapters controlled by calling code.
- If the user wants the component always active, omit `start`.
- If using CLI, `--always` means omit `start`.

## Output Mode

Confirm output mode when it changes the work:

- manifest-only: edit or create `devctl.yaml`;
- manifest plus generation: update YAML and run relevant `devctl gen ...` when available;
- manifest plus implementation: update YAML/generate code, then route to the relevant subskill.

Tooling defaults:

- Do not ask which project-local tooling surface to use for Devctl-managed generation; use `.mise.toml` by default.
- Ask only when an existing repo already has a different established generation workflow and preserving it would materially change the output.
- For new scaffolds, expect `mise install` before generation and project-owned tool version updates after scaffold.

If the user asks for implementation but no language subskill exists, stop after manifest/CLI work and explain the missing skill.
