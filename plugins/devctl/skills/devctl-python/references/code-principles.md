# Code Principles

## Contents

- Principle
- KISS for Python
- DRY for Python
- SOLID for Python Services and Libraries
- Abstraction Defaults
- Typing Defaults
- Documentation and Comments
- Review Checklist
- Related References

## Principle

Require all handwritten Python code—including production code, tests, and tooling—to follow KISS, DRY, and SOLID as practical guardrails. Keep code explicit, typed enough for the boundary, and easy to change without weakening package, domain, transport, and generated-code boundaries.

Simple does not mean unstructured. Prefer the smallest function/class/module shape that protects the current invariant and ownership boundary.

## KISS for Python

Prefer the smallest shape that explains the behavior:

- use a plain function for stateless deterministic logic;
- use a dataclass or small value object for cohesive data with invariants;
- use a class when the object owns state, dependencies, lifecycle, or a cohesive behavior set;
- use `typing.Protocol` for caller-supplied behavior, and require it for side effects consumed by services/usecases;
- keep concrete values such as `Path` concrete instead of abstracting their library methods;
- keep a helper in the module that owns the vocabulary before moving it to `platform`, `domain/common`, or another shared module;
- add `usecase` only for real product flows, multi-step orchestration, retries, compensation, or cross-service coordination;
- add dependency containers or factories only when direct constructors become noisy;
- add decorators/wrappers only when they own real cross-cutting behavior.

Avoid code organization that only mirrors an architecture diagram. A module, class, Protocol, wrapper, or helper should have a current reason in readability, testing, substitution, reuse, or ownership.

## DRY for Python

Keep each piece of knowledge in one authoritative place. Remove duplication when it represents the
same behavior, rule, or fact:

- keep business rules and domain invariants with their behavior owner;
- centralize shared normalization, serialization, error mapping, schema facts, and config defaults
  only when consumers depend on the same contract;
- reuse the existing owner-level capability instead of copying its behavior into another layer;
- share test builders, fixtures, or doubles only when several suites depend on the same stable
  contract.

Do not treat repeated syntax as duplicated knowledge. Prefer a few explicit local lines to a
premature `common`, `utils`, base class, generic helper, registry, or framework. Extract only after
actual repetition reveals one stable responsibility, a clear owner, and consumers that should
change together.

## SOLID for Python Services and Libraries

Apply SOLID in Python terms:

- Single Responsibility: a module, class, function, or package owns one clear capability or domain area. Split when it has multiple reasons to change.
- Open/Closed: extend behavior with composition, Protocols, adapters, options, or wrappers instead of editing core business logic for every runtime variant.
- Liskov Substitution: implementations behind the same Protocol honor the same domain contract, error categories, cancellation/timeout behavior, and side-effect rules.
- Interface Segregation: keep Protocols small, behavior-focused, and consumer-owned. Avoid broad facade Protocols and layer-shaped dumps.
- Dependency Inversion: service/usecase and reusable library objects depend on capability-level
  Protocols for storage, clients, policy, clocks, transactions, telemetry, and other external
  behavior. Applications wire concrete implementations at entrypoints or in `deps`; library
  callers supply theirs through the public API.

Do not turn every dependency into a Protocol. Concrete typed values are right for data, config, options, value objects, paths, and closed domain states. Abstract the external capability, not `Path`, a driver, or a library method set.

## Abstraction Defaults

Default choices:

- data/config/options/value objects: concrete typed values or dataclasses;
- pure transformations and validation helpers: plain functions;
- caller-supplied behavior: small `typing.Protocol` contracts, required at service/usecase and
  reusable-library behavior seams;
- runtime construction: explicit constructors and `deps` modules, not hidden globals;
- delivery adapters: concrete framework code in `transport` or `cli`;
- reusable library behavior: modules and public functions/classes before plugin registries or frameworks.

Constructor input selection:

- required behavioral dependencies: direct constructor parameters typed by Protocol;
- cohesive required runtime values: a typed config object;
- optional overrides with safe defaults: keyword-only parameters or explicit options objects;
- many optional values, staged validation, or public API evolution: a builder/factory only when it reduces call-site confusion.

Do not hide required repositories, clients, clocks, transaction managers, publishers, or runtime handles inside broad config dictionaries or module globals.

Avoid process-global mutable state, hidden runtime creation, logging setup at import time, environment reads during first access, background task startup from library code, implicit plugin registration, and mutable default arguments.

## Typing Defaults

