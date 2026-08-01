# Library Packages

## Contents

- General Principle
- SOLID for Go Libraries
- Single Library
- Multi-Library Monorepo
- API and Interfaces
- Composition
- State and Runtime
- Review Checklist
- Related References

## General Principle

Design a Go library from its public API, package meaning, and value to the library user. Repository structure and import paths should make it clear what capabilities the library provides, what concepts it introduces, and where the stable API boundary is.

Choose package names by meaning: domain concept, capability, or user-visible role. Avoid technical folders that only mirror an architecture diagram when they do not improve API readability.

## SOLID for Go Libraries

Apply SOLID pragmatically. For application and service code, also read `code-principles.md`; this section narrows the same principles to public library APIs.

- Single Responsibility: each package and type owns one clear capability.
- Open/Closed: extend behavior through interfaces, options, adapters, or composition instead of editing core logic for every variant.
- Liskov Substitution: implementations behind the same contract must be safely interchangeable and avoid surprising side effects.
- Interface Segregation: keep interfaces small and behavior-focused; avoid broad facades by default.
- Dependency Inversion: core library code depends on abstractions, and concrete implementations are supplied by the caller.

## Single Library

Use one `go.mod` for a single library. Put the primary public package where it is easiest for users to import and understand. Add extra packages only when they represent meaningful public API areas.

Example:

```text
go.mod
client.go
options.go
errors.go
codec/
retry/
otel/
```

`codec`, `retry`, and `otel` should exist only when they are real public concepts in the library, not as a way to sort files by technical layer.

## Multi-Library Monorepo

A multi-library monorepo contains several separate Go libraries in one repository. Each library has its own `go.mod`; the shared repository is for joint development, shared tooling, and navigation.

For a new repository, use `libs/` as the default top-level directory:

```text
libs/
  auth/
    go.mod
  config/
    go.mod
  telemetry/
    go.mod
go.work
```

Each directory under `libs/` should be a clear library boundary: separate public API, dependencies, import path, and possible release/version boundary.

Use `go.work` for local development across modules. It does not replace the separate `go.mod` files inside the libraries.

For an existing repository, preserve the current structure when it is clear and used consistently. For a new multi-library repository, default to `libs/<library-name>/`.

## API and Interfaces

Public APIs should be composable. Do not couple users to library-owned concrete implementations when the dependency represents behavior.

Constructors that receive behavioral dependencies accept interfaces:

```go
type HTTPDoer interface {
    Do(req *http.Request) (*http.Response, error)
}

func NewClient(http HTTPDoer, opts ...Option) (*Client, error)
```

Concrete values are still appropriate for data and configuration: `string`, `time.Duration`, config structs, option values, and enum-like types. Behavioral dependencies use interfaces.

Plain functions are good public APIs when the operation is stateless, deterministic, and does not depend on caller-supplied behavior. Do not wrap pure helpers in interfaces only to satisfy an interface-first rule.

Good function APIs:

```go
func NormalizeName(s string) string
func ParseToken(raw string) (Token, error)
func Encode(v Value) ([]byte, error)
```

Use functions for pure transformations, parsing, formatting, validation, small calculations, and helper operations where there is no dependency seam to swap. `strings.ToUpper`-style APIs are valid Go library design.

Use interfaces when the library depends on behavior supplied by the caller, when an implementation may be swapped, or when the operation has state, I/O, time, randomness, external systems, policy, or plugin/backend behavior.

Keep interfaces small and name them by behavior:

```go
type Clock interface {
    Now() time.Time
}

type Encoder interface {
    Encode(v any) ([]byte, error)
}
```

Use a broad facade interface only when the library is actually a facade over a pluggable implementation.

## Composition

Expose composition seams, but do not own the application composition root. Libraries should not require an application DI container or hidden global dependency registration.

Prefer constructors, options, and explicit dependency structs:

```go
func NewProcessor(clock Clock, encoder Encoder, opts ...Option) *Processor
```

Use direct parameters for required behavioral dependencies. Use `opts ...Option` for optional overrides over safe defaults, especially when the public API should grow without changing every call site:

```go
func NewClient(http HTTPDoer, opts ...Option) (*Client, error)
```

`Option` and `WithX` functions should only change constructor configuration. They must not read environment variables, open network connections, start goroutines, register globals, or hide required dependencies. If applying options can produce invalid configuration, return `(*T, error)` from the constructor.

When dependencies grow, group them in an explicit dependency struct whose behavioral fields are abstractions:

```go
type Dependencies struct {
    Clock   Clock
    Encoder Encoder
    Store   Store
}

func NewProcessor(deps Dependencies, opts ...Option) *Processor
```

If a library supports backend or plugin composition, expose it through constructors, options, or a registry object created by the caller. Avoid hidden global registries.

## State and Runtime

Runtime state must be instance-owned. Clients, registries, caches, loggers, workers, mutable config, and default dependency instances belong to explicit objects created by the caller.

Do not use package-level variables for library runtime state. Package-level `var` is allowed only for language/tooling-required declarations such as `//go:embed`, or for compile-time/interface assertions that do not hold runtime state. Do not use package-level variables for clients, registries, caches, loggers, configuration, dependency containers, feature flags, or mutable defaults.

Do not use `init()` in reusable libraries. Initialization must be explicit through constructors, options, `Open`/`Start`, or caller-owned registration. Avoid hidden import-time behavior.

Import side effects must be minimal. Library import must not read environment variables, open network connections, start goroutines, register global handlers, install signal handlers, mutate global logging, or register process-wide defaults.

Operations that may block or perform I/O accept `context.Context`. Background work has an explicit lifecycle such as `Run(ctx)`, `Start/Close`, `Open/Close`, or an equivalent contract.

## Review Checklist

- Do package and directory names describe user-facing meaning instead of technical layers?
- Is a new single library a single Go module with extra packages only for meaningful public API areas?
- Does a new multi-library repo use `libs/<library-name>/` with one `go.mod` per library?
- Are behavioral constructor dependencies interfaces rather than concrete implementations?
- Are interfaces small, behavior-named, and substitutable?
- Is application composition kept outside the reusable library?
- Is mutable runtime state instance-owned?
- Are package-level variables limited to `//go:embed` or non-runtime compile-time assertions?
- Is all initialization explicit instead of hidden in `init()`?
- Are import-time side effects avoided?

## Related References

- Read `code-principles.md` for KISS/SOLID defaults that apply to all handwritten Go code.
