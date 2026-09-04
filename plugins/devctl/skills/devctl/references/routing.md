# Routing

Use this reference after manifest and generation decisions are clear.

## General Rule

`devctl` owns project interview, manifest authoring, CLI usage, and generated-artifact refresh decisions. Implementation skills own handwritten architecture and code after manifest/codegen context is established.

Do not duplicate full `devctl.yaml` schema or CLI command documentation in subskills.

Subskills should not duplicate Devctl default path tables. They read explicit `devctl.yaml` values and use `$devctl` for manifest defaults, CLI semantics, and default-vs-explicit decisions.

Subskills should not invent project tooling install workflows. `$devctl` owns `.mise.toml` policy, generation preflight, and default task semantics; subskills may only consume the resulting tooling context while implementing handwritten code.

Subskills should not invent DB/resource manifest shape. `$devctl` owns CLI/resource modeling, including singleton `enable` capabilities, named `add` resources, DB connections, DB backend variants and their migration targets, Redis connections, and S3 connections/buckets.

Subskills should not validate, lint, or materialize `sources`. They may read explicit manifest values for implementation context, but manifest validation, default resolution, source materialization, contract lint, and generation return to `$devctl` and the `devctl` CLI.

## Existing Skills

Route Go backend implementation to `$devctl-go` when the task changes:

- Go package structure;
- domain/service/usecase/repository/client/transport code;
- `internal/deps`, runtime, config, logging, observability, auth, tests;
- Go usage of generated HTTP/gRPC/Kafka/config packages.

Route Rust backend or desktop implementation to `$devctl-rust` when the task changes:

- Rust Cargo workspace/package structure;
- reusable core crate, delivery crates, modules, runtime wiring, config, auth, observability, tests;
- Rust usage of generated HTTP/gRPC/Kafka/config modules;
- Tauri Rust-side commands, state, app data, and Rust plus UI monorepo layout.

Route OpenAPI authoring to `$devctl-openapi` when the task changes:

- OpenAPI paths, operations, schemas, responses, errors, components, or polymorphism;
- contract file organization under `api/openapi` or similar.

Route React + Vite implementation to `$devctl-react-vite` when the task changes:

- frontend structure;
- routes/pages/features;
- platform services;
- generated OpenAPI client usage;
- forms, i18n, Storybook, testing, UI states.

Route Obsidian plugin implementation with React to `$devctl-obsidian-react` when the task changes:

- Obsidian plugin structure, lifecycle, commands, views, settings, events, or vault access;
- React surfaces mounted inside Obsidian;
- mobile compatibility, plugin data safety, startup performance, or community guidelines;
- esbuild packaging, Storybook, unit tests, real-Obsidian E2E, or plugin releases.

## Future Skills

If the manifest language is `python` and no `$devctl-python` skill exists, complete manifest and CLI work only. Do not invent Python project architecture.

When a future language skill exists, route implementation there after `devctl.yaml` and generated boundaries are clear.

## Cross-Skill Order

For a backend service with an API contract:

1. Use `$devctl` to create/update `devctl.yaml`.
2. Use `$devctl-openapi` to author or update OpenAPI when contract content is missing or changing.
3. Use `$devctl` CLI guidance to synchronize external sources, lint contracts, and run generation if requested and available.
4. Use `$devctl-go`, `$devctl-rust`, or another available language skill for handwritten implementation.

For a frontend app consuming a generated API:

1. Use `$devctl` to capture source/client generation context when Devctl-managed.
2. Use `$devctl-openapi` if contract changes are required.
3. Use `$devctl-react-vite` for frontend app structure and generated client integration.

For an Obsidian plugin with React surfaces:

1. Use `$devctl` only when the repository also has Devctl-managed manifest or generation work.
2. Use `$devctl-obsidian-react` for the plugin runtime, React surfaces, tests, and release workflow.
3. Use `$devctl-react-vite` only for a separate browser application package; do not apply SPA routing or runtime defaults to the Obsidian plugin bundle.

## Stop Conditions

Stop and report when:

- the required language implementation skill does not exist;
- CLI generation is requested but `devctl` is unavailable;
- source contracts are missing and cannot be inferred;
- a destructive scaffold overwrite would be required without explicit user approval.
