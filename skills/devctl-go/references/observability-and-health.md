# Observability and Health

## Contents

- Ownership
- Logging
- Logger Usage
- Telemetry Bootstrap
- Metrics
- Tracing
- Health Checks
- Debug and Profiling
- Examples
- Testing
- Review Checklist

## Ownership

Observability is a runtime and boundary concern.

Default placement:

- transport middleware: request/RPC/message metrics, access logs, trace entry spans;
- client wrappers: outbound latency/errors and trace propagation;
- service/usecase decorators: operation-level metrics/tracing when useful;
- narrow service-owned interfaces only when audit or telemetry output is part of application
  behavior rather than diagnostic instrumentation;
- `internal/deps`: registers exporters, health endpoints, and explicit cleanup ownership;
- domain: no metrics/tracing/logging dependencies.

## Logging

Use `*zap.Logger` as the practical concrete logger dependency. Do not introduce a custom logger interface by default.

Prefer decorators or wrappers for cross-cutting operation instrumentation. When service behavior
must publish a business-significant audit event, inject a narrow capability such as `AuditSink`;
do not turn the concrete diagnostic logger into an application port.

Construct application loggers with `github.com/devctllabs/go-libs/log`. Before implementing the
provider, read `go doc -all github.com/devctllabs/go-libs/log`; that package owns the encoding,
output, stacktrace, global-logger, lifecycle, and testing policy. Do not recreate its factory in
`internal/platform/log` unless the application has additional platform behavior not expressible by
the shared package.

Logger provider shape:

```go
func (c *Container) provideLogger() error {
    return di.ProvideResource(c.di,
        func(r di.Resolver) (*zap.Logger, error) {
            cfg, err := di.Resolve[*config.Config](r)
            if err != nil {
                return nil, err
            }
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
            return logger, nil
        },
        func(_ context.Context, logger *zap.Logger) error {
            return logger.Sync()
        },
    )
}
```

DI responsibilities:

- create the application logger through `go-libs/log.New`;
- parse and validate log level;
- add global fields;
- register explicit `Sync()` cleanup ownership;
- handle output-specific `Sync()` errors at the application boundary;
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
- Log a returned operation error at most once, at the highest boundary that owns its final outcome:
  transport middleware, a consumer/job/CLI runner, or an outer service/usecase decorator. Lower
  layers add context and return; they do not log-and-return.
- Log business fields structurally with `zap.String`, `zap.Int`, `zap.Duration`, and similar fields.
- Do not log secrets, tokens, passwords, raw headers, or DSNs with passwords.
- Log PII only when there is an explicit product need and storage policy permits it.

Testing:

- Use `zap.NewNop()` for ordinary unit tests.
- Use `zaptest.NewLogger(t)` when logs should attach to `testing.T`.
- Use `zaptest/observer` when assertions on logs are required.

Interactions:

- Tracing can add trace/span IDs in transport middleware or a zap/OpenTelemetry adapter.
- With telemetry enabled, `go-libs/sqlitedb` (`otelsql`) and `go-libs/postgresdb` (`otelpgx`)
  record raw driver failures on database spans before repository classification. Do not add a
  duplicate repository span for that same driver call. Record mapping, codec, or other
  adapter-owned failures outside the instrumented call on an adapter span before returning the
  domain-classified chain. Multiple causal span events are not duplicate logs.
- Internal error chains may retain raw causes. Never serialize them to a protocol response, and
  apply the same secret/PII policy to error events and span status descriptions as to logs.
- Metrics can observe errors through middleware/decorators, not hidden logger side effects.
- CLI logs top-level startup/runtime/shutdown errors through the application logger after DI exists.

## Telemetry Bootstrap

Use `github.com/devctllabs/go-libs/telemetry` for the standard OpenTelemetry runtime. It owns an
instance-scoped tracer provider, meter provider, fixed W3C Trace Context plus Baggage propagator,
OTLP exporter selection, service resource construction, Go runtime metrics, flush, and shutdown.
It intentionally does not install global providers or a global propagator. Pass
`Runtime.TracerProvider()`, `Runtime.MeterProvider()`, and `Runtime.Propagator()` explicitly to
transport and client instrumentation.

