# Devctl YAML

This is the autonomous working reference for `devctl.yaml` authoring.

## Contents

- Purpose
- Default Authority and Omission
- Top-Level Shape
- Project
- Env
- Components
- Sources
- Exports
- Languages
- Runtime Activation
- Source Materialization and Buf Boundary
- Generation Rules
- Generated Env Outputs
- Generated Contract Locations
- Expected CLI Validation Coverage

## Purpose

`devctl.yaml` is a declarative project manifest. It describes project identity, components, environment variables, contract sources, language-specific generation settings, and runtime activation.

The manifest controls project shape, component declarations, env settings, runtime activation, and generator output paths. Contract files such as OpenAPI, Proto, and JSON Schema control API/message content.

Keep the manifest declarative. Do not encode imperative build scripts, tool installation steps, task definitions, or business workflows in it.

## Default Authority and Omission

Defaults in this reference are an autonomous working mirror for agent use. The product implementation lives in the local `devctl` CLI and project conventions. If an existing manifest, local CLI help, repo docs, or generated output conflicts with this reference, prefer the local behavior and preserve or make the differing value explicit in `devctl.yaml`.

Prefer concise manifests that rely on defaults when the project uses standard paths and behavior. For example, `components.http.server: {}` is enough for the default OpenAPI path.

Write explicit values when:

- the repo uses non-standard paths;
- multiple possible contract locations exist;
- the user asks for a self-documenting manifest;
- preserving a legacy layout or generated output path matters;
- local CLI or generated behavior differs from this reference.

Do not ask the user about default paths when the repo has no conflicting convention.

## Top-Level Shape

```yaml
version: 1

project:
  name: myapp
  language: go
  description: "Example service"

env:
  prefix: APP_

sources: {}
exports: {}
components: {}
languages: {}
```

Sections:

- `version`: schema version. Use `1` by default.
- `project`: name, primary language, optional description.
- `env`: global prefix and custom environment variables.
- `sources`: external or local contract sources.
- `exports`: named contract surfaces published by this Devctl-managed project.
- `components`: architecture and infrastructure components.
- `languages`: language-specific module/package identity, generator paths, and language-specific component details.

Presence of a component section means the component exists. Do not add `enabled: true` as the generic activation mechanism.

Tooling boundary:

- `languages.<lang>.generators` selects generator tools, config paths, and output paths.
- `.mise.toml` owns installable tool versions and task commands for generation/check workflows.
- Do not add tool version pins, install commands, or task definitions to `devctl.yaml`.

## Project

Shape:

```yaml
project:
  name: user-service
  language: go
  description: "Internal user service"
```

Rules:

- `name` should be lowercase kebab-case, such as `user-service`.
- `language` selects language-specific scaffold and generators.
- Put Go module, Python package, Rust crate, and similar identifiers in `languages.<lang>`, not under `project`.

## Env

Shape:

```yaml
env:
  prefix: USER_SERVICE_
  custom:
    - group: app
      vars:
        - { key: FEATURE_AUTH_ENABLED, type: bool, default: true }
        - { key: EXTERNAL_API_KEY, type: string, secret: true }
```

Rules:

- `env.prefix` is optional. If absent, default to `UPPERCASE(project.name with - replaced by _) + "_"`.
- Keys in `devctl.yaml` omit the prefix; generated artifacts add it.
- `env.custom` is for global variables not owned by a component.
- `components.<component>.env.system` is for Devctl-managed or framework variables.
- `components.<component>.env.custom` is for user-owned component variables.
- `secret: true` means generated examples should not expose the value.

Supported common variable types include `string`, `bool`, `int`, and `duration`.

## Components

### HTTP

Server:

```yaml
components:
  http:
    server:
      openapi: api/openapi/swagger.yaml
    env:
      system:
        - { key: HTTP_ADDR, default: ":8080" }
```

Defaults:

- `components.http.server: {}` implies `openapi: api/openapi/swagger.yaml`.
- HTTP clients live under `components.http.clients`.

Client:

```yaml
components:
  http:
    clients:
      - name: users
        source: user-service-devctl
        # export: users-openapi
        # path: openapi/users.yaml
        # base_url_env: USERS_API_URL
```

Rules:

- `name` and `source` are required for clients.
- `export` is only valid for `sources.<name>.type: devctl`.
- For non-Devctl sources, use an explicit OpenAPI `path`.
- `base_url_env` overrides the generated `<CLIENT>_API_URL` key. The global prefix is still applied in generated artifacts.

