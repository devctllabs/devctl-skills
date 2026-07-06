# Testing Strategy

## Contents

- Principle
- Unit Test Scenario Selection
- Layer Matrix
- Unit Tests
- Test Doubles and Mocking
- Repository Integration Tests
- Transport Tests
- Client Tests
- Contract and Generated Code Checks
- Build Script Checks
- Workspace Verification
- Tauri CI Notes
- Review Checklist

## Principle

Test behavior at the narrowest useful boundary. Service/usecase tests should not import repository implementations. Transport tests should not retest service business logic.

## Unit Test Scenario Selection

Use ZOMBIES as a scenario checklist for unit-level behavior, not as a requirement to write every category for every function. Choose cases from the caller-visible contract and keep only scenarios that exercise behavior owned by the unit.

- `Zero`: no records, empty `Vec`/`HashMap`/`String`, `None`, zero-value typed config, or omitted optional input.
- `One`: the smallest meaningful successful case.
- `Many`: multiple records, repeated calls, batches, aggregation, iteration, or observable ordering.
- `Boundary`: min/max values, threshold equality, just below/above limits, off-by-one cases, deadlines, or size limits.
- `Exceptions`: validation failures, dependency errors, cancellation/deadlines, not found, conflict, permission denied, rollback, or error mapping.

Treat `Interface definition` and `Simple Scenarios, Simple Solutions` as style guardrails:

- `Interface definition`: pin the caller-facing contract first: public method, trait contract, command/query/result shape, and observable error enum/category. In Rust, this does not mean introducing a trait unless the boundary already needs one.
- `Simple Scenarios, Simple Solutions`: start with direct `#[test]` or `#[tokio::test]`, clear assertions, and minimal fixtures. Add mocks, fixtures, table macros, or property tests only when they reduce repetition without hiding behavior.

## Layer Matrix

| Layer | Test style | Focus |
| --- | --- | --- |
| `domain` | unit tests | invariants, value normalization, domain errors |
| `service` | unit tests with repo convention or `mockall` trait mocks | business rules, dependency calls, error categories |
| `usecase` | orchestration tests with repo convention or `mockall` trait mocks | flow order, retries, transactions, compensation |
| `repository` | integration tests | storage mapping, constraints, driver error mapping |
| `client` | `mockito` fake server or SDK stub | request construction, timeout/retry behavior, error normalization |
| `transport` | handler/mapper tests | DTO validation, mapping, protocol error mapping |
| `runtime/deps` | smoke tests only when useful | construction, config, critical wiring |

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
- tests do not rely on global env mutation when typed config would be clearer.

## Transport Tests

CLI tests should verify:

- args and flags;
- stdout/stderr shape when it is a contract;
- exit codes;
- config loading;
- error presentation.

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

- Tests are scoped to the layer being changed.
- Generated code drift is checked when generated code is committed.
- Runtime checks use the detected manifest path and repo scripts.
- Transport tests cover DTO and error mapping.
- Relevant Zero/One/Many/Boundary/Exception cases were considered.
- Service/usecase tests follow repo convention, or use `mockall` for new projects.
- Outbound HTTP client tests follow repo convention, or use `mockito` for new projects.
