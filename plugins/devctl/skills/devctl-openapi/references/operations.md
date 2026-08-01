# Operations

Use this reference when adding or changing paths and operations.

## Path Design

Prefer resource-oriented URLs:

- collection: `/workspaces`;
- item: `/workspaces/{workspaceId}`;
- nested collection: `/workspaces/{workspaceId}/folders`;
- command-like transition: `/trash/items/{itemId}/restore`.

Use path-level `parameters` when all methods on a path item share the same path parameter.

## Operation Naming

Use stable, verb-led `operationId` values:

- `listWorkspaces`;
- `createWorkspace`;
- `getWorkspace`;
- `updateWorkspace`;
- `deleteWorkspace`;
- `restoreTrashItem`;
- `searchContent`.

Avoid generic IDs such as `get`, `postWorkspace`, or `workspaceAction`.

## Request Bodies

For JSON body operations:

```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/WorkspaceDraft'
```

Prefer named `$ref` schemas over inline objects. This keeps contract output easier to consume and review.

## Success Responses

Use status codes consistently:

- `200` for read, update, search, and command operations that return a body;
- `201` for create operations that return the created resource or reference;
- `204` for successful operations with no response body.

Every operation should declare at least one explicit 2xx response. If the local runtime requires exactly one 2xx response per operation, preserve that rule.

Use this default matrix when the project has no stronger convention:

| Operation | Success | Common errors |
| --- | --- | --- |
| list collection | `200` with array or result envelope | `400`, `404` for scoped collections, `500` |
| get item | `200` with resource | `404`, `500` |
| create item | `201` with resource or reference | `400`, `404` for parent scope, `422`, `409`, `500` |
| update item | `200` with updated resource or reference | `400`, `404`, `422`, `409`, `500` |
| delete or move to trash | `204` with no body, or `200` when a result is needed | `404`, `409`, `500` |
| search | `200` with result groups | `400`, `404` for missing scope, `422`, `500` |
| restore/transition command | `204` with no body, or `200` when returning state | `404`, `409`, `500` |

## Error Responses

Use reusable shared responses for common error types:

```yaml
responses:
  '400':
    $ref: '../shared/components.yaml#/components/responses/BadRequest'
  '404':
    $ref: '../shared/components.yaml#/components/responses/NotFound'
  '422':
    $ref: '../shared/components.yaml#/components/responses/Validation'
  '500':
    $ref: '../shared/components.yaml#/components/responses/Unexpected'
```

Only declare error statuses that are meaningful for the operation.

## Summaries

Use short operation summaries that describe behavior, not UI wording:

- good: `Move a workspace to trash.`
- good: `Search content within a workspace, folder, or deck scope.`
- weak: `Submit form.`
- weak: `Show nice dashboard data.`
