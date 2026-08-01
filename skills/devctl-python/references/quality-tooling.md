# Quality Tooling

## Contents

- Principle
- Default Stack
- Ruff Baseline
- Documentation Enforcement
- Type Checking
- Cognitive Complexity
- Dependency Hygiene
- Architecture Contracts
- Adoption in Existing Projects
- Verification Commands
- Review Checklist

## Principle

Use the repository's coherent quality commands and configuration first. The baseline below is the
fallback for a new project with no convention, or a target when the user explicitly asks to
standardize an existing project.

Each tool should own a distinct failure class. Prefer stable rules, explicit thresholds, and
actionable failures over a maximal rule count. Exclude generated, migration, and vendored code from
handwritten-code gates, but lint handwritten facades around those boundaries.

## Default Stack

| Tool | Owner |
| --- | --- |
| Ruff | formatting, correctness, imports, security footguns, documentation, and local complexity limits |
| mypy in strict mode | handwritten Python type contracts |
| complexipy | cognitive complexity and complexity ratcheting |
| deptry | declared, missing, unused, and transitive dependency mistakes |
| Import Linter | dependency direction between real application modules |
| pytest | behavior; see `testing-strategy.md` |

Declare the selected tools in the project's development dependency group and commit the updated
lockfile. CI and local verification should use the locked project tools rather than ambient global
executables.

Do not add Pylint, interrogate, vulture, or a custom architecture linter by default. Add another tool
only for a concrete failure class not already covered. When an architectural rule cannot be
expressed by Import Linter, prefer a small repository-owned architecture test before maintaining a
custom linter.

## Ruff Baseline

Derive `target-version` from the project's supported Python version and preserve an established line
length. For a new Python 3.12 project, use this starting point:

```toml
[tool.ruff]
target-version = "py312"
line-length = 100
preview = false

[tool.ruff.lint]
select = [
  "E4",
  "E7",
  "E9",
  "F",
  "I",
  "UP",
  "B",
  "A",
  "ASYNC",
  "BLE",
  "C4",
  "C90",
  "D",
  "DTZ",
  "ERA",
  "G",
  "LOG",
  "N",
  "PERF",
  "PIE",
  "PGH",
  "PTH",
  "PT",
  "RET",
  "RSE",
  "RUF",
  "S",
  "SIM",
  "T10",
  "TC",
  "TID",
  "PLE",
  "PLW",
  "PLR0911",
  "PLR0912",
  "PLR0913",
  "PLR0915",
  "TRY004",
  "TRY201",
  "TRY203",
  "TRY400",
  "TRY401",
]
ignore = ["D100", "D104", "D105", "D107"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = [
  "D",
  "S101",
  "S105",
  "S106",
  "S108",
]
"**/generated/**" = ["ALL"]
"migrations/**" = ["ALL"]

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.pylint]
max-args = 5
max-branches = 12
max-returns = 6
max-statements = 50

[tool.ruff.lint.pydocstyle]
convention = "google"
```

Select specific stable rule families; do not use `select = ["ALL"]` or preview rules as a default.
Make project-specific ignores narrow. Tests may use assertions and fixtures that would be unsafe in
production, but remain subject to the default `C901` and `PLR` complexity limits. Do not add those
rules to the blanket `tests/**` ignore; extract complex fixtures or use a narrowly justified
suppression for an exceptional test.

Do not exempt a handwritten production package, layer, or wildcard such as `src/**` from
documentation, branch, statement, return, or cognitive-complexity rules. Fix the owner or use one
code-specific suppression beside the unavoidable line.

Ruff's McCabe and selected Pylint limits catch large local shapes early. They complement, rather than
replace, complexipy's cognitive-complexity gate.

## Documentation Enforcement

The `D` selection enforces docstrings for public classes, methods, and functions. The baseline does
not require module, package, magic-method, or `__init__` docstrings because those often become
ceremonial. Tests are exempt from docstring rules.

Ruff cannot determine whether a private method is semantically complex. Apply the internal-callable
policy from `code-principles.md` during implementation and review: document non-obvious guarantees,
side effects, errors, locking, atomicity, ordering, and external constraints. Refactor tangled code
before documenting it.

## Type Checking

Use the existing type checker when one is established. For a new project with no convention:

```toml
[tool.mypy]
strict = true
disallow_any_explicit = true
warn_unreachable = true
warn_unused_configs = true
show_error_codes = true
```

Check handwritten source and tests. Exclude generated, migration, and vendored code through the
tool's normal configuration rather than scattering ignores. Add framework plugins only when the
project actually uses the corresponding framework and the plugin improves its real type contracts.

`strict = true` does not enable `disallow_any_explicit`. Enable it separately so explicit `Any`,
including `dict[str, Any]`, cannot silently become an application contract. When an external hook
cannot be typed more narrowly, keep the exception at that boundary and use a line-level
`type: ignore[explicit-any]` with a reason. Do not disable the check for a whole layer.

Do not claim that Ruff enforces this architecture rule. `ANN401` does not reject nested `Any` in a
generic annotation such as `dict[str, Any]`, and Ruff cannot distinguish a fixed-field anonymous
record from a valid dynamic semantic map. Use mypy for explicit `Any`, Import Linter for dependency
direction, tests for behavior, and review/evaluation for the semantic-map rule. Do not add a custom
project linter by default.

## Cognitive Complexity

Use complexipy with a maximum cognitive complexity of 15 for handwritten production code:

```toml
[tool.complexipy]
max-complexity-allowed = 15
exclude = [
  "tests/**",
  "**/generated/**",
  "migrations/**",
  "vendor/**",
]
```

