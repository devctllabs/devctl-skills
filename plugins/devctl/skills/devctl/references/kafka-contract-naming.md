# Kafka Contract Naming

Name every Kafka topic as `<owner>.<entity>.<operation>.vN`:

- write the first three segments as ASCII `lower_snake_case` matching
  `[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)*`;
- use the producing, contract-owning microservice for `owner`, normalizing names such as
  `checkout-service` to `checkout_service`;
- use a singular domain noun for `entity`, such as `order` or `purchase_order`;
- use a completed fact such as `created` for an event, an imperative such as `create` for a
  command, or `events` / `commands` for a multi-type stream;
- use `v[1-9][0-9]*` for the major contract version and increment it only for an incompatible
  contract/topic change.

For a local Proto or JSON schema without `source`, require the schema basename to equal the topic
exactly:

```text
topic: checkout_service.order.created.v1
api/proto/kafka/checkout_service.order.created.v1.proto
api/json/kafka/checkout_service.order.created.v1.json
```

Raw topics have no schema filename. Preserve source-backed external schema filenames instead of
renaming or linting them against the local filename convention.

Prefer one published root message per local schema. Supporting types may live in the same schema;
a multi-type stream may expose one envelope root. Do not prescribe the envelope representation as
part of naming guidance.

Treat malformed topics and mismatched local schema basenames as lint errors. Check the grammar and
topic/basename equality deterministically; do not try to infer whether the chosen domain terms are
semantically correct.

Dot-delimited Proto filenames intentionally replace Buf's `FILE_LOWER_SNAKE_CASE` rule. When Buf
`STANDARD` is enabled, exclude only `FILE_LOWER_SNAKE_CASE` and retain the other standard rules.
