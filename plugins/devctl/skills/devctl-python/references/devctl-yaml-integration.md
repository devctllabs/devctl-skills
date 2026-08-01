# Devctl YAML Integration

## Contents

- Role
- What to Inspect
- Python Language Fields
- Mapping to Python Structure
- Generator Targets
- Generated Boundaries
- Manual Extensions and Updates
- Compatibility
- Config and Runtime Activation
- Review Checklist
- Non-Goals

## Role

Use `devctl.yaml` as project context when it exists. The manifest may identify the Python package, enabled components, generated outputs, contract sources, env/config fields, and runtime activation switches.

This skill consumes manifest context for Python implementation. It does not author the manifest, resolve Devctl defaults, materialize sources, or run generation unless the user explicitly asks for Devctl work.

## What to Inspect

When `devctl.yaml` exists, inspect:

- `project.name` and `project.language`;
- `languages.python.package`;
- Python generator settings and output paths;
- enabled components such as HTTP, gRPC, workers/consumers, DB, Redis, S3, metrics, logging, and pprof/debug equivalents;
- `sources` and contract input paths;
- `env.system`, `env.custom`, and component env fields;
- `start` toggles for runtime components;
- generated output directories in the repo.

Use `$devctl` for manifest authoring, default resolution, CLI command semantics, source sync, linting, and generation.

## Python Language Fields

Expected Python identity is package-oriented:

```yaml
languages:
  python:
    package: user_service
```

Rules:

- Treat `languages.python.package` as the importable package name when present.
- If absent, infer from `pyproject.toml` package metadata and existing `src/` layout before asking the user.
- Do not invent new manifest keys while changing Python code.
- Do not move package identity under `project`; language-specific identity belongs under `languages.python`.

## Mapping to Python Structure

Manifest components inform handwritten boundaries:

- HTTP/gRPC server components map to `transport/http` and `transport/grpc` plus entrypoint/deps wiring.
- Message consumers map to `transport/consumer` plus command or worker startup.
- DB/storage resources map to `repository/<backend>` and dependency providers.
- Outbound clients, producers, and external APIs map to `client/<system>`.
- Generated config maps to typed config consumption in `deps/config.py` or the configured generated boundary.

Do not make manifest components leak into domain names unless they are real domain concepts.

## Generator Targets

Python generators may write checked-in modules or external generated directories depending on the project.

When a generator target is explicit, follow it. When no project-specific boundary exists, prefer:

```text
src/<package_name>/generated/
```

For generated code outside the package, preserve existing repo patterns such as:

```text
gen/
generated/
api/generated/
```

Generated modules should be consumed through narrow manual facades or adapter modules when the generated API is noisy.

## Generated Boundaries

Generated code is output. Do not hand-edit it.

Handwritten code may:

- import generated DTOs inside transport/client adapters;
- map generated DTOs into domain commands, queries, and views;
- wrap generated clients behind service-owned Protocols;
- add manual facades outside generated directories.

Handwritten code must not:

- put generated DTOs in domain/service contracts by default;
- edit generated files to add custom behavior;
- change generated output paths without checking `devctl.yaml`, codegen config, and repo scripts;
- refresh generated code silently when the user asked only for handwritten code.

## Manual Extensions and Updates

When contracts or generated outputs change:

- use `$devctl-openapi` for OpenAPI contract authoring;
- use `$devctl` for source sync, contract lint, and generation commands;
- keep manual extension modules outside generated directories;
- update tests at the handwritten boundary that consumes generated code.

## Compatibility

Preserve contract compatibility unless the user asks for a breaking change.

- Adding fields to domain views or generated DTO mappings is usually safe when old fields keep their meaning.
- Renaming generated modules, changing operation meaning, or moving public package imports can break consumers.
- Transport adapters should map old and new generated shapes deliberately during migrations.

## Config and Runtime Activation

Generated config may contain env-derived settings, component start toggles, secret names, ports, DSNs, client URLs, and feature flags.

Rules:

- Read generated config through the repo's generated API or typed facade.
- Keep env parsing and secret redaction in `deps/config.py` or generated config modules, not domain/service.
- Treat `start` toggles as entrypoint/deps decisions. Service code should not branch on component activation.
- Do not log raw secrets.

## Review Checklist

- Did the implementation inspect `devctl.yaml` before choosing package names or generated paths?
- Does Python code consume explicit manifest values instead of inventing defaults?
- Are generated files untouched unless generation was requested?
- Do domain/service modules avoid generated DTOs and Devctl schema details?
- Are manifest edits routed to `$devctl`?

## Non-Goals

Do not use this reference to:

- author full `devctl.yaml` schema;
- choose Devctl CLI defaults;
- materialize sources;
- lint contracts;
- run generation without user intent;
- invent new Devctl manifest options.
