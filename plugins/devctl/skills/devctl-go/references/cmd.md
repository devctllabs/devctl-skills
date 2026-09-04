# Command Entrypoints

## Contents

- Boundary and Layout
- Command Tree Ownership
- Command Model and Help
- `main.go`
- Runtime Commands
- Testing
- Review Checklist

## Execution Gate

For a CLI-visible feature, this is the first implementation boundary. Change the command owner test,
run it to useful RED, and make the command GREEN against generated gomock mocks for its injected
interfaces before opening or implementing service, repository, client, or dependency-wiring
details. The mocked application capability may match a typed runtime getter, but a valid runtime
graph must ultimately fulfill it with a service/usecase, never directly with a repository or
client.

## Boundary and Layout

Keep `cmd/` as the thin process entrypoint layer: build the CLI, parse arguments, create the selected
runtime container, resolve typed scenario dependencies, run the scenario, and return its final
error. Import `internal/deps` and command-local packages rather than concrete services, adapters,
consumers, or jobs.

```text
cmd/<app_name>/
  main.go
  internal/
    api.go
    consumer.go
    cronjob.go
    config/
      config.go
      path.go
      validate.go
```

Default CLI:

```text
<app_name> api
<app_name> consumer <consumer-name>
<app_name> cronjob <job>
```

Use multiple binaries only for materially different lifecycle, dependency graphs, or deploy units.

## Command Tree Ownership

For a new, unstructured, or explicitly standardized CLI, give every command node one file. Keep
shared output, error, or flag helpers in separate topic-named files; never collect several command
nodes and their actions in a generic `commands.go`.

Map the command tree recursively:

- put a top-level executable leaf such as `<app_name> api` in
  `cmd/<app_name>/internal/api.go`;
- put a top-level namespace group such as `<app_name> config` in
  `cmd/<app_name>/internal/config/config.go`;
- put each immediate executable leaf such as `<app_name> config path` in
  `cmd/<app_name>/internal/config/path.go`;
- when a child is itself a namespace group, give it a nested directory and repeat the same layout.

Name group directories after their CLI tokens. If a token is a Go keyword, keep the directory name
and add a clear suffix to the package identifier, for example
`cmd/<app_name>/internal/package/package.go` with `package packagecmd`.

These command-local packages live below `cmd/<app_name>/internal`; do not confuse a namespace such
as `cmd/<app_name>/internal/config` with the application's root `internal/config` runtime
configuration package.

An executable leaf owns a `<name>Cmd` and `<name>CmdOpts`. Use package-local names such as
`pathCmd` and `pathCmdOpts` when several leaves share a group package; Go files do not provide
separate type namespaces. A namespace-only group with no action, flags, or state needs only its
`NewCmd` factory. Do not add empty command/options structs for symmetry. If a group owns executable
behavior or flags, treat it as an executable command and give it the same structs.

Preserve a coherent established layout unless the user asks to standardize it.

## Command Model and Help

Use the established CLI framework; default to `github.com/urfave/cli/v3` for new service CLIs.
Construct the root `*cli.Command` inline in `main.go` with command factories such as `NewCmdAPI`,
`NewCmdConsumer`, and `NewCmdCronJob`. Treat `main.go` as the root command node's owner file; do not
add a second `root.go`, `Execute`, or `Main` wrapper for a new CLI. A group package exposes `NewCmd`;
its package-local leaf factories remain private. Preserve an established equivalent root wrapper
only when the repository is already coherent and the user did not ask to standardize command
ownership; the exception does not apply to an unstructured scaffold.

Bind flags into the leaf options struct with `Destination`. Bind typed positional arguments through
`Command.Arguments` and the matching `cli.<Type>Arg` or `cli.<Type>Args`, also with `Destination`.
`ArgsUsage` documents syntax but does not parse positional arguments. Validate required single
arguments after parsing; for repeated arguments set explicit `Min` and `Max`. Validate all CLI input
before constructing that leaf's runtime dependencies. Keep simple flows in `Action`; move
lifecycle-heavy coordination to a private `run` method. Command structs hold parsed options and an
optional leaf-local construction seam, not already-constructed application layers.