Treat a violation as a refactoring prompt: extract decisions by ownership, flatten control flow, or
make state transitions explicit. Do not silence a new violation with a snapshot or broad ignore.

Also inspect the highest-complexity functions even when the blocking ceiling passes:

```text
uv run complexipy src/<package> --ignore-complexity --top 20
```

Several near-limit functions in one module are a responsibility hotspot. Review their combined
decisions, side effects, ports, and reasons to change before adding behavior there. Do not lower the
default ceiling or add a module line-count limit solely to force extraction; split only along a
current behavior or ownership boundary.

For an existing codebase that cannot pass immediately, use complexipy's diff mode to ratchet quality
from an agreed base revision. Current complexipy versions enforce threshold-breaking regressions
directly with `--diff <base>`; do not add the deprecated `--ratchet` flag. Keep changed code at or
below the threshold and reduce the legacy baseline incrementally.

## Dependency Hygiene

Run deptry against the project metadata:

```text
uv run deptry .
```

Fix missing, unused, transitive, and misplaced development dependencies at their declaration
source. Use ignores only for documented dynamic loading, optional extras, type-only packages, or
other verified tool limitations. A dependency imported through a plugin or string-based runtime
hook needs a nearby explanation in configuration.

## Architecture Contracts

Use Import Linter for static dependency direction. Define contracts only for modules that actually
exist; do not create empty layers to satisfy a diagram. Prefer focused forbidden-import contracts
over one universal linear-layer contract, because repositories, clients, transports, and optional
usecases are peers with different responsibilities.

For a layered package, encode the applicable contracts:

1. `domain` must not import application layers, adapters, delivery code, generated DTOs, frameworks,
   ORMs, or SDKs.
2. `service` and `usecase` must not import concrete `repository`, `client`, `platform`, `transport`,
   `cli`, `deps`, or `generated` modules.
3. CLI command modules and transport handlers must not import concrete repositories, clients,
   side-effecting platform implementations, or `deps`; they receive service/usecase capabilities.
4. `repository` and `client` must not import each other.
5. Entrypoint and `deps` composition modules may import concrete implementations to wire the graph.

An illustrative contract for an actual package named `example` is:

```toml
[tool.importlinter]
root_packages = ["example"]
include_external_packages = true

[[tool.importlinter.contracts]]
name = "Domain is independent"
type = "forbidden"
source_modules = ["example.domain"]
forbidden_modules = [
  "example.service",
  "example.usecase",
  "example.repository",
  "example.client",
  "example.platform",
  "example.transport",
  "example.cli",
  "example.deps",
  "example.generated",
]

[[tool.importlinter.contracts]]
name = "Services depend on ports, not adapters"
type = "forbidden"
source_modules = ["example.service", "example.usecase"]
forbidden_modules = [
  "example.repository",
  "example.client",
  "example.platform",
  "example.transport",
  "example.cli",
  "example.deps",
  "example.generated",
]

[[tool.importlinter.contracts]]
name = "Delivery modules receive application capabilities"
type = "forbidden"
source_modules = ["example.cli.commands", "example.transport.handlers"]
forbidden_modules = [
  "example.repository",
  "example.client",
  "example.platform",
  "example.deps",
]

[[tool.importlinter.contracts]]
name = "Repositories and clients are independent"
type = "independence"
modules = ["example.repository", "example.client"]
```

Remove absent modules from the real configuration. Add external framework, ORM, or SDK packages to
the relevant forbidden lists only when the project imports them and Import Linter can resolve them.
Keep behavior-level constraints, such as “service calls repository before publisher,” in tests
rather than import contracts.

## Adoption in Existing Projects

Inventory existing task scripts, CI gates, formatter, linter, type checker, suppressions, and
generated-code boundaries before changing tools. Preserve coherent choices such as Pyright or
Pylint. Do not install a duplicate tool merely to match this baseline.

Introduce missing gates in small, reviewable steps:

1. make the current handwritten changed scope pass without broad exclusions;
2. establish explicit generated, migration, and vendor boundaries;
3. ratchet legacy cognitive complexity from an agreed base revision;
4. add one Import Linter contract at a time for a boundary the code already intends to honor;
5. make the commands blocking only after their baseline is understood and reproducible locally.

Do not combine a behavior change with repository-wide formatting, mass annotation, or unrelated
lint cleanup unless the user explicitly requests that migration.

## Verification Commands

Use project scripts first. For the no-convention stack, run focused tests during TDD and finish with:

```text
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy src tests
uv run complexipy src/<package> --max-complexity-allowed 15
uv run complexipy src/<package> --ignore-complexity --top 20
uv run deptry .
uv run lint-imports
```

Adjust source paths to the real project. Run contract/codegen checks already owned by the
repository. A passing formatter or Ruff run does not replace tests, typing, complexity, dependency,
or import-contract checks.

## Review Checklist

- Were existing repository conventions and CI commands inspected first?
- Does each selected tool own a distinct, useful failure class?
- Are Ruff rules stable, explicit, and scoped differently for production and tests?
- Are public and non-trivial internal contracts documented without ceremonial comments?
- Is strict type checking applied to handwritten source and tests?
- Is explicit `Any` rejected, with only narrow justified boundary exceptions?
- Do public application and port signatures use structured contracts or genuine typed semantic maps?
- Are complexity violations refactored or ratcheted instead of broadly ignored?
- Were clustered near-limit functions reviewed by ownership even when the ceiling passed?
- Are dependency ignores limited to verified dynamic, optional, or tool-specific cases?
- Do Import Linter contracts name only modules and boundaries that actually exist?
- Are generated, migration, and vendored files excluded without exempting handwritten facades?
- Is every suppression narrow, local, and justified?
