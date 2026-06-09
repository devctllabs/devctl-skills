# Schemas

Use this reference when authoring component schemas.

## Strict Object Shape

For contract DTOs, prefer explicit closed objects:

```yaml
Workspace:
  type: object
  additionalProperties: false
  required:
    - id
    - title
    - updatedAt
  properties:
    id:
      $ref: '../shared/components.yaml#/components/schemas/Id'
    title:
      type: string
      minLength: 1
    updatedAt:
      $ref: '../shared/components.yaml#/components/schemas/DateTime'
```

Rules:

- include every always-present property in `required`;
- omit optional properties from `required`;
- use `additionalProperties: false` for DTOs unless the object is intentionally open-ended;
- use `minLength`, `minimum`, `maximum`, `minItems`, and `maxItems` where the contract knows the boundary;
- add examples for important public schemas, not every tiny helper schema.

## Identifiers And Timestamps

Define shared primitives once and reuse them:

```yaml
Id:
  type: string
  minLength: 1

DateTime:
  type: string
  format: date-time
```

Use domain-specific parameter names (`workspaceId`, `deckId`, `itemId`) while sharing the `Id` schema.

## Drafts, Records, And Result Schemas

Use separate schemas when request and response shapes differ:

- `Workspace` for the returned resource;
- `WorkspaceDraft` or `CreateWorkspaceRequest` for input;
- `WorkspaceListResult`, `DeleteWorkspaceResult`, or similar for response envelopes.

Do not make a request schema include server-owned fields such as generated IDs, timestamps, derived counters, or lifecycle state unless the API truly accepts them.

## Nullable Values

In OpenAPI 3.1, prefer JSON Schema unions:

```yaml
activeWorkspaceId:
  oneOf:
    - $ref: '../shared/components.yaml#/components/schemas/Id'
    - type: 'null'
```

Use `nullable: true` only when the existing project or toolchain consistently uses OpenAPI 3.0 style.

## Enums

Use enums for stable protocol values:

```yaml
SortDirection:
  type: string
  enum:
    - asc
    - desc
```

Avoid encoding user-facing copy as enum values. Enums should be facts or protocol states.

## Examples

Examples should be realistic, language-agnostic, and consistent with schema constraints. Avoid localized UI strings in backend contracts unless the API is explicitly a localization API.
