# gRPC Contract Naming

Apply this convention to Devctl-owned local gRPC contracts. Preserve filenames from external
sources.

Name a file that declares a service as `<owner>.<service>.proto`:

- write both segments as ASCII `lower_snake_case` matching
  `[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)*`;
- derive `owner` from the contract-owning server project, normalizing names such as
  `checkout-service` to `checkout_service`;
- convert the full declared service name to `lower_snake_case` without dropping a `Service`
  suffix: `OrderService` becomes `order_service`;
- keep one protobuf `service` declaration per file.

Use `<owner>.<purpose>.proto` for a file that contains only shared types. Choose a concrete purpose
such as `common_types`, not a generic name such as `types`.

Keep the gRPC major version in the protobuf package and its directory path, not in the filename.
For example, use `checkout_service.order_service.proto` under a versioned package path, not
`checkout_service.order_service.v1.proto`.

Treat malformed local filenames as lint errors. Check the filename grammar deterministically; do
not try to infer whether the chosen owner or purpose is semantically correct.

This dot-delimited convention intentionally replaces Buf's `FILE_LOWER_SNAKE_CASE` rule. When Buf
`STANDARD` is enabled, exclude only `FILE_LOWER_SNAKE_CASE` and retain the other standard rules.
