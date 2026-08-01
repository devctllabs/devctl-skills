---
name: devctl-openapi
description: Use when creating, extending, or reviewing OpenAPI 3.1 contracts and YAML schema trees, including API paths, operations, request/response schemas, shared components, problem details, discriminated unions, or domain-split OpenAPI files in a downstream-friendly structure.
---

# Devctl OpenAPI

Use this skill to author OpenAPI 3.1 contracts with a compact, reusable structure: one root contract, domain files for resource-specific paths and schemas, and shared components for cross-cutting parameters, primitive schemas, and error responses.

## Workflow

1. Inspect the existing OpenAPI files, package scripts, and generated-code boundaries before editing. Preserve the local file layout and naming when it is coherent.
2. If the project has no coherent OpenAPI layout, use a root contract that references domain files and shared components rather than placing every path and schema in one file.
3. Model the API contract first: resources, path hierarchy, operations, request bodies, success responses, error responses, and schema ownership.
4. Keep object schemas strict and explicit: `type: object`, `additionalProperties: false`, complete `required`, stable property names, and reusable `$ref` entries for repeated concepts.
5. Use `$devctl` when OpenAPI files must be wired into `devctl.yaml`, sources/components must be updated, or Devctl CLI generation must run. This skill owns OpenAPI contract content.
6. Validate authoring quality with YAML/OpenAPI checks and manual review. Do not update generated clients, mock runtime output, or codegen drift unless the user explicitly asks.

## References

- Read `references/structure.md` for root contract shape, domain file split, shared components, and `$ref` conventions.
- Read `references/schemas.md` for strict object schemas, identifiers, timestamps, enums, nullable values, and examples.
- Read `references/operations.md` for paths, HTTP methods, `operationId`, request bodies, success responses, and response status conventions.
- Read `references/errors.md` for reusable `application/problem+json` responses, validation issue contracts, and localized-string boundaries.
- Read `references/polymorphism.md` for `oneOf` plus discriminator patterns and variant schema rules.
- Read `references/review-checklist.md` before finishing contract edits.

## Default Decisions

- Prefer OpenAPI `3.1.0` with JSON Schema 2020-12 when starting a new contract.
- Prefer YAML for hand-authored contracts.
- Prefer `$ref` for reusable parameters, shared primitives, request bodies, response bodies, and public domain schemas.
- Prefer domain file names by resource area, such as `workspaces.yaml`, `orders.yaml`, or `billing.yaml`.
- Prefer stable, verb-led `operationId` values such as `listWorkspaces`, `createWorkspace`, `getWorkspace`, `updateWorkspace`, and `deleteWorkspace`.
- Prefer facts-based validation errors (`issues[]` with `path`, `code`, and optional `params`) over user-language backend strings.
- Keep generated code out of scope for this skill unless the user asks for codegen work.