### gRPC

Server:

```yaml
components:
  grpc:
    server:
      proto: api/proto/grpc
    env:
      system:
        - { key: GRPC_ADDR, default: ":9090" }
```

Defaults:

- `components.grpc.server: {}` implies `proto: api/proto/grpc`.
- gRPC clients live under `components.grpc.clients`.

Client:

```yaml
components:
  grpc:
    clients:
      - name: billing
        source: user-service-devctl
        # export: billing-grpc
        # path: api/proto/grpc/acme/billing/v1
        # proto_root: api/proto/grpc
        # buf_config: tools/buf/clients.billing.yaml
        # addr_env: BILLING_GRPC_ADDR
```

Rules:

- `name` and `source` are required for clients.
- `export` is only valid for `sources.<name>.type: devctl`.
- For non-Devctl sources, `path` is required and `proto_root` is optional.
- If `proto_root` is absent, treat `proto_root = path`.
- `buf_config` may override the generator config for one client.
- `addr_env` overrides the generated `<CLIENT>_GRPC_ADDR` key.

### Kafka

Kafka is active when it has consumers or producers.

```yaml
components:
  kafka:
    consumers:
      - name: users
        topic: users.v1
        source: user-service-devctl
        # export: users-events
        encoding: binary
      - name: orders
        topic: orders.v2
        schema:
          format: json
          source: schemas-git
          path: api/json/kafka/orders.v2.json
    producers:
      - name: audit
        topic: audit.v1
        schema:
          format: proto
          source: schemas-git
          path: api/proto/kafka/audit.v1.proto
          proto_root: api/proto/kafka
          message: audit.v1.AuditEvent
    env:
      system:
        - { key: KAFKA_BROKERS, default: "localhost:29092" }
```

Consumer/producer rules:

- `name` and `topic` are required.
- Top-level `source` is shorthand for `schema.source` with `schema.format: proto`.
- `schema.format`: `proto`, `json`, or `raw`; default is `proto`.
- `schema.encoding` for proto: `binary` or `json`; default is `binary`.
- `schema.message` is required when a proto file contains multiple messages.
- `schema.proto_root` for proto is optional. If absent, it defaults to the directory of `schema.path`.
- For Devctl-managed sources, `export` can select a named Kafka export instead of duplicating schema details.
- `raw` does not use `source`, `path`, or `message`.
- Consumer group env defaults to `KAFKA_<NAME>_GROUP` with default value `<project.name>-<name>-group`; override with `group_env`.
- Producer topic env defaults to `KAFKA_<NAME>_TOPIC` with default value equal to `topic`; override with `topic_env`.

Default schema paths:

- proto: `api/proto/kafka/<topic>.proto`;
- json: `api/json/kafka/<topic>.json`;
- raw: no schema file.

### DB, Redis, S3, and Migrations

```yaml
components:
  db:
    connections:
      - name: primary
        default: sqlite
        kind_env: DB_PRIMARY_KIND
        variants:
          - name: sqlite
            kind: sqlite
            dsn_env: DB_PRIMARY_SQLITE_DSN
            dsn_default: "file:./data/app.db?_foreign_keys=on"
            migrations: migrations/sqlite
          - name: postgres
            kind: postgres
            dsn_env: DB_PRIMARY_POSTGRES_DSN
            secret: true
            migrations: migrations/postgres

      - name: analytics
        default: clickhouse
        variants:
          - name: clickhouse
            kind: clickhouse
            dsn_env: DB_ANALYTICS_CLICKHOUSE_DSN
            secret: true

  redis:
    instances:
      - name: cache
        addr_env: REDIS_CACHE_ADDR
        default: "localhost:6379"

  s3:
    connections:
      - name: default
        endpoint_env: S3_ENDPOINT
        endpoint_default: "http://localhost:9000"
        region_env: S3_REGION
        region_default: us-east-1
        force_path_style_env: S3_FORCE_PATH_STYLE
        credentials:
          mode: static
          access_key_id_env: S3_ACCESS_KEY_ID
          secret_access_key_env: S3_SECRET_ACCESS_KEY
      - name: aws
        region_env: AWS_REGION
        credentials:
          mode: ambient
    buckets:
      - name: uploads
        connection: default
        bucket_env: S3_UPLOADS_BUCKET
        bucket_default: uploads-local
        prefix_env: S3_UPLOADS_PREFIX
      - name: exports
        connection: default
        bucket_env: S3_EXPORTS_BUCKET
```

