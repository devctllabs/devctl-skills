# Testing Strategy

## Contents

- Principle
- Unit Test Scenario Selection
- Layer Matrix
- Pytest Structure
- Test Doubles and Mocking
- Repository Integration Tests
- Transport Tests
- Client Tests
- Contract and Generated Code Checks
- Verification Commands
- Review Checklist

## Principle

Test behavior at the narrowest useful boundary. Service/usecase tests should not import repository implementations. Transport tests should not retest service business logic. Repository tests should exercise storage behavior when storage mapping is non-trivial.

Use the test commands and conventions already present in the repo. Do not invent generic commands when the project has scripts, Make targets, CI jobs, or documented checks.

## Unit Test Scenario Selection

Use ZOMBIES as a scenario checklist for unit-level behavior, not as a requirement to write every category for every function. Choose cases from the caller-visible contract and keep only scenarios that exercise behavior owned by the unit.

- `Zero`: no records, empty lists/dicts/strings, `None`, omitted optional input, or empty command fields.
- `One`: the smallest meaningful successful case.
- `Many`: multiple records, repeated calls, batches, aggregation, iteration, or observable ordering.
- `Boundary`: min/max values, threshold equality, just below/above limits, deadlines, or size limits.
- `Exceptions`: validation failures, dependency errors, cancellation/deadlines, not found, conflict, permission denied, rollback, or error mapping.

Treat `Interface definition` and `Simple Scenarios, Simple Solutions` as style guardrails:

- `Interface definition`: pin the caller-facing contract first: public function/method, Protocol contract, command/query/result shape, and observable errors. This does not mean introducing a Protocol unless the boundary already needs one.
- `Simple Scenarios, Simple Solutions`: start with direct pytest tests, clear assertions, and minimal fixtures. Add mocks, factories, parametrization, or property tests only when they reduce repetition without hiding behavior.

## Layer Matrix

| Layer | Test style | Focus |
| --- | --- | --- |
| `domain` | unit tests | invariants, value normalization, domain errors |
| `service` | unit tests with fakes/spies/mocks for Protocol deps | business rules, dependency calls, error categories |
| `usecase` | orchestration tests with fakes/spies/mocks | flow order, retries, transactions, compensation |
| `repository` | integration tests | storage mapping, constraints, transactions, pagination |
| `client` | fake server, SDK stub, or protocol mock | request construction, timeouts/retries, error normalization |
| `transport` | handler/mapper tests | DTO validation, mapping, protocol error mapping |
| `cli` | command tests | args, output, exit codes, config handoff |
| `deps` | smoke tests only when useful | construction, config, critical wiring |

## Pytest Structure

Use the repo's existing structure first. For new projects:

```text
tests/
  unit/
  integration/
  contract/
```

Colocate helper fixtures close to the tests that use them. Put broad reusable test builders in a test support module only when several independent test modules use them.

Avoid broad ownerless specs such as `test_services.py` when a concrete behavior owner is clearer.

## Test Doubles and Mocking

Use the repo's existing test-double convention first.

For new projects:

- use small handwritten fakes for stateful behavior;
- use spies when call observation is the behavior;
- use `unittest.mock` when expectations are clearer than a fake;
- avoid mocking concrete classes when a small Protocol seam would be clearer;
- keep fake data realistic enough to exercise mapping and validation.

Do not over-specify incidental calls that make behavior tests brittle.

## Repository Integration Tests

Use repository integration tests when the repository owns:

- SQL joins or projections;
- custom row/ORM mapping;
- pagination or sorting;
- optimistic locking or transactional behavior;
- constraint/error mapping;
- backend-specific query behavior.

Checklist:

```text
- apply or reuse test schema/migrations
- create isolated test data
- exercise real repository methods
- assert domain contracts, not storage rows
- assert driver/constraint errors are normalized
- clean up or use isolated database/schema
```

Use mocks only for service-level tests or trivial repositories that do not own storage behavior.

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

Use the fake-server or SDK-stub pattern already present in the repo. For new projects, choose test tools based on the actual HTTP/SDK library rather than adding a default fake-server dependency blindly.

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
uv run ruff check
uv run ruff format --check
```

If the project does not use `uv`, use the local equivalent such as `pytest`, `ruff check`, `poetry run pytest`, `hatch run test`, `tox`, or CI scripts.

Run type checks when the repo already has mypy, pyright, pyre, or another type checker configured.

## Review Checklist

- Are tests placed at the behavior owner?
- Are fakes/mocks used at service/usecase boundaries, not for repository behavior that needs real storage?
- Do transport tests avoid duplicating business logic tests?
- Are generated/contract checks used when the repo already has them?
- Are concurrency- or cancellation-sensitive paths tested or called out?
- Were relevant Zero/One/Many/Boundary/Exception cases considered and omitted only when not meaningful?
