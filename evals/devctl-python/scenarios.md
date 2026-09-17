# devctl-python scenarios

## Remove a catalog entry through its public boundary

### Request

Implement `catalog remove NAME`. Expose `main(argv, deps)`,
`CatalogService(store).remove(name) -> Path`, and `FilesystemCatalog(root).remove(name) -> Path`.
The CLI uses `deps.catalog`, prints `removed <path>` on success, and maps `CatalogError` to
`catalog: <message>` on stderr with exit code 1. Reject blank, absolute, separator-containing,
`.` and `..` names with `InvalidPackageNameError`. Remove only one empty direct child, return
its resolved former path, preserve siblings, and map missing entries to `CatalogNotFoundError`.
Preserve the existing errors, package configuration and documented unittest tooling.

### Setup

Copy [fixtures/catalog-remove-tdd](fixtures/catalog-remove-tdd) into a disposable Python 3.11+
workspace. Provide `skills/devctl-python/SKILL.md`, outside-in-tdd, simplify-code and their resources.

### Success criteria

- Independently exercise CLI success/error output and status, invalid names, missing entries and
  sibling preservation in a temporary directory. A non-empty child is not recursively deleted.
- The service owns a narrow store Protocol and contains no filesystem mechanics; the adapter
  owns I/O and error translation. Tests cover each behavior owner.
- Existing tooling/configuration and error contracts stay intact; documented tests pass.

## Small stateless library

### Request

Export `normalize_name(value: str) -> str` from `acme_names`. Strip surrounding whitespace,
collapse each internal whitespace run to one ASCII space, apply Unicode-aware case folding,
and raise `ValueError` for an empty normalized result. Keep the library stateless and preserve
its package layout and test tooling.

### Setup

Copy [fixtures/library-kiss-tdd](fixtures/library-kiss-tdd) into a disposable Python 3.11+ workspace.
Provide the target skill and its testing dependencies as above.

### Success criteria

- Independently test surrounding/internal whitespace, `Straße`, already normalized input and
  whitespace-only input through the package export. The documented suite passes.
- Importing the library causes no I/O. No service/repository/runtime architecture or unrelated
  dependencies are introduced for this deterministic function.

## Typed I/O boundary migration

### Request

Refactor this run dispatch slice without changing persisted JSON or dispatch behavior. Replace
the public anonymous record with immutable `DispatchOperation` and `DispatchResult` contracts;
`labels` remains a dynamic string-to-string mapping. Expose `dispatch(run_id, limit)` through
`RunService` and a consumer-owned `RunRepository` Protocol. A `FilesystemRunRepository(root)`
owns storage and JSON mapping and is wired in `deps`. Preserve positive-limit validation and
the current transition; keep unittest and add mypy explicit-Any and Import Linter boundary checks.

### Setup

Copy [fixtures/typed-layer-contracts](fixtures/typed-layer-contracts) into a disposable workspace.
Provide the same skills/resources. Python 3.12+ is required; availability of mypy and Import Linter
is needed for their checks, otherwise those checks must be reported unrun.

### Success criteria

- Capture existing dispatch output/state before changes; independently compare JSON and transitions
  afterward, including invalid limits. Public results use immutable named typed contracts.
- Service code imports no repository implementation and does no filesystem I/O; private codec/layout
  details stay inside the adapter. Service tests use a small fake; adapter tests use temporary storage.
- Tests pass; configured type and import checks enforce the requested boundaries when available.
- Evidence distinguishes the initial behavior characterization from tests of the new public types.
