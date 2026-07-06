# Runtime and Wiring

## Contents

- Runtime Boundaries
- Shared Runtime Rules
- Context and Concurrency
- CLI Model
- `main.go`
- `api` Subcommand
- `consumer` Subcommand
- `cronjob` Subcommand
- `internal/deps` Role
- Container Core
- Providers
- Configuration and Secrets
- Multi-Binary Wiring
- Dependency Getters
- Related References

## Runtime Boundaries

`cmd/` is the service entrypoint layer. It contains CLI wiring and runtime lifecycle only:

- create root context;
- initialize the root `urfave/cli` command and subcommands;
- create DI container inside the selected subcommand;
- get dependencies through typed container getters;
- run the chosen scenario;
- handle graceful shutdown.

`cmd/` must not import service, repository, transport, client implementations, consumers, or jobs directly. It imports `internal/deps` and command-local packages only.

Default commands:

```text
<app_name> api
<app_name> consumer <consumer-name>
<app_name> cronjob <job>
```

Multiple binaries are allowed only when scenarios have materially different lifecycle, runtime dependencies, or deploy units. The same rules apply inside each binary.

## Shared Runtime Rules

DI:

- Create the container at the start of each subcommand: `c, err := deps.New()`.
- Use typed getters such as `c.Logger()`, `c.Config()`, `c.HTTPServer()`, `c.GRPCServer()`, `c.GetConsumer(name)`, and `c.GetCronJob(name)`.
- Do not call `do.Invoke`, `do.InvokeNamed`, `deps.Must`, or `deps.Require` from `cmd`.
- `deps.Must` and `deps.Require` remain public within `internal/deps` for DI subpackages and generic resolution, not as the `cmd` API.

Shutdown:

- `c.Shutdown(ctx)` returns `error`.
- Join run errors and shutdown errors with `errors.Join`.
- API/consumer result is `errors.Join(runErr, shutdownErr)`.
- Cronjob result is `errors.Join(job.Run(ctx), shutdownErr)`.
- A non-nil final error should produce a non-zero exit code.

Errors:

- Usage/help errors before container creation may use normal `urfave/cli` formatting.
- Startup/runtime/shutdown errors after container creation are logged by the application logger.
- Bootstrap failures before application logger exists are logged inside `deps.New()` by the bootstrap logger.
- Subcommands return errors directly and let `urfave/cli` determine exit behavior.

## Context and Concurrency

Use `context.Context` as the first argument for operations that can block, do I/O, wait, or call dependencies. Pass contexts through call chains; do not store them in structs.

Use context for cancellation, deadlines, trace/request propagation, and request-scoped technical metadata. Do not use context as the only carrier for business-critical input such as actor, tenant, idempotency key, or operation parameters.

Timeout policy belongs to the caller or runtime boundary:

- transport sets request-level deadlines when needed;
- clients use configured outbound timeouts;
- repositories honor context and driver timeouts;
- services/usecases do not invent arbitrary infrastructure timeouts without config.

When a service/usecase needs a semantic timeout, make it explicit and configurable.

Every goroutine must have an owner responsible for cancellation and error handling. The owner passes a cancelable context, collects errors when they matter, stops goroutines during shutdown, avoids leaks after request/job completion, and documents intentional best-effort fire-and-forget behavior.

Use `errgroup` for server-like or request-like concurrent work where failure of one task should cancel siblings:

- API command running HTTP and gRPC servers;
- long-running consumer command;
- usecase that performs bounded parallel sub-operations;
- worker that owns several loops.

Do not use `errgroup` for simple sequential operations.

Cronjob `Run(ctx)` should be synchronous by default. If a job starts internal goroutines, it must wait for them or stop them before returning.

Shutdown rules:

- runtime commands create root signal context;
- providers register shutdown hooks for resources they own;
- `Container.Shutdown(ctx)` owns shutdown ordering;
- shutdown contexts may use a new timeout context after root context is canceled;
- shutdown errors should be joined with run errors.

Avoid:

```go
go func() {
    _ = worker.Run(context.Background())
}()
```

This goroutine ignores caller cancellation and has no visible owner.

