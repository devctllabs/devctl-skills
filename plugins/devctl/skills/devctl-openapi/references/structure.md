# Contract Structure

Use this reference when creating or reorganizing an OpenAPI contract tree.

## Recommended Layout

Use a small root file that owns API metadata, servers, tags, root path registration, and exported shared components:

```text
api/openapi/
|-- openapi.yaml
|-- domains/
|   |-- workspaces.yaml
|   |-- folders.yaml
|   `-- notes.yaml
`-- shared/
    `-- components.yaml
```

Adapt paths to the project. Preserve an existing coherent layout instead of forcing this exact tree.

## Root Contract

The root contract should:

- declare `openapi: 3.1.0`;
- declare `jsonSchemaDialect: https://json-schema.org/draft/2020-12/schema` when the project uses JSON Schema 2020-12;
- include `info`, `servers`, `security`, and `tags`;
- register each public path under `paths` using `$ref` to domain files;
- re-export shared parameters, reusable responses, and public schemas under `components`.

Keep the root file navigable. Do not put all domain schemas in the root unless the API is tiny.

Root `components.schemas` should include public resource, result, and error schemas that external consumers or downstream tools need to find from the root contract, such as `Workspace`, `SearchResultGroup`, `Settings`, and `ProblemDetails`. Domain-private helper schemas can stay only in the domain file.

## Domain Files

Each domain file should own:

- path item fragments under `paths`;
- operation-local request and response schemas for that domain;
- domain-specific enum, object, draft/input, and result schemas under `components.schemas`.

Use path item names that describe the resource shape, not the literal URL, for example:

```yaml
paths:
  workspaces:
    get: ...
    post: ...
  workspaceById:
    parameters:
      - $ref: '../shared/components.yaml#/components/parameters/WorkspaceId'
    get: ...
    put: ...
    delete: ...
```

The root file maps literal URLs to these path item fragments.

## Authoring Sequence

When adding a new domain or resource:

1. Add or update the domain file under `domains/`.
2. Add path item fragments under the domain file's `paths`.
3. Add domain-owned schemas under the domain file's `components.schemas`.
4. Register the literal URL in the root `paths` with a `$ref` to the domain path item.
5. Add a root `tag` for the domain if it is a new operation group.
6. Add shared path/query parameters in `shared/components.yaml` only when they are reused across operations or domains.
7. Re-export public schemas from the root `components.schemas`; keep internal helper schemas local.

## Shared Components

Use shared components for concepts that cross domain boundaries:

- path parameters such as `WorkspaceId` or `ItemId`;
- query parameters such as sort field and sort direction;
- primitive schemas such as `Id`, `DateTime`, and reusable enum values;
- common error responses and problem-detail schemas.

Avoid moving domain-only fields into shared components just because they are small.

## Ref Conventions

- Use local refs within a file: `#/components/schemas/Workspace`.
- Use relative refs across files: `../shared/components.yaml#/components/schemas/Id`.
- Re-export important public schemas from the root contract when downstream tools or external consumers need root-level access.
- Prefer schema `$ref` in request bodies instead of inline object schemas when downstream tooling expects named schemas.
