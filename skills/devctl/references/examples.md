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
"go:github.com/golang-migrate/migrate/v4/cmd/migrate" = "<devctl-default-or-project-version>"

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
  description: "User management service"

env:
  prefix: USER_SERVICE_

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
        schema:
          format: proto
          path: api/proto/kafka/user_service.user.events.v1.proto
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
        region_env: S3_REGION
        credentials:
          mode: static
          access_key_id_env: S3_ACCESS_KEY_ID
          secret_access_key_env: S3_SECRET_ACCESS_KEY
    buckets:
      - name: uploads
        connection: default
        bucket_env: S3_UPLOADS_BUCKET
        prefix_env: S3_UPLOADS_PREFIX

  logging:
    env:
      system:
        - { key: LOG_LEVEL, default: "info" }

languages:
  go:
    module: github.com/acme/user-service
    generators:
      http:
        tool: oapi-codegen
        oapi_config: tools/oapi/server.yaml
        server_out: gen/serverhttp
        client_out: gen/clienthttp
      kafka:
        lib: segmentio/kafka-go
        consumers_out: gen/consumerkafka
        producers_out: gen/producerkafka
      migrations:
        tool: golang-migrate
        path: migrations
    components:
      logging:
        backend: zap
```

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
      tool: buf
      config: buf.yaml

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
        client_out: gen/clientgrpc
        buf_config: tools/buf/go.gen.yaml
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
        schema:
          format: json
          source: audit-schemas
          path: kafka/audit_service.audit.events.v2.json
    producers:
      - name: debug
        topic: audit_worker.debug.events.v1
        schema:
          format: raw

languages:
  go:
    module: github.com/acme/audit-worker
    generators:
      kafka:
        lib: segmentio/kafka-go
        consumers_out: gen/consumerkafka
        producers_out: gen/producerkafka
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
devctl init --lang go --name user-service
devctl enable http
devctl add db primary --kind sqlite --default
devctl add db primary --kind postgres
devctl add db analytics --kind clickhouse
devctl add redis cache
devctl add s3 uploads
devctl add s3-connection archive
devctl add s3 exports --connection archive
devctl add kafka-consumer users --topic user_service.user.events.v1
devctl validate
devctl inspect
mise install
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

If `devctl` is unavailable, create or edit `devctl.yaml` directly, skip generation, and report that generated artifacts were not refreshed.
