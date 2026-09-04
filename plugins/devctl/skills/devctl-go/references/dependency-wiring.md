# Dependency Wiring

## Contents

- Ownership and Package Shape
- Provider File Rule
- Container and Scenario Roots
- Configuration Registration
- Named Dependencies and Getters
- Multi-Binary Wiring
- Testing
- Review Checklist

## Execution Gate

Treat production wiring as the final implementation boundary of an outside-in slice. Enter it only
after the caller, business, and demanded adapter owner suites are GREEN. Change the wiring smoke
test and observe useful RED before editing container providers or getters.

Typed getters for caller-visible domain operations must resolve services/usecases. Never register a
repository or client directly as the implementation of such a getter merely because it satisfies
the same Go interface.

## Ownership and Package Shape

Use `internal/deps` as the composition root for config, logging/telemetry, infrastructure resources,
repositories, outbound clients, services/usecases, transports, consumers, jobs, and shutdown hooks.
Construct concrete implementations here and pass consumers their contracts. Keep
`github.com/devctllabs/go-libs/di` inside this boundary; business and delivery packages must not
import it.

For a new, unstructured, or explicitly standardized application, map each present dependency to
one owner file. Omit files whose responsibility is absent:

| Owner | Default files | Registers |
| --- | --- | --- |
| Container core | `container.go` | application `Container`, shared DI state, shutdown delegation |
| Scenario roots | `api.go`, `worker.go` | typed input, `NewAPI`/`NewWorker`, graph selection, eager roots |
| Foundation | `config.go`, `logger.go`, `telemetry.go` | validated config, application logger, one shared telemetry runtime |
| Raw resources | `storage_clickhouse.go`, `kafka_broker.go` | pools, connections, SDK runtimes, and their cleanup |
| Outbound adapters | `repositories.go`, `clients.go`, `kafka_producers.go` | concrete implementations of repository/client/producer capabilities |
| Application | `services.go`, `usecases.go` | concrete services/usecases and their decorators |
| Runtime roots | `servers.go`, `kafka_consumers.go`, `cronjobs.go` | servers and named executable consumers/jobs |

Use lowercase snake_case for compound Go filenames. Give related technologies a common prefix, so
Kafka wiring remains adjacent as `kafka_broker.go`, `kafka_producers.go`, and
`kafka_consumers.go`.

Name a file for the dependency it provides, not what that dependency consumes. For example,
`storage_clickhouse.go` registers the raw ClickHouse client or pool, while `repositories.go`
registers repository implementations that resolve that pool. Keep Kafka producers with outbound
adapters and Kafka consumers with executable runtime roots.

Use one `telemetry.go` and `provideTelemetry` when tracing and metrics come from one owned
`*telemetry.Runtime`. Split tracing, metrics, Sentry, or another SDK only when they are genuinely
independent resources with separate configuration or lifecycle.

Use `github.com/devctllabs/go-libs/di` v0.1.0 or newer as the default for new services. Before
implementing wiring, inspect the selected version with
`go doc -all github.com/devctllabs/go-libs/di`; its package contract owns registration, resolution,
resource ownership, shutdown ordering, errors, and concurrency semantics. Preserve an established
equivalent DI pattern when coherent unless the task explicitly requests migration.

## Provider File Rule

Give every thematic provider file exactly one private registration entrypoint named
`provide<Capability>` and returning `error`. The method may register several closely related
dependencies; every `di.Provide*` closure still constructs exactly one dependency.

```go
func (c *Container) provideServices() error {
    if err := di.Provide(c.di, func(r di.Resolver) (*order.Service, error) {
        logger, err := di.Resolve[*zap.Logger](r)
        if err != nil {
            return nil, err
        }
        repo, err := di.Resolve[order.Repository](r)
        if err != nil {
            return nil, err
        }
        return order.New(logger.Named("service.order"), repo), nil
    }); err != nil {
        return fmt.Errorf("provide order service: %w", err)
    }

    if err := di.Provide(c.di, func(r di.Resolver) (*stats.Service, error) {
        repo, err := di.Resolve[stats.Repository](r)
        if err != nil {
            return nil, err
        }
        return stats.New(repo), nil
    }); err != nil {
        return fmt.Errorf("provide stats service: %w", err)
    }

    return nil
}
```

Register repositories, clients, services, and usecases individually. Do not introduce
`svcLayer`, `repoLayer`, or another layer bundle merely to group registrations. A subsequent
provider resolves only the concrete dependency or consumer-owned contract it needs.

Keep registration methods declarative:

- resolve provider dependencies synchronously only through the supplied `di.Resolver`;
- never capture `c.di`, retain the resolver, call another `provideX`, or use container getters from
  inside a provider closure;
- choose `Provide`, `ProvideResource`, or a named variant according to actual ownership;
- keep business policy in service/usecase constructors, not in wiring;
- return the first registration error with `%w` context naming the dependency;
- allow local types, small helpers, provider closures, and runtime-root getters beside the single
  `provideX` entrypoint.

Split a provider file when registrations are selected by different scenarios, have independent
configuration or lifecycle, or no longer form one readable dependency family. Give each resulting
file its own single `provideX` entrypoint. Do not create empty files for symmetry.

Registration methods normally take no arguments. Pass immutable startup input explicitly when it
cannot be resolved from DI, as with construction context and config loaders; do not store those
values on `Container` merely to force a `provideX() error` signature.