Rules:

- `connections[].name` is the logical dependency role, such as `primary`, `analytics`, `audit`, or `readmodel`.
- `variants[].kind` is the physical backend, such as `sqlite`, `postgres`, `mysql`, or `clickhouse`.
- A single-backend DB still uses one `variants[]` entry.
- Multiple logical DBs use multiple `connections[]` entries.
- `connections[].default` selects the default backend variant for that logical DB.
- `connections[].kind_env` overrides the generated `DB_<NAME>_KIND` key.
- `dsn_env` overrides the generated `DB_<NAME>_<VARIANT>_DSN` key.
- `dsn_default` is an optional non-secret default value for local development.
- `secret: true` means generated examples should not expose the DSN value.
- Redis is not a DB variant. Use `components.redis.instances[]` for named Redis resources.
- S3 connections describe shared endpoint, region, and credentials. S3 buckets describe logical application resources.
- Multiple S3 buckets may reference one connection. Do not duplicate access/secret key env vars on each bucket.
- `components.s3.buckets[].connection` must reference an existing `components.s3.connections[].name`.
- `devctl add s3 <bucket>` may create `connection: default` as a convenience only for the default connection.
- Create non-default connections explicitly with `devctl add s3-connection <name>` or direct YAML before attaching buckets.
- Repeated S3 connection creation should preserve existing env keys, credential mode, and bucket references.
- `credentials.mode: static` uses env keys such as `access_key_id_env`, `secret_access_key_env`, and optional `session_token_env`.
- `credentials.mode: ambient` uses the platform or SDK default credential chain and should not define static access/secret key env vars.
- Bucket names and prefixes are runtime config, not provisioning. Keep IAM, bucket creation, CORS, lifecycle, encryption, CDN, and public access policy outside `devctl.yaml`.

Put the default migration tool under the language generator:

```yaml
languages:
  go:
    generators:
      migrations:
        tool: golang-migrate
        path: migrations
```

When a repo has multiple DB connections or backend variants, do not assume a single global migration path. Put variant-specific migration paths under the matching DB variant when schemas differ, and keep the language generator path as the fallback/default.

### Metrics, Logging, Pprof

```yaml
components:
  metrics:
    env:
      system:
        - { key: METRICS_ADDR, default: ":9092" }
  logging:
    env:
      system:
        - { key: LOG_LEVEL, default: "info" }

languages:
  go:
    components:
      pprof:
        env:
          system:
            - { key: PPROF_ADDR, default: "127.0.0.1:6060" }
      logging:
        backend: zap
```

Language-specific components such as Go `pprof` belong under `languages.<lang>.components`.

## Sources

`sources` is a registry of external or local contracts. Consumers refer to source names from `components`.

Use mapping style:

```yaml
sources:
  user-service-devctl:
    type: devctl
    repo: git@github.com:acme/user-service.git
    ref: v1.4.0
  schemas-git:
    type: git
    repo: git@github.com:acme/schemas.git
    ref: main
  googleapis-git:
    type: git
    repo: https://github.com/googleapis/googleapis.git
    ref: master
  stripe-openapi-url:
    type: url
    url: https://api.stripe.com/openapi.yaml
  users-openapi-local:
    type: local
    path: api/external/openapi/users/openapi.yaml
```

Types:

- `devctl`: repo with a `devctl.yaml`; required `repo`, `ref`.
- `git`: repo without a `devctl.yaml`; required `repo`, `ref`.
- `url`: direct single-file contract; required `url`; optional `filename`.
- `local`: file or directory already in this repo; required `path`.

Rules:

- Source names are explicit, unique, and kebab-case.
- `type: devctl` sources can provide named `exports` from their upstream `devctl.yaml`.
- `type: git`, `type: url`, and `type: local` sources do not provide named exports; consumers must declare explicit contract paths or schema details.
- `export` is declared on the consumer, not in `sources`, and only works for `type: devctl`.
- URL sources must include a filename in the URL unless `filename` is provided.
- Local sources should point to existing files/directories when editing an existing repo.
- Use `git@github.com:org/repo.git` as the canonical SSH form for private or internal repos.
- Use `https://github.com/org/repo.git` for public/read-only repos or environments that rely on Git credential helpers.
- Accept `ssh://git@github.com/org/repo.git` as an explicit SSH URL form, but do not use it as the primary example.
- Do not put local filesystem paths in `repo`; use `type: local` for local files and directories.

