# Testing Strategy

## Contents

- Principle
- Mandatory Outside-In TDD
- Scenario Order
- Layer Matrix
- Pytest Structure
- Test Doubles and Mocking
- Repository Integration Tests
- Transport Tests
- Client Tests
- CLI Tests
- Contract and Generated Code Checks
- Verification Commands
- Review Checklist

## Principle

Use TDD for handwritten production behavior from the highest affected public boundary. Advance one
caller-visible scenario per RED/GREEN/refactor cycle, then test demanded lower components at their
own boundaries. Preserve repository conventions.

## Mandatory Outside-In TDD

Remain in this state machine:

```text
TEST -> useful RED -> minimum production -> GREEN -> simplify
```

1. Choose the highest affected caller-visible API and smallest coherent scenario. Combine
   assertions only when they demand the same production change.
2. Before RED, change only its owner test. Initial infrastructure or an importable skeleton must not
   implement requested behavior.
3. Run the narrowest owner check. RED proves missing or wrong behavior, never import, syntax,
   configuration, collection, fixture, or unrelated failure. If GREEN, strengthen or stop.
4. Add minimum production for GREEN, then simplify and re-GREEN after each edit. Do not manufacture
   a refactor change.
5. Repeat. Before descending, run the component suite and verify its public contract and dependency
   direction.

An upper RED may demand a consumer-owned Protocol and double, never a concrete lower adapter. Put
shared demanded contracts inward. Start bugs with their regression; characterize preserved public
behavior before pure refactors; use drift checks instead of editing generated output.

Plans name each scenario's owner test, expected useful RED, minimum GREEN change, and simplification
checkpoint. Final evidence identifies the first RED and GREEN plus the final repository checks.

## Scenario Order

For a new capability, consider applicable scenarios in this order:

```text
Zero -> One -> Many -> Boundary -> Exceptions -> Interfaces
```

Existing tests count. Skip meaningless categories; explain only non-obvious or risky omissions.
Bugfixes start with their regression and add only relevant adjacent coverage.

Assign overlapping scenarios to the earliest category without duplication. Removing from an empty
catalog is `Zero`; `Exceptions` covers distinct error behavior.

- `Zero`: no records, empty collections or strings, `None`, omitted optional input, or empty command fields.
- `One`: the smallest meaningful successful case.
- `Many`: multiple records, repeated calls, batches, aggregation, iteration, or observable ordering.
- `Boundary`: min/max values, threshold equality, just below/above limits, deadlines, path containment, or size limits.
- `Exceptions`: validation failures, dependency errors, cancellation/deadlines, not found, conflict, permission denied, rollback, or error mapping.
- `Interfaces`: optional final public-interface coverage for supported import paths, construction,
  signatures, Protocol shape, CLI invocation, or transport registration when earlier scenarios did
  not already exercise it.

Categories guide behavior selection, not test names or counts. Prefer direct tests, clear
assertions, and minimal fixtures. Coverage is direct only when assertions at the owning public
boundary prove the result, error, side effect, or significant collaborator interaction.

A cross-layer integration test has one declared owner. It may provide end-to-end confidence, but it
does not also count as the direct service/usecase suite and the direct adapter suite. Use Protocol
doubles for application policy and the real boundary facility for adapter mechanics.

## Layer Matrix

Every layer that exists and owns behavior needs a direct suite. Do not create an empty directory,
dummy test, Protocol, or implementation merely to fill the matrix.

| Layer | Minimum direct suite | Focus |
| --- | --- | --- |
| `domain` | unit | invariants, value normalization, domain errors; no dependency doubles |
| `service` | unit with Protocol stubs/fakes/spies/mocks | business rules, demanded dependency calls, application errors |
| `usecase` | unit orchestration with Protocol doubles | flow order, retries, transactions, compensation |
| `repository` | unit for pure mapping plus integration for real storage behavior | mapping, constraints, transactions, filesystem layout, locking, atomic publication |
| `client` | unit with runner/SDK doubles plus integration or contract tests when valuable | request/command construction, parsing, timeouts/retries, external error normalization |
| `platform` | unit for pure primitives plus integration for OS/runtime implementations | clocks, codecs, IDs, telemetry, runtime-specific behavior |
| `transport` | unit with a fake service/usecase plus protocol integration when valuable | DTO validation, mapping, protocol error mapping, registration |
| `cli` | unit with a fake service/usecase plus end-to-end invocation when valuable | args, output, exit codes, config handoff |
| `deps` | integration smoke test when wiring is non-trivial | construction, config, critical wiring |
| `generated`/contracts | existing contract or drift checks | compatibility and reproducible generation |

Passive data declarations, trivial `__init__` modules, and layers absent from the project do not need
tests solely for structural symmetry.

## Pytest Structure

Preserve coherent layouts. New or explicitly standardized projects use:

```text
tests/
  conftest.py
  unit/
    domain/
    service/
    usecase/
    repository/
    client/
    platform/
    transport/
    cli/
  integration/
    repository/
    client/
    platform/
    transport/
    deps/
  contract/
  e2e/
    cli/
  support/
```

Create only needed directories. Name files by capability, such as
`tests/unit/service/test_package_removal.py`, so owner suites run directly without markers.

