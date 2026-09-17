# Devctl Manifest v1

Use this compact reference for direct `devctl.yaml` authoring. The installed CLI owns exact
validation and effective defaults: confirm changes with `devctl validate` and `devctl inspect`
when available.

## Root

A Go v1 manifest has this shape:

```yaml
version: 1
project:
  name: orders-api
  language: go
env: {}
paths: {}
sources: {}
exports: {}
components: {}
languages:
  go:
    module: example.com/orders-api
```

The root sections are required. Unknown and duplicate fields are invalid. Paths are
project-relative, contained by the project, and must not overlap managed output boundaries.

- `project.name` is kebab-case.
- `project.language` is `go`; v1 has no Python or Rust manifest model.
- `paths.external_contracts` overrides the managed external snapshot root, normally
  `api/external`.
- Tool versions and task definitions live in project tooling, not this manifest.

## Runtime configuration

```yaml
env:
  prefix: ORDERS_
  custom:
    - group: Payments
      vars:
        - {key: PAYMENTS_TIMEOUT, type: duration, default: 5s}
        - {key: PAYMENTS_TOKEN, type: string, secret: true}
```

The default prefix derives from the project name. Global custom variables use groups; component
`env.system` and `env.custom` entries use the same `key`, optional `type`, `default`, and
`secret` fields without a group. Supported common types are `string`, `bool`, `int`, and
`duration`. Secret defaults are not rendered.

Runnable capabilities may declare:

```yaml
start:
  env: HTTP_SERVER_ENABLED
  default: true
```

When `start` is absent, the capability is always active. Producers and passive outbound resources
do not use `start`.

## HTTP and gRPC

```yaml
components:
  http:
    server:
      openapi: api/openapi/swagger.yaml
      start: {env: HTTP_SERVER_ENABLED, default: true}
    clients:
      - name: billing
        source: contracts
        path: billing/openapi.yaml
        base_url_env: BILLING_BASE_URL
        oapi_config: tools/oapi/clients.billing.yaml
    env: {}

  grpc:
    server:
      proto_root: api/proto/grpc
      buf_config: buf.yaml
    clients:
      - name: ledger
        source: upstream
        export: ledger-grpc
        addr_env: LEDGER_GRPC_ADDR
    env: {}
```

HTTP and gRPC clients require a unique name and existing source. Ordinary sources select a
source-relative `path`; a `devctl` source selects an `export`. Explicit per-client generator
configs are user-owned. Server contract contents remain in OpenAPI or Proto files.

## Kafka

```yaml
components:
  kafka:
    consumers:
      - name: audit
        topic: orders.audit.v1
        start: {env: KAFKA_AUDIT_CONSUMER_ENABLED, default: false}
        contract: {format: raw}
    producers:
      - name: created
        topic: orders.created.v1
        contract:
          format: json
          source: contracts
          path: orders-created.schema.json
    env: {}
```

Consumers and producers require unique names and topics. Contract format is `raw`, `json`, or
`proto`. Schema-backed contracts select a source and path/export; Proto may also declare
`proto_root`, fully-qualified `message`, and `encoding` (`binary` or `json`). Raw contracts
carry no schema reference. Only consumers may use `start`.

## Databases, Redis, and S3

```yaml
components:
  db:
    connections:
      - name: primary
        default: postgres
        kind_env: DB_PRIMARY_KIND
        variants:
          - name: postgres
            kind: postgres
            dsn_env: DB_PRIMARY_POSTGRES_DSN
            secret: true
            migrations:
              path: migrations/primary/postgres
              database_env: DB_PRIMARY_POSTGRES_MIGRATIONS_URL
    env: {}

  redis:
    connections:
      - {name: cache, addr_env: REDIS_CACHE_ADDR, addr_default: localhost:6379}
    env: {}

  s3:
    connections:
      - name: assets
        credentials: static
        endpoint: http://localhost:9000
        region: us-east-1
        path_style: true
        access_key_env: S3_ASSETS_ACCESS_KEY
        secret_key_env: S3_ASSETS_SECRET_KEY
    buckets:
      - {name: uploads, connection: assets, bucket: uploads}
    env: {}
```

- A database connection contains one or more named `sqlite`, `postgres`, or `clickhouse`
  variants. Multiple variants require an existing default.
- Every database kind may own a migration target with a safe path, migration URL environment key,
  and optional matching-scheme default. ClickHouse cannot share a logical connection with
  transactional variants; its migrations are non-transactional.
- Redis is a separate named connection model with no primary/default selector.
- S3 connections own endpoint, region, credential mode, and credential environment keys. Buckets
  reference an existing connection and may name the physical bucket; there is no bucket-prefix
  field.
- Devctl may scaffold migration directories and project tasks, but it does not create SQL or apply
  migrations.

## Other capabilities

```yaml
components:
  logging:
    env: {}
  health:
    server:
      start: {env: HEALTH_SERVER_ENABLED, default: true}
    env: {}
  telemetry:
    start: {env: TELEMETRY_ENABLED, default: false}
    env: {}

languages:
  go:
    module: example.com/orders-api
    components:
      pprof:
        server:
          start: {env: PPROF_ENABLED, default: false}
        env: {}
```

Logging, health, and telemetry are root components. Pprof is Go-specific and lives under
`languages.go.components`.

## Sources and exports

```yaml
sources:
  contracts:
    type: local
    path: api/contracts
  public-api:
    type: url
    url: https://example.com/openapi.yaml
  schemas:
    type: git
    repo: https://example.com/schemas.git
    ref: main
    path: contracts
  upstream:
    type: devctl
    repo: https://example.com/upstream.git
    ref: v1.2.0

exports:
  public-api:
    kind: openapi
    path: api/openapi/swagger.yaml
  public-grpc:
    kind: grpc
    path: api/proto/grpc
  order-events:
    kind: kafka
    producer: created
```

Source types are `local`, `url`, `git`, and `devctl`. URL sources may declare `filename`
and `allow_insecure_http`; local and Git sources may declare `proto.buf_config`. Only Devctl
sources are selected through named exports. OpenAPI/gRPC exports name paths; Kafka exports name an
existing producer.

## Go generators and outputs

```yaml
languages:
  go:
    module: example.com/orders-api
    generators:
      config:
        out: gen/config
      http:
        oapi_config: tools/oapi/server.yaml
        server_out: gen/serverhttp
        client_out: gen/clienthttp
      grpc:
        out: gen/grpc
        buf_gen_config: tools/buf/grpc.gen.yaml
      kafka:
        out: gen/kafka
        buf_gen_config: tools/buf/kafka.gen.yaml
```

Generator fields select project-owned configs and managed output directories; they do not select or
install tool versions. The config target writes `config.gen.go` beneath its output directory and
also owns the root `.env.example`. HTTP targets write one managed Go file per server or named
client. Inspect the effective target catalog rather than reconstructing all paths by hand.
Generation reads the manifest and contract inputs; it does not rewrite `env.system`,
`env.custom`, or other manifest declarations.
