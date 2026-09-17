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

Give each command node one file and recurse for nested groups. Keep a small topic-named helper
local when shared; create only commands the application needs. Root construction stays in
`main.go`; top-level factories are `NewCmdAPI`, etc. Group packages expose `NewCmd`, with private
leaf factories. Empty namespace groups need only a factory. Executable leaves own private
`<name>Cmd` and `<name>CmdOpts` types, and optionally a private runtime builder for tests.

## Parse before constructing

1. Render help and parse typed flags/positionals before config loading or runtime construction.
   Bind with `Destination`; use `Command.Arguments` and typed `...Arg`/`...Args` rather than
   treating `ArgsUsage` as a parser. Validate required values and repeated-argument bounds.
2. Derive presence-aware config overrides, then construct only the selected scenario in deps.
   Config-backed flags use `Command.IsSet` inside the options type's `ConfigOverrides` method;
   preserve explicit `false`, `0`, and empty strings with pointer/optional fields. Keep env/dotenv
   and required runtime-config validation in deps, after all sources are loaded.
3. Call the narrow service/usecase capability and format its result. The leaf uses
   `go-libs/lifecycle.Run` for long-running tasks, passing the deps graph's shutdown callback.
   A one-shot leaf defers `lifecycle.Shutdown` and joins operation and cleanup errors. Inspect the
   selected library API; it owns fresh bounded cleanup contexts and task coordination.

Keep required command arguments distinct from config-backed flags: the latter must not become
required CLI flags when a file or environment can supply them. Bind flag-name constants locally.
Keep startup input typed and pass it to deps; command code does not build config-library loaders.

## Leaf sketch

This excerpt shows sequencing; domain/deps contracts, a narrow runtime value, and output helpers
are application-owned. Its builder is private to this leaf, not an all-command dependency bundle.

```go
type createCmdOpts struct {
    name string
}

type createCmd struct {
    opts createCmdOpts
    buildRuntime createBuilder
}

func (c *createCmd) command() *cli.Command {
    return &cli.Command{
        Name: "create",
        Usage: "Create a task",
        Arguments: []cli.Argument{
            &cli.StringArg{Name: "name", Destination: &c.opts.name},
        },
        Action: c.run,
    }
}

func (c *createCmd) run(ctx context.Context, command *cli.Command) (err error) {
    if c.opts.name == "" {
        return fmt.Errorf("name is required")
    }
    runtime, err := c.buildRuntime(ctx)
    if err != nil {
        return err
    }
    defer func() {
        err = errors.Join(err, lifecycle.Shutdown(ctx, 5*time.Second, runtime.shutdown.Shutdown))
    }()
    result, err := runtime.creator.Create(ctx, domtask.CreateCommand{Name: c.opts.name})
    if err != nil {
        return fmt.Errorf("creator.Create: %w", err)
    }
    _, err = fmt.Fprintln(command.Writer, result.Name)
    return err
}
```

The real builder calls the selected deps constructor and adapts its typed roots into this leaf's
runtime capabilities. Command tests replace the private builder and return generated gomock
capabilities; separately assert that help and invalid input never invoke it. Domain decisions
remain service tests; resource acquisition and cleanup remain graph/adapter tests.
