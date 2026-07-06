# Collection Queries

Use this reference when adding or changing list/search sorting, filtering,
pagination, text search, or persisted collection-query state in React + Vite
apps.

## Contents

- Ownership rule
- Sorting
- Filtering and search
- Pagination
- Generated API mapping
- Tests and stories

## Ownership Rule

Model collection query state from the feature outward:

- keep concrete sort fields, filter keys, and domain-specific query unions in the owning feature;
- keep only generic reusable primitives in `shared/`, such as sort direction, typed sort preference, pagination params, and paginated response shape;
- keep generated API enum/request types at the API boundary and map them in platform services or adapters;
- avoid global unions that let UI code pass a field accepted by one feature into another feature's endpoint.

Do not move a field union to `shared/` only because several features have a
query parameter with the same name. `sortField=name` in one feature and
`sortField=createdAt` in another are not automatically the same domain type.

## Sorting

Use shared generic primitives for reusable mechanics:

```ts
export type SortDirection = 'asc' | 'desc'

export type SortPreference<TField extends string> = {
  direction: SortDirection
  field: TField
}
```

Keep field lists feature-local:

```ts
// features/decks/types/deck-sort.types.ts
import type { SortPreference } from '@shared/types/common.types'

export const deckSortFields = ['createdAt', 'name', 'updatedAt'] as const

export type DeckSortField = (typeof deckSortFields)[number]

export type DeckSortPreference = SortPreference<DeckSortField>
```

Validate persisted or URL-derived sort fields against the feature whitelist
before using them:

```ts
export function isDeckSortField(value: string): value is DeckSortField {
  return deckSortFields.includes(value as DeckSortField)
}
```

## Filtering and Search

Treat search as a filter because it narrows the collection. Keep free-text
search and structured filters together in the feature-owned filter type:

```ts
export type DeckListFilters = {
  search?: string
  status?: DeckStatus
  dueBefore?: string
  tagIds?: string[]
}
```

Rules:

- use stable protocol values and domain types, not localized labels;
- avoid catch-all filter maps such as `Record<string, unknown>` unless the backend intentionally supports arbitrary filters;
- call out full-text search separately in UI copy or API mapping when needed, but keep it in the feature filter type by default;
- keep route/search-param parsing close to the route or page that owns the collection state.

## Pagination

Use shared pagination primitives only when their behavior is genuinely common:

```ts
export type PaginationParams = {
  page: number
  limit: number
}

export type CursorPaginationParams = {
  cursor?: string
  limit: number
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
```

Do not mix page/offset and cursor pagination in one feature contract unless the
runtime behavior is deliberately specified. Prefer one style for a feature or
API-backed collection surface.

## List Query Shape

Use the full list query type for hooks, page state, query keys, service
interfaces, URL/search-param state, and adapter mapping:

```ts
import type { PaginationParams } from '@shared/types/common.types'

export type DeckListQuery = {
  filters?: DeckListFilters
  sort?: DeckSortPreference
  pagination?: PaginationParams
}

export interface DeckService {
  list(query?: DeckListQuery): Promise<DomainResult<Deck[]>>
}
```

Use `DeckListFilters` when code only owns filtering concerns, such as filter
forms, validation, filter chips, reset behavior, or parsing one filter group.
Use `DeckListQuery` when code owns the whole collection request.

## Generated API Mapping

Generated OpenAPI DTOs and request types live under
`shared/services/api/generated/<source-name>/`. They can include endpoint-specific
sort enums or query DTOs, but feature code should not import generated request
types directly by default.

Map feature query state to generated API parameters in `platform/services` or
`shared/services/api/adapters`:

```ts
import { listDecks } from '@api-generated/openapi/decks'
import type { DeckListQuery } from '@features/decks/types/deck-query.types'

function toListDecksParams(query?: DeckListQuery) {
  return {
    search: query?.filters?.search,
    status: query?.filters?.status,
    dueBefore: query?.filters?.dueBefore,
    tagIds: query?.filters?.tagIds,
    sortField: query?.sort?.field,
    sortDirection: query?.sort?.direction,
    page: query?.pagination?.page,
    limit: query?.pagination?.limit,
  }
}

export async function loadDecks(query?: DeckListQuery) {
  return listDecks(toListDecksParams(query))
}
```

If generated endpoint types are already exact and readable, use them as the
adapter target. Keep the feature-facing type feature-owned so UI state and tests
do not become coupled to generator naming or broad API unions.

## Tests and Stories

For changed collection-query behavior:

- test feature-owned sort/filter parsing and fallback behavior near the parser or hook;
- test platform web adapters at the HTTP boundary when query serialization matters;
- include Storybook states for empty, single item, many items, active search/filter, loading, and load error when those states are visible;
- cover invalid persisted or URL-derived query values when the UI restores state from storage or search params.
