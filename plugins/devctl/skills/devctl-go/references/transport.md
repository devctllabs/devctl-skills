# Transport Layer

## Contents

- Role
- Aggregation and Construction
- Mapping and Errors
- Testing
- Review Checklist

## Role

Use `internal/transport` for inbound protocols. A transport validates protocol DTO shape, maps DTOs
to domain/usecase contracts, calls business behavior through explicit interfaces, maps results back,
and converts domain errors to protocol responses.

```text
internal/transport/
  servergrpc/
  serverhttp/
  consumerkafka/
```

Do not put business logic, repository calls, outbound client implementations, storage details, or
service construction in transport packages. Do not use domain models as external DTOs.

## Aggregation and Construction

Mirror generated protocol boundaries in handwritten code. Keep generated HTTP/gRPC/Kafka types in
the matching transport package and discover custom output paths from `devctl.yaml` or codegen config.

Root `handlers.go` files may aggregate generated service interfaces, route groups, registration
helpers, or handler sets. They must not read the DI container, accept a private service bundle, or
choose concrete implementations. DI constructs handlers with explicit service/usecase capabilities
and passes them into protocol aggregation.

Prefer one operation per file in large controllers. Keep the handler struct/constructor in
`handler.go`; keep shared protocol middleware, validators, DTO mappers, and error mappers in a
protocol-local `common` package only when genuinely reused.

## Mapping and Errors

- Validate wire format at the transport boundary; keep business validation inward.
- Map protocol DTOs to named commands/queries and results/views back to protocol responses.
- Declare an exported narrow local interface for each service/usecase capability accepted by an
  exported constructor. Concrete providers satisfy it implicitly; do not import a provider-owned
  layer interface.
- Map shared domain categories with `errors.Is` in one protocol-level mapper.
- Recognize canceled and deadline-exceeded categories before generic unavailable/internal mapping;
  choose the caller-visible outcome in the selected protocol contract.
- Use `errors.As` for safe feature-specific details before falling back to shared mapping.
- Add a controller-local mapper only for typed details, contract extensions, or policy overrides.
- Keep status codes, Problem Details, gRPC details, and generated responses out of domain/service.
- Never serialize `err.Error()` or a retained raw cause; construct a safe protocol response from the
  matched domain category and approved typed domain facts.

## Testing

Use generated gomock mocks for narrow service/usecase interfaces. Test request/response mapping,
protocol validation, domain-error mapping, auth actor handoff, middleware behavior, and custom
registration. Do not re-test business policy or count a transport integration test as service
coverage. Follow `testing-strategy.md` and the selected protocol reference.

## Review Checklist

- Is all inbound protocol knowledge confined to transport?
- Are business dependencies explicit and narrow?
- Are construction and concrete implementation selection kept in DI?
- Are shared and feature-specific error mappings owned once?
