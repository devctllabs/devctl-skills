# Platform Services and DI

Defines platform-dependent service implementations, composite services, and app-start dependency injection.

## Contents

- Layer Responsibilities
- Default Service Contract
- Additional Platform Implementations
- Object-Scoped Routed Service
- DI Composition
- Runtime Switching
- Testing

## Layer Responsibilities

Use three explicit ownership layers:

```text
features/[feature]/services/
  [feature]Service.ts              # service interface and feature-facing service types

platform/services/[feature]/
  web/[feature]Service.ts          # browser/API implementation
  web/[feature]Service.test.ts
  tauri/[feature]Service.ts        # Tauri/local implementation
  tauri/[feature]Service.test.ts
  mock/[feature]Service.ts         # test/demo implementation
  composite/
    routed[Feature]Service.ts      # object/backend routing implementation
    cached[Feature]Service.ts      # cache wrapper around another implementation
    fallback[Feature]Service.ts    # fallback chain across implementations
    routed[Feature]Service.test.ts

core/services/
  service-registry.ts              # DI composition root
  service-registry.test.ts
  ServicesProvider.tsx             # React provider
  useServices.ts                   # React hook
```

Rules:

- `features/*/services` owns contracts and feature-facing types, not runtime adapters.
- `platform/services/*/web|tauri|mock` owns concrete backend/runtime implementations.
- `platform/services/*/composite` owns services that compose other service implementations, such as routed, cached, fallback, retrying, or logging services. Some are decorators, but the folder is broader than the decorator pattern.
- `core/services` wires dependencies only. Do not put concrete business service implementations there.
- `shared/services/api` owns low-level HTTP clients and generated API contracts. Web adapters may import it.
- Features must not import `apiClient`, `@tauri-apps/api`, `platform/*`, or concrete service implementations.
- Feature hooks may import `@core/services/useServices` to consume injected contracts. Keep `service-registry.ts`, providers, and platform wiring out of feature code.

## Default Service Contract

Feature services are interface-only. Even when a feature has one obvious implementation, keep the contract in the feature and put the default implementation under `platform/services/[feature]/web`.

```text
features/products/services/productService.ts          # ProductService interface
platform/services/products/web/productService.ts      # default concrete implementation
core/services/service-registry.ts                     # final DI wiring
```

```ts
// features/products/services/productService.ts
import type { DomainResult } from '@shared/errors';
import type {
  CreateProductDto,
  Product,
  ProductFilters,
  UpdateProductDto,
} from '../types/product.types';

export interface ProductService {
  getAll(filters?: ProductFilters): Promise<DomainResult<Product[]>>;
  getById(id: string): Promise<DomainResult<Product>>;
  create(data: CreateProductDto): Promise<DomainResult<Product>>;
  update(id: string, data: UpdateProductDto): Promise<DomainResult<Product>>;
  delete(id: string): Promise<DomainResult<void>>;
}
```

```ts
// platform/services/products/web/productService.ts
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

## Additional Platform Implementations

Add `tauri`, `mock`, or `composite` implementations only when the feature needs them.

For first-pass `mock` service implementations that need reusable state, CRUD, filtering, or relations, prefer an `@msw/data`-backed store over ad hoc arrays or maps. Simple injected fake services are still fine for one-off tests, static Storybook states, or behavior that does not need realistic state transitions.

The interface still stays in the feature:

```ts
// features/projects/services/projectService.ts
import type { DomainResult } from '@shared/errors';
import type { CreateProjectDto, Project } from '../types/project.types';

export type ServiceBackend = 'web' | 'tauri' | 'mock';

export type CreateProjectTarget = {
  backend: ServiceBackend;
};

export interface ProjectService {
  list(): Promise<DomainResult<Project[]>>;
  getById(projectId: string): Promise<DomainResult<Project>>;
  create(data: CreateProjectDto, target: CreateProjectTarget): Promise<DomainResult<Project>>;
  delete(projectId: string): Promise<DomainResult<void>>;
}
```

Implement each runtime under `platform/services`:

```ts
// platform/services/projects/web/projectService.ts
import { apiClient } from '@services/api/client';
import { err, ok } from '@shared/errors';
import { mapApiErrorToDomainError } from '@services/api/error-mapping';
import type { ProjectService } from '@features/projects/services';

export const webProjectService: ProjectService = {
  async list() {
    try {
      return ok(await apiClient.get('/projects'));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to load projects.'));
    }
  },

  async getById(projectId) {
    try {
      return ok(await apiClient.get(`/projects/${projectId}`));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to load project.'));
    }
  },

  async create(data) {
    try {
      return ok(await apiClient.post('/projects', data));
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to create project.'));
    }
  },

  async delete(projectId) {
    try {
      await apiClient.delete(`/projects/${projectId}`);
      return ok(undefined);
    } catch (error) {
      return err(mapApiErrorToDomainError(error, 'Failed to delete project.'));
    }
  },
};
```

```ts
// platform/services/projects/tauri/projectService.ts
import { invokeDomain } from '@platform/tauri/invoke';
import type { ProjectService } from '@features/projects/services';

