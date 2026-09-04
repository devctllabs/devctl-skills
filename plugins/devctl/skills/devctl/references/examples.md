# Examples

Use these examples as starting points. Preserve local conventions for existing repos.

## Minimal Go HTTP Service

```yaml
version: 1

project:
  name: users
  language: go

components:
  http:
    server: {}

languages:
  go:
    module: github.com/acme/users
```

Generation:

```bash
mise install
devctl gen http
```

Illustrative `.mise.toml` shape for a Go service:

```toml
[tools]
buf = "<devctl-default-or-project-version>"
"go:github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen" = "<devctl-default-or-project-version>"

[tasks."gen:http"]
run = "devctl gen http"

[tasks."gen:grpc"]
run = "devctl gen grpc"

[tasks."gen:kafka"]
run = "devctl gen kafka"

[tasks.gen]
depends = ["gen:http", "gen:grpc", "gen:kafka"]

[tasks.sync]
run = "devctl sync"

[tasks.lint]
run = "devctl lint"

[tasks.check]
run = "go test ./..."
```

Use local CLI defaults or existing repo versions for real scaffolds. Do not ship placeholder versions in a generated project.

When at least one SQLite or PostgreSQL variant declares `migrations`, Devctl adds the migration CLI and target-specific tasks to `.mise.toml` instead of the application `go.mod`:

```toml
[tools]
"go:github.com/golang-migrate/migrate/v4/cmd/migrate" = { version = "v4.19.1", tags = ["postgres", "sqlite"] }

[tasks."migrate:primary:sqlite:create"]
usage = 'arg "<name>" help="Migration name"'
run = 'migrate create -ext sql -dir "migrations/primary/sqlite" -format "20060102150405" "${usage_name?}"'

[tasks."migrate:primary:sqlite:up"]
run = '''
database_url="${USER_SERVICE_DB_PRIMARY_SQLITE_MIGRATIONS_URL:-sqlite://./data/user_service.db?_pragma=foreign_keys%281%29}"
migrate -path "migrations/primary/sqlite" -database "$database_url" up
'''
```

The scaffold also creates `migrations/<connection>/<variant>/.gitkeep`, but never seeds or applies SQL migrations.

## Minimal Rust HTTP Service

```yaml
version: 1

project:
  name: users
  language: rust

components:
  http:
    server: {}

languages:
  rust:
    workspace: rust
    crate: users
    package_prefix: users
    generation:
      mode: checked-in
    application:
      package: app
    packages:
      - id: app
        name: users-core
        path: crates/users-core
        lib: users_core
      - id: api
        name: users-server
        path: crates/users-server
        bins: [users-server]
    components:
      http:
        server:
          package: api
          framework: axum
          module: transport/http
    generators:
      http:
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
```

Generation:

```bash
mise install
devctl gen config
devctl gen http
```

Use `packages[]` as Cargo inventory. Do not add `role` or `delivery` fields to describe core/server/CLI semantics; bind components and generators to package ids instead.

## Rust plus Tauri Monorepo

```yaml
version: 1

project:
  name: clear
  language: rust

sources:
  clear-api-devctl:
    type: devctl
    repo: git@github.com:acme/clear-api.git
    ref: main

components:
  http:
    clients:
      - name: cloud
        source: clear-api-devctl

languages:
  rust:
    workspace: rust
    crate: clear
    package_prefix: clear
    generation:
      mode: checked-in
    application:
      package: app
    packages:
      - id: app
        name: clear-core
        path: crates/clear-core
        lib: clear_core
      - id: desktop
        name: clear-tauri
        path: tauri
        bins: [clear]
    components:
      tauri:
        package: desktop
        frontend: ui
        app_id: com.devctllabs.clear
    generators:
      http:
        clients:
          package: app
          module: generated/http
      config:
        targets:
          - package: desktop
            module: generated/config
```

Here `desktop` is only a local package id. The fact that it is Tauri comes from `languages.rust.components.tauri.package`.

## Go HTTP, Kafka Consumer, Postgres

```yaml
version: 1

project:
  name: user-service
  language: go

env:
  prefix: USER_SERVICE_

sources:
  contracts:
    type: local
    path: api/contracts

components:
  http:
    server:
      openapi: api/openapi/swagger.yaml
      start:
        env: HTTP_SERVER_ENABLED
        default: true
    env:
      system:
        - { key: HTTP_ADDR, default: ":8080" }

  kafka:
    consumers:
      - name: users
        topic: user_service.user.events.v1
        contract:
          format: proto
          source: contracts
          path: proto/kafka/user_service.user.events.v1.proto
          proto_root: proto
          message: users.v1.UserEvent
    env:
      system:
        - { key: KAFKA_BROKERS, default: "localhost:29092" }

  db:
    connections:
      - name: primary
        default: sqlite
        kind_env: DB_PRIMARY_KIND
        variants:
          - name: sqlite
            kind: sqlite
            dsn_env: DB_PRIMARY_SQLITE_DSN
            dsn_default: "file:./data/user_service.db?_foreign_keys=on"
            migrations:
              path: migrations/primary/sqlite
              database_env: DB_PRIMARY_SQLITE_MIGRATIONS_URL
              database_default: "sqlite://./data/user_service.db?_pragma=foreign_keys%281%29"
          - name: postgres
            kind: postgres
            dsn_env: DB_PRIMARY_POSTGRES_DSN
            secret: true
            migrations:
              path: migrations/primary/postgres
              database_env: DB_PRIMARY_POSTGRES_MIGRATIONS_URL

      - name: analytics
        default: clickhouse
        variants:
          - name: clickhouse
            kind: clickhouse
            dsn_env: DB_ANALYTICS_CLICKHOUSE_DSN
            secret: true

  redis:
    connections:
      - name: cache
        addr_env: REDIS_CACHE_ADDR
        addr_default: "localhost:6379"

  s3:
    connections:
      - name: default
        endpoint: http://localhost:9000
        region: us-east-1
        credentials: static
        path_style: true
        access_key_env: S3_ACCESS_KEY_ID
        secret_key_env: S3_SECRET_ACCESS_KEY
    buckets:
      - name: uploads
        connection: default
        bucket: uploads-local

  logging:
    env:
      system:
        - { key: LOG_LEVEL, default: "info" }

languages:
  go:
    module: github.com/acme/user-service
    generators:
      http:
        oapi_config: tools/oapi/server.yaml
        server_out: gen/serverhttp
        client_out: gen/clienthttp
      kafka:
        out: gen/kafka
        buf_gen_config: tools/buf/kafka.gen.yaml
```

