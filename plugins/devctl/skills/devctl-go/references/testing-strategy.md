# Go Testing

This reference contains only Go-specific behavior owners, assertions, doubles, integration
boundaries, and verification. It neither invokes nor replaces the controlling TDD workflow; the
active language skill must load `$outside-in-tdd` before behavior work begins.

## Owner Mapping

Map the highest affected caller-visible boundary to its Go owner:

```text
CLI command          -> cmd
HTTP/gRPC request    -> transport
consumed message     -> transport
reused product flow  -> usecase
service-only change  -> service
adapter-only change  -> repository or client
```

Dependency arrows describe import direction, not implementation order. A caller-visible operation
backed by repository or client I/O remains service-spanning even when an existing service method
only delegates. Complete the upper owner with a generated gomock mock of its narrow injected
interface before implementing a demanded lower owner.

## Behavior Ownership

Every package that owns changed behavior needs a direct suite. Passive declarations and absent
packages need no symmetry tests. A cross-package integration test has one owner and adds confidence
without replacing the direct suites of crossed packages.

Read each active layer reference for its concrete test boundary. Use a real backend where an adapter
owns backend mechanics. When a unit-test owner isolates an injected interface dependency, use a
generated `go.uber.org/mock/gomock` mock; do not implement that interface with a handwritten fake,
stub, spy, callback struct, or test-only adapter. Do not replace an interface with a function type
merely to avoid mock generation. Read `gomock-unit-tests.md` for generation and package policy.

Use `github.com/stretchr/testify/require` for every assertion in new or changed tests. Do not mix in
`testify/assert` or use `t.Error`, `t.Errorf`, `t.Fatal`, or `t.Fatalf` as assertion mechanisms.
Standard `testing.T` control methods such as `Run`, `Helper`, `Cleanup`, and `Parallel` remain
appropriate. Because `require` must run in the test goroutine, capture worker results and assert
them after synchronization.

Real database/filesystem repositories, `httptest.Server`, helper processes, and SDK-owned test
hooks are concrete test boundaries rather than handwritten DI doubles. Use them when they exercise
behavior owned by that adapter. Reserve repository unit tests for pure mapping or a genuine
lower-level injected dependency.

## Final Go Checks

Use configured repository commands first. Before completion:

- run the direct Go suite for every changed owner and the repository's configured full test and
  quality commands;
- run generation and drift checks when contract, mock, or generated inputs changed;
- run race-focused checks for concurrency-sensitive behavior when configured or practical;
- keep generated files unedited and change their source or generator instead.

## Review Checklist

- Does each changed Go owner have a direct suite with one declared behavior owner?
- Do new and changed assertions use `testify/require`?
- Does every injected interface dependency in a unit test use generated gomock?
- Do adapter tests exercise real owned mechanics rather than handwritten DI doubles?
- Do generation, contract, race, and repository quality checks cover the affected boundaries?
