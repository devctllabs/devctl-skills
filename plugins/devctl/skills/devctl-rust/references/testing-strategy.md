# Testing Strategy

## Contents

- Principle
- Mandatory Outside-In TDD
- Scenario Order
- Layer Matrix
- Unit Tests
- Test Doubles and Mocking
- Repository Integration Tests
- Transport Tests
- Client Tests
- CLI Tests
- Contract and Generated Code Checks
- Build Script Checks
- Workspace Verification
- Tauri CI Notes
- Review Checklist

## Principle

Use outside-in TDD for handwritten production behavior from the highest affected public boundary.
Advance one caller-visible scenario per RED/GREEN/simplify cycle, then test demanded lower
components at their own module or crate boundaries. Preserve repository commands and test
conventions.

## Mandatory Outside-In TDD

Remain in this state machine:

```text
TEST -> useful RED -> minimum production -> GREEN -> simplify
```

1. Choose the highest affected caller-visible API and smallest coherent scenario. Combine
   assertions only when they demand the same production change.
   When the request changes a CLI, HTTP/RPC endpoint, Tauri command, or consumer contract, that
   delivery surface is the highest boundary; start at a service API only when no delivery contract
   changes.
2. Change only the owner test before useful RED. For a new compiled API, first add the smallest
   declaration or skeleton required for the crate to compile, without requested behavior.
3. Run the narrowest owner module/test. RED proves missing or wrong behavior, not unrelated
   compilation, configuration, fixture, or setup failure. `todo!`, `unimplemented!`, or an explicit
   unsupported error may make RED useful but never counts as GREEN.
4. Add minimum production for GREEN, simplify if useful, and rerun the same narrow check after every
   edit. Do not manufacture a refactor.
5. Finish applicable scenarios at the current public boundary before descending. Run its module or
   package suite and verify the named contract and dependency direction at each checkpoint.

For a new delivery operation, the compile skeleton may include clap/route/command registration, a
narrow injected core capability, and a handler that returns an explicit unsupported error. The
first useful RED must exercise the public delivery boundary. Do not implement service or repository
behavior merely to make that RED possible; use a narrow double until delivery scenarios are GREEN.

An upper RED may demand a consumer-owned trait and test double, never a concrete lower adapter.
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

- `Zero`: no records, empty collections or strings, `None`, zero-value typed config, or omitted input.
- `One`: the smallest meaningful successful case.
- `Many`: multiple records, repeated calls, batches, aggregation, iteration, or observable ordering.
- `Boundary`: min/max values, threshold equality, just below/above limits, path containment,
  deadlines, or size limits.
- `Exceptions`: validation failures, dependency errors, cancellation/deadlines, not found, conflict,
  permission denied, partial failure, rollback, or error mapping.
- `Interfaces`: optional public construction, signature, trait shape, CLI invocation, route
  registration, or supported re-export coverage not exercised earlier.

Categories guide behavior selection, not test names or counts. A cross-layer integration test has
one declared owner. It adds confidence but does not count as direct service, adapter, and delivery
coverage simultaneously.

## Layer Matrix

Every module/crate that exists and owns changed behavior needs a direct suite. Do not create empty
modules, traits, mocks, or tests merely to fill the matrix.

| Layer | Minimum direct suite | Focus |
| --- | --- | --- |
| `domain` | module unit | invariants, value normalization, domain errors; no dependency doubles |
| `service` | module unit with trait doubles | business rules, demanded calls, application errors |
| `usecase` | orchestration unit with trait doubles | flow order, retries, transactions, compensation |
| `repository` | unit for pure mapping plus real-backend integration | mapping, constraints, filesystem layout, locking, atomicity |
| `client` | runner/SDK doubles plus protocol integration when valuable | request/command construction, parsing, timeout/retry, normalization |
| `platform` | unit plus integration for OS/runtime implementations | clocks, IDs, codecs, telemetry, runtime-specific behavior |
| delivery transport | unit with narrow service/usecase fake plus protocol integration | DTO validation, mapping, errors, registration |
| CLI delivery | direct command behavior plus end-to-end invocation when valuable | args, delegation, output, exit status |
| `runtime/deps` | integration smoke when wiring is non-trivial | construction, config, critical wiring |
| generated/build/contracts | existing build or drift checks | reproducible generation and compatibility |