## CLI Model

Default structure:

```text
cmd/<app_name>/
  main.go
  internal/
    api.go
    consumer.go
    cronjob.go
```

File roles:

- `main.go`: create signal-aware context, create the root `urfave/cli/v3` command, register subcommands.
- `internal/api.go`: start HTTP/gRPC servers, coordinate errgroup, graceful shutdown.
- `internal/consumer.go`: run one named logical consumer/subscription.
- `internal/cronjob.go`: run one named one-shot background job.

No global logger, config singleton, or package-level runtime state should be used.

Use `github.com/urfave/cli/v3` as the default CLI framework for Go service subcommands unless an existing project has a strong active convention. Prefer the v3 root-command style: a root `*cli.Command` owns metadata and `Commands`, and each leaf command returns `*cli.Command`.

Command factory rules:

- Keep command factories in `cmd/<app_name>/internal` or an equivalent command-local package.
- Use `func NewCmdAPI() *cli.Command`, `func NewCmdConsumer() *cli.Command`, and `func NewCmdCronJob() *cli.Command` for standard runtime scenarios; use `newCmdX()` for private grouped commands.
- For commands with flags, use a small command struct plus opts struct: `type consumerCmd struct { opts consumerOpts }`.
- Bind flag values with `Destination: &cmd.opts.<field>` and use `Required`, `Validator`, `Aliases`, and `UseShortOptionHandling` when they improve CLI correctness.
- Use `Sources: cli.EnvVars(...)` only for CLI-level overrides. Application config belongs in `internal/config` and is loaded through `internal/deps`.
- `Action(ctx context.Context, command *cli.Command) error` is the boundary for reading CLI args and flags. After that, create the container, get typed dependencies, run the scenario, and return the final error.
- Keep simple command flows directly in `Action`. Move runtime/lifecycle coordination into a private receiver method such as `cmd.run(...)` only when `Action` becomes dominated by errgroup, shutdown timeout, or repeated orchestration code.
- Do not put repositories, clients, transports, services, or usecases directly in command structs. Command structs may hold parsed CLI options only.

## `main.go`

Keep `main.go` minimal:

```go
func main() {
    ctx, cancel := signal.NotifyContext(
        context.Background(),
        syscall.SIGINT,
        syscall.SIGTERM,
    )
    defer cancel()

    root := &cli.Command{
        Name:    "<app_name>",
        Usage:   "Run <app_name> service and utilities",
        Version: version,
        Commands: []*cli.Command{
            cmdinternal.NewCmdAPI(),
            cmdinternal.NewCmdConsumer(),
            cmdinternal.NewCmdCronJob(),
        },
    }

    if err := root.Run(ctx, os.Args); err != nil {
        os.Exit(1)
    }
}
```

`Version` is optional. `main.go` does not read config, create DI, or create a logger. Subcommands do that so each scenario initializes only the dependencies it needs.

## `api` Subcommand

The `api` command starts HTTP and gRPC servers concurrently and shuts down on signal or server error.

Responsibilities:

- create container;
- get logger and servers through typed getters;
- run servers with `errgroup`;
- wait for signal/cancel or worker error;
- call `c.Shutdown(stopCtx)`;
- wait for server goroutines;
- return `errors.Join(runErr, shutdownErr)`.

Skeleton:

```go
func NewCmdAPI() *cli.Command {
    return &cli.Command{
        Name:  "api",
        Usage: "Run HTTP and gRPC servers",
        Action: func(ctx context.Context, _ *cli.Command) error {
            c, err := deps.New()
            if err != nil {
                return err
            }

            logger := c.Logger()
            httpSrv := c.HTTPServer()
            grpcSrv := c.GRPCServer()

            g, shutdownCtx := errgroup.WithContext(ctx)

            g.Go(func() error {
                if err := httpSrv.Serve(); err != nil {
                    if isServerClosedError(err) {
                        return nil
                    }
                    return fmt.Errorf("http.Serve: %w", err)
                }
                return nil
            })

            g.Go(func() error {
                if err := grpcSrv.Serve(nil); err != nil {
                    if isServerClosedError(err) {
                        return nil
                    }
                    return fmt.Errorf("grpc.Serve: %w", err)
                }
                return nil
            })

            runErrCh := make(chan error, 1)
            go func() { runErrCh <- g.Wait() }()

            var runErr error
            runErrReady := false
            select {
            case <-shutdownCtx.Done():
            case runErr = <-runErrCh:
                runErrReady = true
            }

            stopCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
            defer cancel()

            shutdownErr := c.Shutdown(stopCtx)
            if !runErrReady {
                runErr = <-runErrCh
            }

            err = errors.Join(runErr, shutdownErr)
            if err != nil {
                logger.Error("command failed", zap.Error(err))
            }
            return err
        },
    }
}
```

