# Contract Structure

Use this reference when creating a contract, selecting its file topology, reorganizing it, or
changing cross-file references.

## Preserve before reorganizing

Treat a coherent existing single-file or multi-file layout as a project convention. Add requested
behavior within it. Moving schemas, changing public component names, or converting topology is a
separate migration because it can affect references and downstream consumers.

Inspect relevant project validators, bundlers, and generator configuration before introducing
external `$ref` values, moving public components, or changing public schema shapes. Tooling
compatibility constrains a repository; it does not define the OpenAPI design rules.

## Single-file contract

Use one file when the API has one bounded resource domain or remains small enough to navigate as a
whole:

```yaml
openapi: 3.1.0
info:
  title: Orders API
  version: 1.0.0
paths: {}
components:
  parameters: {}
  responses: {}
  schemas: {}
```

Keep paths under `paths` and reusable parameters, responses, and schemas under their matching
`components` sections. Use document-local refs such as `#/components/schemas/Order`.

Do not split a small contract merely to create a directory convention.

## Domain-split contract

Use a root plus domain files when the API contains at least two independently evolving resource
areas:

```text
api/openapi/
|-- openapi.yaml
|-- domains/
|   |-- orders.yaml
|   `-- billing.yaml
`-- shared/
    `-- components.yaml
```

The root owns API metadata and registers public paths. Domain files own their resource-specific
path items and schemas. Shared components contain only concepts reused across domains.

A root path may reference a named path item in a domain file:

```yaml
paths:
  /orders:
    $ref: './domains/orders.yaml#/paths/orders'
```

The domain file may keep its schemas beside the operations:

```yaml
paths:
  orders:
    get: {}
    post: {}
components:
  schemas:
    Order: {}
    CreateOrderRequest: {}
```

Re-export public schemas from root `components.schemas` only when external consumers or project
tooling require root-level discoverability. Domain-private helpers stay local.

## Shared components

Move a component to `shared/components.yaml` when multiple domains use the same protocol concept,
such as an identifier primitive, timestamp, cross-domain parameter, or common error response.
Similarity alone is not reuse; keep domain-only concepts with their owner.

## Reference rules

- Use `#/...` for references within the current document.
- Resolve relative refs from the file that contains them, not from the process working directory.
- Keep referenced paths inside the contract's owned tree.
- Preserve stable component names when consumers may reference them.
- Confirm every reference with a validator that can load the full contract tree.
- Treat remote refs as an explicit external dependency and preserve the repository's acquisition
  and trust policy.

## Consumer constraints

A repository may use a bundler, generator-specific import mapping, multiple generation passes, or no
code generation. Inspect that configuration when the proposed contract change can affect it rather
than assuming a tool.

When a proposed topology is incompatible with an existing consumer:

1. Identify the exact unsupported reference or schema boundary.
2. Preserve the compatible contract shape.
3. Surface the constraint before proceeding with an incompatible contract change.

Limit changes to handwritten OpenAPI sources.