Create one `*telemetry.Runtime` in `internal/deps` with the validated service name, version, and
deployment environment. Register `Runtime.Shutdown` as the resource cleanup. The disabled zero
config is a no-op; an enabled runtime uses standard OpenTelemetry environment variables and OTLP
push export. `OTEL_TRACES_EXPORTER` and `OTEL_METRICS_EXPORTER` may independently select `otlp` or
`none`. Do not add application-specific exporter registries or silently support console,
Prometheus, or multiple exporters through this bootstrap.

Application logs remain zap JSON on stderr; this bootstrap does not export OpenTelemetry Logs. At
the composition root, explicitly call `telemetry.SetGlobalLogger(logger)` when OpenTelemetry's own
diagnostics should flow through `logger.Named("opentelemetry")`. Add request correlation with
`telemetry.WithTraceContext(ctx, logger)` at the boundary that owns the request-scoped logger. This
logger bridge is the only intentional process-global effect and is not automatically restored.

Enabled metric export automatically registers Go runtime instruments. Collector connectivity or
an asynchronous export failure is operational telemetry state, not application readiness. Invalid
startup configuration returned by `telemetry.Open` still fails construction.

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

When operation-level metrics are useful, inject an official `metric.Meter` created from the
runtime's explicit provider. Create counters, histograms, and other instruments once in the
decorator constructor; do not look them up on every invocation and do not read the global meter
provider.

## Tracing

Tracing boundaries:

- transport starts or continues request/RPC/message spans;
- clients propagate trace context outward;
- service/usecase decorators can add operation spans when they improve diagnosis;
- repositories may add storage spans when the project already instruments DB calls or the query is important.

Do not pass tracing types into domain contracts.

When an operation span materially improves diagnosis beyond the transport span, inject an official
`trace.Tracer` created from the runtime's explicit provider into a service/usecase decorator. Keep
tracing out of the base business implementation and avoid adding operation spans mechanically to
every method.

For generated Echo/OpenAPI endpoints, install one outer HTTP server instrumentation layer. It owns
the server span, trace propagation, duration, request count, and status/error recording. Do not
start a second server span or duplicate RED metrics in the OpenAPI validator, generated wrapper, or
strict endpoint. Use the matched route template and a bounded operation identifier as labels or
span attributes; never use the raw path. If validation discovers `operationId` after the outer span
has started, handwritten validation middleware may enrich that active span rather than create a
new one. Generated code must not import OpenTelemetry packages.

## Health Checks

Readiness and liveness are different:

| Check | Purpose | Dependencies |
| --- | --- | --- |
| liveness | process is not wedged | should avoid DB/external service dependency |
| readiness | instance can receive traffic | may check critical local dependencies |

Readiness may check DB, broker, cache, or required external dependency when failure means the instance cannot serve traffic.

Avoid expensive health checks and checks that overload dependencies during incidents.

Use `github.com/devctllabs/go-libs/health` for transport-neutral checks and
`github.com/devctllabs/go-libs/healthserver` for the standard Echo management server. Inspect the
selected module APIs with `go doc -all` before wiring them. `health.Probes` has no startup marker:
readiness evaluates registered checks immediately. Before the management listener is available, a
refused connection is a valid startup-probe failure; once `/livez` responds, it reports listener
liveness. Point both Kubernetes startup and liveness probes at `/livez`; their different behavior
comes from Kubernetes probe policy, not separate HTTP semantics. Do not add a `/startupz` alias, a
partial management server, or application startup state.

Keep the standalone management server optional. Application config owns its enabled flag and
address; reusable libraries do not read environment variables. Register it as an owned resource
with `di.ProvideResource` alongside its cleanup:

```go
func (c *Container) provideHealthServer() error {
    return di.ProvideResource(c.di,
        func(r di.Resolver) (*healthserver.Server, error) {
            cfg, err := di.Resolve[*config.Config](r)
            if err != nil {
                return nil, err
            }
            probes, err := di.Resolve[*health.Probes](r)
            if err != nil {
                return nil, err
            }
            return healthserver.NewServer(probes, healthserver.WithAddress(cfg.Health.Address))
        },
        func(ctx context.Context, server *healthserver.Server) error {
            return server.Shutdown(ctx)
        },
    )
}
```

