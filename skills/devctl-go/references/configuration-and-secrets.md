# Configuration and Secrets

## Contents

- Ownership
- Loading and Validation
- Constructor Configuration
- Secrets and Logging
- Reload
- Testing
- Review Checklist

## Ownership

Treat configuration as runtime input. Resolve env, files, secrets, flags, defaults, and precedence
at startup; pass typed values or dependencies into constructors.

- Generated config packages own fields produced by tooling.
- `internal/deps/config.go` loads, validates, and registers runtime config.
- Executable leaves pass only scenario-specific CLI overrides to `internal/deps`; they do not load
  the final config themselves.
- Optional `internal/config` adapts generated fields into derived/grouped values or compatibility
  shapes.
- Services/usecases receive typed values, not raw environment access.

Use project-established precedence from repository tooling, generated config, or `devctl.yaml`.

## Loading and Validation

Validate before starting runtime components:

- required values and secret presence;
- enums, log levels, and feature flags affecting wiring;
- durations, timeouts, URLs, and addresses;
- grouped or cross-field invariants.

Use `github.com/devctllabs/go-libs/config` for source composition. Before implementing loading, read
`go doc -all github.com/devctllabs/go-libs/config` and its `ExampleChain`; the package documentation
owns loader precedence, tags, optional inputs, typed overrides, partial updates, and custom-source
semantics.

Keep `internal/deps/config.go` as the application composition point. Build the loader chain there in
increasing precedence, adapt application-owned typed overrides with `config.Typed`, load into a new
config value, validate it, and register the validated value through `go-libs/di`.

Executable leaves pass presence-aware, scenario-specific override values rather than a loaded
config or config-library loaders. Define their small `TypedLoader` adapters in
`internal/deps/config.go`; each scenario constructor instantiates only its applicable loaders and
passes them to `provideConfig(ctx, loaders...)`. Pointer fields preserve explicit `false`, `0`,
empty string, and nil-capable values. Share only genuinely common overrides.

Every scenario constructor registers all providers, then resolves `*appconfig.Config` before any
runtime resource. This makes invalid startup input fail before clients, servers, or workers are
created.

## Constructor Configuration

Keep runtime loading separate from constructor options. Pass cohesive runtime values through a
small typed config:

```go
func NewServer(logger *zap.Logger, handler http.Handler, cfg ServerConfig) (*Server, error)
```

Use generated config directly when already shaped for the consumer. Add handwritten config only
for derived values, grouped sub-configs, cross-field validation, or compatibility during generator
evolution. Keep configuration immutable after construction by default.

## Secrets and Logging

Log safe presence or redacted source metadata:

```go
logger.Info("external client configured", zap.Bool("api_key_set", cfg.APIKey != ""))
```

Keep tokens, passwords, authorization headers, cookies, API keys, private keys, credentialed DSNs,
and sensitive bodies out of logs and errors. For DSNs, record only safe scheme/host/database fields.

## Reload

Add reload only for an existing mechanism or explicit requirement. Define ownership, concurrency,
validation, rollback-to-last-good behavior, and observability before enabling it.

## Testing

Test precedence, required fields, invalid enum/duration/address values, derived config, feature flags
that change wiring, and redaction. Cover absent CLI overrides and explicit zero values, including
`false`, `0`, and the empty string. Prove invalid config fails before runtime components start and
that each scenario applies only its own overrides. Test reload concurrency and rollback only when
reload exists. Follow `testing-strategy.md`.

## Review Checklist

- Is config loaded once through the composition root?
- Is established precedence preserved and startup validation complete?
- Are CLI values represented as scenario-specific overrides with explicit presence?
- Do constructors receive typed values without environment reads?
- Are secrets absent from logs and errors?
