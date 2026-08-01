# Devctl YAML Integration

## Contents

- Role
- What to Inspect
- Rust Language Fields
- Package and Component Resolution
- Generator Targets
- Contract Inputs
- Generated Boundaries
- Manual Extensions and Updates
- Compatibility
- Config and Runtime Activation
- Review Checklist
- Non-Goals

## Role

Use this reference only when a repo has `devctl.yaml`, generated Devctl-managed artifacts, or the user is explicitly editing Devctl project configuration.

Treat `devctl.yaml` as project context and generator configuration. `$devctl` owns manifest authoring, schema/default decisions, CLI validation, and generation workflow. `$devctl-rust` consumes the manifest while shaping handwritten Rust code.

Do not invent Rust-specific manifest options unless the user is explicitly designing or editing the manifest. When editing the manifest, use `$devctl` rules for the source of truth.

## What to Inspect

When `devctl.yaml` exists, inspect it together with:

- `Cargo.toml` and workspace members;
- `api/`, `proto/`, `schemas/`, or configured source contracts;
- generated output directories;
- root scripts and CI codegen checks;
- existing Rust modules that wrap generated code;
- package-manager files when Rust is part of a UI/Tauri monorepo.

## Rust Language Fields

Expected Rust manifest context:

```yaml
languages:
  rust:
    workspace: rust
    crate: myapp
    package_prefix: myapp
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
    application:
      package: app
```

Rules:

- `workspace` is the Cargo workspace root relative to the repo, such as `rust` or `.`.
- `crate` is the canonical Rust crate/import prefix when generators need one.
- `package_prefix` is used for Devctl inference of standard package names.
- `generation.mode` defaults to `checked-in` for Devctl-managed Rust codegen.
- `packages[]` is physical Cargo inventory only. It does not encode architecture roles.
- `packages[].id` is the stable manifest-local id used by components and generators.
- `packages[].name`, `path`, `lib`, and `bins` describe Cargo package details.
- `application.package` identifies the reusable application/core package.

Do not assume package ids are fixed. `app`, `api`, and `desktop` are examples, not schema-required names.

## Package and Component Resolution

Use manifest context to identify:

- canonical contract inputs;
- configured generated output directories;
- runtime components that correspond to CLI/server/worker/Tauri delivery;
- environment/config values consumed by delivery crates;
- manual extension points that must not be overwritten.

Resolve packages in this order:

- If `languages.rust.packages[]` exists, all package references must match `packages[].id`.
- If package inventory is absent, infer standard packages from `package_prefix`, enabled components, and the actual Cargo workspace.
- `languages.rust.application.package` is the default package for reusable core/application code and generated client/config modules.
- Component bindings such as `languages.rust.components.http.server.package` and `languages.rust.components.tauri.package` identify delivery packages.
- Generator target packages override component bindings only for that generator.

Do not add role/delivery metadata to package entries. The package is physical inventory; delivery semantics come from component bindings.

Rust component example:

```yaml
languages:
  rust:
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
```

Keep Rust architecture rules unchanged:

- core contracts live in `<app>-core`;
- delivery crates map protocol DTOs to core commands/queries;
- generated code stays behind explicit generated boundaries;
- handwritten facades/adapters own business-facing APIs.

## Generator Targets

Rust generators target package ids and module paths:

```yaml
languages:
  rust:
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
          - package: desktop
            module: generated/config
```

Resolution rules:

- `package` references `languages.rust.packages[].id` when explicit inventory exists.
- `module` is a Rust module path under the package, usually under `src/generated/` for checked-in code.
- HTTP/gRPC server generation defaults to the matching component package when the generator target omits `package`.
- Client and shared config generation default to `application.package` unless `targets[]` is explicit.
- `generation.mode: checked-in` means generated files are committed and CI should detect drift.
- A generator may use `mode: build-rs` only when generated code is intentionally produced during `cargo build`.

## Contract Inputs

Contract sources are language-neutral inputs:

```text
api/openapi/
proto/
schemas/
```

If `devctl.yaml` points to a specific source path, prefer that over defaults. Contract content still comes from the contract files; the manifest controls project shape and generator settings.

## Generated Boundaries

Generated Rust output belongs in:

- Cargo `OUT_DIR`;
- `src/generated/` inside the consuming crate;
- a generated crate only for stable shared contract boundaries.

If `devctl.yaml` or generator config already defines a generated target, preserve it unless the user asks to restructure.

Never hand-edit generated output. Put manual extensions outside generated directories, usually in adapters, mappers, or facades.

## Manual Extensions and Updates

When updating generated-adjacent code:

- identify which files are generated and which are handwritten;
- patch handwritten facades, adapters, and mappers;
- run the repo's generator only when the user asks or when the task requires regenerated artifacts;
- fail CI on generated drift when generated code is checked in.

## Compatibility

For API/message compatibility:

- inspect the source contract and generated Rust types;
- preserve wire names, enum values, and message field semantics;
- keep breaking changes explicit;
- map generated DTOs into stable core contracts before business logic.

Do not infer compatibility guarantees from Rust type names alone.

## Config and Runtime Activation

If the manifest defines env/config/start values, treat them as runtime context:

- delivery crates load env/config and validate it;
- core receives typed config values;
- CLI/server/Tauri activation stays in runtime wiring;
- generated config structs should not become global singletons by default.

## Review Checklist

- `devctl.yaml` was inspected when present.
- Rust package ids, application package, component bindings, and generator targets are resolved.
- Generated directories and manual extension points are identified.
- Contract sources remain canonical.
- Rust generated output has an explicit boundary.
- Checked-in vs `build-rs` generation mode is clear.
- No new manifest options were invented without user intent.

## Non-Goals

- Do not validate the full `devctl.yaml` schema unless the task is manifest authoring.
- Do not author OpenAPI/Proto contracts here; use the relevant contract skill.
- Do not regenerate artifacts unless the task requires it.