Place `conftest.py` at the nearest common subtree. Put a builder or double in `tests/support/` only
when several independent suites use it; do not create a global ownerless `mocks` directory.

Avoid broad ownerless specs such as `test_services.py` when a concrete behavior owner is clearer.

## Test Doubles and Mocking

Use the repo's existing test-double convention first.

Use stubs for fixed responses, fakes for coherent state, spies for behavior plus observation, and
`spec`/`autospec` mocks for exact interaction contracts. Prefer outcomes over incidental order.
Consumer tests use Protocols; adapter tests use the real boundary facility.

Keep doubles local and realistic. Do not mock concrete adapters, `Path`, or library method sets when
a small Protocol seam or temporary filesystem expresses the boundary.

## Repository Integration Tests

Use repository integration tests when the repository owns:

- SQL joins or projections;
- custom row/ORM mapping;
- pagination or sorting;
- optimistic locking or transactional behavior;
- constraint/error mapping;
- backend-specific query behavior.
- filesystem layout and persisted format mapping;
- locking, atomic replace/publication, rollback, cleanup, and idempotency;
- path containment, file-kind, and symlink safety.

Use isolated schema/data or a temporary filesystem, exercise real repository methods, assert domain
contracts and normalized errors rather than raw storage rows, and clean up deterministically.

When an adapter claims atomicity, rollback, compensation, or cleanup, include a failure-path test
that fails after at least one operation has been applied. Assert both the normalized error and
restoration of every previously existing target; a success-only atomic write test is insufficient.

Use repository unit tests with dependency doubles only when the repository itself consumes a
genuine lower-level Protocol. Do not invent a Protocol solely to avoid an integration test for I/O
behavior the repository owns.

## Transport Tests

Transport tests focus on protocol boundaries:

- request/response DTO mapping;
- validation errors and field paths;
- application-error-to-protocol mapping;
- auth actor extraction handoff;
- route/method registration when custom.

Do not assert service internals in transport tests. Use narrow fake service/usecase implementations.

## Client Tests

Client tests focus on outbound adapter behavior:

- request construction;
- auth headers or credentials from config;
- timeout/retry behavior when owned by the client;
- external error normalization;
- response DTO mapping into service-facing contracts.

Preserve established fake-server or SDK-stub patterns. Choose new tools from the actual client
library rather than adding a default dependency.

For subprocess clients, test command arguments, stdout/stderr parsing, exit failures, timeouts, and
external contract validation at the client boundary. Reuse an existing command-runner abstraction
when present. For one small client, monkeypatching the adapter module's `subprocess.run` is valid;
introduce a runner Protocol only when several commands, lifecycle behavior, or repeated test setup
make it a real boundary. Never expose subprocess behavior to service tests.

## CLI Tests

CLI tests focus on public command behavior:

- argument parsing and required options;
- delegation to the selected service/usecase capability with exact meaningful arguments;
- stdout, stderr, and exit codes;
- application-error presentation;
- root, group, and leaf `--help` without dependency construction or handler execution;
- command registration when the parser tree is custom.

For argparse, invoke `main(argv, deps)` with capability doubles. Every executable leaf needs a
direct caller-visible test of dependency handoff, output, and exit status; parser-only or private
handler assertions are supplementary.

Help tests should expect `SystemExit(0)` and assert representative descriptions, argument help,
metavars, and examples. Avoid full help snapshots unless byte-for-byte output is an explicit
compatibility contract.

Before replacing an existing string-branch dispatcher, establish a green characterization case for
every leaf and keep those cases green throughout the refactor. This is a pure-refactor workflow, so
do not manufacture RED.

## Contract and Generated Code Checks

When a repo has contract/codegen checks, use them for changed contracts or generated boundaries.

Examples of checks to look for:

```text
devctl lint
devctl gen
make generate
make check-generated
buf lint
openapi validation scripts
```

Do not add new drift tooling as part of ordinary Python code changes unless the user asks.

## Verification Commands

Prefer existing project commands first. For new projects with no convention:

```text
uv run pytest
```

If the project does not use `uv`, use the local equivalent such as `pytest`, `ruff check`, `poetry run pytest`, `hatch run test`, `tox`, or CI scripts.

After tests, run the complete static suite. With no convention, use `quality-tooling.md`; Ruff alone
is insufficient. Preserve an existing type checker unless standardization is requested.

## Review Checklist

- Did each scenario start at its owner boundary and advance through useful RED, minimum GREEN,
  simplification, and re-GREEN after any refactor edit?
- Did new capabilities consider the ordered scenario categories, while bugfixes began with their
  regression and avoided ceremonial `N/A` coverage?
- Did each upper-layer RED demand its Protocol before adapter implementation?
- Does every behavior owner have the right direct suite and boundary-appropriate doubles or real
  temporary backend?
- Do cross-layer tests have one explicit owner rather than being counted as several direct suites?
- Do atomicity and rollback claims include a partial-application failure test that proves recovery?
- Do CLI/transport tests prove caller-visible behavior without duplicating business rules?
- Are paths concrete, generated/contract checks preserved, and concurrency/cancellation covered
  where relevant?
- Did the configured test and static-quality suite pass?
