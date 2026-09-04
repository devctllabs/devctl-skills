# Code Principles

## Contents

- Principle
- KISS for Rust
- DRY for Rust
- SOLID for Rust Core and Libraries
- Abstraction Defaults
- Contract and Type Defaults
- Documentation and Comments
- Review Checklist
- Related References

## Principle

Use KISS, DRY, and SOLID as practical guardrails for handwritten Rust code. Keep code explicit,
type-safe, and easy to change without weakening the crate, module, delivery, and generated-code
boundaries in this skill.

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

## DRY for Rust

Keep each rule or fact in one authoritative place:

- keep business rules and domain invariants with their behavior owner;
- centralize normalization, serialization, error mapping, schema facts, and config defaults only
  when consumers depend on the same contract;
- call the existing owner-level capability instead of copying its behavior into another module;
- share test builders, fixtures, or doubles only after several suites depend on the same stable
  contract.

Repeated syntax is not automatically duplicated knowledge. Prefer a few explicit local lines to a
premature `common`, `utils`, base trait, generic helper, macro, or registry. Extract only after real
repetition reveals one responsibility, owner, and set of consumers that should change together.

## SOLID for Rust Core and Libraries

Apply SOLID in Rust terms:

- Single Responsibility: a module, type, trait, or crate owns one clear capability, invariant, or public API area. Split when it has multiple reasons to change.
- Open/Closed: extend behavior with traits, generics, adapters, feature-gated modules, or delivery-specific composition. Do not edit core business logic for every runtime variant.
- Liskov Substitution: implementations behind the same trait honor the same domain contract, error categories, cancellation/timeout behavior, ownership expectations, and side-effect rules.
- Interface Segregation: keep traits small, behavior-focused, and consumer-owned. Avoid broad facade traits and layer-shaped trait dumps.
- Dependency Inversion: services/usecases and reusable libraries depend on capability-level,
  consumer-owned traits for storage, clients, policy, clocks, transactions, publishers, and other
  application-affecting external behavior. Delivery crates wire concrete implementations; library
  callers supply them through public constructors.

Do not turn every dependency into a trait. Concrete typed values are right for data, config,
options, value objects, paths, and closed domain states. Native diagnostic `tracing` spans and events
do not require a custom trait; business-significant audit output does.

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

## Contract and Type Defaults

- Represent fixed fields with named structs, enums, newtypes, commands, queries, results, or views.
  Do not pass `serde_json::Value`, `HashMap<String, Value>`, or equivalent anonymous records across
  module or application-layer boundaries.
- Use maps when keys are genuinely runtime domain data, such as labels, provider names, or artifact
  identifiers. Make key and value concepts explicit and do not expose mutable internal maps.
- Decode JSON, YAML, SDK, database, and framework values at the raw boundary, validate them, and map
  them immediately to named service-facing types.
- Keep low-level rows, generated DTOs, protocol messages, and driver types inside their adapters.
- Describe application capabilities rather than copying `Path`, `std::fs`, an SDK, or a driver
  method set into a consumer trait.

## Documentation and Comments

Use rustdoc for public library APIs and document internal functions or methods whose contract is not
obvious from their name and type signature. Non-trivial side effects, error semantics, locking,
atomicity, ordering, concurrency ownership, safety invariants, and external constraints usually
deserve documentation.

Explain guarantees and reasons rather than restating fields or narrating readable code. Refactor
tangled control flow before adding comments merely to make it understandable.

Keep `#[allow(...)]`, Clippy expectations, feature exceptions, and tool suppressions narrow,
rule-specific, and accompanied by a local reason when supported. Do not use crate-wide exclusions to
hide new complexity or boundary violations.

## Review Checklist

- Is the new abstraction solving a current problem rather than preparing for a vague future?
- Could a plain function, concrete type, or local module express this more clearly?
- Is each repeated rule, normalization, error mapping, schema fact, or default owned in one place?
- Does each shared abstraction represent actual stable repetition with a clear owner?
- Is a new crate justified by API, dependency, feature, reuse, compile, versioning, or ownership boundaries?
- Are traits small, consumer-owned, and behavior-focused?
- Do trait methods describe application capabilities instead of mirroring a library API?
- Are generics preferred when the dependency is stored and runtime polymorphism is unnecessary?
- Is `dyn Trait` limited to real runtime polymorphism or heterogeneous storage needs?
- Do fixed-field boundaries use named types rather than dynamic values or maps?
- Is raw decoded data validated and mapped before leaving its adapter?
- Does service/usecase code avoid direct filesystem, network, subprocess, clock, random, and
  environment access?
- Does core code avoid delivery framework types, driver types, generated protocol DTOs, process runtime concerns, and global state?
- Do comments explain guarantees and decisions rather than narrating implementation?
- Is every suppression narrow and locally justified?
- Are shared helpers placed by ownership instead of dumped into `common`, `utils`, or `platform`?
- Are alternative implementations selected in delivery or `deps` instead of branching through core?

## Related References

- Read `overview-and-naming.md` for crate/module responsibilities and layer boundaries.
- Read `service-and-usecase.md` for dependency traits, generic services, and `impl Trait`/`dyn Trait` choices.
- Read `io-boundaries-and-platform.md` for side-effect seams, path values, filesystem adapters, and platform ownership.
- Read `quality-tooling.md` for enforceable quality and dependency-direction checks.
- Read `validation-and-crosscutting.md` for helper placement and wrapper composition.
- Read `library-crates.md` for public Rust library API details.
