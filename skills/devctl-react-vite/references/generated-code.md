# Generated Code

Includes placement and usage rules for generated code, especially OpenAPI-generated clients, DTOs, and TanStack Query hooks.

## Contents

- Default Location
- OpenAPI Codegen
- Service Implementation Usage
- DTOs and View Models
- Imports and Aliases
- Guardrails

## Default Location

Put generated code under a dedicated `generated/` folder near the integration boundary it represents.

For OpenAPI and backend API contracts, use:

```text
src/shared/services/api/
|-- client.ts                       # Handwritten transport/config, exports apiClient
|-- interceptors.ts                 # Handwritten request/response behavior
|-- error-mapping.ts                # Handwritten HTTP/API -> DomainError mapping
|-- generated/
|   `-- openapi/                    # Codegen output; do not edit manually
|       |-- index.ts
|       |-- schemas.ts
|       |-- requests.ts
|       `-- types.ts
|-- adapters/                       # Handwritten mapping/view-model adapters
`-- index.ts
```

Do not put OpenAPI output directly inside `features/*` by default. The spec is usually a backend contract shared across multiple frontend use cases, not a single feature implementation.

## OpenAPI Codegen

Use the generator output as an external contract boundary:

- Generated request functions, clients, DTOs, schemas, and generated TanStack Query hooks live in `shared/services/api/generated/<source-name>/`.
- Handwritten transport setup lives in `shared/services/api/client.ts`.
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

## Service Implementation Usage

Platform service implementations can import generated API functions directly when they match the service contract:

```ts
import { getProducts } from '@api-generated/openapi/products';
import type { ProductService } from '@features/products/services';
import { err, ok } from '@shared/errors';
import { mapApiErrorToDomainError } from '@services/api/error-mapping';

export const webProductService: ProductService = {
  async getAll() {
    try {
      return ok(await getProducts());
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to load products.'));
    }
  },
};
```

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
import type { ProductDto, CreateProductRequest } from '@api-generated/openapi/types';
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
import type { ProductDto } from '@api-generated/openapi/types';
```

## Guardrails

- Never edit generated files manually.
- Keep generated output out of route modules and UI component folders.
- Do not mix handwritten files into `generated/`.
- Do not export the entire generated tree from a feature `index.ts`; export feature service interfaces and domain types only when needed.
- Do not expose generated TanStack Query hooks directly from features by default. Prefer feature hooks that call injected services and `unwrapDomainResult` so errors are consistently typed as `DomainError`.
- If generated output is very large, split by spec, tag, or generator output convention under `generated/<source-name>/`.
- Add generator output to lint/format ignore lists when the generator owns formatting.
