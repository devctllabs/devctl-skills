---
name: devctl
description: "Use for Devctl Go project manifests and CLI workflows: shaping or editing devctl.yaml, initializing or scaffolding projects, managing components and contract sources, validating or inspecting effective configuration, synchronizing or linting contracts, and generating managed outputs."
---

# Devctl

Own the `devctl.yaml` manifest and explicit Devctl CLI workflow for Go projects. Contract content
and handwritten implementation belong to the relevant contract or Go skill.

## Workflow

1. Inspect `devctl.yaml`, Go module files, contracts, generated boundaries, project tasks, and local
   conventions. Check `command -v devctl` and relevant `devctl <command> --help` before relying on
   command syntax. The fact set is complete when the project root, manifest, requested target, and
   available tooling are known.
2. Classify the work as manifest authoring, manifest mutation, scaffold, source synchronization,
   contract lint, generation, or implementation handoff. Read only the references for that branch.
3. Ask only for decisions that cannot be derived from the repo or CLI. For incomplete project
   requirements, use `references/interview.md`.
4. Use the CLI for initialization, standard mutations, validation, inspection, synchronization,
   linting, scaffolding, and generation when its help confirms the operation. Use a direct YAML edit
   for a surgical manifest change or a field without CLI mutation support.
5. Keep workflows explicit. Manifest mutation, scaffold, sync, lint, and generation are separate
   operations; run only those the user requested or that are necessary to verify the requested
   change. Preview publication or pruning with `--dry-run` when available.
6. Validate manifest changes with `devctl validate` and inspect effective defaults with
   `devctl inspect`. If the CLI is unavailable, perform a best-effort YAML/repo review and report
   the missing validation rather than imitating the CLI.
7. Route OpenAPI content to `$devctl-openapi` and handwritten Go to `$devctl-go`. Return here only
   for manifest wiring or CLI operations. Completion requires every requested operation to be run
   or explicitly reported as skipped, with managed and handwritten changes distinguished.

## References

- Read `references/devctl-yaml.md` when creating, reviewing, or directly editing `devctl.yaml`.
- Read `references/cli.md` before executing Devctl commands.
- Read `references/interview.md` when project-shape decisions are missing.
- Read `references/routing.md` when the task crosses manifest, contract, generated, and handwritten
  ownership boundaries.
- Read `references/grpc-contract-naming.md` or `references/kafka-contract-naming.md` only for the
  matching contract family.
- Read `references/examples.md` only when a minimal concrete workflow resolves ambiguity.

## Invariants

- The local repository and installed CLI outrank this skill's working reference.
- Devctl v1 supports Go projects. Do not author Python or Rust manifest sections.
- `devctl.yaml` declares desired project shape; OpenAPI, Proto, and JSON Schema files declare
  protocol content.
- Project-owned tool versions and task commands live outside the manifest.
- Generated outputs stay under their configured managed paths and are regenerated rather than
  hand-edited.
- Devctl never applies database migrations.
