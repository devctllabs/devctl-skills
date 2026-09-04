# Kafka and Messaging

## Contents

- Consumer Boundary
- Consumer Shape
- Producers and Events
- Idempotency, Retry, and DLQ
- Outbox and Compatibility
- Testing
- Review Checklist

## Consumer Boundary

Treat inbound Kafka consumers as transport: decode and validate messages, map them to domain/usecase
contracts, invoke application behavior, and apply transport-local retry/drop/DLQ policy. Split by
logical subscription, not necessarily physical topic.

```text
internal/transport/consumerkafka/
  impressionrecorder/
    consumer.go
    error_mapper.go   # optional consumer-specific policy
    consumer_test.go
  common/
```

Topics, groups, and runtime retry settings come from config/provider construction, not CLI APIs.

## Consumer Shape

```go
type RunnableConsumer interface {
    // Consume processes messages until ctx is canceled or an unrecoverable error occurs.
    Consume(ctx context.Context) error
}

type ImpressionRecorder interface {
    // Record records the impression described by cmd.
    Record(ctx context.Context, cmd domimpression.RecordCommand) (domimpression.RecordResult, error)
}

type Consumer struct {
    logger *zap.Logger
    record ImpressionRecorder
}

func NewConsumer(logger *zap.Logger, record ImpressionRecorder) *Consumer {
    return &Consumer{logger: logger, record: record}
}

func (c *Consumer) Consume(ctx context.Context) error {
    // Loop, decode messages, call service operations, and exit on ctx.Done().
    return nil
}
```

Register logical consumers by name in DI and start them through a typed runtime getter. Keep decode
errors distinct from domain/business errors and honor `ctx.Done()`.

## Producers and Events

Treat outbound producers and message APIs as clients. Declare producer interfaces where service or
usecase consumes them:

```go
type EventProducer interface {
    // PublishOrderApproved publishes event using the configured order-approved route.
    PublishOrderApproved(ctx context.Context, event domorder.OrderApprovedEvent) error
}
```

Concrete producers map domain events to messages, apply configured routing, normalize broker
failures, and contain no business rules:

```go
func (p *Producer) PublishOrderApproved(ctx context.Context, event domorder.OrderApprovedEvent) error {
    msg := mapOrderApproved(event)
    if err := p.writer.WriteMessages(ctx, msg); err != nil {
        return classifyProducerError(err)
    }
    return nil
}
```

## Idempotency, Retry, and DLQ

Extract message/operation IDs and pass them inward explicitly. Put business idempotency in
service/usecase when it affects guarantees; never rely on offsets alone.

Classify before retrying:

- decode/schema errors usually go to DLQ or are dropped by explicit policy;
- transient infrastructure failures may retry;
- business invalid/conflict states follow product policy;
- context cancellation stops processing.

Keep general classification in `consumerkafka/common`. Add consumer-local mapping only for a real
policy override. Do not encode Kafka retry/DLQ policy in domain errors.

## Outbox and Compatibility

Use a transactional outbox only when losing a message after committing state breaks correctness:

```text
If losing the message after committing DB state breaks correctness,
write an outbox record in the same transaction and publish asynchronously.
```

Do not add outbox machinery for best-effort notifications. For breaking contracts, version the
topic/schema/message package, keep old producer/consumer paths during migration when required, and
regenerate from canonical contracts rather than editing generated output.

## Testing

Test decode/validation, DTO mapping, application handoff, cancellation, acknowledgement, retry,
drop/DLQ classification, idempotency-key propagation, and safe message metadata logging. Test
producer mapping, routing, and broker error normalization. Test outbox transaction/recovery only
when outbox behavior exists. Follow `transport.md`, `client.md`, and `testing-strategy.md`.

## Review Checklist

- Are inbound and outbound directions placed correctly despite sharing Kafka technology?
- Are application guarantees separate from transport retry/offset mechanics?
- Is outbox complexity justified by correctness?
- Do direct messaging tests prove each owned policy?
