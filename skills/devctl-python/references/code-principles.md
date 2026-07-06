# Code Principles

## Contents

- Principle
- KISS for Python
- SOLID for Python Services and Libraries
- Abstraction Defaults
- Typing Defaults
- Review Checklist
- Related References

## Principle

Use KISS and SOLID as practical guardrails for handwritten Python code. Keep code explicit, typed enough for the boundary, and easy to change without weakening package, domain, transport, and generated-code boundaries.

Simple does not mean unstructured. Prefer the smallest function/class/module shape that protects the current invariant and ownership boundary.

## KISS for Python

Prefer the smallest shape that explains the behavior:

- use a plain function for stateless deterministic logic;
- use a dataclass or small value object for cohesive data with invariants;
- use a class when the object owns state, dependencies, lifecycle, or a cohesive behavior set;
- use `typing.Protocol` for behavior supplied by callers or adapters;
- keep a helper in the module that owns the vocabulary before moving it to `platform`, `domain/common`, or another shared module;
- add `usecase` only for real product flows, multi-step orchestration, retries, compensation, or cross-service coordination;
- add dependency containers or factories only when direct constructors become noisy;
- add decorators/wrappers only when they own real cross-cutting behavior.

Avoid code organization that only mirrors an architecture diagram. A module, class, Protocol, wrapper, or helper should have a current reason in readability, testing, substitution, reuse, or ownership.

## SOLID for Python Services and Libraries

Apply SOLID in Python terms:

- Single Responsibility: a module, class, function, or package owns one clear capability or domain area. Split when it has multiple reasons to change.
- Open/Closed: extend behavior with composition, Protocols, adapters, options, or wrappers instead of editing core business logic for every runtime variant.
- Liskov Substitution: implementations behind the same Protocol honor the same domain contract, error categories, cancellation/timeout behavior, and side-effect rules.
- Interface Segregation: keep Protocols small, behavior-focused, and consumer-owned. Avoid broad facade Protocols and layer-shaped dumps.
- Dependency Inversion: service/usecase code depends on Protocols for storage, clients, policy, clocks, filesystem, transactions, and external behavior. Entrypoints or `deps` modules wire concrete implementations.

Do not turn every dependency into a Protocol. Concrete typed values are right for data, config, options, value objects, and closed domain states.

## Abstraction Defaults

Default choices:

- data/config/options/value objects: concrete typed values or dataclasses;
- pure transformations and validation helpers: plain functions;
- caller-supplied behavior: small `typing.Protocol` contracts;
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

- Use modern built-in generics such as `list[str]` and `dict[str, str]` when the repo's Python version supports them.
- Use `dataclass(frozen=True, slots=True)` for immutable domain value objects when equality and compact storage matter.
- Use `NewType` or small value classes for domain identifiers when plain strings are easy to confuse.
- Use `TypedDict` only for dict-shaped external data that must remain dict-shaped.
- Use Pydantic models for framework or IO boundaries only when the project uses Pydantic; keep them out of domain by default.
- Prefer explicit `None` handling over truthiness when empty values are semantically different from missing values.
- Keep `Any` at IO edges or compatibility boundaries. Do not let it spread into service/domain contracts.

## Review Checklist

- Is the new abstraction solving a current problem?
- Could a plain function, dataclass, or local helper express this more clearly?
- Does each module/class/function have one clear reason to change?
- Are Protocols small, consumer-owned, and behavior-focused?
- Are concrete data/config values kept concrete instead of wrapped in Protocols?
- Does business code avoid framework DTOs, ORM models, driver types, generated protocol DTOs, process lifecycle concerns, and global state?
- Are shared helpers placed by ownership instead of dumped into `common` or `utils`?
- Are alternative implementations selected in entrypoint/`deps` modules instead of branching through core business code?

## Related References

- Read `overview-and-naming.md` for package responsibilities and layer boundaries.
- Read `service-and-usecase.md` for dependency Protocols and service composition.
- Read `validation-and-crosscutting.md` for helper placement and wrapper composition.
- Read `library-packages.md` for public Python package API details.
