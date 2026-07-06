# Code Principles

## Contents

- Principle
- KISS for Go
- SOLID for Go Services and Libraries
- Abstraction Defaults
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

## SOLID for Go Services and Libraries

Apply SOLID in Go terms:

- Single Responsibility: a package, type, function, or service owns one clear capability or domain area. Split when a unit has multiple reasons to change.
- Open/Closed: extend behavior with composition, options, decorators, adapters, or alternative implementations wired in `internal/deps`. Do not edit core business logic for every runtime variant.
- Liskov Substitution: implementations behind the same interface honor the same domain contract, context behavior, error categories, idempotency, and side-effect expectations.
- Interface Segregation: declare small consumer-owned interfaces. Avoid broad facades, layer bundles, and god-service contracts.
- Dependency Inversion: business code depends on service-owned repository/client/policy interfaces. Concrete adapters and runtime dependencies are supplied by `internal/deps`.

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

## Review Checklist

- Is the new abstraction solving a current problem rather than preparing for a vague future?
- Could a plain function or local helper express this more clearly?
- Does each package/type/function have one clear reason to change?
- Are interfaces small, consumer-owned, and behavior-focused?
- Are concrete data/config values kept concrete instead of wrapped in interfaces?
- Does business code avoid DI containers, transport DTOs, driver types, and generated protocol messages?
- Are shared helpers placed by ownership instead of dumped into `common`, `utils`, or `platform`?
- Are alternative implementations selected in `internal/deps` instead of branching through core business code?

## Related References

- Read `overview-and-naming.md` for package responsibilities and layer boundaries.
- Read `service-and-usecase.md` for service interfaces, dependency ownership, and DI-local service assembly.
- Read `validation-and-crosscutting.md` for helper placement and wrapper composition.
- Read `library-packages.md` for public Go library API details.
