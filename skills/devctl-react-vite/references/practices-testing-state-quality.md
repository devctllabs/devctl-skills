# Practices, Testing, State, and Quality

Includes best practices, testing strategy, state management options, and code quality tooling.

## Contents

- Best Practices
  - 1. **Component Organization**
  - 2. **Type Safety**
  - 3. **Custom Hooks**
  - 4. **Error Handling**
  - 5. **Environment Variables**
- Testing Strategy
  - Test File Placement
  - Unit Tests
  - Integration Tests
  - Service and Adapter Tests
- State Management Options
  - Option 1: React Query (Recommended for Server State)
  - Option 2: Zustand (Recommended for Client State)
  - Option 3: Context API (For Simple Cases)
- Code Quality Tools
  - ESLint Configuration
  - Prettier Configuration
  - Husky + Lint-Staged

## Best Practices

### 1. **Component Organization**
Keep `shared/components/ui` for shadcn/ui base primitives copied into the app. Use lowercase shadcn filenames there (`button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`). Put app-specific reusable composites in sibling shared folders and keep feature/business components inside `features/[feature]/components`.

```typescript
// Good: Small, focused components
const UserCard: FC<{ user: User }> = ({ user }) => (
  <div className="user-card">
    <UserAvatar user={user} />
    <UserInfo user={user} />
    <UserActions user={user} />
  </div>
);

// Avoid: Monolithic component
const UserCard: FC = () => {
  // 300+ lines of code...
};
```

### 2. **Type Safety**
```typescript
// Good: Explicit types
interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
}

// Avoid: Any types
interface ButtonProps {
  onClick: any;
  children: any;
}
```

### 3. **Custom Hooks**
```typescript
// Good: Reusable logic
import { useQuery } from '@tanstack/react-query';
import { unwrapDomainResult } from '@core/query/domain-query';
import { useServices } from '@core/services/useServices';
import type { DomainError } from '@shared/errors';

const useUser = (id: string) => {
  const { users: userService } = useServices();

  const { data, isLoading, error } = useQuery<User, DomainError>({
    queryKey: ['user', id],
    queryFn: () => unwrapDomainResult(userService.getById(id)),
  });

  return { user: data, isLoading, error };
};

// Usage
const { user, isLoading } = useUser('123');
```

### 4. **Error Handling**
```typescript
import { useMutation } from '@tanstack/react-query';

import { unwrapDomainResult } from '@core/query/domain-query';
import { useServices } from '@core/services/useServices';
import type { DomainError } from '@shared/errors';

// Good: expose typed mutation state; let the owning UI choose the visible surface.
const useCreateUser = () => {
  const { users: userService } = useServices();

  return useMutation<User, DomainError, CreateUserDto>({
    mutationFn: (data) => unwrapDomainResult(userService.create(data)),
  });
};

// Usage: the page, dialog, or form decides whether the error belongs near fields,
// the form body, the owning action surface, or as secondary toast feedback.
```

### 5. **Environment Variables**
```typescript
// Good: Type-safe env variables
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_KEY: string;
}

const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  apiKey: import.meta.env.VITE_API_KEY,
};
```

---

## Testing Strategy

### Test File Placement

Co-locate test specs with the source file by default. For every new or changed file in `pages/`, `hooks/`, or `components/`, create or update a matching test file with the same basename. Vitest finds `*.test.*` and `*.spec.*` files in any subdirectory, so a separate global tests tree is not needed.

For every user-facing route-facing page, also create or update a colocated Storybook file with the same basename. Storybook page files are the visual inventory of all screens and should cover supported user-visible states such as loaded, loading/skeleton, empty, error, search/filter, dialog/open, dense-data, and long-content states. For public, reusable, or visually risky UI components, create or update colocated Storybook files when the component has meaningful visual states or layout risk. For list/grid/table/container UI that renders domain collections, including route-facing pages with collection sections, cover zero, single, and many item states whenever those states are valid user-visible states. Storybook files do not replace colocated unit/integration tests.

Use this placement convention:

```text
src/features/products/components/ProductList.tsx
src/features/products/components/ProductList.test.tsx
src/features/products/components/ProductList.stories.tsx
src/features/products/pages/ListPage.tsx
src/features/products/pages/ListPage.test.tsx
src/features/products/pages/ListPage.stories.tsx
src/features/products/hooks/useProductData.ts
src/features/products/hooks/useProductData.test.ts
src/routes/products/index.tsx
src/routes/products/index.test.tsx
src/platform/services/products/web/productService.ts
src/platform/services/products/web/productService.test.ts
src/core/services/service-registry.ts
src/core/services/service-registry.test.ts
```

