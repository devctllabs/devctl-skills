# Observability and Health

## Contents

- Ownership
- Logging
- Logger Usage
- Metrics
- Tracing
- Health Checks
- Debug and Profiling
- Examples
- Review Checklist

## Ownership

Observability is a runtime and boundary concern.

Default placement:

- transport middleware: request/RPC/message metrics, access logs, trace entry spans;
- client wrappers: outbound latency/errors and trace propagation;
- service/usecase decorators: operation-level metrics/tracing when useful;
- `internal/deps`: registers exporters, health endpoints, and shutdown hooks;
- domain: no metrics/tracing/logging dependencies.

## Logging

Use `*zap.Logger` as the practical concrete logger dependency. Do not introduce a custom logger interface by default.

`internal/platform/log` is the technical package for logger construction. It has no domain knowledge and is not public to other Go modules; exported names are still valid internal APIs because the package is under `internal/`.

Default factory:

```go
package log

func New(level zapcore.Level, stacktrace bool) *zap.Logger {
    encoderCfg := zap.NewProductionEncoderConfig()
    encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder

    core := zapcore.NewCore(
        zapcore.NewJSONEncoder(encoderCfg),
        zapcore.Lock(os.Stderr),
        level,
    )

    stacktraceLevel := zapcore.FatalLevel + 1
    if stacktrace {
        stacktraceLevel = zapcore.ErrorLevel
    }

    return zap.New(core, zap.AddStacktrace(stacktraceLevel))
}
```

Logging policy:

- Format is always JSON. Do not add `LOG_FORMAT=plain`.
- Configurable values: level and stacktrace flag.
- Output is `stderr`.
- Do not use global zap loggers: `zap.L()`, `zap.S()`, or `zap.ReplaceGlobals`.

Logger provider shape:

```go
func (c *Container) provideLogger() {
    do.Provide(c.i, func(i *do.Injector) (*zap.Logger, error) {
        cfg := c.Config()
        lvl := zapcore.InfoLevel
        if err := lvl.Set(cfg.Log.Level); err != nil {
            return nil, fmt.Errorf("parse log level %q: %w", cfg.Log.Level, err)
        }

        logger := applog.New(lvl, cfg.Log.WithStacktrace).
            With(
                zap.String("service", cfg.Service.Name),
                zap.String("env", cfg.Env),
                zap.String("build", cfg.Build.Version),
            )

        c.addShutdown("logger", func(ctx context.Context) error {
            return logger.Sync()
        })
        return logger, nil
    })
}
```

DI responsibilities:

- create bootstrap logger inside `Container`;
- create application logger through `internal/platform/log.New`;
- parse and validate log level;
- add global fields;
- register `Sync()` shutdown hook;
- handle benign OS `Sync()` errors inside `internal/platform/log` if necessary;
- create component loggers with `.Named(...)`.

## Logger Usage

Rules:

- `cmd` gets logger through `c.Logger()`.
- Services/usecases/clients/transports receive logger through constructors.
- If a constructor receives `*zap.Logger`, place it before other dependencies, after optional `context.Context`: `New(ctx?, logger?, deps..., opts...)`.
- `Named(...)` is for static component identity and should be set in `internal/deps`.
- Global fields such as `service`, `env`, and `build` are added once by the logger provider.
- Use `.With(...)` for dynamic request/operation/user context.
- Do not store request-scoped logger values in long-lived structs.
- Log errors with `zap.Error(err)`, not formatted strings.
- Log business fields structurally with `zap.String`, `zap.Int`, `zap.Duration`, and similar fields.
- Do not log secrets, tokens, passwords, raw headers, or DSNs with passwords.
- Log PII only when there is an explicit product need and storage policy permits it.

Testing:

- Use `zap.NewNop()` for ordinary unit tests.
- Use `zaptest.NewLogger(t)` when logs should attach to `testing.T`.
- Use `zaptest/observer` when assertions on logs are required.

Interactions:

- Tracing can add trace/span IDs in transport middleware or a zap/OpenTelemetry adapter.
- Metrics can observe errors through middleware/decorators, not hidden logger side effects.
- CLI logs top-level startup/runtime/shutdown errors through the application logger after DI exists.

## Metrics

Use stable, low-cardinality labels.

Good labels:

```text
method
route_template
grpc_service
grpc_method
consumer
operation
status_code
error_category
```

Avoid labels with unbounded cardinality:

```text
user_id
email
order_id
raw_path
request_id
token
```

Metrics should observe behavior. Do not hide business decisions inside metric side effects.

## Tracing

Tracing boundaries:

- transport starts or continues request/RPC/message spans;
- clients propagate trace context outward;
- service/usecase decorators can add operation spans when they improve diagnosis;
- repositories may add storage spans when the project already instruments DB calls or the query is important.

Do not pass tracing types into domain contracts.

## Health Checks

Readiness and liveness are different:

| Check | Purpose | Dependencies |
| --- | --- | --- |
| liveness | process is not wedged | should avoid DB/external service dependency |
| readiness | instance can receive traffic | may check critical local dependencies |

Readiness may check DB, broker, cache, or required external dependency when failure means the instance cannot serve traffic.

Avoid expensive health checks and checks that overload dependencies during incidents.

## Debug and Profiling

Debug endpoints, pprof, and diagnostics must be config-gated and non-public by default.

Place debug/profiling wiring near runtime/transport setup, not in business packages.

## Examples

Metric label example:

```go
requestsTotal.WithLabelValues("POST", "/orders/{id}/approve", "403").Inc()
```

Avoid:

```go
requestsTotal.WithLabelValues("POST", "/orders/ord_123/approve", "user@example.com").Inc()
```

Operation decorator shape:

```go
func (s *metricsService) Approve(ctx context.Context, actor common.Actor, cmd domorder.ApproveOrderCommand) error {
    start := time.Now()
    err := s.next.Approve(ctx, actor, cmd)
    s.observe("approve_order", time.Since(start), err)
    return err
}
```

## Review Checklist

- Is logging JSON to stderr with configurable level and stacktrace?
- Are component loggers named in DI instead of recreated ad hoc?
- Are secrets, tokens, passwords, raw headers, and unapproved PII kept out of logs?
- Are metrics labels bounded and stable?
- Are traces created at transport/client/service boundaries, not domain?
- Does readiness check only critical dependencies?
- Is liveness cheap and mostly process-local?
- Are debug/pprof endpoints gated and non-public by default?
- Are exporters and shutdown hooks wired in `internal/deps`?
