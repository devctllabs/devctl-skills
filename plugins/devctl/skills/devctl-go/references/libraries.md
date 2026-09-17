# Reusable libraries

Design a library from the API and concepts its caller uses. Apply typed contracts, error, I/O, and
lifetime rules without manufacturing application layers, a CLI, or `internal/deps`.

## Package and module shape

A single cohesive library normally uses one `go.mod` and exposes its primary package at the clearest
import path. Add subpackages only for independently meaningful public concepts, not to mirror
domain/service/repository layers.

A repository containing independently versionable libraries uses one module per library and a
`go.work` for joint development. For a new repository without a convention, use
`libs/<library-name>/go.mod`; preserve a coherent established layout. Each module has its own public
API, dependency graph, tool declarations, tests, and possible release boundary.

Application `internal` packages stay private. Expose `pkg` only for intentional imports from other
modules; moving code to `pkg` is a public API decision rather than a visibility workaround.

## Public API and dependencies

Prefer a plain function for stateless deterministic parsing, normalization, validation, formatting,
or calculation. Use an interface when the library consumes caller-supplied behavior, state, I/O,
time, randomness, or a genuinely replaceable backend.

Keep interfaces small and capability-named. Required behavioral dependencies are explicit
constructor parameters or a cohesive dependency struct. Configuration and data remain concrete.
Use options for real optional overrides over safe defaults; options do not hide required
dependencies, read environment variables, acquire resources, mutate globals, or start work. Return
an error from construction when the combined configuration can be invalid.

Expose stable errors through `errors.Is`/`errors.As`, document side effects and non-obvious ordering,
atomicity, concurrency, and cleanup guarantees, and preserve compatibility for exported names and
wire-visible behavior unless the task explicitly changes them.

## State and lifetime

Runtime state is instance-owned: clients, registries, caches, loggers, mutable config, workers, and
dependency sets belong to values created by the caller. Library import has no environment reads,
network/file access, goroutine startup, signal handling, handler registration, or logging changes.
Avoid `init()` for reusable behavior and package-level mutable runtime state.

Blocking or I/O operations accept `context.Context`. Background work exposes an explicit lifecycle
such as `Run(ctx)`, `Start/Close`, or `Open/Close`, with documented ownership. The caller composes
dependencies and decides process lifetime; the library does not require an application DI container.

## Tests

Test exported behavior from the consumer-facing package boundary, including stable errors and
supported construction. Pure functions need direct table tests rather than interfaces or mocks.
Use generated gomock mocks for caller-supplied capabilities and real economical resources for
library-owned adapters. Add compile/import coverage where construction or generic contracts can
drift, and test explicit resource and worker lifecycle.