Do not call `httpSrv.Shutdown` or `grpcSrv.GracefulStop` directly in the API command action. Server providers register shutdown hooks, and `c.Shutdown(ctx)` owns shutdown order.

Provider example:

```go
func (c *Container) provideHTTPServer() {
    do.Provide(c.i, func(i *do.Injector) (*http.Server, error) {
        cfg := c.Config()
        srv := &http.Server{
            Addr:    fmt.Sprintf(":%d", cfg.HTTP.Port),
            Handler: c.httpHandler(),
        }
        c.addShutdown("http_server", func(ctx context.Context) error {
            return srv.Shutdown(ctx)
        })
        return srv, nil
    })
}
```

For gRPC, the shutdown hook should call `GracefulStop()` and fall back to `Stop()` when `ctx` expires.

Shutdown order should be LIFO:

1. transports;
2. storage and network clients;
3. tracing, metrics, logger.

## `consumer` Subcommand

`consumer <consumer-name>` runs one logical consumer/subscription. The CLI name does not need to equal a physical Kafka topic.

Use this shape for command-specific flags and positional args:

```go
type consumerCmd struct {
    opts consumerOpts
}

type consumerOpts struct {
    shutdownTimeout time.Duration
}

func NewCmdConsumer() *cli.Command {
    cmd := &consumerCmd{
        opts: consumerOpts{shutdownTimeout: 30 * time.Second},
    }

    return &cli.Command{
        Name:                   "consumer",
        Usage:                  "Run one named consumer",
        ArgsUsage:              "<consumer-name>",
        UseShortOptionHandling: true,
        Flags: []cli.Flag{
            &cli.DurationFlag{
                Name:        "shutdown-timeout",
                Usage:       "graceful shutdown timeout",
                Destination: &cmd.opts.shutdownTimeout,
            },
        },
        Action: cmd.Action,
    }
}

func (cmd *consumerCmd) Action(ctx context.Context, command *cli.Command) error {
    name := command.Args().First()
    if name == "" {
        return cli.Exit("consumer name is required", 2)
    }

    c, err := deps.New()
    if err != nil {
        return err
    }

    cons, err := c.GetConsumer(name)
    if err != nil {
        return err
    }

    return cmd.run(ctx, c, cons)
}
```

For short commands, keep the full flow in `Action`. For longer runtime commands, a private receiver helper such as `cmd.run(...)` can own errgroup coordination, read `cmd.opts.shutdownTimeout`, call `c.Shutdown(stopCtx)`, and return `errors.Join(runErr, shutdownErr)`.

Responsibilities:

- create container;
- get logger and consumer through typed getters;
- run `consumer.Consume(ctx)` in an `errgroup`;
- stop everything on signal or consumer error;
- call `c.Shutdown(stopCtx)`;
- return `errors.Join(runErr, shutdownErr)`.

Named registration:

```go
func (c *Container) provideConsumers() {
    do.ProvideNamed(c.i, "impression-recorder", func(i *do.Injector) (Consumer, error) {
        cfg := c.Config()
        cons := NewImpressionRecorderConsumer(
            c.KafkaReader(cfg.Kafka.Consumers.ImpressionRecorder.Topics),
            c.services().Impressions,
        )
        c.addShutdown("consumer:impression-recorder", func(ctx context.Context) error {
            return cons.Close(ctx)
        })
        return cons, nil
    })
}
```

Getter:

