# Python Testing

## Contents

- Behavior Owners
- Pytest Structure
- Test Doubles and Mocking
- Repository Integration Tests
- Transport Tests
- Client Tests
- CLI Tests
- Contract and Generated Code Checks
- Verification Commands
- Review Checklist

This reference contains only Python-specific test placement, doubles, integration boundaries, and
commands. It neither invokes nor replaces the controlling TDD workflow; the active language skill
must load `$outside-in-tdd` before behavior work begins.

## Behavior Owners

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

Keep every executable leaf under caller-visible coverage when replacing a string-branch dispatcher.

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

- Does every behavior owner have the right direct suite and boundary-appropriate doubles or real
  temporary backend?
- Do cross-layer tests have one explicit owner rather than being counted as several direct suites?
- Do atomicity and rollback claims include a partial-application failure test that proves recovery?
- Do CLI/transport tests prove caller-visible behavior without duplicating business rules?
- Are paths concrete, generated/contract checks preserved, and concurrency/cancellation covered
  where relevant?
- Did the configured test and static-quality suite pass?