Passive declarations and absent layers need no tests solely for symmetry.

## Unit Tests

Put unit tests near the code they verify:

- domain invariants and value normalization in domain modules;
- service/usecase business rules with the repo's test-double convention;
- repository mapping helpers with focused fixtures;
- error mapping with precise category assertions;
- config normalization with explicit inputs.

Prefer testing public behavior over private implementation details. Use `#[cfg(test)] mod tests` for small focused module tests.

For new projects, use `mockall` for trait dependencies in service/usecase unit tests. This shape assumes `MockOrderRepository` is generated from the dependency trait with `mockall::automock`:

```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn create_rejects_empty_items() {
        let repo = MockOrderRepository::new();
        let service = OrderService::new(repo);

        let error = service
            .create(CreateOrderCommand {
                customer_id: "cust_1".into(),
                items: vec![],
            })
            .await
            .expect_err("empty order should be rejected");

        assert!(matches!(error, AppError::Invalid(_)));
    }

    #[tokio::test]
    async fn create_returns_repository_view_for_valid_order() {
        let mut repo = MockOrderRepository::new();
        repo.expect_insert()
            .withf(|command| command.customer_id == "cust_1" && command.items.len() == 1)
            .times(1)
            .returning(|command| {
                Ok(OrderView {
                    id: OrderId("ord_test".into()),
                    customer_id: command.customer_id,
                })
            });

        let service = OrderService::new(repo);

        let order = service
            .create(CreateOrderCommand {
                customer_id: "cust_1".into(),
                items: vec![OrderItemParams {
                    sku: "sku_1".into(),
                    qty: 1,
                }],
            })
            .await
            .expect("valid order should be created");

        assert_eq!(order.id, OrderId("ord_test".into()));
        assert_eq!(order.customer_id, "cust_1");
    }
}
```

Place `mockall::automock` on service/usecase dependency traits only when the repo already uses that pattern or the project is new. For async traits, follow the repo's existing async trait style and `mockall` support for that style; do not introduce a second async trait convention only for tests.

## Test Doubles and Mocking

Use the repo's existing test-double convention first.

For new projects:

- use `mockall` for service/usecase dependency traits;
- use handwritten fakes/spies only when they are clearer than expectations or when stateful behavior is the point of the test;
- avoid struct-mocking frameworks as a default;
- keep mock dependencies in dev-dependencies or test-only configuration.

Use `mockall` expectations for meaningful dependency behavior: required calls, argument matching, error branches, ordering, retry counts, transaction behavior, and compensation. Avoid over-specifying incidental calls that make behavior tests brittle.

## Repository Integration Tests

Repository integration tests may use temp directories, temporary SQLite databases, or testcontainers depending on project dependencies and CI support.

Checklist:

- schema/migration setup is explicit;
- test data is isolated per test;
- constraints map to expected core error categories;
- storage rows map to domain views correctly;
- tests do not rely on global env mutation when typed config would be clearer;
- filesystem/object-storage layout and persisted format are asserted through the public repository;
- locking, atomic publication, rollback, cleanup, containment, file kind, and symlink safety are
  covered when owned by the adapter.

When an adapter claims atomicity, rollback, compensation, or cleanup, fail it after at least one
operation has applied. Assert the normalized error and restoration of every pre-existing target; a
success-only atomic write test is insufficient.

Test filesystem repositories with `tempfile::TempDir` or the repository's real temporary backend.
Do not invent a raw filesystem trait solely to avoid testing I/O behavior owned by the adapter.

## Transport Tests

Server tests should verify:

- route/protocol mapping;
- request/response DTO mapping;
- core error to protocol error mapping;
- health/readiness behavior;
- shutdown-sensitive behavior when practical.

Tauri tests should focus on command helper logic, error mapping, path/config normalization, and core interactions. UI-side IPC adapter tests belong in the React/Vite skill area.

## Client Tests