Use `src/test/` only for shared test infrastructure:

```text
src/test/setup.ts
src/test/msw.ts
src/test/render.tsx
src/test/factories.ts
src/test/storybook/decorators.tsx
src/test/storybook/providers.tsx
src/test/storybook/fake-services.ts
```

Use `src/test/storybook/` only for shared Storybook harnesses such as decorators, providers, fake services, router wrappers, viewport helpers, and reusable story fixtures. Keep `.storybook/preview.ts` thin and import these helpers instead of duplicating providers in each story.

Do not require stories for every JSX component. Skip hooks, services, utilities, generated code, route modules, private helper subcomponents, and thin connected wrappers without independent visual states. This exception does not apply to user-facing route-facing pages: cover those with page stories even when they are connected wrappers. Cover private helper output through the owning component or page story.

Use `features/[feature]/__tests__/` only for feature-owned flows that do not have a single clear owner file. Use `src/routes/-tests/` for route-tree, history, redirect, and router-state navigation flows that cross several features or route modules. Use top-level `e2e/` only for browser E2E suites such as Playwright or Cypress. Do not create a global unit/integration tests tree under `src` for normal product specs.

Avoid broad ownerless product test files such as `pages.test.tsx`, `components.test.tsx`, `hooks.test.ts`, or `[feature].test.tsx` when the behavior belongs to a concrete page, hook, or component. Use ownerless flow specs only when the scenario spans multiple files and no single source file is the natural owner.

Name ownerless multi-page/user-flow specs with a `-flow.test.tsx` suffix, such as `deck-create-flow.test.tsx` or `deck-navigation-flow.test.tsx`. Keep ordinary page, component, hook, and service tests on the standard `*.test.ts[x]` pattern.

### Navigation and Route-Flow Tests