Register the shared telemetry runtime as one owned resource in `telemetry.go`. Pass the scenario
construction context to `provideTelemetry`, distribute its tracer/meter providers and propagator,
and create component-scoped tracers/meters while composing decorators. Do not call
`otel.SetTracerProvider`, `otel.SetMeterProvider`, or `otel.SetTextMapPropagator` in application
wiring.

## Container and Scenario Roots

Treat `container.go` and scenario files as graph owners, not thematic provider files; the
one-`provideX` rule does not apply to them. Keep `container.go` limited to the application
`Container`, shared construction/rollback mechanics, and `Shutdown` delegation. Store the DI
container privately and cache only successfully resolved runtime roots required by executable
callers:

```go
type Container struct {
    di         *di.Container
    logger     *zap.Logger
    httpServer *http.Server
    consumers  map[string]Consumer
}

func (c *Container) Logger() *zap.Logger       { return c.logger }
func (c *Container) HTTPServer() *http.Server { return c.httpServer }
func (c *Container) Shutdown(ctx context.Context) error {
    return c.di.Shutdown(ctx)
}
```

Do not copy the library's injector, mutex, shutdown hooks, or generic helpers into
`internal/deps`. Do not cache or expose repositories, outbound clients, raw pools, services, or
usecases merely because they are registered.

For one scenario, let `New` in `container.go` own the explicit provider list. For multiple
scenarios, put `NewAPI`, `NewWorker`, or an equivalent constructor in its matching file. Each
constructor must:

1. receive typed scenario input and create the container;
2. call `provideConfig` and every applicable provider group explicitly before any resolution;
3. order the list for readability as foundation -> raw resources -> adapters -> application ->
   runtime roots, without treating registration order as dependency order;
4. resolve and cache validated config first, then only that scenario's runtime roots;
5. roll back a partially built graph with an application-owned bounded context and return
   `errors.Join(buildErr, shutdownErr)`.

Do not hide the scenario graph in a shared `wire.go` or register a superset graph for every binary.
Do not log fatally inside DI; the executable boundary owns error presentation and process exit.

## Configuration Registration

Keep base config sources and validation in `config.go`. Let `cmd` create presence-aware typed
override values; it must not construct config-library loaders or load the final application config.
Define the small typed loader adapters in `internal/deps/config.go`, and let each scenario
constructor instantiate only its applicable common and scenario-specific loaders:

```go
func (c *Container) provideConfig(
    ctx context.Context,
    loaders ...configlib.TypedLoader[appconfig.Config],
) error
```

Inside `provideConfig`, build the base chain in increasing precedence, append each loader through
`configlib.Typed`, load into a new value, validate it, and register `*appconfig.Config`. Passing no
scenario overrides is `provideConfig(ctx)`. A config provider may capture the construction context
and immutable loader values because every successful scenario constructor resolves config before
returning; it must not capture the DI container.

## Named Dependencies and Getters

Register independently selected consumers and cronjobs with `di.ProvideNamed` or
`di.ProvideNamedResource`. Use stable logical names rather than topics, queues, or deployment
identifiers. A group method such as `provideKafkaConsumers` may contain several named registrations
because they share one dependency family.

Resolve every configured external name during scenario construction and cache the selected runtime
root. A runtime getter performs lookup only:

```go
func (c *Container) Consumer(name string) (Consumer, bool) {
    consumer, ok := c.consumers[name]
    return consumer, ok
}
```

Expose typed getters only for values the executable boundary actually runs or presents, such as
the application logger, selected servers, consumers, and cronjobs. Expose config only when the
executable genuinely consumes it. Do not expose `ClickHouse()`, repositories, clients, service
bundles, or generic `Resolve`/`Must`/`Require` helpers.

After a scenario constructor succeeds, fixed getters are error-free because their roots were
already resolved. Named external input is validated during construction and uses the established
lookup or error-returning getter shape. Represent optional runtime roots explicitly.

## Multi-Binary Wiring

Prefer one shared `Container` plus scenario-specific constructors:

```text
internal/deps/
  container.go
  config.go
  logger.go
  telemetry.go
  storage_clickhouse.go
  repositories.go
  services.go
  servers.go
  api.go
  worker.go
```

Keep common CLI overrides in a small shared value and scenario-only overrides in their matching
input; do not grow one union input across every executable leaf. Do not call a `Wire` function after
`New`: the container is sealed once resolution starts.

Use separate application container types only when lifecycle and dependency graphs differ strongly.
Share technical factories through `deps/common` only after real duplication exists; keep reusable
domain-free mechanisms in `internal/platform`.

## Testing

Add an integration smoke test when wiring is non-trivial. Resolve every required provider, selected
implementation, named consumer/job, and server/handler graph. Prove that each scenario registers
only its owner groups, applies only its config loaders, resolves config before resource creation,
exposes only its runtime roots, and rolls back a partially built graph. Test explicit resource
ownership without repeating behavior owned by the DI library or constructed components. Follow
`testing-strategy.md`.

## Review Checklist

- Does every present dependency family have one owner file and one `provideX` entrypoint?
- Are raw resources separate from repository/client/producer adapters?
- Does each DI provider closure construct one dependency and resolve only through its resolver?
- Are services, repositories, and clients registered individually without layer bundles?
- Does each scenario show its provider groups explicitly and eagerly resolve only runtime roots?
- Are owned resources and named dependencies registered with honest lifecycle and names?
- Does the container expose only runtime capabilities needed by executable callers?
- Does a wiring smoke test prove the configured graph and shutdown ownership?