export const tauriProjectService: ProjectService = {
  list: () =>
    invokeDomain('projects_list', undefined, 'Failed to load local projects.'),
  getById: (projectId) =>
    invokeDomain('projects_get', { projectId }, 'Failed to load local project.'),
  create: (data) =>
    invokeDomain('projects_create', { data }, 'Failed to create local project.'),
  delete: (projectId) =>
    invokeDomain('projects_delete', { projectId }, 'Failed to delete local project.'),
};
```

## Object-Scoped Routed Service

Use a composite service when different objects in the same feature may live on different backends.

Example: one project is local via Tauri, another project is remote via web API.

Keep metadata access as a normal service contract:

```ts
// features/projects/services/projectMetadataService.ts
import type { DomainResult } from '@shared/errors';
import type { ServiceBackend } from './projectService';

export type ProjectMetadata = {
  projectId: string;
  backend: ServiceBackend;
};

export interface ProjectMetadataService {
  getByProjectId(projectId: string): Promise<DomainResult<ProjectMetadata>>;
}
```

Put the routed implementation in `platform/services/[feature]/composite`:

```ts
// platform/services/projects/composite/routedProjectService.ts
import type {
  ProjectMetadataService,
  ProjectService,
  ServiceBackend,
} from '@features/projects/services';
import { domainError, err, ok } from '@shared/errors';

type ProjectServiceAdapters = Partial<Record<ServiceBackend, ProjectService>>;

export const createRoutedProjectService = ({
  adapters,
  projectMetadataService,
}: {
  adapters: ProjectServiceAdapters;
  projectMetadataService: ProjectMetadataService;
}): ProjectService => {
  const getAdapter = (backend: ServiceBackend): ProjectService | null => {
    const adapter = adapters[backend];

    if (!adapter) {
      return null;
    }

    return adapter;
  };

  const resolveAdapter = async (projectId: string) => {
    const metadata = await projectMetadataService.getByProjectId(projectId);

    if (!metadata.ok) {
      return metadata;
    }

    const adapter = getAdapter(metadata.value.backend);

    if (!adapter) {
      return err(domainError.unexpected(
        `Project service adapter is not available: ${metadata.value.backend}`,
      ));
    }

    return ok(adapter);
  };

  return {
    async list() {
      const availableAdapters = Object.values(adapters).filter(
        (adapter): adapter is ProjectService => Boolean(adapter),
      );

      const results = await Promise.all(
        availableAdapters.map((adapter) => adapter.list()),
      );

      const failed = results.find((result) => !result.ok);

      if (failed) {
        return failed;
      }

      return ok(results.flatMap((result) => result.value));
    },

    async getById(projectId) {
      const adapter = await resolveAdapter(projectId);

      return adapter.ok ? adapter.value.getById(projectId) : adapter;
    },

    async create(data, target) {
      const adapter = getAdapter(target.backend);

      if (!adapter) {
        return err(domainError.unexpected(
          `Project service adapter is not available: ${target.backend}`,
        ));
      }

      return adapter.create(data, target);
    },

    async delete(projectId) {
      const adapter = await resolveAdapter(projectId);

      return adapter.ok ? adapter.value.delete(projectId) : adapter;
    },
  };
};
```

Do not add a separate resolver abstraction by default. Inject `ProjectMetadataService` directly. Add a resolver only when source resolution becomes non-trivial, shared across services, cached independently, or based on more than metadata.

## DI Composition

Build final services in `core/services/service-registry.ts`:

```ts
import type { ProjectService } from '@features/projects/services';
import { createRoutedProjectService } from '@platform/services/projects/composite/routedProjectService';
import { tauriProjectMetadataService } from '@platform/services/projects/tauri/projectMetadataService';
import { tauriProjectService } from '@platform/services/projects/tauri/projectService';
import { webProjectService } from '@platform/services/projects/web/projectService';
import { mockProjectService } from '@platform/services/projects/mock/projectService';

export type AppServices = {
  projects: ProjectService;
};

export const createAppServices = (): AppServices => {
  const projects = createRoutedProjectService({
    projectMetadataService: tauriProjectMetadataService,
    adapters: {
      web: webProjectService,
      tauri: tauriProjectService,
      mock: mockProjectService,
    },
  });

  return { projects };
};
```

React code consumes the injected interface:

```ts
import { unwrapDomainResult } from '@core/query/domain-query';

const { projects } = useServices();
const project = await unwrapDomainResult(projects.getById(projectId));
```

## Runtime Switching

Use startup DI for the default path. Runtime switching is allowed only by replacing provider state or rebuilding `AppServices` in the composition layer.

When a service backend or object source can change:

- keep UI code backend-agnostic;
- update metadata/source state through a service;
- invalidate affected TanStack Query keys;
- include `projectId` and, when needed, backend/source version in query keys;
- never branch on `web` vs `tauri` inside pages or components.

## Testing

- Co-locate service tests next to the implementation they verify.
- Test feature UI by injecting test services through `ServicesProvider`; keep those tests near the page/component or in feature-local `__tests__/` for feature-owned flows. Put app/router navigation flows in `src/routes/-tests/`.
- Test `core/services/service-registry.test.ts` next to default wiring and override behavior.
- Test `platform/services/*/web/[feature]Service.test.ts` with HTTP/MSW or API-client stubs.
- Test `platform/services/*/tauri/[feature]Service.test.ts` by stubbing Tauri IPC at the adapter boundary.
- Test `platform/services/*/composite/*.test.ts` by passing fake adapters and fake metadata services.
- Do not require `platform/services/*/mock` for every service. Add mock implementations only for tests, demos, or local runtime modes that use them.
