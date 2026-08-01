# Feature Workflow

Includes the quick-start workflow for adding a new feature module.

## Contents

- Quick Start - Adding a New Feature
  - Step-by-Step Guide

## Quick Start - Adding a New Feature

### Step-by-Step Guide

**1. Create Feature Structure**
```bash
mkdir -p src/features/products/{components,hooks,services,types,utils}
mkdir -p src/features/products/pages/product-detail
mkdir -p src/shared/errors src/shared/services/api src/core/query
mkdir -p src/core/services
mkdir -p src/platform/services/products/web
mkdir -p 'src/routes/products/$productId'
touch src/routes/products/route.tsx src/routes/products/index.tsx src/routes/products/new.tsx
touch 'src/routes/products/$productId/route.tsx' 'src/routes/products/$productId/index.tsx'
```

**2. Define Types** (`types/product.types.ts`)
```typescript
import type { BaseEntity } from '@types/common.types';

export interface Product extends BaseEntity {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}
```

This baseline example defines DTOs explicitly for clarity. If OpenAPI codegen is available, see `generated-code.md` before duplicating generated DTOs in a feature.

**3. Create Service Interface** (`services/productService.ts`)
```typescript
import type { Product, CreateProductDto, UpdateProductDto, ProductFilters } from '../types/product.types';
import type { DomainResult } from '@shared/errors';

export interface ProductService {
  getAll(filters?: ProductFilters): Promise<DomainResult<Product[]>>;
  getById(id: string): Promise<DomainResult<Product>>;
  create(data: CreateProductDto): Promise<DomainResult<Product>>;
  update(id: string, data: UpdateProductDto): Promise<DomainResult<Product>>;
  delete(id: string): Promise<DomainResult<void>>;
}
```

Feature services are interface-only. Do not import `apiClient`, `@tauri-apps/api`, `platform/*`, or concrete service implementations from feature code.

**4. Create Default Web Implementation** (`platform/services/products/web/productService.ts`)
`shared/services/api/client.ts` exports the explicit `apiClient` transport instance. `shared/services/api/error-mapping.ts` exports API error normalization helpers.

```typescript
import { apiClient } from '@services/api/client';
import { err, ok } from '@shared/errors';
import { mapApiErrorToDomainError } from '@services/api/error-mapping';
import type { ProductService } from '@features/products/services';

export const webProductService: ProductService = {
  async getAll(filters) {
    try {
      return ok(await apiClient.get('/products', { params: filters }));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to load products.'));
    }
  },

  async getById(id) {
    try {
      return ok(await apiClient.get(`/products/${id}`));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to load product.'));
    }
  },

  async create(data) {
    try {
      return ok(await apiClient.post('/products', data));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to create product.'));
    }
  },

  async update(id, data) {
    try {
      return ok(await apiClient.put(`/products/${id}`, data));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to update product.'));
    }
  },

  async delete(id) {
    try {
      await apiClient.delete(`/products/${id}`);
      return ok(undefined);
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to delete product.'));
    }
  },
};
```

Add `platform/services/products/tauri`, `mock`, or `composite` only when the feature needs runtime-specific behavior, test/demo implementations, or per-object routing.

**5. Wire Service in DI** (`core/services/service-registry.ts`)
```typescript
import type { ProductService } from '@features/products/services';
import { webProductService } from '@platform/services/products/web/productService';

export type AppServices = {
  products: ProductService;
};

export const createAppServices = (): AppServices => ({
  products: webProductService,
});
```

Expose services through a `ServicesProvider` and `useServices` hook in `core/services`. Feature hooks/pages consume the injected interface, not the platform implementation.

**6. Create Hooks** (`hooks/useProductData.ts`)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@core/services/useServices';
import { unwrapDomainResult } from '@core/query/domain-query';
import type { DomainError } from '@shared/errors';
import type { Product, CreateProductDto, UpdateProductDto, ProductFilters } from '../types/product.types';

export const useProducts = (filters?: ProductFilters) => {
  const { products: productService } = useServices();

  return useQuery<Product[], DomainError>({
    queryKey: ['products', filters],
    queryFn: () => unwrapDomainResult(productService.getAll(filters)),
  });
};

