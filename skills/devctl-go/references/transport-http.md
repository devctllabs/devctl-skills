# HTTP Transport

## Contents

- Package Shape
- Routing and Handlers
- oapi-codegen Echo 5 Boundary
- Echo OpenTelemetry
- Errors and Validation
- Testing
- Review Checklist

## Package Shape

```text
internal/transport/serverhttp/
  handlers.go
  common/
    middleware.go
    validator.go
    error_mapper.go
    dto_mapper.go
  <controller>/
    handler.go
    <operation>.go
    error_mapper.go   # optional feature-specific response details
```

Keep generated HTTP types and router bindings inside this boundary. Use configured generator paths
rather than assuming `gen/serverhttp`.

## Routing and Handlers

Use `handlers.go` when HTTP has meaningful aggregation such as router construction, route groups,
middleware binding, or a handler set consumed by the server provider. A tiny transport may keep
registration in a package-local helper or server provider, but service construction stays in
`internal/deps`.

Construct controller handlers with narrow service/usecase capability interfaces declared by the
controller. Do not pass the DI container or its private service bundle. Keep request parsing,
response encoding, route parameters, headers, and protocol middleware in transport.

## oapi-codegen Echo 5 Boundary

For a contract-first Echo service using `oapi-codegen`, keep one canonical OpenAPI 3.1 document and
generate a checked-in server package with these capabilities:

```yaml
package: serverhttp
generate:
  models: true
  echo5-server: true
  strict-server: true
  embedded-spec: true
```

The native config owns generator behavior, not the output path. Omit an output field from it. The
Devctl manifest owns `languages.go.generators.http.server_out`, and the generator command writes one
file such as `<server_out>/server.gen.go`. Keep the strict implementation, DTO/domain mapping,
authentication adapter, and DI wiring outside that generated directory.

Use the embedded document as the runtime validation source so routing, generated types, and request
validation cannot silently use different contract files. Construct
`github.com/devctllabs/go-libs/oapivalidator` with that document and the same base URL passed to
`RegisterHandlersWithOptions`. The logical request pipeline is:

```text
Echo OpenTelemetry -> request ID -> access log -> recovery
  -> body limit
  -> OpenAPI validation and authentication
  -> generated Echo wrapper
  -> handwritten strict handler
  -> application usecase
```

OpenAPI Security Requirement semantics belong to the validator. One authenticator call represents
one named security scheme; the validator evaluates AND schemes sequentially and OR alternatives in
contract order. A successful call may enrich `request.Context()`, and the resulting context must
reach later scheme calls and the strict handler. Treat that context as transport authentication
state, then map it to an explicit actor before calling the usecase. Keep authorization policy in the
application layer. Do not put authentication, authorization, OpenTelemetry calls, metrics, or
business behavior into generated endpoint code.

Do not add a framework plugin merely to compose these pieces. The generated package, Echo
middleware, the shared validator library, and handwritten DI/adapter code are the intended
extension points.

## Echo OpenTelemetry

Use `github.com/labstack/echo-opentelemetry` v0.0.2 or a compatible established version for the one
outer HTTP server instrumentation layer. Build middleware with `Config.ToMiddleware()` so invalid
construction returns a startup error instead of using the panic-based convenience constructor.
Supply all three dependencies from `*telemetry.Runtime`:

```go
otelMiddleware, err := (echootel.Config{
    ServerName:     cfg.HTTP.ServerName,
    TracerProvider: runtime.TracerProvider(),
    MeterProvider:  runtime.MeterProvider(),
    Propagators:    runtime.Propagator(),
}).ToMiddleware()
if err != nil {
    return nil, fmt.Errorf("build Echo OpenTelemetry middleware: %w", err)
}

e.Use(otelMiddleware)
e.Use(requestIDMiddleware)
e.Use(accessLogMiddleware)
e.Use(recoveryMiddleware)
e.Use(bodyLimitMiddleware)
e.Use(openAPIValidatorMiddleware)
```

Register these with `Echo.Use`, in the shown outer-to-inner order. Do not use `Pre`: routing must
already have resolved the matched route template before telemetry records its final attributes.
Do not skip liveness or readiness by default; only add a skipper after a measured operational need
and keep its policy explicit. The Echo layer owns one server span and standard HTTP metrics. The
OpenAPI validator may enrich that active span with a bounded `operationId`, but it and generated
handlers must not create another server span or duplicate HTTP RED metrics.

Instrument outbound HTTP at the client transport boundary with the same explicit runtime:

```go
transport := otelhttp.NewTransport(
    http.DefaultTransport,
    otelhttp.WithTracerProvider(runtime.TracerProvider()),
    otelhttp.WithMeterProvider(runtime.MeterProvider()),
    otelhttp.WithPropagators(runtime.Propagator()),
)
client := &http.Client{Transport: transport}
```

Construct and own that client in `internal/deps`; do not replace the process-wide default transport.

## Errors and Validation

- Map shared domain categories to HTTP statuses in one protocol-level mapper.
- Handle feature-specific typed details before delegating to common mapping.
- Emit typed details or response extensions only when safe, stable, and contractual.
- Map DTO/shape validation to `400 Bad Request` or the established validation contract.
- For OpenAPI request middleware, preserve its `404`, `405` plus `Allow`, `400`, `415`, `422`,
  `401` plus a safe challenge, `403`, and `500` classification unless the API contract establishes
  another mapping.
- Return safe RFC 9457 Problem Details. Never serialize raw schema dumps, submitted values, or
  authentication backend errors; retain the original cause for server-side logging and inspection.
- Keep business validation in service/usecase and storage constraints in repositories.
- Keep Problem Details, statuses, headers, and generated response types out of business packages.

## Testing

Use the public HTTP boundary with a generated gomock mock of its narrow application interface. Test
method/path registration, request decoding, response encoding, validation failures, shared and
feature-specific error mapping, middleware handoff, and safe details. Do not duplicate service
policy. Follow `transport.md` and `testing-strategy.md`.

## Review Checklist

- Does the handler only adapt HTTP to an application capability?
- Are routing, middleware, DTOs, and statuses transport-owned?
- Does generated Echo 5 strict code come from the embedded OpenAPI 3.1 contract and remain
  free of handwritten auth/telemetry logic?
- Do the validator and generated registration use the same base URL?
- Is construction kept in DI?
- Do direct HTTP tests prove caller-visible behavior?
