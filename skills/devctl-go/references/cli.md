# CLI ownership

Use the existing framework; default new applications to `urfave/cli/v3`. Inspect its selected API
before implementing typed arguments. The command tree owns the file tree:

```text
cmd/<app>/
  main.go                    # root metadata, signals, registration, run, final exit
  internal/
    api.go                   # executable leaf: <app> api
    consumer.go              # executable leaf when needed
    config/
      config.go              # namespace: <app> config
      path.go                # leaf: <app> config path
      validate.go            # leaf: <app> config validate
```

Give each command node one file and recurse for nested groups. Put command implementations in
importable packages under `cmd/<app>/internal` so generated mocks can import their public types.
`main.go` composes the root; namespace packages expose `NewCmd` to register children. A group with
no action needs only that factory. Every executable node has a private `<name>Command`, a `run`
method, and public `<Name>CommandOptions` for its input, held by value in `opts`. Commands without
input need no empty options type. `New<Name>Command` creates the object and returns `*cli.Command`, binding
`Destination: &x.opts.Field` and `Action: x.run`. This factory is public so external command tests
can exercise the real CLI with injected dependencies.

## Dependency factory

For a command that acquires runtime dependencies, inject a consumer-owned `<Name>DepsFactory`
interface. Its single method is `Build(ctx context.Context, opts <Name>CommandOptions)
(*<Name>Deps, error)`. Pass the full options by value; omit that parameter for a command without
input. Options contain input data and flag presence; the CLI command, writers, and runtime
resources stay outside them.

`<Name>Deps` is a public concrete bundle of the command's narrow capability interfaces and
`Shutdown func(ctx context.Context) error`. Export the capability interfaces and bundle fields so
external tests and the consumer's `mocks` package can use them. Keep the command's acquired bundle
local to `run`. Commands without runtime dependencies need no artificial factory.

The production `Default<Name>DepsFactory` lives beside the command, initially in the same file.
Expose its concrete type where registration crosses a package boundary. Its construction acquires
no resources. `Build` maps options to typed deps startup input, invokes only the selected scenario
constructor, and adapts its roots and shutdown callback into the bundle. Configuration resolution,
concrete wiring, and resource acquisition stay in [composition](runtime.md). The factory constructs
dependencies; operation execution and CLI output belong to `run`.

Keep command options and bundles in the importable CLI package. Deps defines its own startup types;
the factory bridges these types on the CLI side, preserving the dependency direction toward deps.

On success, `Build` returns a non-nil bundle with the required capabilities and shutdown callback.
Only then does cleanup ownership transfer to the command. On failure, deps rolls back partial
acquisitions with bounded cleanup independent of startup cancellation, retaining cleanup failures.
If factory adaptation fails after construction, the factory releases the graph it still owns.

## Parse before constructing

1. Render help and parse typed flags/positionals before config loading or dependency construction.
   Bind with `Destination`; use `Command.Arguments` and typed `...Arg`/`...Args` rather than
   treating `ArgsUsage` as a parser. Validate command-only values and argument bounds before `Build`.
