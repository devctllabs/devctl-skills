# Delivery, messaging, and access

Inbound adapters translate one protocol into an application capability. Keep generated messages,
headers, status codes, middleware, authentication state, and retry/ack mechanics at the delivery
edge; pass typed domain data and actors inward.

## Shared transport rules

- Organize `internal/transport/<protocol>` by logical controller or subscription. Aggregate
  registration only when several generated services or route groups require it.
- Handlers declare narrow service/usecase interfaces. They receive no DI container, concrete
  repository/client, driver, or SDK.
- Decode and validate protocol shape, map to domain commands/queries, invoke one application
  operation, then map results or stable error categories back to the protocol.
- Keep common protocol mappings in one shared mapper and add controller-local details only for a
  real contract difference. Preserve cancellation and deadline semantics.
- Generated code remains an adapter edge. Put handwritten authentication, mapping, telemetry, and
  business calls outside generated paths.

Transport tests exercise the public protocol boundary with generated mocks of its application
capability. Prove registration, decoding, validation, mapping, safe errors, context propagation,
and middleware handoff without duplicating service policy.

## HTTP

For contract-first HTTP, use `$devctl-openapi` for the canonical OpenAPI document and `$devctl` for
the configured server/client generation. Inspect the generated framework and interfaces before
writing handlers. Prefer strict generated bindings and an embedded or otherwise canonical runtime
spec so routing, types, security requirements, and request validation cannot drift between files.
The generator owns bindings, models, registration helpers, and an embedded spec only when configured.
Use `github.com/devctllabs/go-libs/oapivalidator` for runtime OpenAPI validation; handwritten
transport/deps code owns construction and wiring of that library, authentication adapters, other
middleware, and mappings.

Use the same configured base URL for validation and route registration. Compose one deliberate
outer-to-inner pipeline: server telemetry, request correlation/access logging, recovery and body
limits, then OpenAPI validation/authentication, generated wrappers, handwritten mapping, and the
application call. Preserve framework-specific ordering required to observe matched route templates.

OpenAPI security evaluation belongs to the validator. Preserve AND/OR requirement semantics and
propagate context enrichment between schemes and into the handler. Convert validated credential
state into a typed actor before entering service/usecase code.

Map validation and domain categories to the established response contract. Preserve useful HTTP
distinctions such as missing route, method mismatch with `Allow`, malformed or unsupported input,
authentication, authorization, conflict, cancellation, and internal failure. Return safe RFC 9457
Problem Details when the contract uses them; retain raw schema, submitted values, backend errors,
credentials, and internal paths only for controlled server-side inspection.

Install one server instrumentation layer and one owner for standard HTTP request metrics. Generated
wrappers and validators may enrich the active span with bounded route or operation identifiers;
they do not create duplicate server spans or RED metrics. Instrument outbound HTTP in the concrete
client with the explicitly supplied telemetry runtime rather than replacing a process-global
default transport.

## gRPC

Keep generated gRPC contracts at transport/client boundaries. When several generated services are
registered together, use a handwritten aggregate that satisfies the generated registration shape
and delegates each operation to a focused controller. Controllers map protobuf messages to domain
contracts and receive explicit application capabilities.

Map shared domain categories to gRPC codes in one protocol mapper. Add stable typed status details
only when the API contract requires them. Preserve `Canceled` and `DeadlineExceeded`, and keep gRPC
status/detail types outside business packages.

Use the OpenTelemetry mechanism supported by the selected gRPC version; with current `otelgrpc`,
prefer explicit client/server stats handlers supplied with the instance-owned tracer provider,
meter provider, and propagator. Avoid duplicate RPC spans in generated methods or application
decorators.

Test generated method conformance, registration, DTO mapping, validation, status/details, and
context propagation at the gRPC boundary.

## Kafka and messages

Inbound consumers are transport; outbound producers are clients. Split consumers by logical
subscription, with physical topics, groups, retry limits, and destinations supplied by config and
composition. A consumer decodes and validates, maps to a domain command/event, calls one
service/usecase capability, and applies delivery policy.

Carry message and operation identifiers inward explicitly. Business idempotency belongs in the
service/usecase when it changes the operation guarantee; broker offsets alone are insufficient.
Classify outcomes before acknowledgement or retry:

- malformed or incompatible messages follow the explicit drop or DLQ policy;
- transient infrastructure failures may retry within the configured bound;
- business invalid/conflict outcomes follow product policy rather than a generic transport retry;
- cancellation stops processing and is not reclassified as a message failure.

Concrete producers map domain events to generated messages, apply configured routing, propagate
trace/idempotency metadata, and normalize broker failures. Use a transactional outbox only when
losing publication after committing state violates correctness. Breaking message changes require a
versioned topic/schema path or another explicit compatibility window; regenerate from canonical
contracts instead of editing output.

Messaging tests prove decode/validation, mapping, application handoff, cancellation, acknowledgement,
retry/drop/DLQ classification, idempotency propagation, safe metadata logging, producer routing,
and broker error normalization. Test outbox recovery only when the operation requires an outbox.

## Authentication and authorization

Transport authenticates credentials and performs coarse protocol admission. Service/usecase owns
resource and business authorization using domain state, tenant scope, and policy dependencies.

- Derive a typed actor/principal from verified JWT, session, API key, mTLS identity, or signature.
  Never accept trusted actor fields from a request body, query, or path.
- Pass the actor explicitly beside the operation command by default. Put it inside a command only
  when commands intentionally model complete audited operation envelopes.
- Map missing or invalid credentials to the protocol's unauthenticated response. Map an authenticated
  actor denied by business policy to forbidden or not-found according to the operation's explicit
  resource-disclosure policy, without exposing policy data.
- External policy engines are service/usecase dependencies declared as consumer-owned interfaces
  and implemented by concrete clients. Repositories may accept tenant-scoped queries for safe
  enforcement but do not decide permission.

Test credential-to-actor mapping at transport, authorization decisions at the owning service/usecase,
tenant-scoped repository calls, and safe unauthenticated/forbidden protocol responses.

## Middleware, decorators, cache, and idempotency

Protocol middleware owns protocol concerns such as correlation, recovery, authentication, request
limits, and access logs. Reusable business behavior across entrypoints belongs in an explicit
service/usecase decorator. Keep the base implementation focused on business decisions and compose
decorators in `internal/deps` in a deliberate, tested order.

Cache policy is application behavior when callers can observe freshness, invalidation, fallback, or
failure. Domain-aware keys and codecs belong to a repository adapter; a shared raw cache mechanism
may live in platform. Idempotency policy belongs with the operation, while persistence and atomic
claim mechanics belong to its repository.

Document wrapper order when it changes outcomes: for example, authorization before cache access,
idempotency claim around the state-changing operation, and metrics outside the component whose
latency it reports. Test observable composition once at the owner that assembles it.
