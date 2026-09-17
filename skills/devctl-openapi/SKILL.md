---
name: devctl-openapi
description: Use when designing, creating, extending, or reviewing OpenAPI 3.1 contracts, including single-file or domain-split YAML, paths and operations, strict request/response schemas, problem details, discriminated unions, and downstream contract compatibility.
---

# Devctl OpenAPI

Design, modify, review, and validate handwritten OpenAPI contracts: their protocol semantics, house
style, file organization, and references.

## Workflow

1. Inspect the contract entrypoint, all referenced files, existing layout, and local conventions.
   When changing topology, `$ref` values, or public schemas, also inspect project validation
   commands and relevant bundler or generator configuration. Preserve a coherent existing topology
   unless the user explicitly requests reorganization.
2. For a new contract, choose topology by scale: keep one bounded resource domain in one file; use a
   small root plus domain files when two or more independently evolving domains exist. Extract
   shared components only when they are reused across domains.
3. Model resources, path hierarchy, operations, request bodies, success responses, error responses,
   and schema ownership before authoring details.
4. Apply the Devctl house style to new contract surfaces. Preserve a different coherent local style
   during ordinary edits; normalize it only when the user requests a migration.
5. Treat relevant project tooling as a compatibility constraint on the contract. If the intended
   contract shape conflicts with a discovered constraint, surface the concrete conflict before
   changing the contract.
6. Validate the complete contract with the project's existing OpenAPI command when available and
   resolve every local and cross-file `$ref` from the file that contains it. Report checks that
   could not run. Completion requires the requested contract behavior, references, examples,
   discriminator mappings, and relevant consumer constraints to be accounted for.

## References

- Read `references/structure.md` when creating a contract, choosing topology, reorganizing files,
  or changing cross-file references.
- Read `references/schemas.md` when adding or changing component schemas.
- Read `references/operations.md` when adding or changing paths and operations.
- Read `references/errors.md` when defining or changing error responses.
- Read `references/polymorphism.md` for variant schemas.
- Read `references/review-checklist.md` before finishing contract work.

## House style

For new contract surfaces:

- Use OpenAPI `3.1.0`, JSON Schema 2020-12 semantics, and YAML.
- Use strict object DTOs with explicit properties, complete `required`, and
  `additionalProperties: false`.
- Use named schemas and `$ref` for reused or public request and response shapes.
- Use stable verb-led `operationId` values.
- Use the exact Problem Details family in `references/errors.md`, including stable
  `ProblemType`, `retryable`, entity facts, discriminators, and fact-based validation issues.
- Add `servers`, `security`, and `tags` when the API requires them; they are not empty
  boilerplate.
- Keep localized UI copy out of protocol facts.
