# Ownership and Routing

Use this reference when work crosses manifest, contract, generated, and handwritten boundaries.

## Owners

- `$devctl` owns `devctl.yaml`, CLI command discovery, effective defaults, scaffold, source sync,
  contract lint, generation, and managed-output reporting.
- `$devctl-openapi` owns OpenAPI paths, operations, schemas, errors, polymorphism, and file
  organization. It may account for project tooling but does not own Devctl wiring or generators.
- `$devctl-go` owns handwritten Go packages, delivery adapters, dependency wiring, runtime,
  configuration use, migrations, tests, and consumption of generated packages.
- `$devctl-react-vite` owns a separate React/Vite application and generated client integration.
- `$devctl-obsidian-react` owns an Obsidian plugin runtime and its React surfaces.

Devctl CLI v1 does not own Python or Rust manifests. Route generic Python or Rust work directly to
the corresponding language skill without inventing `devctl.yaml` support.

## Order

For a Devctl Go service whose API changes:

1. Establish or update manifest ownership with `$devctl` only when the contract path or component
   declaration changes.
2. Author the contract with `$devctl-openapi`.
3. Return to `$devctl` for requested lint or generation.
4. Implement handwritten Go behavior with `$devctl-go`.

For an external client, establish its source and manifest target before sync, then lint and
generate from the synchronized snapshot. Each operation remains explicit.

## Boundaries

- Subskills read explicit manifest values and return to `$devctl` for default resolution or
  mutation rather than copying the manifest schema.
- Contract skills do not edit generator outputs.
- Language skills consume generated packages but do not materialize sources or reinterpret target
  IDs.
- Project tool installation and upgrades remain user-owned unless explicitly requested.

Stop and report when the requested manifest language is unsupported, a required contract is
missing, CLI-required work cannot run, or a scaffold would overwrite user-owned content.