Default source name suggestions:

- `devctl`: `<repo-basename>-devctl`;
- `git`: `<repo-basename>-git`;
- `url`: `<host>-<basename>-url`;
- `local`: `<basename-from-path>-local`.

Buf-managed external proto sources may declare source-level metadata:

```yaml
sources:
  billing-proto-git:
    type: git
    repo: git@github.com:acme/billing-proto.git
    ref: v1.4.0
    proto:
      tool: buf
      config: buf.yaml
```

Use this only as source materialization metadata when the external repo is Buf-managed and its `buf.yaml` / `buf.lock` are needed to materialize the proto graph. Omit `proto` for a plain self-contained proto tree; set `path` and optional `proto_root` on consumers instead. Do not use external source `buf.gen.yaml` for local generation.

## Exports

`exports` names public contract surfaces from a Devctl-managed producer project. Consumers of a `type: devctl` source can reference these names through `export`.

```yaml
exports:
  users-openapi:
    kind: openapi
    path: api/openapi/swagger.yaml

  billing-grpc:
    kind: grpc
    path: api/proto/grpc

  users-events:
    kind: kafka
    producer: user-events
```

Rules:

- OpenAPI exports use repo-relative `path`.
- gRPC exports use repo-relative proto `path`. This can be the whole proto root or a narrower proto surface.
- Do not list gRPC service names in `devctl.yaml`; the export is a proto surface, not a service registry.
- Kafka exports should reference a declared producer by name instead of duplicating topic/schema details.
- `exports` belongs to producer projects. Consumers select an export from a `type: devctl` source.

## Languages

Go example:

```yaml
languages:
  go:
    module: github.com/acme/myapp
    generators:
      http:
        tool: oapi-codegen
        oapi_config: tools/oapi/server.yaml
        server_out: gen/serverhttp
        client_out: gen/clienthttp
      grpc:
        tool: buf
        server_out: gen/servergrpc
        client_out: gen/clientgrpc
        buf_config: tools/buf/go.gen.yaml
      kafka:
        lib: segmentio/kafka-go
        consumers_out: gen/consumerkafka
        producers_out: gen/producerkafka
        buf_config: tools/buf/go.kafka.gen.yaml
      migrations:
        tool: golang-migrate
        path: migrations
```

Rust example:

```yaml
languages:
  rust:
    workspace: rust
    crate: myapp
    package_prefix: myapp
    edition: "2024"
    rust_version: "1.96"
    generation:
      mode: checked-in
    packages:
      - id: app
        name: myapp-core
        path: crates/myapp-core
        lib: myapp_core
      - id: api
        name: myapp-server
        path: crates/myapp-server
        bins: [myapp-server]
      - id: desktop
        name: myapp-tauri
        path: tauri
        bins: [myapp]
    application:
      package: app
    components:
      http:
        server:
          package: api
          framework: axum
          module: transport/http
      tauri:
        package: desktop
        frontend: ui
        app_id: com.acme.myapp
    generators:
      http:
        tool: openapi-generator
        server:
          package: api
          module: generated/http
        clients:
          package: app
          module: generated/http
      config:
        targets:
          - package: api
            module: generated/config
          - package: desktop
            module: generated/config
```

Rules:

- Put language-specific identity under `languages.<lang>`.
- Put generator tool names and output directories under `languages.<lang>.generators`.
- Put generator config paths under `languages.<lang>.generators` or the specific client override when the CLI supports it.
- Keep generator config files under `tools/`, such as `tools/oapi/server.yaml`, `tools/oapi/clients.users.yaml`, `tools/buf/go.gen.yaml`, or `tools/buf/go.kafka.gen.yaml`.
- Put language-specific component refinements under `languages.<lang>.components`.
- Language components may merge with root components but must not change architecture facts such as contract paths, client lists, Kafka topics, or schemas.
- Supported merge strategy values for language components: `merge` by default, `replace` for a deliberate full replacement of that component's language-specific settings.
- Tool versions and task commands belong in `.mise.toml`, not in `devctl.yaml`.

Rust rules:

