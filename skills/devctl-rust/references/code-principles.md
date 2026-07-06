# Code Principles

## Contents

- Principle
- KISS for Rust
- SOLID for Rust Core and Libraries
- Abstraction Defaults
- Review Checklist
- Related References

## Principle

Use KISS and SOLID as practical guardrails for handwritten Rust code. Keep code explicit, type-safe, and easy to change without weakening the crate, module, delivery, and generated-code boundaries in this skill.

Simple does not mean untyped or unlayered. Prefer the smallest type/module/crate shape that protects the real invariant and current ownership boundary.

## KISS for Rust

Prefer the smallest shape that explains the behavior:

- use a plain function for stateless deterministic logic;
- use modules before adding crates;
- keep a helper in the module that owns the vocabulary before moving it to `platform`, `domain/common`, or another shared module;
- use an enum and `match` for a closed set of variants; use traits for open behavior supplied by callers or adapters;
- use a concrete struct before adding a builder;
- add a builder only when options are numerous, optional, or need staged validation;
- add `usecase` only for real product flows, multi-step orchestration, retries, compensation, or cross-service coordination;
- add features only for real optional capabilities or dependency groups;
- add crates only for real API, dependency, feature, reuse, compile-time, versioning, or ownership boundaries.

Avoid object-safety and async ceremony without a concrete need. `dyn Trait`, `async_trait`, boxed futures, service locators, and DI frameworks should pay for themselves in current code.

## SOLID for Rust Core and Libraries

Apply SOLID in Rust terms:

- Single Responsibility: a module, type, trait, or crate owns one clear capability, invariant, or public API area. Split when it has multiple reasons to change.
- Open/Closed: extend behavior with traits, generics, adapters, feature-gated modules, or delivery-specific composition. Do not edit core business logic for every runtime variant.
- Liskov Substitution: implementations behind the same trait honor the same domain contract, error categories, cancellation/timeout behavior, ownership expectations, and side-effect rules.
- Interface Segregation: keep traits small, behavior-focused, and consumer-owned. Avoid broad facade traits and layer-shaped trait dumps.
- Dependency Inversion: core business code depends on traits/generics for storage, clients, policy, clocks, filesystem, transaction, and external behavior. Delivery crates wire concrete implementations.

Do not turn every dependency into a trait. Concrete typed values are right for data, config, options, value objects, and closed domain states.

## Abstraction Defaults

Default choices:

- data/config/options/value objects: concrete typed values;
- pure transformations and validation helpers: plain functions;
- caller-supplied behavior: traits, usually with generic services by default;
- runtime polymorphism or heterogeneous storage: `dyn Trait` behind `Arc` or another explicit owner;
- async trait object seams: use `async_trait` or boxed futures only when runtime polymorphism is required;
- reusable core behavior: modules inside `<app>-core` before separate crates;
- delivery/runtime wiring: delivery crates or `deps`/`runtime` modules, not hidden globals.

Constructor input selection:

- required behavioral dependencies: direct parameters, usually stored as generic types or explicit `dyn Trait` owners when runtime polymorphism is required;
- cohesive required runtime values: a typed `Config` struct;
- simple optional knobs with safe defaults: `Config { field: value, ..Default::default() }`;
- many optional values, staged validation, or public API evolution: a builder.

Do not hide required repositories, clients, clocks, transaction managers, publishers, or runtime handles inside config structs or builders.

Avoid process-global mutable state, hidden runtime creation, global tracing/logging setup, environment reads during first access, background task startup from library code, and implicit plugin registration.

## Review Checklist

- Is the new abstraction solving a current problem rather than preparing for a vague future?
- Could a plain function, concrete type, or local module express this more clearly?
- Is a new crate justified by API, dependency, feature, reuse, compile, versioning, or ownership boundaries?
- Are traits small, consumer-owned, and behavior-focused?
- Are generics preferred when the dependency is stored and runtime polymorphism is unnecessary?
- Is `dyn Trait` limited to real runtime polymorphism or heterogeneous storage needs?
- Does core code avoid delivery framework types, driver types, generated protocol DTOs, process runtime concerns, and global state?
- Are shared helpers placed by ownership instead of dumped into `common`, `utils`, or `platform`?

## Related References

- Read `overview-and-naming.md` for crate/module responsibilities and layer boundaries.
- Read `service-and-usecase.md` for dependency traits, generic services, and `impl Trait`/`dyn Trait` choices.
- Read `validation-and-crosscutting.md` for helper placement and wrapper composition.
- Read `library-crates.md` for public Rust library API details.
