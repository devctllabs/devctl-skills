# Structure and Feature Modules

Includes the project overview, recommended folder structure, and feature module template.

## Contents

- Overview
  - Key Principles:
- Recommended Folder Structure
  - Complete Structure Overview
- Vite Root and Assets
- UI Stack Defaults
- Feature Module Template

## Overview
This guide provides a comprehensive, production-ready folder structure for modern frontend applications using React and TypeScript. This structure is framework-agnostic and can be adapted for various projects.

### Key Principles:
- **Scalability** - Easy to add new features without restructuring
- **Maintainability** - Clear organization and predictable structure
- **Type Safety** - Full TypeScript support
- **Modularity** - Self-contained, reusable modules
- **Team Collaboration** - Clear boundaries and conventions

---

## Recommended Folder Structure

### Complete Structure Overview

```
project-root/
|-- public/                          # Files served as-is by stable URL
|   |-- favicon.ico
|   |-- robots.txt
|   `-- manifest.webmanifest
|
|-- src/
|   |-- features/                    # Feature modules (business logic)
|   |   |-- auth/
|   |   |   |-- components/         # Feature-specific components
|   |   |   |   |-- LoginForm.tsx
|   |   |   |   |-- LoginForm.test.tsx
|   |   |   |   |-- RegisterForm.tsx
|   |   |   |   `-- ForgotPassword.tsx
|   |   |   |-- hooks/              # Feature-specific hooks
|   |   |   |   |-- useAuth.ts
|   |   |   |   |-- useAuth.test.ts
|   |   |   |   |-- useLogin.ts
|   |   |   |   `-- useRegister.ts
|   |   |   |-- services/           # Service interfaces/contracts only
|   |   |   |   `-- authService.ts
|   |   |   |-- pages/              # Route pages
|   |   |   |   |-- Login.tsx
|   |   |   |   |-- Login.test.tsx
|   |   |   |   |-- Register.tsx
|   |   |   |   `-- ForgotPassword.tsx
|   |   |   |-- types/              # TypeScript types
|   |   |   |   `-- auth.types.ts
|   |   |   |-- utils/              # Feature utilities
|   |   |   |   `-- authHelpers.ts
|   |   |   `-- index.ts            # Public exports
|   |   |
|   |   |-- users/
|   |   |   |-- components/
|   |   |   |-- hooks/
|   |   |   |-- services/
|   |   |   |-- pages/
|   |   |   |-- types/
|   |   |   `-- index.ts
|   |   |
|   |   |-- dashboard/
|   |   |   |-- components/
|   |   |   |-- hooks/
|   |   |   |-- pages/
|   |   |   |-- types/
|   |   |   `-- index.ts
|   |   |
|   |   `-- [feature-name]/         # Add new features here
|   |       |-- components/
|   |       |-- hooks/
|   |       |-- services/
|   |       |-- pages/
|   |       |-- types/
|   |       |-- utils/
|   |       `-- index.ts
|   |
|   |-- shared/                      # Shared resources
|   |   |-- components/             # Reusable UI components
|   |   |   |-- ui/                 # shadcn/ui base primitives
|   |   |   |   |-- button.tsx
|   |   |   |   |-- input.tsx
|   |   |   |   |-- dialog.tsx
|   |   |   |   |-- dropdown-menu.tsx
|   |   |   |   `-- card.tsx
|   |   |   |
|   |   |   |-- layout/             # Layout components
|   |   |   |   |-- Header.tsx
|   |   |   |   |-- Sidebar.tsx
|   |   |   |   |-- Footer.tsx
|   |   |   |   |-- Container.tsx
|   |   |   |   `-- index.ts
|   |   |   |
|   |   |   |-- feedback/           # User feedback
|   |   |   |   |-- Toast.tsx
|   |   |   |   |-- LoadingSpinner.tsx
|   |   |   |   |-- LoadErrorState.tsx
|   |   |   |   |-- ErrorBoundary.tsx
|   |   |   |   |-- Skeleton.tsx
|   |   |   |   `-- index.ts
|   |   |   |
|   |   |   |-- data-display/       # Data visualization
|   |   |   |   |-- Table.tsx
|   |   |   |   |-- DataGrid.tsx
|   |   |   |   |-- Pagination.tsx
|   |   |   |   |-- List.tsx
|   |   |   |   `-- index.ts
|   |   |   |
|   |   |   `-- forms/              # Form components
|   |   |       |-- FormInput.tsx
|   |   |       |-- FormSelect.tsx
|   |   |       |-- FormTextarea.tsx
|   |   |       |-- DatePicker.tsx
|   |   |       `-- index.ts
|   |   |
|   |   |-- hooks/                  # Generic hooks
|   |   |   |-- useDebounce.ts
|   |   |   |-- useLocalStorage.ts
|   |   |   |-- useSessionStorage.ts
|   |   |   |-- useToast.ts
|   |   |   |-- useModal.ts
|   |   |   |-- usePagination.ts
|   |   |   |-- useToggle.ts
|   |   |   `-- index.ts
|   |   |
|   |   |-- utils/                  # Utility functions
|   |   |   |-- cn.ts               # Tailwind className merge helper
|   |   |   |-- formatters.ts       # Date, currency, text formatters
|   |   |   |-- validators.ts       # Validation functions
|   |   |   |-- helpers.ts          # General helpers
|   |   |   |-- abort.ts            # AbortSignal helpers
|   |   |   |-- constants.ts        # Global constants
|   |   |   `-- index.ts
|   |   |
|   |   |-- errors/                 # Typed Result, DomainError, and translated summaries
|   |   |   |-- result.ts
|   |   |   |-- domain-error.ts
|   |   |   |-- domain-error.test.ts
|   |   |   |-- domain-result.ts
|   |   |   |-- translation.ts
|   |   |   `-- index.ts
|   |   |
|   |   |-- services/               # Core services
|   |   |   |-- api/
|   |   |   |   |-- client.ts       # Axios/Fetch instance, exports apiClient
|   |   |   |   |-- interceptors.ts # Request/Response interceptors
|   |   |   |   |-- error-mapping.ts # HTTP/API -> DomainError mapping
|   |   |   |   |-- error-mapping.test.ts
|   |   |   |   |-- generated/      # Codegen output; do not edit manually
|   |   |   |   |   `-- openapi/
|   |   |   |   |-- adapters/       # Handwritten DTO/view-model mapping
|   |   |   |   `-- index.ts
|   |   |   |
|   |   |   |-- storage/
|   |   |   |   |-- localStorage.ts
|   |   |   |   |-- sessionStorage.ts
|   |   |   |   `-- index.ts
|   |   |   |
|   |   |   `-- analytics/          # Analytics services (optional)
|   |   |       |-- analytics.ts
|   |   |       `-- index.ts
|   |   |
|   |   `-- types/                  # Shared TypeScript types
|   |       |-- common.types.ts     # Common types
|   |       |-- api.types.ts        # API-related types
|   |       |-- user.types.ts       # User types
|   |       `-- index.ts
|   |
|   |-- core/                        # Core functionality
|   |   |-- config/                 # App configuration
|   |   |   |-- env.ts              # Environment variables
|   |   |   |-- app.config.ts       # App settings
|   |   |   `-- index.ts
|   |   |
|   |   |-- router/                 # Router setup
|   |   |   |-- router.tsx          # TanStack createRouter/RouterProvider setup
|   |   |   |-- guards.ts           # App-wide auth/permission helpers
|   |   |   `-- index.ts
|   |   |
|   |   |-- query/                  # React Query helpers
|   |   |   |-- domain-query.ts     # unwrapDomainResult
|   |   |   `-- domain-query.test.ts
|   |   |
|   |   |-- services/               # DI composition only
|   |   |   |-- service-registry.ts # Builds AppServices from implementations
|   |   |   |-- service-registry.test.ts
|   |   |   |-- ServicesProvider.tsx
|   |   |   |-- useServices.ts
|   |   |   `-- index.ts
|   |   |
|   |   |-- providers/              # Context providers
|   |   |   |-- AuthProvider.tsx
|   |   |   |-- ThemeProvider.tsx
|   |   |   |-- QueryProvider.tsx   # React Query provider
|   |   |   `-- index.ts
|   |   |
|   |   |-- store/                  # Global state (if needed)
|   |   |   |-- slices/
|   |   |   |   |-- authSlice.ts
|   |   |   |   `-- uiSlice.ts
|   |   |   `-- index.ts
|   |   |
|   |   `-- i18n/                   # Internationalization (optional)
|   |       |-- I18nProvider.tsx      # App i18n provider + document metadata
|   |       |-- i18n.ts               # i18next init and app instance
|   |       |-- i18next.d.ts          # Typed selector resource augmentation
|   |       |-- locales.ts            # Public locales, fallback, direction metadata
|   |       |-- resources/
|   |       |   |-- en-US.ts           # Canonical default-locale key tree
|   |       |   |-- [locale].ts
|   |       |   `-- index.ts
|   |       `-- index.ts
|   |
|   |-- platform/                    # Runtime/backend-specific implementations
|   |   |-- runtime.ts               # Runtime detection and service mode helpers
|   |   |-- tauri/                   # Shared Tauri invoke/error boundary
|   |   |   |-- invoke.ts
|   |   |   |-- invoke.test.ts
|   |   |   |-- tauri-error.ts
|   |   |   `-- tauri-error.test.ts
|   |   `-- services/
|   |       `-- [feature-name]/
|   |           |-- web/             # Browser/API-backed implementation
|   |           |   |-- [feature]Service.ts
|   |           |   `-- [feature]Service.test.ts
|   |           |-- tauri/           # Tauri/local implementation
|   |           |   |-- [feature]Service.ts
|   |           |   `-- [feature]Service.test.ts
|   |           |-- mock/            # Test/demo implementation
|   |           `-- composite/       # Services that route, compose, cache, or fallback
|   |               |-- routed[Feature]Service.ts
|   |               |-- cached[Feature]Service.ts
|   |               |-- fallback[Feature]Service.ts
|   |               `-- routed[Feature]Service.test.ts
|   |
|   |-- assets/                      # Imported/bundled assets
|   |   |-- images/
|   |   |-- icons/
|   |   |-- fonts/
|   |   `-- styles/
|   |       |-- globals.css
|   |       |-- variables.css
|   |       `-- themes/
|   |
|   |-- test/                        # Shared test infrastructure only
|   |   |-- setup.ts                 # Vitest/testing-library setup
|   |   |-- msw.ts                   # Shared MSW server/helpers
|   |   |-- render.tsx               # App/provider render helpers
|   |   |-- factories.ts             # Shared fixtures/builders
|   |   `-- storybook/               # Shared Storybook harnesses only
|   |       |-- decorators.tsx
|   |       |-- providers.tsx
|   |       |-- fake-services.ts
|   |       |-- router.tsx
|   |       `-- fixtures.ts
|   |
|   |-- App.tsx                      # Main app component
|   |-- main.tsx                     # Entry point
|   `-- vite-env.d.ts               # Vite type definitions
|
|-- .storybook/
|   |-- main.ts
|   `-- preview.ts                   # Thin Storybook wiring; imports src/test/storybook
|
|-- index.html                        # Vite HTML entry, in the app root
|-- e2e/                             # Optional browser E2E specs
|   `-- projects.spec.ts
|
|-- .env                             # Environment variables
|-- .env.example                     # Example env file
|-- .gitignore
|-- package.json
|-- pnpm-lock.yaml                   # Preferred lockfile for new projects
|-- components.json                  # shadcn/ui config, if using shadcn
|-- tsconfig.json                    # TypeScript config
|-- tsconfig.node.json               # Node TypeScript config
|-- vite.config.ts                   # Vite config, plugins, aliases
|-- tailwind.config.ts               # Optional Tailwind config when needed
`-- README.md
```

---

## Vite Root and Assets

Keep `index.html` in the Vite app root next to `package.json` and `vite.config.ts`. In a normal single-app repo this is `project-root/index.html`; use `ui/index.html` only when `ui/` is a separate package/app root with its own Vite config and package manifest.

Use `public/` for files that must be served as-is by stable URL, such as favicons, robots files, manifests, or vendor files referenced directly from HTML. Do not make `public/assets/` the default asset home.

Use `src/assets/` for assets imported by application code and processed by Vite, including images, icons, fonts, and global styles. Keep shadcn/Tailwind global CSS at `src/assets/styles/globals.css` unless the existing app has a coherent different convention.

---

## UI Stack Defaults

For new React + Vite projects, use `pnpm` by default, Tailwind via `@tailwindcss/vite`, and shadcn/ui for base primitives. For existing projects, follow the detected lockfile/package manager and keep the coherent UI stack unless the user explicitly asks to migrate.

Use `src/shared/components/ui` only for shadcn/ui base primitives copied by the CLI. These files use shadcn's lowercase naming (`button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`) because they are framework primitives, not app-domain components. Put reusable app composites in sibling folders such as `shared/components/forms`, `shared/components/layout`, `shared/components/feedback`, or `shared/components/data-display`. Put feature-specific components under `features/[feature]/components`.

Configure `components.json` so shadcn writes into shared UI boundaries:

```json
{
  "tsx": true,
  "tailwind": {
    "css": "src/assets/styles/globals.css",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/shared/components",
    "ui": "@/shared/components/ui",
    "utils": "@/shared/utils/cn",
    "hooks": "@/shared/hooks"
  },
  "iconLibrary": "lucide"
}
```

Keep `src/shared/utils/cn.ts` as the app's className merge helper:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

If the project uses Tailwind v4, prefer the Vite plugin and `@import "tailwindcss";` in the global CSS file. Add `tailwind.config.ts` only when the project needs explicit Tailwind configuration.

---

## Feature Module Template

When adding a new feature, use this template:

```
features/[feature-name]/
|-- components/                      # Feature components
|   |-- [Feature]List.tsx
|   |-- [Feature]List.test.tsx
|   |-- [Feature]List.stories.tsx
|   |-- [Feature]Form.tsx
|   |-- [Feature]Form.test.tsx
|   |-- [Feature]Form.stories.tsx
|   |-- [Feature]Card.tsx
|   |-- [Feature]Detail.tsx
|   `-- index.ts
|
|-- hooks/                           # Feature hooks
|   |-- use[Feature]Data.ts         # Data fetching
|   |-- use[Feature]Data.test.ts
|   |-- use[Feature]Form.ts         # Form handling
|   |-- use[Feature]Actions.ts      # CRUD operations
|   `-- index.ts
|
|-- services/                        # Service interfaces/contracts only
|   |-- [feature]Service.ts
|   `-- index.ts
|
|-- pages/                           # Route-facing pages and route layouts
|   |-- ListPage.tsx                 # Collection index page
|   |-- ListPage.test.tsx
|   |-- ListPage.stories.tsx
|   |-- CreatePage.tsx               # Create page
|   |-- CreatePage.stories.tsx
|   `-- [item-detail]/               # Nested route group, e.g. /$id/*
|       |-- DetailLayout.tsx         # Shared layout with an outlet
|       |-- DetailLayout.test.tsx
|       |-- DetailLayout.stories.tsx
|       |-- OverviewPage.tsx         # Detail index page
|       |-- EditPage.tsx             # Edit child page
|       `-- SettingsPage.tsx         # Additional child page
|
|-- __tests__/                       # Optional feature flows with no single owner
|   `-- [flow-name]-flow.test.tsx
|
|-- types/                           # TypeScript types
|   |-- [feature].types.ts
|   `-- index.ts
|
|-- utils/                           # Feature utilities
|   |-- [feature]Helpers.ts
|   `-- index.ts
|
`-- index.ts                         # Public exports
```