## Go OpenAPI 3.1 Echo 5 Server Generation

The manifest owns the contract and generated directory:

```yaml
components:
  http:
    server:
      openapi: api/openapi/swagger.yaml

languages:
  go:
    module: github.com/acme/user-service
    generators:
      http:
        oapi_config: tools/oapi/server.yaml
        server_out: gen/serverhttp
```

The project-owned `tools/oapi/server.yaml` owns generator features and deliberately has no output
field:

```yaml
package: serverhttp
generate:
  models: true
  echo5-server: true
  strict-server: true
  embedded-spec: true
```

The future Devctl workflow is:

```bash
devctl validate
devctl lint http
devctl gen http --target http-server
git diff --exit-code -- gen/serverhttp/server.gen.go
```

Until the CLI is available, an already-scaffolded repo may expose the equivalent pinned task:

```toml
[tools]
"go:github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen" = "2.8.0"

[tasks."gen:http"]
run = "oapi-codegen -config tools/oapi/server.yaml -o gen/serverhttp/server.gen.go api/openapi/swagger.yaml"
```

Run `mise install` and `mise run gen:http`, then report that `devctl validate` was unavailable. Keep
the generated file checked in. Runtime validation loads the embedded document from the generated
package; handwritten strict handlers, authentication, authorization, telemetry, and DI wiring stay
outside `gen/serverhttp`.

## External HTTP and gRPC Clients

```yaml
version: 1

project:
  name: checkout-service
  language: go

env:
  prefix: CHECKOUT_

sources:
  users-devctl:
    type: devctl
    repo: git@github.com:acme/users-service.git
    ref: v1.4.0
  billing-proto-git:
    type: git
    repo: git@github.com:acme/billing-proto.git
    ref: main
    proto:
      buf_config: buf.yaml

components:
  http:
    clients:
      - name: users
        source: users-devctl
        export: users-openapi
  grpc:
    clients:
      - name: billing
        source: billing-proto-git
        path: api/proto/grpc/acme/billing/v1
        proto_root: api/proto/grpc
        addr_env: BILLING_GRPC_ADDR

languages:
  go:
    module: github.com/acme/checkout-service
    generators:
      http:
        client_out: gen/clienthttp
      grpc:
        out: gen/grpc
        buf_gen_config: tools/buf/grpc.gen.yaml
```

External contract workflow:

```bash
devctl validate
devctl sync http
devctl sync grpc
devctl lint http
devctl lint grpc
devctl gen http
devctl gen grpc
```

## Kafka JSON and Raw Messages

```yaml
version: 1

project:
  name: audit-worker
  language: go

sources:
  audit-schemas:
    type: git
    repo: git@github.com:acme/audit-schemas.git
    ref: main

components:
  kafka:
    consumers:
      - name: audit
        topic: audit_service.audit.events.v2
        contract:
          format: json
          source: audit-schemas
          path: kafka/audit_service.audit.events.v2.json
    producers:
      - name: debug
        topic: audit_worker.debug.events.v1
        contract:
          format: raw

languages:
  go:
    module: github.com/acme/audit-worker
    generators:
      kafka:
        out: gen/kafka
        buf_gen_config: tools/buf/kafka.gen.yaml
```

## Runtime Toggle vs Always Active

Toggleable:

```yaml
components:
  http:
    server:
      start:
        env: HTTP_SERVER_ENABLED
        default: true
```

Always active:

```yaml
components:
  http:
    server: {}
```

CLI equivalent:

```bash
devctl enable http
devctl enable http --always
```

## CLI-Assisted Workflow

```bash
command -v devctl
devctl --help
command -v mise
devctl init manifest --lang go --preset http-service --name user-service --module github.com/acme/user-service
devctl enable http
devctl add db primary --kind sqlite --default
devctl add db primary --kind postgres
devctl add db analytics --kind clickhouse
devctl add redis cache --addr-default localhost:6379
devctl add s3 uploads
devctl add s3-connection archive
devctl add s3 exports --connection archive
devctl add kafka-consumer users --topic user_service.user.events.v1
devctl init scaffold
mise install
devctl validate
devctl inspect
devctl lint http
devctl lint kafka
devctl gen config
devctl gen http
devctl gen kafka
```

When `.mise.toml` defines project tasks, prefer:

```bash
mise install
mise run gen
```

If `devctl` is unavailable, create or edit `devctl.yaml` directly. Skip generation unless the repo
already has an explicit pinned project-local generation task like the Go HTTP example above. When
using that fallback, report that Devctl validation and generation orchestration did not run.