Client tests should verify:

- request construction;
- auth headers or signing when applicable;
- timeout/retry behavior;
- mapping external errors into core categories;
- response DTO mapping into service-facing contracts.

Use a fake server, SDK stub, or protocol-level mock that matches the project's dependency choices.

For new projects, use `mockito` for outbound HTTP client tests. Verify method, path, query, headers, request body, response mapping, and external-error normalization at the HTTP boundary. Use SDK stubs only when the dependency is SDK-native rather than HTTP-level.

For subprocess clients, test arguments, stdout/stderr parsing, non-zero exits, timeouts, and external
contract validation at the client boundary. Reuse an established command-runner trait when one
exists; add one only when several commands, lifecycle behavior, or repeated setup makes it a real
boundary. Never expose subprocess behavior to service tests.

## CLI Tests

CLI tests focus on public behavior:

- args, flags, and required options;
- delegation to the selected core service/usecase capability with meaningful values;
- stdout/stderr and exit status;
- application-error presentation;
- command registration when the tree is custom.

Exercise the public `clap` parse-and-dispatch boundary or the repository's established command
helper. Private handler tests are supplementary. Before replacing an existing dispatcher, establish
GREEN characterization for every executable leaf and keep it green throughout the refactor.

## Contract and Generated Code Checks

For checked-in generated code, CI should prove generated output is current.

Acceptable patterns:

- run the repo's codegen command and fail on non-empty `git diff`;
- generate into a temp directory and compare;
- run a dedicated drift checker.

Never hand-edit generated output to satisfy tests. Fix the source contract, generator config, or handwritten adapter.

## Build Script Checks

For `build.rs`:

- test the generated behavior through the consuming Rust API;
- keep generated output stable by sorting inputs;
- emit `cargo:rerun-if-changed` for source directories and files;
- avoid writing outside `OUT_DIR`;
- use clear panic/error messages for malformed checked-in inputs such as migrations.

If `cargo check` does not exercise a build-script path fully, add a focused test that consumes the generated module.

## Workspace Verification

Inspect the repo before choosing commands. Prefer existing root scripts and CI commands.

Common Rust checks:

```bash
cargo fmt --check --manifest-path rust/Cargo.toml
cargo check --manifest-path rust/Cargo.toml
cargo test --manifest-path rust/Cargo.toml
cargo clippy --manifest-path rust/Cargo.toml --all-targets --all-features -- -D warnings
```

If Rust is at the repo root, omit `--manifest-path rust/Cargo.toml`. If the repo has package-specific scripts, use those.

When changing workspace policy, verify members:

```bash
cargo metadata --manifest-path rust/Cargo.toml --no-deps
```

Check that every member crate inherits intended `edition.workspace = true` and `rust-version.workspace = true` when workspace-level policy is used.

Run `cargo tree` when dependency placement or feature leakage is in question.

Do not run formatters that rewrite files unless the task is in implementation mode and formatting changed files is appropriate.

## Tauri CI Notes

Tauri on Linux often needs system libraries before any Rust check can compile native dependencies. Do not guess blindly:

- inspect the actual CI workflow;
- read the failing native crate message;
- add the smallest package set for the missing libraries;
- keep the Rust check command scoped to the detected manifest path.

Failures mentioning missing `pango`, `gdk`, `webkit`, appindicator, xdo, SSL, SVG, or pkg-config are routing signals for Tauri/Linux system dependencies, not Rust module-structure problems.

## Review Checklist

- Did each scenario advance through useful RED, minimum GREEN, optional simplification, and
  re-GREEN at its owner boundary?
- Did bugs begin with regression and pure refactors with characterization?
- Did upper-layer RED demand a trait before a concrete adapter?
- Does every changed behavior owner have a direct module/crate suite?
- Does each cross-layer test have one owner instead of being counted several times?
- Do atomicity/rollback claims include partial-application failure and recovery?
- Do CLI/transport tests prove caller-visible behavior without duplicating business policy?
- Are generated/build, feature, cancellation, and concurrency checks run where relevant?
- Did configured repository tests and quality checks pass through the detected manifest path?
