# CLI Workflow

Read this reference before executing Devctl. Use the installed command, not this file, for exact
flags and current help text.

## Discover

Start with:

```bash
command -v devctl
devctl --version
devctl --help
devctl <command> --help
```

Inspect leaf help before using a subcommand or flag that is not already established in the repo.
The v1 command families are `init`, `validate`, `inspect`, `enable`, `add`, `sync`,
`lint`, and `gen`.

If Devctl is unavailable, direct manifest editing remains possible. Report that CLI validation,
inspection, synchronization, lint, scaffold, or generation did not run. An existing project-owned
task may replace generation only when its inputs, configuration, and managed output are explicit.

## Choose the operation

- Use `init manifest` for a new manifest and `init scaffold` to materialize the project
  foundation.
- Use `enable` for singleton capabilities and `add` for named resources, sources, clients, and
  Kafka endpoints.
- Use direct YAML editing for surgical changes, unsupported mutation fields, or when preserving
  comments and ordering matters.
- Use `validate` for structural, semantic, reference, path, and project-readiness checks.
- Use `inspect` for effective defaults, target IDs, runtime configuration, resources, and resolved
  contract inputs.
- Use `sync` for external contract snapshots, `lint` for committed contract inputs, and `gen`
  for managed outputs.

Manifest mutations do not scaffold, synchronize, lint, generate, or install tools. `sync`,
`lint`, and `gen` do not invoke one another.

## Safety and ownership

- Inspect existing files and Git status before scaffold or publication.
- `init scaffold` refreshes managed outputs and creates missing user-owned seeds; it has no force
  overwrite mode for handwritten files.
- A full synchronization may prune stale managed target trees. Preview it with the command's
  `--dry-run` when available; an explicit target must not prune sibling targets.
- Generation publishes only managed outputs and may replace an owned target tree. Keep handwritten
  files outside those paths.
- Use project-owned tool versions and native configs. Inspect `go.mod`, `.mise.toml`, and
  project tasks; Devctl must not install tools implicitly.
- Do not substitute handwritten output when a required generator is unavailable.
- Devctl declares and scaffolds migration tasks but never applies migrations.

## Contract and generation order

For a local contract change, lint before requested generation. For an external contract, use:

```text
validate -> sync -> lint -> gen
```

Run only the applicable families or target IDs confirmed by local help. Generation consumes local or
already synchronized input; it does not synchronize or lint implicitly.

After manifest changes, run `validate` and `inspect`. After generated Go imports change, run the
project's established Go dependency and check tasks when they are in scope.

## Structured output

Prefer `--json` when automation needs deterministic result or failure records. Treat validation
and lint findings as normal invalid results, not execution failures. Use `--verbose` only when raw
diagnostics are necessary and safe to expose.

## Completion report

Report:

- manifest and CLI operations performed;
- validation or inspection evidence;
- sync, lint, scaffold, or generation skipped and why;
- managed outputs changed;
- handwritten work remaining or routed to another skill.

Never claim an unavailable or unexecuted command succeeded.