```go
func (c *Container) GetConsumer(name string) (Consumer, error) {
    cons, err := do.InvokeNamed[Consumer](c.i, name)
    if err != nil {
        return nil, fmt.Errorf("unknown consumer %q: %w", name, err)
    }
    return cons, nil
}
```

Consumers use `errgroup` because they are long-running server-like components that can fail asynchronously.

## `cronjob` Subcommand

`cronjob <job>` runs one named one-shot task and exits.

Responsibilities:

- create container;
- get logger and job through typed getters;
- run `job.Run(ctx)` directly;
- call `c.Shutdown(stopCtx)` regardless of run result;
- return `errors.Join(runErr, shutdownErr)`;
- log and wrap job failure with the job name.

Contract:

```go
type CronJob interface {
    Run(ctx context.Context) error
}
```

The job must honor cancellation. If it starts internal goroutines, it must stop them inside `Run(ctx)`.

Named registration:

```go
func (c *Container) provideCronJobs() {
    do.ProvideNamed(c.i, "rebuild-cache", func(i *do.Injector) (CronJob, error) {
        job := NewRebuildCacheJob()
        c.addShutdown("cronjob:rebuild-cache", func(ctx context.Context) error {
            return job.Close(ctx)
        })
        return job, nil
    })
}
```

Shutdown hooks are optional for jobs that own no extra resources beyond shared DB/cache/client dependencies.

Getter:

```go
func (c *Container) GetCronJob(name string) (CronJob, error) {
    job, err := do.InvokeNamed[CronJob](c.i, name)
    if err != nil {
        return nil, fmt.Errorf("unknown cronjob %q: %w", name, err)
    }
    return job, nil
}
```

Cronjobs do not need `errgroup` by default because `Run(ctx)` is the complete synchronous operation. The task should not fail outside the control of the caller.

## `internal/deps` Role

`internal/deps` owns construction and lifecycle for:

- configuration;
- logging;
- tracing and metrics;
- database/cache/queue clients;
- outbound clients;
- repositories;
- services and usecases;
- transports;
- consumers and cronjobs;
- shutdown hooks.

Concrete implementations are created in `internal/deps`. Business code receives contracts:

- service/repository/client interfaces;
- system interfaces such as `TxManager`, clock, ID generator, telemetry, cache;
- `*zap.Logger` directly as a practical exception.

Business code must not depend on `samber/do` or call the DI container directly.

Service assembly is DI-local. Define a private service bundle in `internal/deps/services.go`, not a root `internal/service/services.go` facade:

```go
type svcLayer struct {
    Orders order.Service
    Stats  stats.Service
}

func (c *Container) provideServices() {
    do.Provide(c.i, func(i *do.Injector) (*svcLayer, error) {
        logger := c.Logger()
        ordersRepo := Must[order.Repository](c)
        statsRepo := Must[stats.Repository](c)

        return &svcLayer{
            Orders: order.New(logger, ordersRepo),
            Stats:  stats.New(logger, statsRepo),
        }, nil
    })
}

func (c *Container) services() *svcLayer {
    return Must[*svcLayer](c)
}
```

Other providers use `c.services()` to select concrete service fields for transports, consumers, and cronjobs. Do not expose a public service-bundle getter for `cmd`.

Recommended DI package files:

```text
internal/deps/
  container.go        # Container, New, Must/Require, typed getters
  shutdown.go         # addShutdown, Shutdown, LIFO, errors.Join, sync.Once
  config.go           # load and validate config
  logger.go           # bootstrap/application logger through internal/platform/log
  tracing.go          # TracerProvider, exporters, shutdown hooks
  sentry.go           # Sentry SDK init and shutdown
  metrics.go          # metrics registry/exporters
  clickhouse.go       # storage clients/pools
  kafka-consumers.go  # ProvideNamed consumers
  kafka-producers.go  # producers
  services.go         # domain services and private svcLayer
  servers.go          # HTTP/gRPC servers and shutdown hooks
  cronjobs.go         # ProvideNamed cron jobs
```

## Container Core

Requirements:

