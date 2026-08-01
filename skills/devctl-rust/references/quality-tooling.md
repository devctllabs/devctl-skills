# Quality Tooling

## Contents

- Principle
- Baseline
- Documentation and Suppressions
- Complexity and Dependency Hygiene
- Architecture Contracts
- Adoption in Existing Projects
- Verification
- Review Checklist

## Principle

Use coherent repository commands and configuration first. The baseline below is for a new project
with no convention or an explicit standardization request.

Each gate should own a distinct failure class. Prefer stable, actionable checks over a maximal
toolset. Exclude generated, migration, and vendored code where appropriate, but continue checking
handwritten facades around those boundaries.

## Baseline

Use the Rust toolchain before adding third-party tools:

```text
cargo fmt --check
cargo check
cargo test
cargo clippy --all-targets --all-features -- -D warnings
```

Scope commands through the detected manifest path and preserve repository feature policy. Do not
enable every feature when the project deliberately tests feature sets separately.

Use established repository tools such as `cargo deny`, `cargo machete`, `cargo audit`, coverage,
or policy scripts when present. Add one only for a concrete failure class during an explicit
standardization; do not duplicate advisory, license, unused-dependency, or lint ownership.

## Documentation and Suppressions

Use rustdoc for public library APIs and internal callables whose guarantees are not evident from
names and types. Explain side effects, error semantics, locking, atomicity, ordering, safety
invariants, and external constraints without narrating the implementation.

Keep `#[allow(...)]`, Clippy expectations, feature exceptions, and generated-code exclusions narrow
and adjacent to the exception. Include a reason when supported. Do not disable warnings for an
entire handwritten crate or module to hide new complexity or dependency violations.

## Complexity and Dependency Hygiene

Treat configured branch, statement, cyclomatic, or cognitive-complexity limits as refactoring
prompts. Passing a ceiling is not proof of clear ownership: inspect clusters of near-limit
functions before adding more behavior to the module.

Use `cargo metadata` when workspace membership or inheritance changes, and `cargo tree` when
dependency placement or feature leakage is in question. Preserve the lockfile policy for libraries
versus applications. Do not run broad dependency upgrades as part of ordinary behavior work.

## Architecture Contracts

Use crate boundaries, module visibility, and the compiler first. Enforce only dependencies that
correspond to modules/crates that exist:

1. domain does not depend on service, usecase, adapters, delivery, generated DTOs, or frameworks;
2. service/usecase does not import concrete repository, client, platform, delivery, or runtime
   composition modules;
3. delivery handlers receive service/usecase capabilities rather than concrete adapters;
4. repository and client modules do not depend on one another;
5. delivery `deps`/`runtime` modules may import concrete implementations to compose the graph.

When visibility and review are insufficient, use an existing repository rule or a small
repository-owned architecture test against the actual module graph. Do not create layer crates or a
custom architecture framework solely to satisfy a diagram.

## Adoption in Existing Projects

Inventory CI, task scripts, toolchain files, formatters, Clippy policy, suppressions, workspace
layout, features, and generated boundaries before changing tooling. Preserve coherent choices.

Adopt missing gates in small steps:

1. make the changed handwritten scope pass without broad exclusions;
2. establish explicit generated, migration, and vendor boundaries;
3. ratchet legacy complexity or lint debt from an agreed baseline;
4. add one dependency rule at a time for a boundary the repository already intends to honor.

Do not combine behavior work with repository-wide formatting, dependency upgrades, or unrelated
lint cleanup unless requested.

## Verification

Run focused owner tests during TDD, then the repository's complete formatting, check, Clippy,
test, feature, dependency, contract, build-script, and generation checks that apply to the change.
A passing formatter or linter never replaces behavior tests.

## Review Checklist

- Were existing commands, toolchain, feature policy, and CI inspected first?
- Does each selected tool own a distinct failure class?
- Are handwritten production and tests checked without broad suppressions?
- Were complexity hotspots reviewed by ownership rather than only threshold?
- Are dependency-direction rules limited to real module/crate boundaries?
- Are generated, migration, and vendor exclusions precise?
- Is every suppression local and justified?