For route-facing pages with `Back`, `Close`, breadcrumbs, return targets, redirect-after-mutation behavior, or `location.state`/router state, add integration tests through the real router harness (`renderRoute`, `createMemoryHistory`, or the project's equivalent). Prefer user-level clicks with Testing Library over asserting helper functions in isolation.

Cover both entry modes when they can differ: direct URL/reload fallback and the user-click path that sets route state such as `openedFrom`. Include root vs nested entities, parent/sibling navigation, search/deep-link result navigation, create/edit close targets, and delete/save redirects when those paths affect where the user lands.

Treat navigation as transport unless the assertion is specifically about route state or history. If a user flow creates, edits, deletes, or verifies a domain entity across pages, place it with the owning feature flow, for example `src/features/folders/__tests__/folder-create-flow.test.tsx`.

Put the test on the owning page when the assertion is about one page's fallback or redirect behavior. Use `src/routes/-tests/[flow-name]-flow.test.tsx` when the primary assertion is about route tree behavior, history, `location.state`, redirects, or `Back`/`Close` navigation across multiple features.

### Storybook Testing Boundaries

Use Storybook for render smoke checks, browser interaction tests with `play`, accessibility checks, visual review/regression, and documentation of supported UI states. Add stories for primary states and layout-risk edge data. For collection containers, make zero, single, and many items baseline stories; prefer `Empty`, `SingleItem`, and `ManyItems` for component stories and clear domain names for page stories. For visible text fields in constrained layouts, include a text-length ladder such as `ShortText`, `WrappedText`, `TruncatedText`, `LongUnbrokenText`, and `EmptyText`/`MissingText` when valid. Also cover missing images, unusual image ratios, large numbers, dense lists, unknown statuses, and responsive layout risk through universal stories plus Storybook viewport switching, not mobile/desktop-specific story variants.

Keep normal `*.test.ts[x]` files for hooks, services, adapters, data mapping, reducers, stores, DI wiring, React Query cache/query behavior, domain error mapping, and exact business assertions. Use E2E tests for cross-page navigation, auth redirects, app-shell behavior, and complete user workflows.

### Unit Tests
```typescript
// shared/components/ui/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests
```typescript
// features/products/pages/ListPage.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListPage from './ListPage';

describe('Product Flow', () => {
  it('creates a new product', async () => {
    const user = userEvent.setup();
    render(<ListPage />);

    await user.click(screen.getByText('Add Product'));
    await user.type(screen.getByLabelText('Name'), 'New Product');
    await user.type(screen.getByLabelText('Price'), '99.99');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('New Product')).toBeInTheDocument();
    });
  });
});
```

For a cross-page flow, use the narrowest owner:

```typescript
// features/[feature]/__tests__/[flow-name]-flow.test.tsx
// routes/-tests/[flow-name]-flow.test.tsx
```

### Service and Adapter Tests

When a feature uses injected services:

- Test feature UI by injecting services through the app service provider.
- Test `core/services/service-registry.test.ts` next to DI wiring.
- Test `platform/services/*/web/[feature]Service.test.ts` at the HTTP boundary with MSW or API-client stubs.
- Test `platform/services/*/tauri/[feature]Service.test.ts` by stubbing Tauri IPC at the adapter boundary.
- Test `platform/services/*/composite/*.test.ts` with fake adapters and fake metadata services.
- Test `shared/errors/*`, `shared/services/api/error-mapping.test.ts`, `platform/tauri/tauri-error.test.ts`, and `core/query/domain-query.test.ts` near their implementations.
- Avoid mocking web/Tauri transport directly in React components when service injection is available.

### Web Service Adapter Tests

Test `platform/services/*/web/*.test.ts` at the HTTP boundary when a web adapter wraps a generated SDK or shared API client. Prefer MSW over mocking generated SDK functions when the test should prove URL building, path/query/body serialization, response validation, and API error mapping.

Keep MSW opt-in unless most tests need HTTP interception. Put shared helpers under `src/test/`, return a file-local server from the setup helper, and use strict unhandled-request behavior:

```typescript
// src/test/web-api-msw.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';

export const WEB_API_BASE_URL = 'http://app.test/api/v1';
export const apiUrl = (path: `/${string}`) => `${WEB_API_BASE_URL}${path}`;

export const setupWebApiMsw = () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  return server;
};
```

If the generated client keeps global configuration, set the test base URL in the helper and restore the original config in `afterAll`.

Prefer handlers that assert transport details instead of only returning static JSON:

```typescript
// src/platform/services/products/web/productService.test.ts
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { apiUrl, setupWebApiMsw } from '@/test/web-api-msw';

import { webProductService } from './productService';

const server = setupWebApiMsw();

const product = {
  id: 'notebook',
  name: 'Notebook',
  updatedAt: '2026-05-15T12:00:00.000Z',
};

describe('webProductService', () => {
  it('lists category products with path and sort query params', async () => {
    server.use(
      http.get(apiUrl('/categories/:categoryId/products'), ({ params, request }) => {
        const url = new URL(request.url);

        expect(params.categoryId).toBe('stationery');
        expect(url.searchParams.get('sortDirection')).toBe('desc');
        expect(url.searchParams.get('sortField')).toBe('updated');

        return HttpResponse.json([product]);
      }),
    );

    await expect(
      webProductService.listCategoryProducts('stationery', {
        direction: 'desc',
        field: 'updated',
      }),
    ).resolves.toEqual({
      ok: true,
      value: [product],
    });
  });
});
```

Cover each public web adapter method with focused success tests. Include representative tests for request bodies, `204`/void responses, API errors, and malformed successful responses when the client performs runtime response validation. Keep UI, hook, and page tests on injected fake services unless the test intentionally exercises the HTTP boundary.

---

## State Management Options

### Option 1: React Query (Recommended for Server State)
```typescript
// Best for: API data, caching, synchronization
import { useQuery } from '@tanstack/react-query';
import { unwrapDomainResult } from '@core/query/domain-query';
import { useServices } from '@core/services/useServices';
import type { DomainError } from '@shared/errors';

const useUsers = () => {
  const { users: userService } = useServices();

  return useQuery<User[], DomainError>({
    queryKey: ['users'],
    queryFn: () => unwrapDomainResult(userService.getAll()),
  });
};
```

### Option 2: Zustand (Recommended for Client State)
```typescript
// Best for: UI state, global app state
import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

### Option 3: Context API (For Simple Cases)
```typescript
// Best for: Theme, auth, simple global state
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

---

## Code Quality Tools

### ESLint Configuration
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### Husky + Lint-Staged
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

---
