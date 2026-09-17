# Review Checklist

Use this checklist before finishing contract work. Apply house-style migration checks only to new or
explicitly normalized surfaces; preserve coherent existing conventions elsewhere.

## Contract behavior

- Every requested resource and transition has the intended path and HTTP method.
- Every operation has a stable unique `operationId` and an explicit success response.
- Request bodies and success responses use named schemas when their shapes are public or reused.
- Declared error statuses are meaningful for the operation.

## Schemas and errors

- New object DTOs are closed, explicit, and have complete `required` lists.
- Request schemas exclude server-owned fields unless the API accepts them.
- Enums and discriminator values are stable protocol facts.
- Examples satisfy their schemas.
- New error responses use the Problem Details family and aligned problem type mappings.
- Validation issues expose facts through `path`, `code`, and optional `params`.

## Structure and references

- The topology matches the contract's scale or preserves the existing coherent layout.
- Domain and shared ownership is unambiguous in a multi-file contract.
- Every local and relative `$ref` resolves from its containing file.
- Public component names and intended root exports remain reachable.
- Remote references follow the repository's dependency policy.

## Project compatibility

- Existing validators, bundlers, and generator configs were inspected when topology, references, or
  public schemas can affect them.
- The project's OpenAPI validation command ran successfully when available.
- Changes are limited to handwritten OpenAPI sources.
