# Validation

## Contents

- Ownership by Layer
- Validation Errors
- Testing
- Review Checklist

## Ownership by Layer

Validate each fact at the layer that owns it. Early protocol validation improves feedback; inward
validation preserves invariants for every entrypoint.

- Transport validates required fields, primitive types, UUID/email/date/enum formats, lengths,
  ranges, and protocol-level cross-field shape. It validates DTOs and returns protocol validation
  responses.
- Domain/service validates entity invariants, state transitions, forbidden business combinations,
  and rules that must hold across every entrypoint.
- Usecase validates process context, related entity conditions, permissions, and flow-specific
  constraints. Preliminary uniqueness checks may improve diagnostics; storage still enforces truth.
- Repository enforces `NOT NULL`, `UNIQUE`, `CHECK`, foreign keys, optimistic locking, and
  concurrency integrity, then maps constraint failures to domain categories.

Keep validation representations local: transport DTO issues at delivery, domain categories or
typed facts inward, and raw constraints/drivers inside repositories.

## Validation Errors

Transport format errors may carry a field/path, code, and safe params for API clients. Domain
errors remain protocol-independent, use sentinel categories for ordinary branching, and use typed
errors only for stable structured facts while preserving `errors.Is`.

Map domain validation categories to HTTP/gRPC/message outcomes in transport. Map storage and client
failures before they reach business callers. Keep localized labels and generated validation DTOs at
the protocol/UI boundary.

## Testing

Test protocol shape in transport, business invariants and transitions in domain/service, flow
conditions in usecase, and constraints/races in repository integration tests. Use one owner per
scenario rather than repeating the same assertion through every layer. Follow
`testing-strategy.md` and the affected layer reference.

## Review Checklist

- Is every validation rule owned at the narrowest authoritative layer?
- Are invariants protected independently of transport?
- Are protocol, domain, and storage error representations separated?
- Do owner tests prove both useful feedback and final integrity?