export const useProduct = (id: string) => {
  const { products: productService } = useServices();

  return useQuery<Product, DomainError>({
    queryKey: ['product', id],
    queryFn: () => unwrapDomainResult(productService.getById(id)),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { products: productService } = useServices();

  return useMutation<Product, DomainError, CreateProductDto>({
    mutationFn: (data) => unwrapDomainResult(productService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { products: productService } = useServices();

  return useMutation<Product, DomainError, { id: string; data: UpdateProductDto }>({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      unwrapDomainResult(productService.update(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { products: productService } = useServices();

  return useMutation<void, DomainError, string>({
    mutationFn: (id) => unwrapDomainResult(productService.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
```

**7. Create Components** (`components/ProductList.tsx`)
```typescript
import { FC } from 'react';
import type { Product } from '../types/product.types';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductList: FC<ProductListProps> = ({ products, onEdit, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <div key={product.id} className="border rounded-lg p-4">
          <h3 className="text-lg font-bold">{product.name}</h3>
          <p className="text-gray-600">{product.description}</p>
          <p className="text-xl font-semibold mt-2">${product.price}</p>
          <p className="text-sm text-gray-500">Stock: {product.stock}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onEdit(product)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

**8. Create Page** (`pages/ListPage.tsx`)
For localized apps, route-facing pages should use `useTranslation()` for
visible copy instead of hardcoded labels.

```typescript
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts, useDeleteProduct } from '../hooks/useProductData';
import { ProductList } from '../components/ProductList';
import { LoadingSpinner } from '@shared/components/feedback/LoadingSpinner';
import { LoadErrorState } from '@shared/components/feedback/LoadErrorState';
import type { Product } from '../types/product.types';

const ListPage: FC = () => {
  const { t } = useTranslation();
  const { data: products, isLoading, error, refetch } = useProducts();
  const deleteMutation = useDeleteProduct();

  const handleEdit = (product: Product) => {
    console.log('Edit product:', product);
    // Navigate to edit page
  };

  const handleDelete = (id: string) => {
    if (confirm(t(($) => $.products.dialogs.confirmDelete))) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <LoadErrorState
        error={error}
        title={t(($) => $.products.errors.couldNotLoad)}
        variant="page"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {t(($) => $.products.labels.products)}
      </h1>
      <ProductList
        products={products || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ListPage;
```

Inside `features/products/`, page filenames are contextual. Use `ListPage.tsx`, not `ProductsListPage.tsx`; use public export aliases when external callers need more explicit names.

**9. Add Colocated Tests and Stories**

Place test specs next to the files they verify. For every new or changed page, hook, or component, add or update the matching test file with the same basename. For every new or materially changed public, reusable, route-facing, or visually risky UI component or page, also add or update the matching Storybook file with the same basename. Use `src/test/` only for shared setup, MSW, render helpers, fixtures, builders, and `src/test/storybook/` harnesses.

```text
src/features/products/components/ProductList.test.tsx
src/features/products/components/ProductList.stories.tsx
src/features/products/pages/ListPage.test.tsx
src/features/products/pages/ListPage.stories.tsx
src/features/products/hooks/useProductData.test.ts
src/platform/services/products/web/productService.test.ts
src/routes/products/index.test.tsx
```

Do not create broad ownerless product specs such as `products.test.tsx`, `pages.test.tsx`, or `hooks.test.ts` when a concrete source file owns the behavior. Do not write stories for hooks, services, route modules, utilities, private helper subcomponents, or thin connected wrappers without independent visual states. Feature service files are contracts, so they usually do not need runtime tests. Test concrete web/Tauri/mock/composite implementations under `platform/services`. If a test covers a multi-page feature-owned flow with no single owner file, place it in a feature-local flow spec such as `src/features/[feature]/__tests__/[flow-name]-flow.test.tsx`.

Creation, edit, delete, and verification flows that assert domain state across pages are feature-owned flows, even when they navigate through multiple routes.

For route-flow behavior such as `Back`, `Close`, breadcrumbs, return targets, router state, and redirect-after-mutation paths, test the real user navigation through the router harness. Put the test on the owning page when possible; use `src/routes/-tests/[flow-name]-flow.test.tsx` when the primary assertion is app/router navigation across multiple features or route modules.

For Storybook coverage, include primary UI states and layout-risk data: loading, empty, error, validation errors, dense data, missing media, and responsive layout risks. Do not add separate mobile/desktop story variants just to check viewport behavior; use universal stories and Storybook viewport switching. For visible text fields in constrained layouts, add a text-length ladder such as short, wrapping, truncated, and long-unbroken text; render it in the realistic container width where wrapping or truncation appears. Prefer fake injected services from `src/test/storybook/` for page stories; use MSW when the story intentionally exercises the HTTP boundary.

**10. Create TanStack Route Modules** (`src/routes/products/*`)

Keep TanStack route modules thin and import feature pages through the feature public API.

```typescript
// src/routes/products/route.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/products')({});
```

```typescript
// src/routes/products/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProductsListPage } from '@features/products';

export const Route = createFileRoute('/products/')({
  component: ProductsListPage,
});
```

```typescript
// src/routes/products/new.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProductCreatePage } from '@features/products';

export const Route = createFileRoute('/products/new')({
  component: ProductCreatePage,
});
```

```typescript
// src/routes/products/$productId/route.tsx
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { ProductDetailLayout } from '@features/products';

const ProductDetailRoute = () => (
  <ProductDetailLayout>
    <Outlet />
  </ProductDetailLayout>
);

export const Route = createFileRoute('/products/$productId')({
  component: ProductDetailRoute,
});
```

```typescript
// src/routes/products/$productId/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProductOverviewPage } from '@features/products';

export const Route = createFileRoute('/products/$productId/')({
  component: ProductOverviewPage,
});
```

Create additional nested detail route modules as the route branch grows, for example `src/routes/products/$productId/members.tsx` or `src/routes/products/$productId/settings.tsx`. Use `$productId` for TanStack dynamic segments, not `:productId`.

**11. Create Public Exports** (`index.ts`)
```typescript
// Components
export { ProductList } from './components/ProductList';
export { ProductForm } from './components/ProductForm';

// Hooks
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './hooks/useProductData';

// Service contracts
export type { ProductService } from './services/productService';

// Pages, only if external callers need explicit page access
export { default as ProductsListPage } from './pages/ListPage';
export { default as ProductCreatePage } from './pages/CreatePage';
export { default as ProductDetailLayout } from './pages/product-detail/DetailLayout';
export { default as ProductOverviewPage } from './pages/product-detail/OverviewPage';

// Types
export type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductFilters,
} from './types/product.types';
```

---
