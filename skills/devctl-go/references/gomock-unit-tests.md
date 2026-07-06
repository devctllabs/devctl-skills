# Gomock Unit Tests

## Contents

- Principle
- Discovery
- When To Use Generated Mocks
- Mock Generation
- Test Package Boundaries
- Gomock Style
- Layer Patterns
- Migration From Manual Fakes
- Verification

## Principle

Use generated `gomock` mocks for service/usecase and adapter boundary tests when dependencies are interfaces and behavior is easier to state as expectations than as a handwritten fake.

Prefer repo-local conventions first. Use this reference as the fallback when the repo has no consistent gomock/mockgen pattern or when the user asks to standardize around generated mocks.

Do not use gomock as a substitute for repository integration tests when repository behavior depends on SQL, transactions, constraints, pagination, locking, or backend-specific mapping. Read `testing-strategy.md` for layer-level test ownership.

Choose test scenarios with the ZOMBIES checklist in `testing-strategy.md` before deciding which dependency interactions need gomock expectations.

## Discovery

Before adding mocks, inspect the existing Go module:

```bash
rg -n "go:generate|mockgen|gomock|mocks/" internal pkg
rg -n "package .+_test|NewMock|gomock.NewController" internal pkg -g '*_test.go'
```

Reuse established local choices for:

- mockgen command shape;
- generated file naming;
- `mocks/` package location;
- same-package vs external-package tests;
- expectation style;
- generation and test commands.

## When To Use Generated Mocks

Prefer generated gomock mocks for:

- service tests that mock repository, client, policy, publisher, or transaction dependencies;
- usecase tests that mock service interfaces or optional transaction managers;
- transport tests where a handler receives a narrow service/usecase interface;
- consumer tests that mock service/usecase calls after decode and validation;
- client/repository-adjacent tests only when the dependency is another boundary, not the behavior under test.

Prefer simple fakes or test servers when they make behavior clearer:

- HTTP client tests often use `httptest.Server`;
- SDK clients may use the SDK's test hooks;
- transport mapper tests often need only local values;
- deterministic value-object tests should not use mocks.

## Mock Generation

Place `//go:generate` near the interface definitions that the mock represents. In `devctl-go` layout, this usually means consumer-owned interfaces in service/usecase packages or narrow local interfaces in transport packages.

Prefer one directive per source file when practical, and usually generate one `mocks/<source-file>.go` for interfaces declared in `<source-file>.go`.

Default command:

```go
//go:generate go run go.uber.org/mock/mockgen -destination mocks/service.go -package mocks -typed . Repository,Publisher
```

Use separate generated files only when a combined target becomes materially harder to read, creates an import cycle, or conflicts with local repo conventions.

Keep handwritten code outside generated output boundaries such as `gen/`. Local gomock output usually belongs in a package-local `mocks/` directory, unless the repo already standardizes a different generated-mock location.

## Test Package Boundaries

Default to same-package tests for service, usecase, and consumer packages when tests need unexported helpers or package-local constructors.

Use external `<pkg>_test` tests when importing generated mocks from the same package would create an import cycle. Repository behavior tests are the common case: generated mocks may import the repository package, so behavioral tests should move to `<pkg>_test` and import the repository package explicitly.

Keep helper-only tests that require unexported functions in separate same-package files. Do not weaken the mock layout or reintroduce manual fakes just to avoid splitting helper tests from external-package behavior tests.

## Gomock Style

Create a new controller per test:

```go
ctrl := gomock.NewController(t)
```

When `gomock.NewController` receives `*testing.T`, gomock registers cleanup and calls `Finish` automatically after the test and subtests complete. Do not also call `defer ctrl.Finish()`. Call `Finish` manually only when using a custom reporter that does not register cleanup.

Use generated constructors such as `mocks.NewMockRepository(ctrl)` and express behavior with `EXPECT()`.

Rules:

- prefer generated mocks over custom fake structs with counters, captured args, or ad hoc callbacks;
- prefer exact arguments for meaningful values;
- use `gomock.Any()` only for incidental values such as context, timestamps, or generated IDs;
- use `gomock.InOrder` only when call order is part of the behavior;
- use `DoAndReturn` when assertions need computed arguments, slices, variadic values, or callback behavior;
- keep expectations close to the behavior being asserted.

## Layer Patterns

Service/usecase tests:

- keep tests beside the behavior owner;
- mock repository/client/policy/service dependencies;
- assert domain results, state transitions, validation, error wrapping/classification, and transaction behavior;
- do not import concrete repository/client implementations.

Transport and consumer tests:

- mock only the narrow service/usecase interface the adapter receives;
- assert DTO/message decoding, mapper behavior, auth handoff, and protocol/domain error mapping;
- do not retest service business logic through transport expectations.

Repository tests:

- prefer integration tests for non-trivial persistence behavior;
- use gomock only for repository dependencies outside the storage behavior under test;
- when external `<pkg>_test` is needed, keep unexported helper coverage in a separate same-package helper test file.

## Migration From Manual Fakes

When replacing manual fakes:

1. Identify the interface the fake represents.
2. Add or consolidate `go:generate` on the source file that owns the interface.
3. Run generation using the repo's established command, or `go generate ./...` when no narrower command exists.
4. Replace call-state assertions with `EXPECT()` chains.
5. Use `DoAndReturn` only when the old fake captured arguments or computed a response.
6. Keep the same behavioral assertions unless the old test was asserting implementation detail.

## Verification

If a mockgen directive or generated mock changed, run generation before tests:

```bash
go generate ./...
```

Then run focused package tests for touched packages:

```bash
go test ./path/to/package
```

Prefer project scripts, Make targets, or CI-equivalent commands when the repo already documents them. Run full-repo tests only when the change affects shared interfaces, generation commands, or broad package boundaries.
