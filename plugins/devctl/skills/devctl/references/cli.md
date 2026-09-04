# CLI

Use this reference before running `devctl` commands.

## Availability

Before using the CLI:

```bash
command -v devctl
devctl --help
```

If the CLI is unavailable, edit `devctl.yaml` directly. Generation normally remains skipped. An
already-scaffolded repository may instead run its pinned project-local generator task when the
contract, generator config, and output path are all explicit; state that Devctl validation and
generation orchestration did not run.

Before using a subcommand or flag that is not already established in the repo, inspect help first:

```bash
devctl init --help
devctl validate --help
devctl inspect --help
devctl enable --help
devctl add --help
devctl sync --help
devctl gen --help
devctl lint --help
```

## Local CLI Wins

This reference documents expected workflows. If `devctl --help`, subcommand help, existing repo docs, or generated output differs from this reference, follow the local CLI/repo behavior and report the difference.

## Safety Rules

- Inspect existing files before running scaffold or generation commands.
- Do not run destructive overwrite/scaffold commands unless the user explicitly approves.
- Prefer direct YAML edits for precise manifest changes.
- Prefer CLI for new project initialization, standard component enablement, adding Kafka consumers/producers, and regenerating managed outputs.
- Use `.mise.toml` as the project-local toolchain and task surface when Devctl scaffolds or maintains generation tooling.
- After generation, inspect generated diffs and update handwritten code through the target language skill.
- Do not hand-edit generated outputs unless the user explicitly asks for a temporary patch.

## Tooling and Mise

Devctl-scaffolded projects use `.mise.toml` for pinned tool versions and generation/check tasks.

Before running `devctl gen ...`, `devctl lint ...`, or project-local generation/check tasks:

```bash
command -v mise
test -f .mise.toml
mise install
```

Rules:

- `devctl gen ...` must not install external tools implicitly.
- If `mise` is unavailable, `.mise.toml` is missing, or a required tool is missing/wrong-version, stop before generation or lint and tell the user to run `mise install` after the tooling file exists.
- For new Devctl scaffolds, expect the CLI to create or update `.mise.toml` together with `devctl.yaml` and generator config.
- For existing repos, preserve the established `.mise.toml` tasks and tool versions. Do not rewrite tool versions unless the user explicitly asks for a tooling update.
- Do not invent exact tool versions. Prefer local CLI defaults, repo docs, or existing `.mise.toml`; otherwise report that tooling scaffold requires CLI/default version data.
- Treat `mise run gen`, `mise run gen:http`, `mise run gen:grpc`, `mise run gen:kafka`, `mise run lint`, and `mise run check` as project-local task entrypoints when present.

## Known Commands

The v1 CLI surface is:

```bash
devctl init
devctl validate
devctl inspect
devctl enable
devctl add
devctl sync
devctl gen
devctl lint
```

Initialize:

```bash
devctl init manifest --lang go --preset http-service --name myapp --module github.com/acme/myapp
# Complete or mutate devctl.yaml, then materialize the foundation:
devctl init scaffold
```

Validate and inspect:

```bash
devctl validate
devctl inspect
```

`validate` checks manifest shape, required fields, source references, local contract paths, and project-local generation tooling without generating artifacts or installing tools.

`inspect` shows the resolved/effective view after defaults are applied, such as default contract paths, generated output paths, env names, DB selected variants, and generation targets.

Enable singleton capabilities:

```bash
devctl enable http
devctl enable grpc
devctl enable http --always
devctl enable logging
devctl enable health
devctl enable telemetry
devctl enable pprof
```

Add named resources:

```bash
devctl add db primary --kind sqlite --default
devctl add db primary --kind postgres
devctl add db archive --kind postgres --migrations-path db/archive
devctl add db scratch --kind sqlite --no-migrations
devctl add db analytics --kind clickhouse
devctl add redis cache --addr-default localhost:6379
devctl add s3 uploads
devctl add s3-connection archive
devctl add s3 exports --connection archive
devctl add source users-devctl --type devctl --repo git@github.com:acme/users.git --ref v1.4.0
devctl add source billing-proto-git --type git --repo git@github.com:acme/billing-proto.git --ref main
devctl add http-client users --source users-devctl --export users-openapi
devctl add grpc-client billing --source billing-proto-git --path api/proto/grpc/acme/billing/v1 --proto-root api/proto/grpc
devctl add kafka-consumer users --topic user_service.user.events.v1
devctl add kafka-producer audit --topic audit_service.audit.events.v1
```

