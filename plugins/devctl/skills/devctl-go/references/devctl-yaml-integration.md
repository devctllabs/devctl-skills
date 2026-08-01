# Devctl YAML Integration

## Contents

- Role
- What to Inspect
- Mapping to Go Layers
- Contract Inputs
- Generated Boundaries
- Manual Extensions and Updates
- Compatibility
- Config and Runtime Activation
- Review Checklist
- Non-Goals

## Role

Use this reference only when a Go repo has `devctl.yaml` or the task mentions devctl-managed components, generated paths, config, or runtime activation.

`devctl.yaml` is project context for devctl-managed shape and settings:

- project metadata and selected language;
- enabled components such as HTTP, gRPC, Kafka, DB, Redis, S3, metrics, logging, and pprof;
- generator output paths and tool config under `languages.go.generators`;
- external contract references under `sources`;
- environment variables and runtime activation under `env` and `start`.

Keep the source boundaries precise:

- `devctl.yaml` controls devctl-managed project shape, component declarations, environment settings, runtime activation, and generator output paths.
- Proto, OpenAPI, and JSON Schema files control API and message contract content.
- Generator configs such as `buf.gen.yaml` or `oapi-codegen` config control generator behavior when present.
- `.mise.toml` controls project-local tool versions and generation/check tasks when present.
- `gen/*` is generated output. Do not hand-edit it unless the user explicitly asks.

## What to Inspect

When `devctl.yaml` exists, inspect only the fields relevant to the task:

- `project.language` and `languages.go.module` for Go project identity.
- `components.http.server` and `components.http.clients` for HTTP server/client shape.
- `components.grpc.server` and `components.grpc.clients` for gRPC server/client shape.
- `components.kafka.consumers` and `components.kafka.producers` for Kafka runtime and outbound messaging.
- `components.db.connections[].name`, `.default`, `.kind_env`, and `.variants[]` for logical DB resources and backend selection.
- `components.redis.instances[]` for named Redis resources.
- `components.s3.connections[]` and `components.s3.buckets[]` for S3-compatible object storage resources.
- `components.*.env`, `env.prefix`, and `env.custom` for generated config fields.
- `start` blocks for runtime activation toggles.
- `languages.go.generators.*` for explicit output directories and generator config.
- `.mise.toml`, `go.mod` tool declarations, `buf.gen.yaml`, and `oapi-codegen` config only as codegen/tooling context for existing generated boundaries.
- `sources` only to understand where contracts come from. Do not materialize or validate sources manually; route codegen, manifest validation, and source materialization through `$devctl`.

## Mapping to Go Layers

Use manifest components to explain or verify expected Go structure:

| Manifest area | Go context |
| --- | --- |
| `components.http.server` | `internal/transport/serverhttp`, configured HTTP server provider, optional generated server package |
| `components.http.clients` | generated HTTP clients under the configured `client_out`, service-side client interfaces, optional wrappers in `internal/client/<system>` |
| `components.grpc.server` | `internal/transport/servergrpc`, generated server interfaces, gRPC server provider |
| `components.grpc.clients` | generated gRPC clients under the configured `client_out`, service-side client interfaces, optional wrappers in `internal/client/<system>` |
| `components.kafka.consumers` | consumer packages, named DI registration, `consumer <name>` runtime entrypoint |
| `components.kafka.producers` | outbound producer adapters in `internal/client` or the existing project convention |
| `components.db.connections` | logical DB providers keyed by connection name; provider selects a backend variant from generated config |
| `components.redis.instances` | named Redis clients or caches wired by instance name |
| `components.s3.connections` and `components.s3.buckets` | named S3-compatible clients plus logical bucket resources wired by bucket name |
| `components.*.env` and `env.custom` | generated config plus validation and registration in `internal/deps/config.go` |
| `start` | conditional runtime startup for servers, consumers, metrics, workers, or similar components |

Do not infer business operations directly from `devctl.yaml`. The manifest tells which infrastructure and generated surfaces exist; domain/service contracts still come from business code and contract files.

For DBs, Go code should depend on logical connection names such as `primary` or `analytics`, not concrete backend package names. Generated config may expose the selected DB kind plus backend-specific DSN fields. DI/provider code chooses the concrete adapter from the selected variant. Do not collapse DB variants into separate business dependencies unless they are separate logical connections in the manifest.

For S3, Go code should depend on logical bucket names such as `uploads` or `exports`, not duplicated credential env vars. Generated config may expose named S3 connections plus bucket names and prefixes. DI/provider code creates S3-compatible clients from connections and passes bucket-scoped adapters to services.

## Contract Inputs

Contract inputs define external API/message behavior:

- OpenAPI files for HTTP APIs;
- Proto files for gRPC and protobuf messages;
- JSON Schema files for JSON messages;
- config schemas or devctl manifest fields for generated config shape;
- generator configs such as `buf.gen.yaml` or `oapi-codegen` config for generator behavior.
- project tooling such as `.mise.toml` or Go tool declarations for pinned generator entrypoints.

