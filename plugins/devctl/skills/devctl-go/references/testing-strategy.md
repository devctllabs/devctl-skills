# Testing Strategy

## Contents

- Principle
- Mandatory Outside-In TDD
- Scenario Order
- Layer Matrix
- Repository Integration Tests
- Generated Gomock Tests
- Transport Tests
- Client Tests
- CLI Tests
- Contract and Generated Code Checks
- Concurrency Tests
- Review Checklist

## Principle

Use outside-in TDD for handwritten production behavior from the highest affected public boundary.
Advance one caller-visible scenario per RED/GREEN/simplify cycle, then test demanded lower
components at their own package boundaries. Preserve repository commands and test conventions.

## Mandatory Outside-In TDD

Remain in this state machine:

```text
TEST -> useful RED -> minimum production -> GREEN -> simplify
```

1. Choose the highest affected caller-visible API and smallest coherent scenario. Combine
   assertions only when they demand the same production change.
   When the request changes a CLI, HTTP/RPC endpoint, or consumer contract, that delivery surface
   is the highest boundary; start at a service API only when no delivery contract changes.
2. Change only the owner test before useful RED. For a new compiled API, first add the smallest
   declaration or skeleton required for the package to compile, without requested behavior.
3. Run the narrowest owner package/test. RED proves missing or wrong behavior, not unrelated
   compilation, configuration, fixture, or setup failure. A placeholder panic or unsupported error
   may make RED useful but never counts as GREEN.
4. Add minimum production for GREEN, simplify if useful, and rerun the same narrow check after every
   edit. Do not manufacture a refactor.
5. Finish applicable scenarios at the current public boundary before descending. Run its package
   suite and verify the named contract and dependency direction at each checkpoint.

For a new delivery operation, the compile skeleton may include parser/route registration, a narrow
injected service interface, and a handler that returns an explicit unsupported error. The first
useful RED must exercise the public delivery boundary. Do not implement service or repository
behavior merely to make that RED possible; use a narrow double until delivery scenarios are GREEN.

An upper RED may demand a consumer-owned interface and test double, never a concrete lower adapter.
Begin bugs with the regression. Characterize preserved behavior before pure refactors. Use drift
checks instead of editing generated output.

Plans name each scenario's owner test, expected useful RED, minimum GREEN change, and simplification
checkpoint. Final evidence identifies the first useful RED and GREEN plus final repository checks.

## Scenario Order

For a new capability, consider applicable scenarios in this order:

```text
Zero -> One -> Many -> Boundary -> Exceptions -> Interfaces
```

Existing tests count. Skip meaningless categories; explain only non-obvious or risky omissions.
Bugfixes start with their regression and add only relevant adjacent coverage.

- `Zero`: no records, empty slices/maps/strings, zero-value commands, or omitted optional input.
- `One`: the smallest meaningful successful case.
- `Many`: multiple records, repeated calls, batches, aggregation, iteration, or observable ordering.
- `Boundary`: min/max values, threshold equality, just below/above limits, path containment,
  deadlines, or size limits.
- `Exceptions`: validation failures, dependency errors, cancellation/deadlines, not found, conflict,
  permission denied, partial failure, rollback, or domain error mapping.
- `Interfaces`: optional public construction, method signature, command invocation, route
  registration, or supported import/package coverage not exercised earlier.

Categories guide behavior selection, not test names or counts. A cross-package integration test has
one declared owner. It adds confidence but does not count as direct service, adapter, and command
coverage simultaneously.

## Layer Matrix

Every package that exists and owns changed behavior needs a direct suite. Do not create empty
packages, interfaces, mocks, or tests merely to fill the matrix.

| Layer | Minimum direct suite | Focus |
| --- | --- | --- |
| `domain` | package unit | invariants, value objects, domain errors; no dependency doubles |
| `service` | package unit with interface doubles | business rules, state transitions, demanded calls, errors |
| `usecase` | orchestration unit with interface doubles | flow order, retries, transactions, compensation |
| `repository` | unit for pure mapping plus real-backend integration | mapping, constraints, filesystem layout, locking, atomicity |
| `client` | runner/SDK doubles plus protocol integration when valuable | request/command construction, parsing, timeout/retry, normalization |
| `platform` | unit plus integration for OS/runtime implementations | clocks, IDs, codecs, telemetry, runtime-specific behavior |
| `transport` | unit with narrow service/usecase fake plus protocol integration | DTO validation, mapping, protocol errors, registration |
| `cmd` | direct command behavior plus end-to-end invocation when valuable | args, delegation, output, exit status |
| `internal/deps` | integration smoke when wiring is non-trivial | provider graph, config, named dependencies, shutdown |
| generated/contracts | existing drift or compatibility checks | reproducible generation and compatibility |