For a concrete `features/projects/` module, omit redundant domain prefixes inside the feature:

```
features/projects/
|-- pages/
|   |-- ListPage.tsx
|   |-- ListPage.test.tsx
|   |-- CreatePage.tsx
|   `-- project-detail/
|       |-- DetailLayout.tsx
|       |-- OverviewPage.tsx
|       |-- MembersPage.tsx
|       `-- SettingsPage.tsx
|-- components/
|-- hooks/
|-- services/
|-- types/
|-- utils/
`-- index.ts
```

For TanStack Router, keep file-based route modules in `src/routes` and import the feature pages through the feature public API:

```
src/routes/
|-- __root.tsx
|-- index.tsx
|-- -tests/
|   `-- project-navigation-flow.test.tsx
`-- projects/
    |-- route.tsx
    |-- index.tsx
    |-- new.tsx
    |-- $projectId.edit.tsx
    `-- $projectId/
        |-- route.tsx
        |-- index.tsx
        |-- members.tsx
        `-- settings.tsx
```

Use nested `pages/[route-group]/` folders for related screens under the same URL context, such as `/projects/$projectId/*`. Route modules should stay thin; feature pages, hooks, services, components, and types stay in `features/projects/`.

For every new or changed page, hook, or component, create or update a colocated test file with the same basename as the source file:

```
features/projects/pages/ListPage.tsx
features/projects/pages/ListPage.test.tsx
features/projects/pages/ListPage.stories.tsx
features/projects/components/ProjectList.tsx
features/projects/components/ProjectList.test.tsx
features/projects/components/ProjectList.stories.tsx
features/projects/hooks/useProjectData.ts
features/projects/hooks/useProjectData.test.ts
features/projects/__tests__/project-create-flow.test.tsx
src/routes/projects/index.tsx
src/routes/projects/index.test.tsx
src/routes/-tests/project-navigation-flow.test.tsx
```

Do not create broad ownerless product specs such as `pages.test.tsx`, `components.test.tsx`, or `[feature].test.tsx` when a concrete page, hook, or component owns the behavior. Use `features/[feature]/__tests__/` only for feature-owned flows that do not have one clear source-file owner. Use `src/routes/-tests/` for route-tree, history, redirect, and router-state navigation flows that cross several features or route modules. Use `src/test/` for shared Vitest setup, MSW, render helpers, fixtures, and builders; do not put normal product specs under `src/test/`. Use top-level `e2e/` only for browser E2E suites such as Playwright or Cypress.

For each new or materially changed public, reusable, route-facing, or visually risky UI component or page, also create or update a colocated Storybook file with the same basename. Use `src/test/storybook/` for shared Storybook providers, decorators, fake services, router wrappers, viewport helpers, and story fixture builders; keep `.storybook/preview.ts` thin and import those helpers. Do not write stories for hooks, services, generated code, utilities, thin route modules, private helper subcomponents, or thin connected wrappers without independent visual states.

Generated API code belongs at the shared backend-contract boundary, not inside a feature by default:

```
src/shared/services/api/
|-- client.ts
|-- error-mapping.ts
|-- generated/
|   `-- openapi/
|-- adapters/
`-- index.ts
```

Platform service implementations or composite services may wrap generated API functions when they need UI-specific query keys, mapping, defaults, or naming. Do not hand-edit files under `generated/`.

Platform-dependent services belong under `platform/services`, while `core/services` only wires final dependencies:

```
features/projects/services/
|-- projectService.ts               # ProjectService interface/contract
`-- projectMetadataService.ts       # Metadata/source interface when needed

platform/services/projects/
|-- web/projectService.ts
|-- web/projectService.test.ts
|-- tauri/projectService.ts
|-- tauri/projectService.test.ts
|-- mock/projectService.ts
|-- composite/routedProjectService.ts
|-- composite/cachedProjectService.ts
|-- composite/fallbackProjectService.ts
`-- composite/routedProjectService.test.ts

core/services/
|-- service-registry.ts
|-- service-registry.test.ts
|-- ServicesProvider.tsx
`-- useServices.ts
```

Use `composite/` for service implementations that compose other service implementations: routed services, cache wrappers, fallback chains, retry/logging wrappers, and similar coordinating implementations. Some are decorators, but the folder is broader than the decorator pattern. Do not use `core/services` as an implementation folder.

Typed errors and React Query unwrapping belong in shared/core boundaries, not feature code:

```
shared/errors/
|-- result.ts
|-- domain-error.ts
|-- domain-result.ts
|-- translation.ts
`-- index.ts

shared/services/api/
`-- error-mapping.ts

platform/tauri/
|-- invoke.ts
`-- tauri-error.ts

core/query/
`-- domain-query.ts
```

---
