# TypeScript, Path Aliases, Naming, and Shared Types

Includes TypeScript configuration, Vite path aliases, naming conventions, and common shared types.

## Contents

- TypeScript Configuration
  - tsconfig.json
  - vite.config.ts (Path Aliases)
- Naming Conventions
  - Files & Folders
  - Code Examples
- Common Shared Types
  - shared/types/common.types.ts
  - Collection query primitives

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@core/*": ["./src/core/*"],
      "@platform/*": ["./src/platform/*"],
      "@assets/*": ["./src/assets/*"],
      "@components/*": ["./src/shared/components/*"],
      "@hooks/*": ["./src/shared/hooks/*"],
      "@services/*": ["./src/shared/services/*"],
      "@utils/*": ["./src/shared/utils/*"],
      "@types/*": ["./src/shared/types/*"],
      "@api-generated/*": ["./src/shared/services/api/generated/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### vite.config.ts (Path Aliases)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@core': path.resolve(__dirname, './src/core'),
      '@platform': path.resolve(__dirname, './src/platform'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/shared/components'),
      '@hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@services': path.resolve(__dirname, './src/shared/services'),
      '@utils': path.resolve(__dirname, './src/shared/utils'),
      '@types': path.resolve(__dirname, './src/shared/types'),
      '@api-generated': path.resolve(__dirname, './src/shared/services/api/generated'),
    },
  },
});
```

Use the Tailwind Vite plugin for new Tailwind projects. Omit `tailwindcss()` only when the existing app does not use Tailwind or already has a different coherent styling pipeline.

---

## Naming Conventions

### Files & Folders
```
Components:       Button.tsx, UserProfile.tsx (PascalCase)
shadcn/ui:        button.tsx, dropdown-menu.tsx (lowercase/kebab-case)
Utilities:        formatDate.ts, cn.ts (camelCase)
API infra:        client.ts, error-mapping.ts (context comes from services/api/)
Types:            user.types.ts, api.types.ts (.types.ts suffix)
Tests:            Button.test.tsx, utils.test.ts (co-located .test.ts[x] by default)
Stories:          Button.stories.tsx, ListPage.stories.tsx (co-located UI stories)
Folders:          data-display/, user-profile/ (kebab-case)
Constants:        API_ENDPOINTS.ts, CONFIG.ts (UPPERCASE)
Generated dirs:   openapi/, billing-openapi/, admin-api/ (source/spec name)
```

Generated code lives under `shared/services/api/generated/<source-name>/` and is not edited manually. Handwritten wrappers, adapters, and feature-specific services keep normal project naming conventions. Prefer `.test.ts` and `.test.tsx` for app tests; prefer `.stories.tsx` for React Storybook stories; `.spec.ts` and `.spec.tsx` are acceptable for E2E when the project already uses that convention.

### Code Examples

**Component:**
```typescript
// Button.tsx
import { FC, ReactNode, MouseEvent } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export const Button: FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};
```

**Hook:**
```typescript
// useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Service interface:**
```typescript
// features/users/services/userService.ts
import type { DomainResult } from '@shared/errors';
import type { User, CreateUserDto, UpdateUserDto } from '../types/user.types';

export interface UserService {
  getAll(): Promise<DomainResult<User[]>>;
  getById(id: string): Promise<DomainResult<User>>;
  create(data: CreateUserDto): Promise<DomainResult<User>>;
  update(id: string, data: UpdateUserDto): Promise<DomainResult<User>>;
  delete(id: string): Promise<DomainResult<void>>;
}
```

Feature service files define interfaces only. Runtime implementations live under
`platform/services`.

**Platform service implementation:**
```typescript
// platform/services/users/web/userService.ts
import { apiClient } from '@services/api/client';
import { err, ok } from '@shared/errors';
import { mapApiErrorToDomainError } from '@services/api/error-mapping';
import type { UserService } from '@features/users/services';

export const webUserService: UserService = {
  async getAll() {
    try {
      return ok(await apiClient.get('/users'));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to load users.'));
    }
  },

  async getById(id) {
    try {
      return ok(await apiClient.get(`/users/${id}`));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to load user.'));
    }
  },

  async create(data) {
    try {
      return ok(await apiClient.post('/users', data));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to create user.'));
    }
  },

  async update(id, data) {
    try {
      return ok(await apiClient.put(`/users/${id}`, data));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to update user.'));
    }
  },

  async delete(id) {
    try {
      await apiClient.delete(`/users/${id}`);
      return ok(undefined);
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to delete user.'));
    }
  },
};
```

**Types:**
```typescript
// user.types.ts
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
```

---

## Common Shared Types

### shared/types/common.types.ts

```typescript
// Base types
export type ID = string | number;

export interface BaseEntity {
  id: ID;
  createdAt: string;
  updatedAt: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export type SortDirection = 'asc' | 'desc';

export type SortPreference<TField extends string> = {
  direction: SortDirection;
  field: TField;
};

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common UI types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}
```

Keep concrete collection fields in the owning feature, not in shared types:

```typescript
// features/decks/types/deck-sort.types.ts
import type { SortPreference } from '@shared/types/common.types';

export const deckSortFields = ['createdAt', 'name', 'updatedAt'] as const;

export type DeckSortField = (typeof deckSortFields)[number];

export type DeckSortPreference = SortPreference<DeckSortField>;
```

Use `shared/types` for generic reusable shapes such as `SortDirection`,
`SortPreference<TField>`, `PaginationParams`, and `PaginatedResponse<T>`.
Do not put feature-specific field unions such as `DeckSortField`,
`NoteSortField`, lifecycle-specific filter unions, or generic search-only filter
params in `shared/`.

---