- Model fixed-field inputs and outputs with dataclasses, value objects, enums, named tuples, or
  another concrete structured type. Do not use `dict[str, Any]`, `dict[str, object]`, or an
  equivalent mapping as an anonymous record across package or application-layer boundaries.
- Use `Mapping[K, V]` or `dict[K, V]` only when keys are genuinely dynamic domain data, such as
  artifact names, labels, or provider identifiers. Make key and value types explicit; prefer
  `Mapping` for read-only inputs and return an owned value rather than exposing mutable state.
- Use modern built-in generics such as `list[str]` and `dict[str, str]` when the repo's Python
  version supports them.
- Use `dataclass(frozen=True, slots=True)` for immutable domain value objects when equality and compact storage matter.
- Use `NewType` or small value classes for domain identifiers when plain strings are easy to confuse.
- Use `TypedDict` only for an external or compatibility contract that must remain dict-shaped. Do
  not use it instead of a domain command, query, result, or view.
- Use Pydantic models for framework or IO boundaries only when the project uses Pydantic; keep them out of domain by default.
- Treat decoded JSON, TOML, YAML, SDK, and framework values as `object` at the raw boundary.
  Validate and narrow them inside the adapter, then map them immediately to service-facing
  structured types.
- Prefer explicit `None` handling over truthiness when empty values are semantically different from missing values.
- Do not use explicit `Any` in handwritten code by default. If an external hook makes it
  unavoidable, contain it at that boundary and use the narrowest local type-check suppression with
  a reason; never let it enter domain, service, usecase, or repository capability signatures.

## Documentation and Comments

Write docstrings for public APIs and for internal functions or methods whose contract is not obvious
from their name and signature. An internal callable usually needs a docstring when it owns
non-trivial control flow, side effects, error semantics, locking or atomicity, ordering guarantees,
or constraints imposed by an external protocol.

A useful docstring explains caller-visible behavior: what the operation guarantees, which
restrictions matter, which meaningful side effects occur, and which errors or exceptional outcomes
the caller must handle. Do not restate parameter names, annotations, or line-by-line implementation.
Trivial private helpers, passive declarations, and tests do not need ceremonial docstrings.

Use inline comments to explain why an invariant, workaround, ordering rule, or non-obvious
constraint exists. Do not narrate what readable code already says. If a method needs comments merely
to make tangled control flow understandable, refactor it first; documentation is not a substitute
for reducing complexity.

Keep lint and type-check suppressions narrow and code-specific. Place the reason beside a necessary
`noqa`, `type: ignore[code]`, or tool-specific exclusion. Do not use blanket file-level
suppressions, broad rule disables, or complexity ignores to hide new regressions.

## Review Checklist

- Is the new abstraction solving a current problem?
- Could a plain function, dataclass, or local helper express this more clearly?
- Is each repeated business rule, invariant, normalization, error mapping, schema fact, or default owned in one authoritative place?
- Does each shared abstraction represent actual stable repetition with a clear owner?
- Does each module/class/function have one clear reason to change?
- Are Protocols small, consumer-owned, and behavior-focused?
- Do port methods describe capabilities instead of mirroring `Path`, a filesystem, an SDK, or a driver?
- Do fixed-field cross-layer values use named structured types rather than dictionaries?
- Are mappings reserved for dynamic key spaces with explicit key and value types?
- Is raw untyped decoded data validated and mapped before it leaves its adapter?
- Are concrete data/config values kept concrete instead of wrapped in Protocols?
- Does service/usecase code avoid direct filesystem, network, subprocess, clock, and telemetry side effects?
- Does business code avoid framework DTOs, ORM models, driver types, generated protocol DTOs, process lifecycle concerns, and global state?
- Do public and non-trivial internal callables document meaningful guarantees, side effects, and errors without repeating the code?
- Do inline comments explain decisions and invariants rather than narrate implementation?
- Were complex methods simplified before adding explanatory comments or suppressions?
- Is every necessary suppression narrow and accompanied by a local reason?
- Are shared helpers placed by ownership instead of dumped into `common` or `utils`?
- Are alternative implementations selected in entrypoint/`deps` modules instead of branching through core business code?

## Related References

- Read `overview-and-naming.md` for package responsibilities and layer boundaries.
- Read `service-and-usecase.md` for dependency Protocols and service composition.
- Read `io-boundaries-and-platform.md` for side-effect seams, `Path`, filesystem adapters, and platform ownership.
- Read `quality-tooling.md` for enforceable documentation, complexity, typing, dependency, and import-boundary checks.
- Read `validation-and-crosscutting.md` for helper placement and wrapper composition.
- Read `library-packages.md` for public Python package API details.
