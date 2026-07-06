# Testing Strategy

## Contents

- Principle
- Unit Test Scenario Selection
- Layer Matrix
- Repository Integration Tests
- Transport Tests
- Client Tests
- Generated Gomock Tests
- Contract and Generated Code Checks
- Concurrency Tests
- Review Checklist

## Principle

Test the behavior owned by each layer. Do not retest the whole stack in every package.

Use the test commands and conventions already present in the repo. Do not invent generic commands when the project has scripts, Make targets, CI jobs, or documented checks.

## Unit Test Scenario Selection

Use ZOMBIES as a scenario checklist for unit-level behavior, not as a requirement to write every category for every function. Choose cases from the caller-visible contract and keep only scenarios that exercise behavior owned by the unit.

- `Zero`: no records, empty slices/maps/strings, zero-value commands, or omitted optional input.
- `One`: the smallest meaningful successful case.
- `Many`: multiple records, repeated calls, batches, aggregation, iteration, or observable ordering.
- `Boundary`: min/max values, threshold equality, just below/above limits, off-by-one cases, deadlines, or size limits.
- `Exceptions`: validation failures, dependency errors, cancellation/deadlines, not found, conflict, permission denied, rollback, or domain error mapping.

Treat `Interface definition` and `Simple Scenarios, Simple Solutions` as style guardrails:

- `Interface definition`: pin the caller-facing contract first: constructor, method, command/query/result shape, and observable errors. In Go, this does not mean introducing an `interface` type unless the boundary already needs one.
- `Simple Scenarios, Simple Solutions`: start with direct behavior-focused tests and the simplest implementation path. Add table tests, fixtures, mocks, and helpers only when they reduce repetition without hiding behavior.

## Layer Matrix

| Layer | Default test shape | Focus |
| --- | --- | --- |
| `domain` | unit tests beside code | invariants, value objects, domain errors |
| `service` | unit tests with mocked repositories/clients/policies | business rules, authz, state transitions, transactions |
| `usecase` | unit/scenario tests with mocked services | flow orchestration, compensation, retries, cross-service policy |
| `repository` | integration tests against real/test DB when behavior is non-trivial | SQL mapping, constraints, transactions, locking, pagination |
| `client` | fake server, SDK mock, or protocol stub | request construction, timeout/retry behavior, error normalization |
| `transport` | handler/mapper tests | DTO validation, mapping, protocol error mapping |
| `internal/deps` | assembly smoke tests only when useful | provider graph, named dependencies, shutdown hooks |
| `cmd` | minimal tests or none unless CLI behavior is custom | command wiring and exit behavior |

Service/usecase tests should not import repository implementations. Transport tests should not retest service business logic.

## Repository Integration Tests

Use repository integration tests when the repository owns:

- SQL joins or projections;
- custom scans/mappers;
- pagination or sorting;
- optimistic locking or transactional behavior;
- constraint/error mapping;
- backend-specific query behavior.

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

- Are tests placed beside the behavior owner?
- Are mocks used at service/usecase boundaries, not for repository behavior that needs real storage?
- Do transport tests avoid duplicating business logic tests?
- Are generated/contract checks used when the repo already has them?
- Are concurrency-sensitive paths tested or explicitly called out?
- Were relevant Zero/One/Many/Boundary/Exception cases considered and omitted only when not meaningful?