- Use `github.com/samber/do`.
- Keep a bootstrap logger for early fatal errors.
- Create an application logger after config is available.
- Support graceful shutdown in reverse initialization order.
- Return shutdown errors.
- Hide `samber/do` details behind package helpers and typed getters.
- Use package-level generic helpers `Must[T]` and `Require[T]`; Go has no generic methods.

Core shape:

```go
type shutdownFunc func(ctx context.Context) error

type shutdown struct {
    name string
    fn   shutdownFunc
}

type Container struct {
    i            *do.Injector
    mu           sync.Mutex
    shutdowns    []shutdown
    shutdownOnce sync.Once
    shutdownErr  error

    boot *zap.Logger
}
```

`New()`:

- creates `do.New()`;
- creates bootstrap logger via `internal/platform/log.New`;
- registers low-level providers and config;
- registers observability and application logger;
- initializes storage/integration/business providers;
- registers servers/consumers/jobs;
- may initialize exporters or tracer side effects when needed;
- returns `(*Container, error)`, not panic.

Helpers:

```go
func Must[T any](c *Container) T {
    v, err := Require[T](c)
    if err != nil {
        tn := reflect.TypeFor[T]().String()
        c.boot.Fatal("di resolve failed", zap.String("type", tn), zap.Error(err))
    }
    return v
}

func Require[T any](c *Container) (T, error) {
    return do.Invoke[T](c.i)
}
```

Shutdown:

```go
func (c *Container) Shutdown(ctx context.Context) error {
    c.shutdownOnce.Do(func() {
        l, err := Require[*zap.Logger](c)
        if err != nil {
            l = c.boot
        }

        c.mu.Lock()
        shutdowns := append([]shutdown(nil), c.shutdowns...)
        c.mu.Unlock()

        errs := make([]error, 0, len(shutdowns))
        for i := len(shutdowns) - 1; i >= 0; i-- {
            sd := shutdowns[i]
            l.Info("shutting down", zap.String("name", sd.name))
            if err := sd.fn(ctx); err != nil {
                errs = append(errs, fmt.Errorf("%s: %w", sd.name, err))
                l.Warn("error on shutdown", zap.String("name", sd.name), zap.Error(err))
            }
        }
        c.shutdownErr = errors.Join(errs...)
    })
    return c.shutdownErr
}
```

Rules:

- Do not use `zap.ReplaceGlobals`.
- Bootstrap logger is only for early startup and `Must` failures.
- Shutdown is idempotent; repeated calls return the first result.
- Do not execute shutdown hooks while holding the mutex. Copy the slice under lock, release, then run hooks.

## Providers

Provider naming:

```text
provideConfig
provideTracer
provideMetrics
provideHTTPTransport
provideClickHouse
provideKafkaConsumers
provideGRPCServer
provideHTTPServer
provideDebugServer
provideServices
provideCronJobs
```

Each provider:

- registers one dependency with `do.Provide` or `do.ProvideNamed`;
- registers shutdown hooks when it owns resources;
- returns service-facing interfaces for business adapters such as repositories, clients, services, consumers, and jobs;
- may return concrete infrastructure types when the concrete API is the dependency contract, such as `*zap.Logger`, `*http.Server`, `*grpc.Server`, or a database pool.

## Configuration and Secrets

Configuration is runtime input. Load and validate it at startup, then pass it through DI.

Runtime config loading is separate from constructor options. Env vars, files, secrets, flags, and precedence are resolved in startup/DI code; constructors receive typed values, dependencies, or optional overrides that are already explicit.

Default ownership:

- generated config package: typed environment/config fields produced by project tooling;
- `internal/deps/config.go`: loads generated config, validates it, and registers it;
- `internal/config`: optional handwritten normalization layer above generated config;
- services/usecases: receive typed values or dependencies, not raw environment access.

Use typed constructor config for cohesive runtime values:

```go
func NewServer(logger *zap.Logger, handler http.Handler, cfg ServerConfig) (*Server, error)
```

Do not use global config singletons or package-level mutable config.

Validate config before starting runtime components. Invalid config is a startup error; do not defer required validation until the first request, message, or job run.