`enable` is only for singleton project capabilities. Use `add` for named dependencies, resources, clients, consumers, and producers.

`add source` is declaration-only: it updates `devctl.yaml`, but should not download contracts, generate clients, install tools, or stage files.

DB command rules:

- `devctl add db <name> --kind <kind>` creates a logical DB connection when `<name>` is new.
- Running it again with the same `<name>` and a different `--kind` adds a backend variant to that logical DB.
- `--default` sets the default backend variant for that logical DB.
- SQLite and PostgreSQL variants get migrations by default at `migrations/<connection>/<variant>`.
- `--migrations-path <path>` overrides that directory; `--no-migrations` opts out. The two flags are mutually exclusive and are invalid for ClickHouse.
- Migration commands are scaffolded as `mise run migrate:<connection>:<variant>:{create,up,down}`; Devctl never applies migrations itself.
- Generated config should select backend with `kind_env`, defaulting to `DB_<NAME>_KIND`.
- Redis is not a DB variant and has no default selector. Use `devctl add redis <name> [--addr-env <ENV>] [--addr-default <address>]`.

S3 command rules:

- `devctl add s3 <name>` creates a logical S3 bucket resource.
- Without `--connection`, `devctl add s3 <name>` uses `connection: default` and may create a minimal default connection if it does not exist.
- `devctl add s3-connection <name>` explicitly creates a named S3 connection.
- `devctl add s3 <name> --connection <connection>` attaches the bucket to an existing named S3 connection.
- If the named connection is missing, fail fast and tell the user to run `devctl add s3-connection <connection>` or edit `devctl.yaml`.
- S3 connections own endpoint, region, path-style, and credentials env keys; buckets own bucket and optional prefix env keys.
- Do not duplicate static access/secret key env vars on each bucket. Reuse a named connection.

## Target Selectors

Use the same target grammar for focused `sync` and `gen`:

```text
http-server
http-client:<name>
grpc-server
grpc-client:<name>
kafka-consumer:<name>
kafka-producer:<name>
```

The target kind should match the `add` command type, such as `devctl add grpc-client billing` -> `--target grpc-client:billing`.

## Source Sync

`sync` materializes external source artifacts referenced by the manifest:

```bash
devctl sync
devctl sync http
devctl sync grpc
devctl sync kafka
devctl sync http --target http-client:users
devctl sync grpc --target grpc-client:billing
devctl sync kafka --target kafka-consumer:users
```

Use `--dry-run` to preview source materialization without fetching or writing:

```bash
devctl sync grpc --target grpc-client:billing --dry-run
```

`devctl sync` without a kind synchronizes all materializable source artifacts. `devctl sync <kind>` synchronizes one contract family. Do not materialize sources manually when the CLI supports the selected source type.

Generate:

```bash
devctl gen
devctl gen config
devctl gen http
devctl gen grpc
devctl gen kafka
devctl gen http --target http-server
devctl gen http --target http-client:users
devctl gen grpc --target grpc-client:billing
devctl gen kafka --target kafka-consumer:users
devctl gen kafka --target kafka-producer:audit
devctl gen grpc --target grpc-client:billing --dry-run
```

`gen` writes generated outputs from local or already synchronized inputs. It should fail with actionable `devctl sync ...` guidance when required external artifacts are absent or stale; it should not synchronize sources implicitly.

For a Go HTTP server, `devctl gen http --target http-server` resolves the OpenAPI input, passes
`oapi_config`, and writes `<server_out>/server.gen.go`. The native config owns
generation flags, while the manifest owns the output path. Devctl must reject competing output
ownership, require the project-pinned tool, and leave handwritten transport/DI files untouched.

Lint contracts:

```bash
devctl lint
devctl lint http
devctl lint grpc
devctl lint kafka
```

`lint` checks contract content for local or already synchronized inputs. `devctl lint` runs all applicable contract linters; `lint http`, `lint grpc`, and `lint kafka` run one contract family.