Generated Go code is an output of these inputs.

## Generated Boundaries

Prefer explicit paths over defaults:

1. Use paths from `languages.go.generators` when present.
2. Otherwise use existing generated directories and codegen config in the repo.
3. Otherwise use the default `gen/*` boundary from this skill.

Go implementation should not own the full default path table. Use explicit `devctl.yaml` or codegen config values first. Use standard generated boundaries only as an implementation fallback when manifest/config is absent or incomplete. Use `$devctl` for manifest defaults and CLI semantics.

Common default output directories are:

```text
gen/serverhttp
gen/clienthttp
gen/servergrpc
gen/clientgrpc
gen/consumerkafka
gen/producerkafka
gen/config
```

If a project customizes these directories, adjust imports, package references, and handwritten adapter locations accordingly. Do not hardcode default `gen/*` paths when `devctl.yaml` or codegen config says otherwise.

Keep handwritten code outside generated output:

- generated protocol/API packages stay under the configured output directories;
- transport maps generated DTOs to domain/usecase contracts;
- client wrappers normalize external errors before they reach service contracts;
- manual extensions live under `internal/`, usually `internal/transport`, `internal/client`, or `internal/deps`.

## Manual Extensions and Updates

Put manual code outside generated directories:

- HTTP/gRPC/Kafka handlers and mappers in `internal/transport`;
- outbound wrappers in `internal/client`;
- dependency wiring in `internal/deps`;
- domain/application contracts in `internal/domain`, `internal/service`, or `internal/usecase`.

Do not push generated DTOs into domain/service contracts.

When changing contract inputs:

- update the contract file first;
- run the repo's existing generation command if available;
- inspect generated diff for expected shape only;
- update transport/client mappers and tests;
- run existing drift or generated-code checks when present.

Do not invent new generation/drift tooling during ordinary Go changes unless the user asks.

Do not create or update `.mise.toml` from this skill alone for Devctl-managed generation. Route that work through `$devctl` so the manifest, CLI, and project tooling policy stay aligned.

## Compatibility

External contracts should evolve backward-compatibly by default.

HTTP:

- prefer additive fields/endpoints;
- avoid changing response meaning without versioning;
- represent deprecation in the OpenAPI contract when supported.

gRPC/Proto:

- do not reuse field numbers;
- reserve removed fields/names when appropriate;
- prefer additive messages/fields;
- version packages/services for breaking changes.

Kafka/messages:

- version topics or message schemas for breaking changes;
- keep consumers tolerant of additive fields when the encoding supports it;
- document semantic changes that generated Go cannot detect.

Generated code compiling is not proof that contract compatibility is preserved.

## Config and Runtime Activation

Generated config may come from `env`, `components.*.env`, and `start` blocks.

Use these rules when changing Go runtime code:

- `internal/deps/config.go` loads and validates generated config; put manual config adaptation in `internal/config` only when the project needs a handwritten layer above `gen/config`.
- If `start` exists for a component, startup code should honor the generated boolean field or the existing project equivalent.
- If `start` is absent, the component is always active and may not have a generated boolean field.
- Kafka producers are outbound adapters controlled by calling code; do not add `start`-style runtime toggles for producers unless the manifest and existing project already define that behavior.
- ENV prefixing is a manifest concern; Go code should use generated config field names instead of reconstructing prefixed ENV keys throughout business code.

## Review Checklist

When reviewing or changing a Go project with `devctl.yaml`, check:

- Do generated imports and directories match explicit `languages.go.generators` paths?
- Do HTTP/gRPC/Kafka components declared in the manifest have matching transport/client/DI/runtime wiring?
- Do DB providers use logical connection names and select backend variants through generated config?
- Are Redis instances wired as named infrastructure clients instead of DB variants?
- Are S3 buckets wired as logical resources through named S3 connections instead of duplicating credentials per bucket?
- Are contract files treated as inputs and generated packages as outputs?
- Are manual handlers, mappers, wrappers, and domain/service contracts outside generated directories?
- Are generated DTOs kept out of domain/service contracts?
- Was compatibility impact reviewed for external API/message contract changes?
- If generation is involved, does project tooling context such as `.mise.toml` or Go tool declarations match the command used?
- Are config fields loaded through generated config and `internal/deps`, not global config singletons?
- Are `start` toggles honored only where the manifest or generated config exposes them?
- Are custom paths preserved instead of replaced with default `gen/*` paths?

## Non-Goals

This skill does not provide a `devctl.yaml` parser, full schema validation, manifest-authoring workflow, or `devctl` CLI workflow. Use `$devctl` for those tasks.

Do not:

- rewrite `devctl.yaml` unless the user explicitly asks to edit the manifest;
- invent new devctl manifest settings while changing Go code;
- copy the full YAML specification into this skill;
- treat generated files as contract inputs;
- use this reference as a substitute for `$devctl` when the task is manifest authoring, manifest validation, CLI-driven component enablement, or code generation.