2. For config-backed flags, capture `Command.IsSet` in the options before passing them to the
   factory, for example `URL` plus `URLSet`. The factory maps presence to typed deps overrides:
   omitted `--url` becomes nil; explicit `--url ""` becomes a pointer to an empty string. Preserve
   explicit `false` and `0` the same way. Deps owns env/dotenv lookup, merging, and final validation
   under [configuration](runtime.md#configuration-and-secrets), before acquiring resources.
3. Build the selected dependencies, call the capability, and format its result. Business commands
   call a service/usecase; infrastructure commands may call their composed infrastructure capability
   directly. Use `go-libs/lifecycle.Run` for long-running tasks with the bundle's shutdown callback.
   A one-shot leaf defers bounded `lifecycle.Shutdown` and joins operation/output and cleanup errors.
   Inspect the selected library API; it owns fresh cleanup contexts and task coordination.

Keep required command arguments distinct from config-backed flags: the latter must not become
required CLI flags when a file or environment can supply them. Bind flag-name constants locally.
The factory receives the full raw options; only at the deps boundary do they become startup input.

## Shared options and output

Extract common options when commands actually share a cohesive set of input fields and bindings.
Embed them by value in each command's options. A pointer-receiver `CommonFlags()` method returns
fresh flags whose destinations reference that instance. Each leaf appends those flags explicitly;
this reuse shares definitions while preserving separate options and flag objects per command.
Keep the common type local to its users; expose it when shared across packages. Command factories
and runtime dependencies remain outside common options.

`run`, with small local formatters when useful, owns stdout results and stderr progress/warnings
through the CLI's configured writers. Return final errors to the root for one diagnostic and exit
code. Business capabilities return data; byte-stream operations may receive an `io.Writer` selected
by the command, and business progress may use typed callbacks rendered by the command. The caller
owns a supplied writer. A dependency factory performs no CLI output.

## Leaf sketch

This JSON-producing `bench` leaf uses application-owned `benchservice.Options` and `Report` types.
Here the application's `deps.NewBench(ctx)` resolves its configuration and returns a graph exposing
`Evaluate` and `Shutdown`. Its actual constructor and roots follow the application's deps contract.
All declarations below live in the importable command package.

```go
// BenchCommandOptions selects the training split for a bench run.
type BenchCommandOptions struct {
    // TrainPercent is the percentage of samples used for training, from 1 through 99.
    TrainPercent int
}

// BenchEvaluator compares pipelines using a selected training split.
type BenchEvaluator interface {
    // Evaluate compares pipelines using the requested training split.
    Evaluate(ctx context.Context, opts benchservice.Options) (benchservice.Report, error)
}

// BenchDeps holds the runtime capabilities owned by a bench command.
type BenchDeps struct {
    Evaluator BenchEvaluator
    // Shutdown releases the acquired runtime resources after command execution.
    Shutdown  func(ctx context.Context) error
}

// BenchDepsFactory acquires the runtime capabilities for a bench command.
type BenchDepsFactory interface {
    // Build returns ready dependencies or releases partial resources before returning an error.
    Build(ctx context.Context, opts BenchCommandOptions) (*BenchDeps, error)
}

// DefaultBenchDepsFactory builds the application's bench runtime graph.
type DefaultBenchDepsFactory struct{}

// Build resolves the bench runtime and transfers cleanup ownership to the caller on success.
func (DefaultBenchDepsFactory) Build(ctx context.Context, opts BenchCommandOptions) (*BenchDeps, error) {
    graph, err := deps.NewBench(ctx)
    if err != nil {
        return nil, err
    }
    return &BenchDeps{Evaluator: graph, Shutdown: graph.Shutdown}, nil
}

type benchCommand struct {
    opts    BenchCommandOptions
    factory BenchDepsFactory
}

// NewBenchCommand returns a bench command that acquires runtime dependencies only when run.
func NewBenchCommand(factory BenchDepsFactory) *cli.Command {
    x := &benchCommand{factory: factory}
    return &cli.Command{
        Name: "bench",
        Flags: []cli.Flag{
            &cli.IntFlag{
                Name: "train-percent", Value: 80,
                Destination: &x.opts.TrainPercent,
            },
        },
        Action: x.run,
    }
}

func (c *benchCommand) run(ctx context.Context, command *cli.Command) (err error) {
    if c.opts.TrainPercent < 1 || c.opts.TrainPercent > 99 {
        return fmt.Errorf("train percent must be between 1 and 99")
    }
    resources, err := c.factory.Build(ctx, c.opts)
    if err != nil {
        return fmt.Errorf("build bench dependencies: %w", err)
    }
    defer func() {
        err = errors.Join(err, lifecycle.Shutdown(ctx, 5*time.Second, resources.Shutdown))
    }()
    report, err := resources.Evaluator.Evaluate(ctx, benchservice.Options{
        TrainPercent: c.opts.TrainPercent,
    })
    if err != nil {
        return fmt.Errorf("evaluate pipelines: %w", err)
    }
    return json.NewEncoder(command.Root().Writer).Encode(report)
}
```

When a scenario exposes typed root getters, select its evaluator root for the bundle instead.
Keep its DI container private. Namespace factories pass the appropriate factory to each child
without building a graph.

## Command verification

Use an external test package, such as `command_test`, with generated gomock factories and capability
mocks in the consumer's `mocks` subpackage. Public options, bundle, and capability types allow these
imports without a cycle. Invoke the real command returned by `New<Name>Command`; mock construction
and consumed operations rather than replacing `run` or the DI container. Complete this boundary
check by generating the mocks and compiling/running the external command suite.

Cover help, parse errors, and invalid command-only input without `Build`; full options/defaults and
raw flag presence at `Build`; stdout/stderr and output failures; construction and operation failures;
cancellation; and cleanup after success, operation failure, or output failure, retaining both errors.
For shared flags, verify separate command instances keep independent destinations and values.

Even with `DATABASE_URL` set, omitted `--url` reaches `Build` with presence unset; explicit empty
stays present. Test the production factory's mapping to deps input and use real graph tests for env
precedence, invalid merged configuration before acquisition, rollback, and resource cleanup. Domain
decisions remain service tests. A small factory adapter can be covered by the real graph/CLI fixture.

For the leaf sketch, assume module `example.com/app`, package `command` in `cmd/app/internal`,
and the application operation types in `internal/service/bench`. Declare and pin `mockgen` in the
owning module using [Go generation](stack-and-generation.md#go-generation). Add this directive to
the command's `bench.go`, then run `go generate ./cmd/app/internal` and `go test ./cmd/app/internal`:

```go
//go:generate go tool mockgen -source=bench.go -destination=mocks/bench.go -package=mocks
```

The following `bench_test.go` exercises the real command through its public constructor. The mock
factory returns the concrete bundle with a mock capability and an observable shutdown callback:

```go
package command_test

import (
    "bytes"
    "context"
    "encoding/json"
    "testing"

    command "example.com/app/cmd/app/internal"
    "example.com/app/cmd/app/internal/mocks"
    benchservice "example.com/app/internal/service/bench"
    "github.com/stretchr/testify/require"
    "github.com/urfave/cli/v3"
    "go.uber.org/mock/gomock"
)

func TestBenchCommandOutputAndCleanup(t *testing.T) {
    ctrl := gomock.NewController(t)
    factory := mocks.NewMockBenchDepsFactory(ctrl)
    evaluator := mocks.NewMockBenchEvaluator(ctrl)
    report := benchservice.Report{TrainPercent: 65}
    shutdowns := 0

    factory.EXPECT().Build(gomock.Any(), command.BenchCommandOptions{
        TrainPercent: 65,
    }).Return(&command.BenchDeps{
        Evaluator: evaluator,
        Shutdown: func(ctx context.Context) error {
            require.NoError(t, ctx.Err())
            shutdowns++
            return nil
        },
    }, nil)
    evaluator.EXPECT().Evaluate(gomock.Any(), benchservice.Options{
        TrainPercent: 65,
    }).Return(report, nil)

    var stdout, stderr bytes.Buffer
    app := &cli.Command{
        Name: "app",
        Commands: []*cli.Command{command.NewBenchCommand(factory)},
        Writer: &stdout, ErrWriter: &stderr,
    }
    err := app.Run(context.Background(), []string{"app", "bench", "--train-percent", "65"})

    require.NoError(t, err)
    var got benchservice.Report
    require.NoError(t, json.Unmarshal(stdout.Bytes(), &got))
    require.Equal(t, report, got)
    require.Empty(t, stderr.String())
    require.Equal(t, 1, shutdowns)
}
```