Do not use `--target` with `lint <kind>` in v1. Diagnostics should still identify the affected component or target, such as `http-server`, `http-client:users`, `grpc-client:billing`, or `kafka-consumer:users`. If only one component matters, run the family lint and inspect the target-specific diagnostics.

`lint` must not download sources, run `sync`, generate code, install tools, modify files, or run language code lint. If synced artifacts are missing, run the relevant `devctl sync ...` command first.

These commands are expected workflows, not a substitute for checking actual CLI help when the local CLI may differ.

## Validation And Materialization Contract

Use this section to understand what the CLI owns. Do not manually reimplement the full manifest validator, source materializer, generator, or contract linter when the CLI is available.

- `validate` owns exact manifest validation. Expected coverage includes manifest shape, required fields, source references, source URL/local path validity, consumer `export` rules, component consistency, language/generator consistency, and project-local tooling preflight.
- Component consistency includes runtime `start` rules, Kafka names/topics, DB connections/variants/defaults, Redis placement, and S3 bucket-to-connection references.
- `validate` must not install tools, generate artifacts, or materialize external contracts.
- `inspect` owns resolved defaults and effective configuration, including default contract paths, generated output paths, env names, selected DB variants, and generation targets.
- `sync` owns materializing external contracts under managed generated input directories.
- `gen` owns writing generated outputs under configured or default generated directories from local or already synchronized inputs.
- Go HTTP generation owns the `oapi-codegen` invocation and output file location; the native config
  must not override the manifest-owned `server_out`.
- `gen config` owns generated config outputs such as `.env.example`, Helm values, and `gen/config/config.go` or the language-specific equivalent.
- `lint` owns contract-content checks for local or already synchronized inputs. It must not auto-sync, fix files, or run language code lint.
- If `validate` is unavailable, perform only best-effort YAML/repo review and report that CLI validation did not run.

## CLI vs Direct YAML

Use direct YAML edits when:

- the task asks for manifest authoring or review;
- the CLI is missing;
- the required field is not supported by known CLI commands;
- preserving comments/order/custom structure matters;
- the user wants a surgical diff.

Use CLI when:

- starting a new project from scratch;
- enabling a standard component with default shape;
- adding named resources such as DB connections, Redis connections, S3 buckets, clients, Kafka consumers, or Kafka producers;
- validating or inspecting the effective manifest view;
- synchronizing external source artifacts;
- linting contracts;
- refreshing generated config or protocol scaffolds after manifest/contract changes.

## Runtime Activation

Default CLI behavior for toggleable runtime components should add `start`:

```bash
devctl enable http
```

Expected manifest shape:

```yaml
components:
  http:
    server:
      start:
        env: HTTP_SERVER_ENABLED
        default: true
```

Use `--always` when the component should have no runtime env toggle:

```bash
devctl enable http --always
```

Expected manifest shape:

```yaml
components:
  http:
    server: {}
```

Running `devctl enable http` again without `--always` should restore the default `start.env` and `start.default` for the HTTP server.

Do not add `start` to Kafka producers.

## Generation Sequence

For a new Go service with HTTP and Kafka:

```bash
devctl init manifest --lang go --preset http-service --name user-service --module github.com/acme/user-service
devctl enable http
devctl add db primary --kind sqlite --default
devctl add db primary --kind postgres
devctl add redis cache --addr-default localhost:6379
devctl add s3 uploads
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

For external contracts, synchronize before linting or generation:

```bash
devctl validate
devctl sync grpc
devctl lint grpc
devctl gen grpc
```

If `.mise.toml` defines generation tasks, the project-local equivalent may be:

```bash
mise install
mise run gen
```

For existing repos, do not assume all commands are safe. Inspect current `devctl.yaml`, generated directories, and help output first.

## Reporting

When finishing CLI work, report:

- commands run;
- source synchronization skipped or failed, if applicable;
- contract lint skipped or failed, if applicable;
- generation skipped because CLI was unavailable, if applicable;
- direct pinned generation used as a CLI-unavailable fallback, if applicable, together with the
  fact that Devctl validation did not run;
- generation skipped because project-local tools were unavailable, if applicable;
- generated files/directories changed;
- follow-up implementation skill used or recommended.
