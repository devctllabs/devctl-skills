# Code Principles

## Contents

- Principle
- KISS for Go
- DRY for Go
- SOLID for Go Services and Libraries
- Abstraction Defaults
- Contract and Type Defaults
- Documentation and Comments
- Review Checklist
- Related References

## Principle

Use KISS and SOLID as practical guardrails for handwritten Go code. Keep code explicit, boring, and easy to change without weakening the layer boundaries in this skill.

Simple does not mean unstructured. Keep the existing dependency direction, domain contracts, runtime wiring, and generated-code boundaries. Remove ceremony that has no current job.

## KISS for Go

Prefer the smallest shape that explains the behavior:

- use a plain function for stateless deterministic logic;
- keep a helper in the package that uses it before moving it to `internal/platform`, `internal/domain/common`, or another shared package;
- keep 1-2 closely related operations in one file before splitting by operation;
- add `usecase` only for real product flows, multi-step orchestration, retries, compensation, or cross-service coordination;
- use direct constructor parameters before dependency structs or option sets;
- use a dependency struct only when constructor arity is noisy and the fields remain explicit;
- add interfaces only for behavior seams, not for data, config, options, or pure helpers;
- add generics only when they remove meaningful duplication or express a reusable typed contract.

Avoid code organization that only mirrors an architecture diagram. A package, file, interface, or wrapper should have a current reason in readability, testing, substitution, reuse, or ownership.

## DRY for Go

Keep each rule or fact in one authoritative place:

- keep business rules and domain invariants with their behavior owner;
- centralize normalization, serialization, error mapping, schema facts, and config defaults only
  when consumers depend on the same contract;
- call the existing owner-level capability instead of copying its behavior into another package;
- share test builders, fixtures, or doubles only after several suites depend on the same stable
  contract.

Repeated syntax is not automatically duplicated knowledge. Prefer a few explicit local lines to a
premature `common`, `utils`, base abstraction, generic helper, or registry. Extract only after real
repetition reveals one responsibility, owner, and set of consumers that should change together.

## SOLID for Go Services and Libraries

Apply SOLID in Go terms:

- Single Responsibility: a package, type, function, or service owns one clear capability or domain area. Split when a unit has multiple reasons to change.
- Open/Closed: extend behavior with composition, options, decorators, adapters, or alternative implementations wired in `internal/deps`. Do not edit core business logic for every runtime variant.
- Liskov Substitution: implementations behind the same interface honor the same domain contract, context behavior, error categories, idempotency, and side-effect expectations.
- Interface Segregation: declare small consumer-owned interfaces. Avoid broad facades, layer bundles, and god-service contracts.
- Dependency Inversion: services/usecases and reusable libraries depend on capability-level,
  consumer-owned interfaces for storage, clients, policy, clocks, transactions, publishers, and
  other application-affecting external behavior. Applications wire concrete implementations in
  `internal/deps`; library callers supply them through public constructors.

Use `*zap.Logger` directly as the default logger dependency. Do not invent a logger interface only to satisfy a blanket abstraction rule.

## Abstraction Defaults

Default choices:

- data/config/options: concrete typed values;
- pure transformations and validation helpers: plain functions;
- blocking or I/O operations: methods that accept `context.Context`;
- storage, outbound systems, clocks, ID generators, policy engines, publishers, and transaction managers: small interfaces owned by the consumer package;
- runtime assembly: explicit constructors and `internal/deps`, not hidden globals;
- reusable libraries: caller-owned composition through constructors, options, and explicit dependency structs.

Constructor input selection:

- required behavioral dependencies: direct constructor parameters;
- cohesive required runtime values: a typed `Config` struct;
- optional overrides with safe defaults: `opts ...Option`, mainly for reusable libraries and clients;
- noisy required dependencies: an explicit dependency struct with named fields.

Do not hide required dependencies such as repositories, clients, clocks, transaction managers, loggers, or publishers inside `Config`, `Option`, or package globals.

Do not introduce package-level runtime state, global registries, hidden DI registration, or `init()` side effects. Runtime state belongs to explicit instances built by the caller or composition root.

## Contract and Type Defaults

- Represent fixed fields with named structs, named scalar types, enums, commands, queries, results,
  or views. Do not pass `map[string]any` as an anonymous record across package or application-layer
  boundaries.
- Use maps when keys are genuinely runtime domain data, such as labels, provider names, or artifact
  identifiers. Make key and value concepts explicit and do not expose mutable internal maps.
- Decode JSON, YAML, SDK, database, and framework values at the raw boundary, validate them, and map
  them immediately to named service-facing types.
- Keep low-level rows, generated DTOs, protocol messages, and driver types inside their adapters.
- Describe application capabilities rather than copying `os`, `io/fs`, an SDK, or a driver method
  set into a consumer interface.

## Documentation and Comments

Document exported library APIs and internal functions or methods whose contract is not obvious from
their name and signature. Non-trivial side effects, error semantics, locking, atomicity, ordering,
concurrency ownership, and external constraints usually deserve documentation.

Explain guarantees and reasons rather than restating parameters or narrating readable code. Refactor
tangled control flow before adding comments merely to make it understandable.

Keep `//nolint`, build-tag exceptions, and tool suppressions narrow, rule-specific, and accompanied
by a local reason. Do not use package-wide exclusions to hide new complexity or boundary violations.

## Review Checklist

- Is the new abstraction solving a current problem rather than preparing for a vague future?
- Could a plain function or local helper express this more clearly?
- Is each repeated rule, normalization, error mapping, schema fact, or default owned in one place?
- Does each package/type/function have one clear reason to change?
- Are interfaces small, consumer-owned, and behavior-focused?
- Do interface methods describe application capabilities instead of mirroring a library API?
- Do fixed-field boundaries use named types rather than `map[string]any`?
- Is raw decoded data validated and mapped before leaving its adapter?
- Are concrete data/config values kept concrete instead of wrapped in interfaces?
- Does service/usecase code avoid direct filesystem, network, subprocess, clock, random, and
  environment access?
- Does business code avoid DI containers, transport DTOs, driver types, and generated protocol messages?
- Do comments explain guarantees and decisions rather than narrating implementation?
- Is every suppression narrow and locally justified?
- Are shared helpers placed by ownership instead of dumped into `common`, `utils`, or `platform`?
- Are alternative implementations selected in `internal/deps` instead of branching through core business code?

## Related References

- Read `overview-and-naming.md` for package responsibilities and layer boundaries.
- Read `service-and-usecase.md` for service interfaces, dependency ownership, and DI-local service assembly.
- Read `io-boundaries-and-platform.md` for side-effect seams, path values, filesystem adapters, and platform ownership.
- Read `quality-tooling.md` for enforceable quality and dependency-direction checks.
- Read `validation-and-crosscutting.md` for helper placement and wrapper composition.
- Read `library-packages.md` for public Go library API details.
