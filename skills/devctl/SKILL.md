---
name: devctl
description: Use when interviewing for project shape, creating or updating devctl.yaml manifests, using the devctl CLI for project initialization, component enablement, source synchronization, contract linting, scaffold/code generation, generated-code refreshes, or routing work to Devctl language and contract skills such as devctl-go, devctl-rust, devctl-openapi, devctl-react-vite, devctl-obsidian-react, or future devctl-python.
---

# Devctl

Use this skill as the entrypoint for Devctl-managed projects. It owns the manifest, the CLI workflow, and routing to implementation skills.

## Workflow

1. Inspect the repo before asking questions: `devctl.yaml`, project language, contracts, generated directories, scripts, package/module files, existing commands, and current conventions.
2. Classify the task:
   - manifest-only: create, review, or update `devctl.yaml`;
   - CLI-assisted workflow: use `devctl` to initialize, enable components, add consumers/producers/clients/sources, synchronize sources, lint contracts, or run code generation;
   - implementation routing: prepare manifest/codegen context, then use a language or contract skill.
3. Ask only for missing decisions that materially affect the manifest or generation. Use `references/interview.md` for the question set.
4. Author or update `devctl.yaml` using `references/devctl-yaml.md`. Keep it declarative: project shape, components, env, sources, language settings, and generator settings.
5. Use `references/cli.md` before running `devctl`. If the CLI is unavailable, edit `devctl.yaml` directly and state that generation was not run.
6. Route follow-up implementation with `references/routing.md`. Load only the target subskill references needed for that implementation.
7. When the CLI is available, use `devctl validate` for manifest validation, `devctl inspect` for resolved defaults, `devctl sync` for external source materialization, `devctl lint` for contract lint, and `devctl gen` for generated outputs. Use best-effort YAML/repo checks only when the CLI is unavailable, and state that CLI validation was not run. Do not hand-edit generated files unless the user explicitly asks for a temporary patch.

## References

- Read `references/interview.md` when requirements are incomplete or the task asks to bootstrap/design a project.
- Read `references/devctl-yaml.md` when creating, reviewing, or editing `devctl.yaml`.
- Read `references/cli.md` before running `devctl` commands or deciding whether to edit YAML directly.
- Read `references/grpc-contract-naming.md` when naming or linting local gRPC contracts.
- Read `references/kafka-contract-naming.md` when naming or linting Kafka topics and schemas.
- Read `references/routing.md` when delegating work to language, frontend, or contract skills.
- Read `references/examples.md` when a concrete manifest or workflow example would reduce ambiguity.

## Default Decisions

- Do not create a separate `devctl-yaml` skill. Manifest authoring belongs here.
- Treat built-in defaults as an autonomous working mirror of Devctl behavior. If an existing `devctl.yaml`, repo convention, local `devctl` CLI help, or generated output conflicts with this skill, prefer the local repo/CLI behavior and preserve or make the differing value explicit.
- Prefer a direct `devctl.yaml` edit when the user asks for a precise manifest diff or when the CLI is unavailable.
- Prefer CLI commands when initializing a new project, enabling standard components, adding Kafka consumers/producers, synchronizing external sources, linting contracts, or regenerating managed artifacts and the command behavior is confirmed.
- Treat the v1 CLI surface as `init`, `validate`, `inspect`, `enable`, `add`, `sync`, `gen`, and `lint`.
- Treat `devctl validate`, `devctl inspect`, `devctl sync`, `devctl gen`, and `devctl lint` as the authoritative workflow for manifest validation, resolved defaults, source materialization, generated outputs, and contract lint. This skill documents the expected CLI contract; it does not replace the CLI validator/generator/linter.
- Treat `devctl.yaml` as the project manifest for architecture, environment, runtime activation, and generator settings. Proto, OpenAPI, and JSON Schema files still define API/message contract content.
- Treat `.mise.toml` as the standard project-local toolchain and task surface for Devctl-scaffolded projects. Repos own future tool version updates after scaffold; generation should preflight tools and fail with `mise install` guidance instead of installing tools implicitly.
- Keep DB migrations on each SQLite/PostgreSQL variant. Devctl owns their directories and `.mise.toml` golang-migrate tasks, but never applies migrations or adds the migration CLI to application runtime dependencies.
- Model Redis as named `connections[]` with `addr_env` and optional credential-free `addr_default`; there is no default/primary Redis connection flag.
- Keep generated outputs under configured generator paths or existing generated directories. Do not hand-edit generated outputs.
- For unsupported language skills, stop after manifest/CLI work and explain that handwritten implementation guidance needs a dedicated language skill.
