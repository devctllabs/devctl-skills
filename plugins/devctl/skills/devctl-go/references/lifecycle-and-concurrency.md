# Lifecycle and Concurrency

## Contents

- Context Ownership
- Goroutine Ownership
- Runtime Coordination
- Shutdown Hooks
- Testing
- Review Checklist

## Context Ownership

Use `context.Context` as the first parameter for blocking, I/O, waiting, or dependency calls. Pass it
through call chains and keep it request/run-scoped rather than storing it in structs.

Use context for cancellation, deadlines, tracing, and technical metadata. Pass actor, tenant,
idempotency key, and business inputs explicitly when they affect business behavior.

Let the owning caller set timeouts: transport for requests, clients for configured outbound work,
repositories for driver operations, and runtime for shutdown. Make semantic service/usecase
timeouts explicit and configurable.

## Goroutine Ownership

Every goroutine has one owner that provides cancellation, observes relevant errors, and waits for or
stops the work before its scope ends. For an application runtime with multiple long-lived tasks and
one common dependency shutdown, prefer `github.com/devctllabs/go-libs/lifecycle`. Inspect the
selected module version with `go doc -all github.com/devctllabs/go-libs/lifecycle` before wiring it.
Use `errgroup` directly for smaller scoped concurrency, such as bounded parallel usecase work, when
there is no application-wide shutdown to coordinate. Prefer direct sequential calls for ordinary
one-shot work.

Cronjob `Run(ctx)` is synchronous by default. A job that starts goroutines waits for or stops them
before returning.

The following pattern has no visible owner and loses caller cancellation:

```go
go func() {
    _ = worker.Run(context.Background())
}()
```

## Runtime Coordination

- Create a root signal-aware context in the process entrypoint.
- Let a lifecycle-heavy command pass named long-lived tasks and the container shutdown method to
  `lifecycle.Run`.
- Let providers register cleanup for resources they construct.
- Let `Container.Shutdown(ctx)` own cleanup order.
- Give `lifecycle.Run` a positive shutdown timeout; it creates the fresh shutdown context and joins
  task, parent, and shutdown failures.

Pass a consumer's `Run(ctx)` method directly as a task. Adapt a server method without a context
parameter through an explicit closure; its provider-owned cleanup must make the method return:

```go
tasks := []lifecycle.Task{
    {Name: "http", Run: func(context.Context) error { return runtime.httpServer.ListenAndServe() }},
    {Name: "events", Run: runtime.consumer.Run},
}
if runtime.healthEnabled {
    server := runtime.healthServer
    tasks = append(tasks, lifecycle.Task{
        Name: "health",
        Run:  func(context.Context) error { return server.ListenAndServe() },
    })
}
return lifecycle.Run(ctx, lifecycle.Config{
    ShutdownTimeout: runtime.shutdownTimeout,
    Shutdown:        runtime.shutdown.Shutdown,
    Tasks:           tasks,
})
```

Do not install signals, load config, construct DI, or own logging inside the lifecycle library.
Complete required one-shot initialization synchronously before starting lifecycle tasks. Run a
cronjob synchronously rather than wrapping it as a lifecycle task; its command still owns bounded
container shutdown after the job returns.

## Shutdown Hooks

For new composition roots, read the selected `github.com/devctllabs/go-libs/di` package
documentation and delegate owned-resource lifecycle to it. Register cleanup in the same
`di.ProvideResource` call that constructs the resource; do not recreate shutdown mechanisms in
`internal/deps`.

```go
func (c *Container) provideHTTPServer() error {
    return di.ProvideResource(c.di,
        func(r di.Resolver) (*http.Server, error) {
            cfg, err := di.Resolve[*config.Config](r)
            if err != nil {
                return nil, err
            }
            handler, err := di.Resolve[http.Handler](r)
            if err != nil {
                return nil, err
            }
            return &http.Server{
                Addr:    fmt.Sprintf(":%d", cfg.HTTP.Port),
                Handler: handler,
            }, nil
        },
        func(ctx context.Context, server *http.Server) error {
            return server.Shutdown(ctx)
        },
    )
}
```

`internal/deps.Container.Shutdown` delegates directly to `di.Container.Shutdown`. The runtime passes
that method and its configured timeout to `lifecycle.Run`; build rollback remains owned by the
container constructor. For gRPC, adapt graceful stop and forced fallback inside the explicit
cleanup function.

## Testing

Test the command's task selection, including optional tasks, and its delegation to the lifecycle
boundary. The lifecycle library owns cancellation propagation, sibling cancellation, task waiting,
shutdown timeout, and joined task/shutdown errors; DI owns resource cleanup order. Do not duplicate
either library's semantic suite in application wiring tests. Use the race detector when configured
or when changed behavior is concurrency-sensitive. Follow `testing-strategy.md`.

## Review Checklist

- Does every goroutine have cancellation, error, and wait ownership?
- Are timeouts set by the owning boundary?
- Is cleanup registered explicitly by the provider that owns the resource?
- Are runtime roots stopped before their dependencies without assuming a sequential registration order?
- Do tests prove cancellation and shutdown failure behavior?
