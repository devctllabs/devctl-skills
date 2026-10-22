# Generated Code

Generate OpenAPI clients and keep generated contracts behind the application's service boundary.

## Contents

- Default Location
- OpenAPI Codegen
- Hey API Recipe
- Runtime and Error Boundary
- Generation Checks
- Service Implementation Usage
- DTOs and View Models
- Imports and Aliases
- Guardrails

## Default Location

Put generated code under a dedicated `generated/` folder near the integration boundary it represents.

For OpenAPI and backend API contracts, use:

```text
src/shared/services/api/
|-- runtime-config.ts               # Handwritten client configuration
|-- error-mapping.ts                # Handwritten HTTP/API -> DomainError mapping
|-- sdk-result.ts                   # Handwritten SDK result -> DomainResult conversion
|-- generated/
|   `-- openapi/                    # Codegen output; do not edit manually
|       |-- client.gen.ts
|       |-- sdk.gen.ts
|       |-- types.gen.ts
|       `-- zod.gen.ts
|-- adapters/                       # Handwritten mapping/view-model adapters
`-- index.ts
```

The generated filenames shown are Hey API examples; let the installed generator own its output layout. Add handwritten helpers only when used. Do not put OpenAPI output directly inside `features/*` by default: a backend contract commonly serves multiple frontend use cases.

## OpenAPI Codegen

Use the generator output as an external contract boundary:

- Generated request functions, clients, DTOs, schemas, and generated TanStack Query hooks live in `shared/services/api/generated/<source-name>/`.
- Handwritten Hey API configuration lives in `shared/services/api/runtime-config.ts`; keep an established transport entrypoint when one already exists.
- Handwritten HTTP/API error normalization lives in `shared/services/api/error-mapping.ts`.
- Handwritten request/response mapping lives in `shared/services/api/adapters/`.
- Platform service implementations or composite services consume generated code; they do not own generated files.
- Inside `shared/services/api`, file names do not repeat the `api` prefix. Keep exported symbols explicit, such as `apiClient` and `mapApiErrorToDomainError`.

Use source/spec names for generated folders:

```text
generated/
|-- openapi/
|-- admin-api/
`-- billing-openapi/
```

## Hey API Recipe

For a new client without an established generator, use `@hey-api/openapi-ts` with its Fetch client, named SDK functions, TypeScript types, and Zod validation. Preserve an existing generator, transport, and output convention unless migration is requested. The OpenAPI document is input; this workflow does not create or rewrite the API contract.

Install the generator as an exact-version dev dependency with the project's package manager; install `zod` as a runtime dependency. Add a package script such as `codegen:api` that runs `openapi-ts`. Inspect the installed generator's Node requirements, configuration types, and official migration notes before choosing options. In a new project, prefer Zod 4; preserve a compatible existing Zod version.

Example `openapi-ts.config.ts`, adapting paths to the package root:

```ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './api/openapi.yaml',
  output: 'src/shared/services/api/generated/catalog-api',
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: './src/shared/services/api/runtime-config',
      throwOnError: false,
    },
    '@hey-api/typescript',
    { name: 'zod', definitions: true, requests: true, responses: true },
    {
      name: '@hey-api/sdk',
      operations: { strategy: 'flat' },
      paramsStructure: 'grouped',
      validator: { request: 'zod', response: 'zod' },
    },
  ],
});
```

Generating schemas alone does not activate validation: keep both SDK validators enabled. Generate reusable definition schemas rather than hand-copying API DTO schemas into features. Form schemas can still own UI-specific fields and validation rules.

Use handwritten runtime configuration for the base URL, current authentication, and `responseStyle: 'fields'`. The extensionless runtime path above keeps generated imports compatible with projects that do not enable TypeScript extension imports. The web client uses the standard Fetch implementation. Compose configured client instances with platform services; avoid resetting shared global client configuration for each request or leaking account state between instances.

Keep TanStack Query hooks handwritten and feature-owned. They call injected services through `unwrapDomainResult`; features own query keys, invalidation, and query state. This recipe does not enable the generated Query plugin. Preserve existing generated Query integrations when no migration is requested.

## Runtime and Error Boundary

Convert the SDK's structured result into `DomainResult` in a small handwritten helper or the owning platform service. With `throwOnError: false` and response style `fields`, retain `error`, `response`, and `request` when available. Check for the error result, including validation errors on a 2xx response; absence of `data` alone does not mean failure. Map `204` and void operations to `ok(undefined)`.

Pass the parsed error together with HTTP status and headers to API error mapping. Throwing only the parsed error body would lose transport metadata needed for status fallbacks and `Retry-After`. Follow [error-handling.md](error-handling.md) for the authoritative `DomainError` taxonomy, Problem Details mapping, cancellation control flow, and Query unwrapping.

Account for failures both returned by the installed SDK and thrown before a response exists:

- Request schema failures prevent HTTP dispatch and map to non-retryable validation facts. They may have neither request nor response.
- Response schema failures represent an invalid upstream response; map them to network `unavailable`, not user form validation.
- HTTP failures use payload plus response metadata; network failures may have no response.
- Apply the same cancellation detection to structured SDK errors and caught exceptions before domain mapping. Recognize the `AbortError` name on DOMException, ordinary Error, and cross-realm errors rather than relying only on `instanceof DOMException`; rethrow cancellation so it cannot become a retryable domain failure.

Keep query retries in TanStack Query using `DomainError.retryable`; do not add a second automatic transport retry loop. Leave mutation retries disabled unless the operation explicitly supports safe replay.

## Generation Checks

Commit generated output by default; preserve a coherent existing build-only generation policy. Generate from the repository's contract source or reproducible pinned snapshot, keeping credentials out of files and generated output. Add a CI generation/drift check that also detects newly created untracked output, using the repository's existing task conventions. Generated files remain generator-owned and excluded from handwritten formatting/lint rules when appropriate.

Finish a new client integration when its generation command, generated-output drift check, typecheck, and focused boundary tests have run, with unavailable checks named explicitly. At the HTTP boundary, cover path/query/body serialization, valid JSON, `204`, HTTP errors with status and payload, network failure, rejected request data without dispatch, malformed successful responses, and both DOMException and Error-shaped cancellation. Check service substitution and Query error propagation separately. Reuse the testing guidance in [practices-testing-state-quality.md](practices-testing-state-quality.md).

## Service Implementation Usage

Platform service implementations import generated SDK functions and use the configured client injected at composition time. A small SDK-result helper can share the conversion and error handling described above once multiple operations need it. Match operation names and DTO imports to actual generated output.

Wrap generated code in `platform/services/[feature]/web` or `platform/services/[feature]/composite` when the service implementation needs:

- use-case naming or parameter shaping;
- TanStack Query key composition;
- UI-specific filtering defaults;
- response mapping into a view model;
- error normalization into `DomainError` or feature-specific side effects.

Keep wrappers handwritten and small. Feature service files remain interface-only and still return `DomainResult<T>` even when generated API clients exist.

## DTOs and View Models

Do not duplicate generated OpenAPI DTOs in `features/[feature]/types`.

Use generated DTOs directly for API data:

```ts
import type { ProductDto, CreateProductRequest } from '@api-generated/openapi/types.gen';
```

Create feature-local types only when the frontend shape is different from the API contract:

```ts
export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface ProductFormValues {
  name: string;
  price: string;
  categoryId: string;
}
```

Use adapters when converting between generated DTOs and UI models:

```text
src/shared/services/api/adapters/productAdapter.ts
src/features/products/types/product.types.ts
```

## Imports and Aliases

Add an alias for generated API code when imports would otherwise be long:

```json
{
  "paths": {
    "@api-generated/*": ["./src/shared/services/api/generated/*"]
  }
}
```

Keep imports explicit enough to show the source contract:

```ts
import type { ProductDto } from '@api-generated/openapi/types.gen';
```

## Guardrails

- Never edit generated files manually.
- Keep generated output out of route modules and UI component folders.
- Do not mix handwritten files into `generated/`.
- Do not export the entire generated tree from a feature `index.ts`; export feature service interfaces and domain types only when needed.
- Do not expose generated TanStack Query hooks directly from features by default. Prefer feature hooks that call injected services and `unwrapDomainResult` so errors are consistently typed as `DomainError`.
- If generated output is very large, split by spec, tag, or generator output convention under `generated/<source-name>/`.
- Add generator output to lint/format ignore lists when the generator owns formatting.
