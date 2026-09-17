# Configuration, composition, and operations

Runtime code translates validated configuration into an owned graph of concrete resources and
typed scenario roots. Business packages receive capabilities and values; they do not resolve
dependencies, install process globals, or own process shutdown.

## Configuration and secrets

For a new application, load generated configuration through
`github.com/devctllabs/go-libs/config` in `internal/deps/config.go`. Inspect the selected module API
and generated config before adding wrappers. Handwritten config adds only application grouping,
derived values, or validation that generated types do not express.

Define source precedence once and preserve presence. Defaults are lowest priority, followed by the
project's configured file/dotenv/environment sources and then explicitly supplied CLI overrides.
An explicit `false`, zero, or empty string must survive; represent optional overrides with pointers
or another presence-aware type. Required runtime validation happens after sources merge and before
any dependent resource is resolved.

Pass cohesive constructor values in typed config. Keep secrets in dedicated fields and redact them
from config dumps, logs, errors, traces, metrics, and protocol responses. Test precedence, explicit
zero values, invalid config before resource acquisition, and redaction.

Reload is a product/runtime capability, not a default. When required, define which fields are
reloadable, validate a complete candidate, swap it atomically, and retain the previous working value
on failure. Resources whose construction changes require an explicit restart or owned replacement
protocol; config mutation alone does not rewire the graph.

## DI graph and resources

For new applications, use `github.com/devctllabs/go-libs/di` in `internal/deps`. Keep the container
private. Give each present dependency family one snake_case file with one private provider entrypoint,
such as `provideRepositories`, `provideClients`, `provideServices`, and `provideServers`. Register
concrete components individually rather than layer bundles.

Register the complete selected graph before resolving roots. Providers resolve their dependencies
synchronously through the supplied resolver, not a captured root container. Use ordinary providers
for values and explicit resource providers for acquired resources; a `Close` method alone does not
transfer cleanup ownership.

Scenario constructors such as `NewAPI`, `NewWorker`, or one small `New` choose provider groups
explicitly. Eagerly resolve and cache only the scenario's callable roots, then expose typed getters.
Use named dependency types only when several instances of the same Go type are present and their
roles matter. Multi-binary repositories may share private provider helpers while keeping each
binary's graph and roots explicit.

Constructors either return a usable resource or release every partial acquisition they still own.
After a resource is returned to the graph, graph shutdown owns it. Registration and eager-resolution
failures use one rollback path with a fresh bounded cleanup context independent of startup
cancellation, preserving both construction and cleanup errors with `errors.Join`.

```go
func New(ctx context.Context) (_ *Container, err error) {
    c := &Container{di: di.New()}
    defer func() {
        if err != nil {
            cleanupErr := lifecycle.Shutdown(ctx, 5*time.Second, c.Shutdown)
            err = errors.Join(err, cleanupErr)
        }
    }()

    for _, provide := range []func(context.Context) error{
        c.provideConfig,
        c.provideRepositories,
        c.provideServices,
    } {
        if err := provide(ctx); err != nil {
            return nil, err
        }
    }
    c.orders, err = di.Resolve[*order.Service](c.di)
    if err != nil {
        return nil, fmt.Errorf("resolve order service: %w", err)
    }
    return c, nil
}
```

Use a real graph test with observable resources to prove provider selection, eager roots, rollback,
cleanup order, optional roots, and joined failures. Do not mock the DI container.

## Lifecycle and concurrency

Executable leaves own process signals and task execution. For new applications, use
`github.com/devctllabs/go-libs/lifecycle` after inspecting its selected API. Long-running commands
pass named tasks and the graph's shutdown callback to `Run`; one-shot commands complete their
operation and invoke bounded `Shutdown` without manufacturing a long-running task.

HTTP servers, gRPC servers, consumers, health servers, and debug servers are resources owned by the
graph and tasks selected by the executable scenario. Stop intake before closing dependencies.
Cronjobs remain synchronous one-shot operations unless they genuinely own concurrent work.

Propagate caller cancellation through blocking operations. Every goroutine has a cancellation
source, error destination, and join owner. Use `errgroup` or the established equivalent when sibling
tasks share a lifetime; avoid detached background work. A timeout belongs to the boundary that can
act on expiry: protocol clients own network timeouts, operations own business deadlines, and
shutdown owns its bounded cleanup deadline.

Test cancellation, sibling failure, shutdown order, cleanup deadlines, and goroutine results after
synchronization in the test goroutine.

## Logging and telemetry

Construct one application logger in composition, pass named `*zap.Logger` instances, and keep
structured fields bounded. Log a returned operation error once at its highest outcome boundary;
lower layers wrap and classify it. Exclude credentials, secrets, raw authorization headers,
unapproved PII, request bodies, and raw external payloads. Test meaningful structured fields with
an observer rather than full log snapshots.

Use `github.com/devctllabs/go-libs/telemetry` for the instance-owned OpenTelemetry runtime when
telemetry is enabled. Pass its tracer provider, meter provider, and propagator explicitly to
transport and client instrumentation. Register flush/shutdown with the graph. Business and domain
contracts do not carry telemetry types.

Transport owns request/RPC/message spans and clients propagate them outward. Add service/usecase
decorators only when an operation span or metric adds diagnostic value beyond transport telemetry.
Use stable low-cardinality attributes such as operation, route template, RPC method, consumer, status,
and error category; exclude raw paths, user IDs, emails, order IDs, tokens, and request IDs.

Avoid parallel owners for the same signal. One outer HTTP/gRPC instrumentation layer owns standard
server spans and RED metrics; validators, generated wrappers, and business decorators may enrich
that context without duplicating it. Test tracing and metrics with real SDK providers/readers rather
than mocks of official OpenTelemetry interfaces.

## Health and debug

Liveness answers whether the process is responsive and should remain cheap and process-local.
Readiness answers whether the instance can accept work and may include only dependencies whose
failure prevents useful service. Telemetry exporter connectivity is operational state, not
application readiness.

Use the selected `go-libs/health*` modules for transport-neutral probes and protocol exposure.
Create optional management servers as config-gated resources, eagerly resolve them only when
enabled, expose typed optional roots, and start them as lifecycle tasks. Startup probing may reuse
the real liveness endpoint with deployment-level startup timing instead of inventing application
startup state.

Use `debugserver` for a standalone profiling surface when required. Keep it disabled by default,
bound to a private/loopback address unless the platform provides authenticated access, outside the
public application router, and absent from public Service/Ingress resources. Do not expose
`http.DefaultServeMux`. The application explicitly owns any process-global mutex or block profiling
rates and their runtime cost.

Test probe aggregation and readiness transitions, config-gated management/debug roots, lifecycle
task selection, and exporter/server cleanup.