Passive declarations and absent layers need no tests solely for symmetry.

## Repository Integration Tests

Use repository integration tests when the repository owns:

- SQL joins or projections;
- custom scans/mappers;
- pagination or sorting;
- optimistic locking or transactional behavior;
- constraint/error mapping;
- backend-specific query behavior;
- filesystem/object-storage layout and persisted-format mapping;
- locking, atomic publication, rollback, cleanup, and idempotency;
- path containment, file-kind, permissions, and symlink safety.

Repository integration checklist:

```text
- apply or reuse test schema/migrations
- create isolated test data
- exercise real repository methods
- assert domain contracts, not storage rows
- assert driver/constraint errors are normalized
- clean up or use isolated database/schema
```

Use mocks only for trivial repositories or service-level tests that do not need storage behavior.

When an adapter claims atomicity, rollback, compensation, or cleanup, fail it after at least one
operation has applied. Assert the normalized error and restoration of every pre-existing target; a
success-only atomic write test is insufficient.

Test filesystem repositories against `t.TempDir()` or the repository's real temporary backend. Do
not invent a raw filesystem interface solely to avoid testing I/O behavior owned by the adapter.

## Generated Gomock Tests

Read `gomock-unit-tests.md` when adding or migrating generated gomock mocks, mockgen `go:generate` directives, `mocks/` packages, fake-to-gomock replacements, or `_test` package splits caused by generated mock import cycles.

## Transport Tests

Transport tests focus on the protocol boundary:

- request/response DTO mapping;
- validation errors and field paths;
- domain-error-to-protocol mapping;
- auth actor extraction handoff;
- route/method registration when custom.

Do not assert service internals in transport tests. Use narrow fake service/usecase interfaces.

## Client Tests

Client tests focus on outbound adapter behavior:

- request construction;
- auth headers or credentials from config;
- timeout/retry/circuit-breaker behavior when owned by the client;
- external error normalization;
- response DTO mapping into service-facing contracts.

Do not expose raw protocol or SDK error types in expected service-facing results.

For subprocess clients, test arguments, stdout/stderr parsing, non-zero exits, timeouts, and external
contract validation at the client boundary. Reuse an established command-runner interface when one
exists; add one only when several commands, lifecycle behavior, or repeated setup makes it a real
boundary. Never expose subprocess behavior to service tests.

## CLI Tests

Command tests focus on public behavior:

- args, flags, and required options;
- delegation to the selected service/usecase capability with meaningful arguments;
- stdout/stderr and exit status;
- application-error presentation;
- command registration when the tree is custom.

Use `urfave/cli`'s public command execution boundary or the repository's established helper. Test
private action functions only as supplementary coverage. Before replacing an existing dispatcher,
establish GREEN characterization for every executable leaf and keep it green throughout the
refactor.

## Contract and Generated Code Checks

When a repo has contract/codegen checks, use them for changed contracts or generated boundaries.

Examples of checks to look for:

```text
make generate
make check-generated
go generate ./...
buf breaking
buf lint
oapi-codegen validation scripts
```

Do not add new drift tooling as part of ordinary Go code changes unless the user asks.

## Concurrency Tests

Add focused tests for:

- idempotency races;
- transaction conflict handling;
- goroutine cancellation;
- shutdown ordering;
- cache single-flight or stampede protection;
- optimistic locking.

If the repo has a race-test command, run it for concurrency-sensitive changes. Otherwise run the closest existing tests and state the remaining risk.

## Review Checklist

- Did each scenario advance through useful RED, minimum GREEN, optional simplification, and
  re-GREEN at its owner boundary?
- Did bugs begin with regression and pure refactors with characterization?
- Did upper-layer RED demand an interface before a concrete adapter?
- Does every changed behavior owner have a direct package suite?
- Does each cross-package test have one owner instead of being counted several times?
- Do atomicity/rollback claims include partial-application failure and recovery?
- Do command/transport tests prove caller-visible behavior without duplicating business policy?
- Are generated, race-sensitive, cancellation, and concurrency checks run where relevant?
- Did configured repository tests and quality checks pass?
