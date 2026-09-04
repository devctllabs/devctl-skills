# Client Layer

## Contents

- Role and Shape
- Protocol Ownership
- Subprocess Clients
- Error Mapping
- Testing
- Review Checklist

## Role and Shape

Put outbound integrations in `internal/client`: HTTP/gRPC APIs, third-party SDKs, external message
APIs and producers, and external commands/subprocess protocols. Keep business rules, inbound
delivery, and internal storage outside clients.

```text
internal/client/<system>/
  client.go
  types.go
  mapper.go
  errors.go
  grpc/
  http/
  sandbox/
```

Keep compact integrations in one file. Split types, mappers, errors, or protocol implementations
only when volume or alternatives justify it. Declare interfaces in the consuming service/usecase
and wire concrete clients in `internal/deps`.

```text
internal/service/billing/service.go     # type BillingClient interface { ... }
internal/client/billing/billing.go      # type Client struct { ... }
```

## Protocol Ownership

- Own request construction, authentication, protocol DTOs, response parsing, timeout, retry,
  tracing, circuit-breaker, and SDK details inside the client.
- Map results into named service-facing contracts before returning.
- Do not expose HTTP statuses, gRPC codes, SDK types, broker errors, or raw decoded maps.
- Keep application selection/orchestration in service/usecase when one operation combines a client
  with repositories or other clients.
- Put outbound producers in this layer unless the established repository uses a more specific
  equivalent boundary. Read `kafka-and-messaging.md` for messaging policy.

## Subprocess Clients

Keep command construction, executable resolution, arguments, environment, stdin/stdout/stderr,
exit status, timeout/cancellation, and external contract validation inside the concrete client.
Expose an application capability rather than an `Exec`/`RunCommand` mirror. Read
`io-boundaries-and-platform.md` before adding a generic command runner.

## Error Mapping

Normalize protocol and SDK failures into the categories required by the consumer-owned interface.
Preserve `errors.Is`/`errors.As`, add safe operation context, and keep credentials or sensitive
response bodies out of errors and logs.

## Testing

Test request/argument construction, authentication input, parsing/mapping, external error
normalization, timeout/retry/circuit-breaker behavior owned by the client, and cancellation. For
subprocess clients, cover stdout/stderr, non-zero exits, timeouts, and malformed external output.

Use protocol servers, SDK-owned test hooks, generated gomock runner mocks, or helper processes at
the client boundary as appropriate. Do not test subprocess mechanics through services. Add a runner
interface only when repeated commands or lifecycle behavior make it a real seam. Follow
`testing-strategy.md`.

## Review Checklist

- Is the integration outbound and named for the external system/capability?
- Does the consuming business package own the interface?
- Are protocol details and failures normalized before returning?
- Do direct client tests prove the concrete boundary behavior?