- `languages.rust.workspace` is the Cargo workspace root, such as `rust` or `.`.
- `languages.rust.crate` is the crate/import prefix used for generated names when a single canonical value is needed.
- `languages.rust.package_prefix` is the package-name prefix Devctl uses for inferred packages.
- `languages.rust.packages[]` is physical Cargo inventory only. Do not encode architecture roles with fixed keys such as `core`, `cli`, `server`, or `tauri`, and do not add `role` or `delivery` fields.
- `packages[].id` is a stable manifest-local identifier used by component and generator bindings.
- `packages[].name` is the Cargo package name; `packages[].path` is relative to `languages.rust.workspace`; `lib` and `bins` describe crate import and binary names.
- `languages.rust.application.package` points to the reusable application/core package. If absent, Devctl may infer `id: app` or `id: core`; otherwise ask or fail validation.
- Delivery semantics come from `languages.rust.components.*.*.package`, not from package inventory.
- If `packages[]` is absent, Devctl may infer standard packages from `package_prefix` and enabled components. If present, all package references must use declared package ids.
- Devctl-managed Rust codegen defaults to `generation.mode: checked-in`. Per-generator `mode` may override it, for example `mode: build-rs`.
- Rust generator targets use `{ package, module }` bindings. `package` references `packages[].id`; `module` is a Rust module path under that package, usually `generated/<name>`.

### Language Component Merge

Language-specific components refine root components for one target language.

Rules:

- `merge` is the default strategy.
- Scalar fields from `languages.<lang>.components.<name>` override the root component for that language.
- Objects merge by key.
- `env.system` and `env.custom` arrays merge by `key`: matching keys are replaced by the language layer, new keys are added.
- Use `{ key: NAME, remove: true }` inside language `env.system` or `env.custom` to remove a root env key from that language view.
- `replace` fully replaces the component's language-specific settings, but still cannot change root architecture facts.
- Language components must not change `http.server.openapi`, `grpc.server.proto`, HTTP/gRPC client lists, Kafka consumers/producers, Kafka topics, schemas, or source references.

## Runtime Activation

Use `start` only for components that can be toggled at runtime: servers, consumers, workers, metrics, pprof, and similar runtime components.

```yaml
components:
  http:
    server:
      start:
        env: HTTP_SERVER_ENABLED
        default: true
```

Rules:

- `start.env` is the unprefixed env key.
- `start.default` defaults to `true`.
- If `start` is absent, the component is always active and no generated boolean config field is required.
- ENV values override YAML defaults.
- Valid bool strings include `true/false`, `1/0`, and `on/off`, case-insensitive.
- Kafka producers must not have `start`; they are outbound adapters controlled by calling code.

Default runtime env names:

- HTTP server: `HTTP_SERVER_ENABLED`;
- gRPC server: `GRPC_SERVER_ENABLED`;
- Kafka consumer: `KAFKA_<NAME>_CONSUMER_ENABLED`;
- metrics: `METRICS_ENABLED`;
- pprof: `PPROF_ENABLED`;
- logging: `LOGGING_ENABLED` when logging can be runtime-toggled.

## Source Materialization and Buf Boundary

Use `devctl sync` to materialize external contract sources before linting or generation. Use `devctl gen` only for generated code/config outputs from local or already synchronized inputs.

For proto sources:

- Devctl selects the source, `path`, and optional `proto_root`.
- Devctl should not search for `buf.yaml` to infer `proto_root`; if absent, use the defaults described by the component schema.
- Buf owns proto parsing, import resolution, and dependency resolution.
- If imports are outside `proto_root`, widen `proto_root` or express dependencies through the source repo's Buf config and lockfile.
- Do not add generic extra proto import paths as a normal manifest API.

Keep source Buf metadata separate from consumer generator config. Source `buf.yaml` / `buf.lock` can be used for materialization; consumer `buf.gen.yaml` or `buf_config` controls local generation.

## Generation Rules

- Defaults first: use predictable defaults for contract paths and `gen/*` paths when not configured, unless local CLI/repo behavior shows a different default.
- Generated code is output. Do not hand-edit it.
- `devctl sync` materializes external contracts under generated client/consumer/producer input directories.
- `devctl gen` writes generated outputs from local or already synchronized inputs.
- `env.system` can be updated by Devctl generation; `env.custom` is user-owned.
- Repeated generation should be idempotent.
- Go generators usually use output directories such as `server_out` and `client_out`.
- Rust generators usually use target bindings such as `server.package`, `server.module`, `clients.package`, and `clients.module`.
- For Rust, generator package fields override component bindings. When a Rust generator package is absent, server targets use the matching `languages.rust.components.<component>.<surface>.package`; client/core targets default to `languages.rust.application.package`.
- For Rust checked-in generation, write generated modules inside the consuming package, typically under `src/generated/`. For `build-rs`, write to Cargo `OUT_DIR` and do not write into checked-in `src/` paths from `build.rs`.