Default a private construction function inside the leaf file when command tests need to replace
runtime construction. Tests may replace that function through the leaf's private command factory
and return generated gomock mocks for the runtime capabilities it supplies. Do not pass an
aggregate `Dependencies`, `DependenciesBuilder`, service facade, or all-command options object
through `main`, the root, or namespace groups. Each leaf resolves only the narrow capabilities it
executes.

Treat help as public behavior:

- Give root, groups, leaves, flags, and positional arguments meaningful usage text.
- Render help before `Action`, config loading, container construction, or external work.
- Preserve established help conventions and standard templates unless compatibility requires
  custom output.

## Config-Backed Flags

Bind config-backed flags through normal `Destination` fields. `Destination` stores the parsed
value but not whether the user supplied it, so derive scenario overrides with `Command.IsSet`.
Keep canonical flag names in package-private constants and confine every `IsSet` call to the
owning options type's `ConfigOverrides` method:

```go
const logLevelFlagName = "log-level"

type CommonCmdOpts struct {
    logLevel string
}

func (o *CommonCmdOpts) CommonFlags() []cli.Flag {
    return []cli.Flag{
        &cli.StringFlag{
            Name:        logLevelFlagName,
            Value:       "info",
            Destination: &o.logLevel,
        },
    }
}

func (o CommonCmdOpts) ConfigOverrides(
    command *cli.Command,
) deps.CommonConfigOverrides {
    var overrides deps.CommonConfigOverrides
    if command.IsSet(logLevelFlagName) {
        value := o.logLevel
        overrides.LogLevel = &value
    }
    return overrides
}
```

Scenario options compose common overrides before adding their own. Pointer fields preserve the
difference between an absent flag and explicit `false`, `0`, or empty string. Config-backed flags
must not use `Sources` or `Required`: dotenv and process env belong to the config loader chain, and
required config is validated after all sources load. Command-owned inputs such as output mode,
consumer name, or a lifecycle-only timeout may still use `Sources`, `Required`, and direct values.
Adapt the resulting typed override loader with `go-libs/config.Typed` as documented by that package.

## `main.go`

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
            configcmd.NewCmd(),
        },
    }

    if err := root.Run(ctx, os.Args); err != nil {
        os.Exit(1)
    }
}
```

Keep `main` limited to signal context, root metadata and command registration, root execution, and
the final process exit. Do not put `deps.New`, domain imports, service adapters, error presentation
implementations, or command actions in `main`. A CLI-wide error renderer may live in a command-local
helper and be assigned to the root. Keep config, logging, and DI construction in executable leaves
so help and unrelated commands initialize no runtime graph.

## Runtime Commands

Create the container inside each executable leaf. Resolve only typed getters. Return errors to the
CLI and join run/shutdown failures according to `lifecycle-and-concurrency.md`. The API leaf owns
concurrent server execution while resource providers declare server cleanup ownership.

Keep parsed options separate from the optional leaf-local construction seam. For a non-trivial
runtime command, let a private builder create the real scenario container and immediately adapt its
concrete getters into a private runtime value containing only capabilities used by that command:

```go
type apiRuntime struct {
    logger        *zap.Logger
    httpServer    httpServer
    grpcServer    grpcServer
    healthServer  healthServer
    healthEnabled bool
    shutdown      shutdowner
}

type apiBuilder func(
    ctx context.Context,
    input deps.APIInput,
) (apiRuntime, error)

type apiCmd struct {
    opts         apiCmdOpts
    buildRuntime apiBuilder
}

