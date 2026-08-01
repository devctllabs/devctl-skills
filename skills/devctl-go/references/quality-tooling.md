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

Use the Go toolchain before adding third-party tools:

```text
gofmt check for changed handwritten files
go vet ./...
go test ./...
```

Run the repository's race-test command for concurrency-sensitive changes. If none exists, run
targeted `go test -race` for the affected packages and state any remaining coverage risk.

Use an established repository linter or static-analysis command when present. For new projects,
introduce `staticcheck` or a pinned aggregate linter only when standardization is requested and its
enabled checks do not duplicate existing gates. Do not add a linter solely to reproduce another
language's stack.

## Documentation and Suppressions

Document exported library APIs and internal callables whose guarantees are not evident from names
and signatures. Explain side effects, error semantics, locking, atomicity, ordering, and external
constraints without narrating the implementation.

Keep `//nolint`, build-tag exceptions, and tool-specific exclusions narrow and adjacent to the
exception. Include the reason and rule name when the tool supports it. Do not exempt a handwritten
package or layer to hide new complexity or dependency violations.

## Complexity and Dependency Hygiene

Treat configured branch, statement, cyclomatic, or cognitive-complexity limits as refactoring
prompts. Passing a ceiling is not proof of clear ownership: inspect clusters of near-limit
functions before adding more behavior to the package.

Use the repository's module-hygiene commands. For an explicit standardization, verify that module
metadata is reproducible, direct dependencies are declared directly, and an update does not leave
unexplained `go.mod` or `go.sum` changes. Do not run broad dependency upgrades as part of ordinary
behavior work.

## Architecture Contracts

Use Go package boundaries and `internal` first. Enforce only dependencies that correspond to
packages that exist:

1. domain does not import service, usecase, adapters, transport, DI, or generated protocol packages;
2. service/usecase does not import concrete repository, client, platform, transport, `cmd`, or DI;
3. transport and command handlers receive service/usecase capabilities rather than concrete
   adapters;
4. repository and client packages do not import one another;
5. `internal/deps` may import concrete implementations to compose the graph.

When review is insufficient, use an existing dependency rule such as a configured `depguard`, or a
small repository-owned import test based on the actual package graph. Do not create empty packages
or a custom architecture framework to satisfy a diagram.

## Adoption in Existing Projects

Inventory CI, task scripts, formatters, linters, suppressions, module layout, and generated
boundaries before changing tooling. Preserve coherent choices.

Adopt missing gates in small steps:

1. make the changed handwritten scope pass without broad exclusions;
2. establish explicit generated, migration, and vendor boundaries;
3. ratchet legacy complexity or lint debt from an agreed baseline;
4. add one dependency rule at a time for a boundary the repository already intends to honor.

Do not combine behavior work with repository-wide formatting, dependency upgrades, or unrelated
lint cleanup unless requested.

## Verification

Run focused owner tests during TDD, then the repository's complete formatting, vet/static-analysis,
test, race-sensitive, module, contract, and generation checks that apply to the change. A passing
formatter or linter never replaces behavior tests.

## Review Checklist

- Were existing commands and CI configuration inspected first?
- Does each selected tool own a distinct failure class?
- Are handwritten production and tests checked without broad suppressions?
- Were complexity hotspots reviewed by ownership rather than only threshold?
- Are dependency-direction rules limited to real package boundaries?
- Are generated, migration, and vendor exclusions precise?
- Is every suppression local and justified?