Common generated locations:

- HTTP server: `gen/serverhttp`;
- HTTP clients: `gen/clienthttp/<client>`;
- gRPC server: `gen/servergrpc`;
- gRPC clients: `gen/clientgrpc/<client>`;
- Kafka consumers: `gen/consumerkafka/<name>`;
- Kafka producers: `gen/producerkafka/<name>`;
- config: `gen/config`.
- Rust checked-in HTTP/config modules: `languages.rust.generators.<name>.<target>.module` inside the referenced package, commonly `src/generated/<name>/`.

## Generated Env Outputs

`devctl gen config` owns generated configuration artifacts.

Expected behavior:

- Collect env vars from `components.*.env.system`, `components.*.env.custom`, and `env.custom`.
- Add generated system env vars for clients, Kafka entities, DB/Redis/S3 resources, runtime `start` toggles, and framework defaults.
- Apply `env.prefix` to final artifact keys. If `env.prefix` is absent, use `UPPERCASE(project.name with - replaced by _) + "_"`.
- Write `.env.example`, Helm values, and `gen/config/config.go` or the language-specific generated config equivalent.
- For Rust, write generated config to each explicit `languages.rust.generators.config.targets[]` entry, or to `languages.rust.application.package` when no targets are configured.
- Keep `env.system` Devctl-managed; generation may add or refresh system keys.
- Keep `env.custom` user-owned; generation must preserve custom variables and should not rewrite user meaning.
- Render secrets such as DSNs, API keys, and S3 secret access keys as empty or redacted examples, not literal secret values.

## Generated Contract Locations

Use these locations to inspect synchronized source artifacts and generated diffs after `devctl sync` or `devctl gen`. Do not materialize sources manually when the CLI is available.

- HTTP client OpenAPI: `gen/clienthttp/<client>/openapi/<filename>`, usually `swagger.yaml`.
- HTTP client code: `languages.<lang>.generators.http.client_out/<client>`, default `gen/clienthttp/<client>`.
- gRPC client proto: `gen/clientgrpc/<client>/proto/**`.
- gRPC client code: `languages.<lang>.generators.grpc.client_out/<client>`, default `gen/clientgrpc/<client>`.
- Rust generated code: the configured `{ package, module }` target under `languages.rust.generators.<generator>`, resolved through `languages.rust.packages[]`.
- Kafka consumer proto/json schema: `gen/consumerkafka/<name>/proto/<filename>` or `gen/consumerkafka/<name>/json/<filename>`.
- Kafka producer proto/json schema: `gen/producerkafka/<name>/proto/<filename>` or `gen/producerkafka/<name>/json/<filename>`.
- Kafka `raw` entities do not materialize schema files.

## Expected CLI Validation Coverage

Use this section to understand what `devctl validate` should enforce. Do not manually reimplement the full validator when the CLI is available.

- Project identity: `project.name` is kebab-case and `project.language` matches the target language.
- Input/output boundaries: contract files are inputs and generated directories are outputs.
- Env ownership: component-specific env keys live under the owning component; secrets are marked with `secret: true`.
- Sources: referenced sources are defined; URL/local source validity is checked by the CLI; `export` is used only with `type: devctl` sources.
- Exports: producer exports have valid `kind` and references; gRPC exports do not require service-name enumeration.
- Kafka: consumers/producers have `name` and `topic`; producers do not use `start`.
- DB, Redis, and S3: DB resources use named `components.db.connections[]` with `variants[]`; multi-variant DB connections have a default; Redis resources use `components.redis.instances[]`; S3 buckets reference existing named `components.s3.connections[]`.
- Language settings: customized generator paths are explicit, and language-specific components do not change root architecture facts.
- Rust package bindings: package ids are unique; `application.package`, component packages, and generator target packages reference declared `packages[].id` when explicit inventory exists; package inventory does not use fixed role keys or `role`/`delivery` fields.