func buildAPI(ctx context.Context, input deps.APIInput) (apiRuntime, error) {
    container, err := deps.NewAPI(ctx, input)
    if err != nil {
        return apiRuntime{}, err
    }
    healthServer, healthEnabled := container.HealthServer()
    return apiRuntime{
        logger:        container.Logger(),
        httpServer:    container.HTTPServer(),
        grpcServer:    container.GRPCServer(),
        healthServer:  healthServer,
        healthEnabled: healthEnabled,
        shutdown:      container,
    }, nil
}
```

The builder is a private construction function, not an application behavior interface. Tests may
replace it to capture the exact scenario input and return an `apiRuntime` whose behavioral fields
are generated gomock mocks. Keep `apiRuntime` private and keep container getters concrete; do not
export runtime types or add a container interface solely for command tests.

For multiple long-lived tasks, keep the command's private `run` method declarative: build named
`lifecycle.Task` values, append optional runtime roots only when their getter reports them enabled,
and call `lifecycle.Run` once with the configured shutdown timeout and `runtime.shutdown.Shutdown`.
Pass `Run(ctx)` methods directly. Wrap `ListenAndServe()` methods in explicit closures that ignore
the task context because common container shutdown stops those servers. Do not add command-owned
goroutines, a second signal context, or a parallel `errgroup` framework around `lifecycle.Run`.

Use a command/options struct and a leaf-local factory for a named consumer:

```go
type consumerCmd struct {
    opts         consumerCmdOpts
    buildRuntime consumerBuilder
}

type consumerCmdOpts struct {
    name string
    shutdownTimeout time.Duration
}

func NewCmdConsumer() *cli.Command {
    return newConsumerCmd(
        consumerCmdOpts{shutdownTimeout: 30 * time.Second},
        buildConsumer,
    )
}

func newConsumerCmd(opts consumerCmdOpts, build consumerBuilder) *cli.Command {
    cmd := &consumerCmd{opts: opts, buildRuntime: build}
    return &cli.Command{
        Name:                   "consumer",
        Usage:                  "Run one named consumer",
        UseShortOptionHandling: true,
        Arguments: []cli.Argument{
            &cli.StringArg{
                Name:        "consumer-name",
                UsageText:   "<consumer-name>",
                Destination: &cmd.opts.name,
            },
        },
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

func (cmd *consumerCmd) Action(ctx context.Context, _ *cli.Command) error {
    if cmd.opts.name == "" {
        return cli.Exit("consumer name is required", 2)
    }
    consumer, shutdown, err := cmd.buildRuntime(ctx, cmd.opts.name)
    if err != nil {
        return err
    }
    return cmd.run(ctx, consumer, shutdown)
}
```

Define `consumerBuilder` and `buildConsumer` in `consumer.go`. The production builder creates the
container and resolves the named consumer; the owner test calls the private command factory with a
controlled builder returning generated gomock mocks.
This keeps construction lazy and leaf-owned without moving the whole CLI dependency graph into
`main`.

Run consumers as long-lived cancelable components. Run cronjobs synchronously through:

```go
type CronJob interface {
    // Run executes the job until completion or ctx cancellation.
    Run(ctx context.Context) error
}
```

Resolve externally supplied names through error-returning getters. Resolve required fixed
dependencies through typed getters that treat absence after `deps.New()` as a graph bug.

## Testing

Exercise the public CLI boundary. Cover args/flags, required values, delegation, output, stderr,
exit status, application-error presentation, registration, and root/group/leaf help. Prove help
and invalid input do not construct the container or execute an action, and prove a valid leaf
constructs only its own runtime. For config-backed flags, prove an omitted flag produces no
override even when the flag has a displayed default, while an explicitly supplied default or zero
value does. Use the private builder function to test parsing and scenario-input mapping; use
generated gomock mocks for the behavioral capabilities inside the private runtime value. Test the
real `deps.NewXxx` graph separately in its wiring smoke test. Keep leaf tests beside their owner
file. Prefer representative help assertions over full snapshots. Follow `testing-strategy.md`.

## Review Checklist

- Is `main` limited to signal context and root command execution?
- For a new CLI, does `main.go` itself own the root command without an extra execution wrapper?
- Does every command node have one owner file, without a multi-command `commands.go`?
- Does every executable leaf own its command/options structs while namespace-only groups avoid
  empty symmetry structs?
- Are construction seams leaf-local instead of aggregated through `main` or the root?
- Does each leaf initialize only its selected runtime graph?
- Are application dependencies reached through typed getters?
- Do command tests prove public behavior independently of concrete services?
