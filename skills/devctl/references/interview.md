# Project Interview

Use this reference only when repository inspection cannot settle a decision that changes the
manifest or requested CLI workflow.

## Decision order

1. Project identity: kebab-case name, Go module path, new or existing repository.
2. Required components: HTTP, gRPC, Kafka, databases, Redis, S3, logging, health, telemetry, or
   pprof.
3. Contract ownership: local server contract, local source, or external source and consumer.
4. Runtime activation: always active or controlled by `start`.
5. Requested output: manifest only, scaffold, sync/lint/gen, or handwritten implementation.

## Discover before asking

- Infer the project name from the repository and the module from `go.mod` when unambiguous.
- Preserve existing contract and generated paths.
- Use CLI defaults for a new standard component; do not ask the user to restate them.
- Treat an existing `devctl.yaml`, `devctl inspect`, and project tasks as stronger evidence than
  examples in this skill.
- Ask for a path only when multiple existing candidates are plausible or a non-standard location
  is intentional.

## Component decisions

Collect only the fields needed for the selected branch:

- HTTP/gRPC server: whether it exists, contract root, and runtime start policy.
- HTTP/gRPC client: name, source, export or source-relative path, and explicit generator config
  only when the project uses one.
- Kafka endpoint: role, name, topic, contract format, source selection, message/encoding for Proto,
  and consumer start policy.
- Database: connection name, variant kind, default variant when several exist, DSN policy, and
  migration opt-out or path override.
- Redis: connection name and optional local address.
- S3: bucket name; ask for a connection only when the project has more than the canonical default.

Use `devctl <command> --help` to discover exact flags after the desired shape is known.

## Completion

The interview is complete when every field that would alter the requested manifest diff or command
sequence is either discovered, answered, or covered by a confirmed CLI default. Leave unrelated
architecture and implementation decisions to the owning skill.