Use project-established precedence. If repo/devctl/generated config already defines env/file/default precedence, follow it. Do not invent a new precedence model.

Validate:

- required values;
- enum-like settings;
- durations and timeouts;
- URLs and addresses;
- log level;
- feature flags that affect dependency wiring;
- secret presence, not secret contents.

Use generated config directly when it is already shaped for runtime needs. Add `internal/config` only when the project needs derived values, grouped sub-configs, validation spanning generated fields, or a compatibility shim while generated config evolves.

Keep `internal/deps/config.go` as the composition point even when `internal/config` exists:

```go
func (c *Container) provideConfig() {
    do.Provide(c.i, func(i *do.Injector) (*config.Config, error) {
        cfg, err := config.Load()
        if err != nil {
            return nil, err
        }
        if err := validate(cfg); err != nil {
            return nil, err
        }
        return cfg, nil
    })
}
```

Do not log tokens, passwords, raw authorization headers, cookies, API keys, DSNs with passwords, private keys, or full request/response bodies that may contain PII or secrets.

Log secret presence, source name, or redacted form only when useful:

```go
logger.Info("external client configured", zap.Bool("api_key_set", cfg.APIKey != ""))
```

Avoid:

```go
logger.Info("external client configured", zap.String("api_key", cfg.APIKey))
```

For DSNs, log scheme/host/database when needed, not credentials.

Do not add config reload by default. Add reload only when the repo already has a reload mechanism or the user asks for it. Reloadable config must define ownership, concurrency safety, validation, rollback behavior, and observability.

Review checklist:

- Is config loaded once through `internal/deps`?
- Are required values validated before runtime starts?
- Are secrets kept out of logs and errors?
- Is `internal/config` used only when handwritten adaptation is needed?
- Are services free of direct environment lookups?
- Is reload avoided unless intentionally supported?

## Multi-Binary Wiring

If a repo has multiple binaries with materially different dependency graphs, prefer one shared container plus wire functions first:

```text
internal/deps/
  container.go
  logger.go
  metrics.go
  storage_clickhouse.go
  api/
    wire.go
  worker/
    wire.go
```

Example:

```go
c, err := deps.New()
if err != nil {
    return err
}
depsapi.Wire(c)
```

This avoids unnecessary dependencies per binary while keeping one container type.

Use separate containers per binary only when lifecycle and dependencies differ strongly:

```text
internal/deps/api/container.go
internal/deps/worker/container.go
```

If separate containers duplicate common providers, move technical factories into `internal/deps/common` or mechanisms into `internal/platform`.

## Dependency Getters

Typed getters hide `do.Invoke` and named keys from CLI:

```go
func (c *Container) Logger() *zap.Logger
func (c *Container) Config() *config.Config
func (c *Container) GRPCServer() *grpc.Server
func (c *Container) HTTPServer() *http.Server
func (c *Container) Clickhouse() clickhouse.Client
func (c *Container) GetConsumer(name string) (Consumer, error)
func (c *Container) GetCronJob(name string) (CronJob, error)
```

Placement:

- `logger.go` owns `Logger()`;
- `config.go` owns `Config()`;
- `servers.go` owns `GRPCServer()` and `HTTPServer()`;
- `clickhouse.go` owns `Clickhouse()`;
- `kafka-consumers.go` owns `GetConsumer(...)`;
- `cronjobs.go` owns `GetCronJob(...)`.

Required typed getters call `deps.Must` because missing required dependencies after successful `deps.New()` means a DI graph bug. Named getters return errors because names come from external CLI input. Optional dependencies should expose an explicit optional getter shape instead of hiding absence behind `Must`.

`deps.Must` and `deps.Require` remain package-level functions so DI subpackages can use generics without duplication. They are not the preferred API for `cmd`.

## Related References

- Read `observability-and-health.md` for logging, metrics, tracing, health, readiness/liveness, and pprof runtime wiring.
- Read `adapters-and-transport.md` for repository/client/transport adapters, Kafka consumers, producers, and message retry/DLQ policy.
- Read `testing-strategy.md` for CLI, DI assembly, runtime, and concurrency test scope.
