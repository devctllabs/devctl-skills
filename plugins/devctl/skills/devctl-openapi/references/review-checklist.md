# Review Checklist

Use this checklist before finishing OpenAPI contract edits.

## Structure

- The root file declares OpenAPI metadata and references domain files.
- Domain files own domain paths and domain schemas.
- Shared components contain only cross-domain parameters, primitives, and reusable responses.
- Public schemas that external consumers need are reachable from the root contract.
- Public error schemas such as `ProblemDetails` are exported from the root contract when the root exports other public schemas.

## Paths And Operations

- Each operation has a stable, unique `operationId`.
- Path parameters are declared once at the path item level when shared by all methods.
- Request bodies use named schemas through `$ref`.
- Success statuses match the behavior: `200`, `201`, or `204`.
- Error statuses are reusable and operation-relevant.

## Schemas

- Object DTOs use `type: object`, `additionalProperties: false`, `required`, and explicit `properties`.
- Server-owned fields are not required in client request schemas.
- Nullable values use the project's established OpenAPI style.
- Enums represent protocol facts, not UI copy.
- Examples satisfy the schema and stay language-agnostic.

## Errors

- Error responses use `application/problem+json`.
- Reusable error responses point at the public `ProblemDetails` schema.
- `ProblemDetails.discriminator.mapping` covers every stable problem type.
- `ProblemType`, `MessageProblemDetails.type`, and `ProblemDetails.discriminator.mapping` stay aligned.
- Validation errors expose facts through `issues[]`, `path`, `code`, and optional `params`.
- Backend contracts do not depend on localized frontend strings.

## References

- Relative `$ref` paths are valid from the file that contains them.
- Local refs point to existing component names.
- Cross-domain refs are intentional and do not create accidental ownership confusion.
- No generated output was edited as part of contract authoring unless explicitly requested.

## Validation

- Run the project's existing OpenAPI/YAML validation command if one exists.
- If no validator exists, at least parse edited YAML and manually inspect changed `$ref` targets.
- Do not install new validators or run generated-client drift checks unless the user asks.