Register the provider before the container's first resolution. Resolve and cache the server root
only when validated config enables it, then expose `HealthServer() (*healthserver.Server, bool)`.
The command appends that root as one `lifecycle.Task`; it never calls protocol-specific shutdown
outside the common container cleanup.

Construction of a required resource may perform necessary bounded, cancellable I/O before its
provider returns. Keep one-shot initialization synchronous and explicit; do not create a generic
initializer registry until the application has a separate repeated orchestration problem.

## Debug and Profiling

Use `github.com/devctllabs/go-libs/debugserver` for the standard standalone pprof server. Inspect
the version selected by `go.mod` and `go.work`, then run
`go doc -all github.com/devctllabs/go-libs/debugserver` before wiring it. Keep debug/profiling
wiring near runtime setup, not in business packages or the application's public HTTP router.

Debug endpoints must be config-gated and disabled by default. Application config owns both
`debug.enabled` and `debug.address`; the library does not read environment variables. Keep the
default address on loopback. Do not create a Kubernetes Service or Ingress for the debug listener;
use an authenticated operational path such as `kubectl port-forward` when access is needed.

Register the server as an owned resource with `di.ProvideResource`:

```go
func (c *Container) provideDebugServer() error {
    return di.ProvideResource(c.di,
        func(r di.Resolver) (*debugserver.Server, error) {
            cfg, err := di.Resolve[*config.Config](r)
            if err != nil {
                return nil, err
            }
            return debugserver.NewServer(debugserver.WithAddress(cfg.Debug.Address))
        },
        func(ctx context.Context, server *debugserver.Server) error {
            return server.Shutdown(ctx)
        },
    )
}
```

Register this provider before the container's first resolution. Resolve and cache the server root
only when validated config enables it, then expose `DebugServer() (*debugserver.Server, bool)`.
API and long-lived consumer commands append the enabled root as a lifecycle task:

```go
if server, enabled := container.DebugServer(); enabled {
    tasks = append(tasks, lifecycle.Task{
        Name: "debug",
        Run:  func(context.Context) error { return server.ListenAndServe() },
    })
}
```

Do not start the debug server for cronjobs. Common container cleanup owns shutdown; commands do not
call `Shutdown` directly.

The library intentionally does not call `runtime.SetMutexProfileFraction` or
`runtime.SetBlockProfileRate`. Those settings are process-global, so an application that enables
mutex or block sampling must own the values and their runtime cost explicitly.

The library serves a private `http.ServeMux`, but its required `net/http/pprof` import also
registers pprof handlers on `http.DefaultServeMux` during package initialization. Never expose
`http.DefaultServeMux` publicly, even when the standalone debug server is disabled.

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

## Testing

Use `zaptest/observer` for meaningful structured fields. Test metric label bounds, trace-context
propagation, health aggregation, readiness transitions, exporter flush/shutdown, and config-gated
debug exposure where owned. Test tracing decorators with a real SDK tracer provider plus
`tracetest.SpanRecorder`, and metric decorators with a real SDK meter provider plus
`sdkmetric.ManualReader`; do not mock official OpenTelemetry interfaces. Prefer stable field
assertions over full log snapshots. Follow `testing-strategy.md`.

## Review Checklist

- Is logging JSON to stderr with configurable level and stacktrace?
- Are component loggers named in DI instead of recreated ad hoc?
- Is each returned operation error logged at most once at its highest outcome boundary?
- Are secrets, tokens, passwords, raw headers, and unapproved PII kept out of logs?
- Are raw adapter failures recorded before classification without leaking into protocol responses?
- Are metrics labels bounded and stable?
- Are traces created at transport/client/service boundaries, not domain?
- Do generated HTTP endpoints have exactly one outer server span and one owner for RED metrics?
- Does readiness check only critical dependencies?
- Is liveness cheap and mostly process-local?
- Is the optional management server config-owned, DI-managed, and started as a lifecycle task?
- Does startup probing reuse `/livez` without a duplicated endpoint or startup marker?
- Are debug/pprof endpoints gated and non-public by default?
- Are exporters and their cleanup ownership wired in `internal/deps`?
