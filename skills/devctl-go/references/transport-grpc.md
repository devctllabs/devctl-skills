# gRPC Transport

## Contents

- Package Shape
- Generated Service Aggregation
- Controllers
- OpenTelemetry Stats Handlers
- Error Mapping
- Testing
- Review Checklist

## Package Shape

```text
internal/transport/servergrpc/
  handlers.go
  common/
    middleware.go
    validator.go
    error_mapper.go
    dto_mapper.go
  echo/
    handler.go
    echo.go
    echo_test.go
  quickstats/
  advancedstats/
```

Keep generated gRPC imports inside this protocol boundary. Use configured generated paths rather
than assuming `gen/servergrpc`.

## Generated Service Aggregation

Aggregate generated service surfaces in `handlers.go` when multiple generated services exist:

```go
package servergrpc

import (
    "context"

    gen "<module>/gen/servergrpc"
)

type EchoHandler interface {
    // EchoServiceEcho handles the generated Echo RPC contract.
    EchoServiceEcho(ctx context.Context, req *gen.EchoRequest) (*gen.EchoReply, error)
}

type StatsQueryHandler interface {
    // StatsQueryServiceCampaignStats handles the generated campaign-stats RPC contract.
    StatsQueryServiceCampaignStats(ctx context.Context, req *gen.CampaignStatsRequest) (*gen.CampaignStatsReply, error)
}

type Handlers struct {
    EchoHandler
    StatsQueryHandler
}
```

The aggregate owns the generated registration shape, not dependency construction.

## Controllers

```text
internal/transport/servergrpc/<controller>/
  handler.go
  <operation>.go
  error_mapper.go     # optional feature-specific details
  *_test.go
```

Export narrow interface names used by exported constructors:

```go
type StatsQuerier interface {
    // Query returns the advanced statistics selected by q.
    Query(ctx context.Context, q domstats.AdvancedStatsQuery) (domstats.AdvancedStatsView, error)
}

type Handler struct {
    logger *zap.Logger
    stats  StatsQuerier
}

func NewHandler(logger *zap.Logger, stats StatsQuerier) *Handler {
    return &Handler{logger: logger, stats: stats}
}
```

The gRPC provider resolves only the service it needs and passes it explicitly:

```go
statsService, err := di.Resolve[*stats.Service](r)
if err != nil {
    return nil, err
}

handler := statsgrpc.NewHandler(
    logger,
    statsService,
)
```

Put each generated operation implementation in its own file when useful:

```go
func (h *Handler) AdvancedStatsQueryServiceQuery(
    ctx context.Context,
    req *gen.QueryRequest,
) (*gen.QueryReply, error) {
    // Validate DTO, map to a domain query, call service, map the view to proto.
}
```

## OpenTelemetry Stats Handlers

Instrument gRPC with `go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc`
stats handlers. Supply the instance-owned providers and propagator explicitly:

```go
otelOptions := []otelgrpc.Option{
    otelgrpc.WithTracerProvider(runtime.TracerProvider()),
    otelgrpc.WithMeterProvider(runtime.MeterProvider()),
    otelgrpc.WithPropagators(runtime.Propagator()),
}

server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler(otelOptions...)),
)

conn, err := grpc.NewClient(
    target,
    grpc.WithTransportCredentials(transportCredentials),
    grpc.WithStatsHandler(otelgrpc.NewClientHandler(otelOptions...)),
)
```

Use `grpc.StatsHandler` and `grpc.WithStatsHandler`; do not add the deprecated otelgrpc client or
server interceptors. Current default instrumentation emits one client/server span per RPC and
standard `rpc.client.call.duration` / `rpc.server.call.duration` metrics. It does not add per-message
events by default. Keep application operation spans in explicit service/usecase decorators rather
than duplicating the RPC span in generated or handwritten transport methods.

## Error Mapping

Map common domain categories to gRPC status codes in `servergrpc/common/error_mapper.go`. Add a
controller mapper only for feature-specific typed details; handle those first and delegate shared
categories to common. Map canceled and deadline-exceeded categories to `codes.Canceled` and
`codes.DeadlineExceeded`. Keep gRPC status and detail types out of business packages.

## Testing

Test generated method conformance, DTO mapping, validation, status/detail mapping, interceptor
handoff, and registration when custom. Use a generated gomock mock of the narrow application
interface and avoid asserting service internals. Follow `transport.md` and `testing-strategy.md`.

## Review Checklist

- Does handwritten code conform to the generated service boundary?
- Are controllers constructed with explicit capabilities?
- Are gRPC statuses/details mapped only in transport?
- Do direct tests prove protocol behavior and registration?
