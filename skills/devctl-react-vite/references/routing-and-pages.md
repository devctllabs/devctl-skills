# Routing and Pages

Includes TanStack Router file-based route modules, hierarchical feature `pages/` route groups, route-facing page composition, route layouts, generated route tree placement, and route naming rules.

## Contents

- TanStack Router Default
- Route Directory Structure
- File Naming Rules
- Route Modules
- Hierarchical `pages/`
- Responsive Page View Split
- Naming Rules
- Route Group Decisions

## TanStack Router Default

Use TanStack Router file-based routing. Keep route modules in the configured TanStack routes directory, usually `src/routes`, and keep real page implementation inside the owning feature.

Use TanStack's generated route tree as router wiring. Keep the generated file at the TanStack default, usually `src/routeTree.gen.ts`, outside `src/routes`. Import it from the app router setup, for example `src/core/router/router.tsx`, and never hand-edit it.

This keeps the URL tree visible in one router-owned place while preserving feature colocation:

```text
src/
|-- routeTree.gen.ts                 # generated; do not edit
|-- core/
|   `-- router/
|       `-- router.tsx               # createRouter({ routeTree })
|-- routes/
|   |-- __root.tsx
|   |-- index.tsx
|   |-- boot.tsx
|   `-- projects/
|       |-- route.tsx
|       |-- index.tsx
|       |-- new.tsx
|       |-- $projectId.edit.tsx
|       `-- $projectId/
|           |-- route.tsx
|           |-- index.tsx
|           |-- members.tsx
|           `-- settings.tsx
`-- features/
    `-- projects/
        |-- pages/
        |   |-- ListPage.tsx
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

Route modules should stay thin: define route paths, loaders, validation, route-level boundaries, and minimal page wiring there; import UI and feature behavior from `features/`.

## Route Directory Structure

Organize `src/routes` by URL context and navigation hierarchy, not by `features`. The routes directory should read like the application route map; feature folders remain the ownership boundary for real page UI, hooks, services, and domain types.

Use nested directories for object or section route boundaries. Use mixed flat filenames for short terminal leaf paths that do not need their own directory boundary:

```text
src/routes/
|-- __root.tsx
|-- index.tsx
|-- boot.tsx
|-- dashboard/
|   |-- route.tsx
|   |-- index.tsx
|   `-- $workspaceId/
|       |-- route.tsx
|       |-- index.tsx
|       |-- create.$entityKind.tsx
|       |-- folders/
|       |   `-- $folderId/
|       |       |-- route.tsx
|       |       |-- index.tsx
|       |       |-- edit.tsx
|       |       `-- create.$entityKind.tsx
|       `-- decks/
|           `-- $deckId/
|               |-- route.tsx
|               |-- index.tsx
|               |-- edit.tsx
|               |-- notes/
|               |   |-- route.tsx
|               |   |-- new.$kind.tsx
|               |   `-- $noteId/
|               |       |-- route.tsx
|               |       |-- index.tsx
|               |       `-- edit.tsx
|               `-- review/
|                   |-- route.tsx
|                   |-- index.tsx
|                   `-- summary.tsx
|-- workspaces/
|   |-- route.tsx
|   |-- index.tsx
|   |-- new.tsx
|   `-- $workspaceId.edit.tsx
`-- menu/
    |-- route.tsx
    |-- index.tsx
    |-- settings.tsx
    |-- trash.tsx
    `-- conflicts.tsx
```

Route modules may import page components from any owning feature through public feature exports. For example, a route under `routes/dashboard/decks/notes/` can import `NoteEditorPage` from `@features/notes` because the URL context is dashboard navigation while the page implementation belongs to the notes feature.

## File Naming Rules

- Use `__root.tsx` for the TanStack root route. It lives at the root of `src/routes` and usually renders global route-level providers, boundaries, shortcuts, transitions, and `<Outlet />`.
- Use `route.tsx` for a directory parent route node. Add it when a route directory has children or needs route-level loaders, validation, guards, context, pending/error/not-found boundaries, or layout.
- Keep `route.tsx` minimal when it only exists as a parent route anchor: `export const Route = createFileRoute('/projects')({})`.
- Render `<Outlet />` in `route.tsx` only when that route provides a real layout or wrapper component.
- Use `index.tsx` for the exact index page of its parent route.
- Use `$paramName` for dynamic segments, not React Router-style `:paramName`.
- Use mixed flat names for terminal leaf paths such as `$workspaceId.edit.tsx`, `create.$entityKind.tsx`, or `new.$kind.tsx`.
- Use `-`-prefixed folders for non-route files under `src/routes`, such as `-tests/`.

Do not put generated route-tree output inside `src/routes`; `src/routes` should contain route modules and route-local ignored folders only.

## Route Modules

Use `createFileRoute` in TanStack route files and import feature pages through the feature public API.

```tsx
// src/routes/projects/route.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects')({});
```

```tsx
// src/routes/projects/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProjectsListPage } from '@features/projects';

export const Route = createFileRoute('/projects/')({
  component: ProjectsListPage,
});
```

```tsx
// src/routes/projects/new.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProjectCreatePage } from '@features/projects';

export const Route = createFileRoute('/projects/new')({
  component: ProjectCreatePage,
});
```

```tsx
// src/routes/projects/$projectId/route.tsx
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { ProjectDetailLayout } from '@features/projects';

const ProjectDetailRoute = () => (
  <ProjectDetailLayout>
    <Outlet />
  </ProjectDetailLayout>
);

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetailRoute,
});
```

```tsx
// src/routes/projects/$projectId/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProjectOverviewPage } from '@features/projects';

const ProjectOverviewRoute = () => {
  const { projectId } = Route.useParams();

  return <ProjectOverviewPage projectId={projectId} />;
};

export const Route = createFileRoute('/projects/$projectId/')({
  component: ProjectOverviewRoute,
});
```

```tsx
// src/routes/projects/$projectId.edit.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProjectEditPage } from '@features/projects';

const ProjectEditRoute = () => {
  const { projectId } = Route.useParams();

  return <ProjectEditPage projectId={projectId} />;
};

export const Route = createFileRoute('/projects/$projectId/edit')({
  component: ProjectEditRoute,
});
```

## Hierarchical `pages/`

Use feature-local `pages/` for route-facing components and route layouts, not for all UI. Put reusable feature UI in `components/`.

```text
features/projects/pages/
|-- ListPage.tsx                    # /projects
|-- CreatePage.tsx                  # /projects/new
|-- EditPage.tsx                    # /projects/$projectId/edit
`-- project-detail/                 # /projects/$projectId/*
    |-- DetailLayout.tsx            # layout used by route.tsx
    |-- OverviewPage.tsx            # /projects/$projectId
    |-- MembersPage.tsx             # /projects/$projectId/members
    `-- SettingsPage.tsx            # /projects/$projectId/settings
```

Use a layout file when several child pages share object loading, breadcrumbs, tabs, sidebars, permissions, or error boundaries. In TanStack Router layouts, render child routes with `Outlet` from `@tanstack/react-router`.

## Responsive Page View Split

For route-facing pages with meaningfully different desktop and mobile layouts, keep the exported `...Page` component as the controller and split layout JSX into local desktop/mobile view components in the same file.

Keep data flow in the controller:

- Call queries, mutations, navigation hooks, media-query hooks, and local state hooks in `...Page`.
- Derive shared values and compose retry/delete/create/search handlers in `...Page`.
- Keep confirmation dialogs and other cross-layout overlays in `...Page` unless they are truly layout-specific.

For small pages, it is fine for the controller to render loading/error branches before choosing a desktop or mobile view. For complex pages, prefer a discriminated page view props union so the controller branches only once on the viewport and each view owns its layout-specific shell for loading, error, and loaded states:

```tsx
type PageViewProps =
  | { state: 'loading'; showSkeleton: boolean; homeTarget: NavigationTarget }
  | {
      state: 'workspace-error'
      error: unknown
      homeTarget: NavigationTarget
      onRetry: () => void
    }
  | {
      state: 'loaded'
      content: ReactNode
      homeTarget: NavigationTarget
      onCreate: () => void
    }

export const DashboardPage = () => {
  const isDesktop = useMediaQuery(mediaQueries.desktop)
  const workspaceQuery = useWorkspace()
  const showSkeleton = shouldShowSkeleton(workspaceQuery)

  const viewProps: PageViewProps = workspaceQuery.isLoading
    ? { state: 'loading', showSkeleton, homeTarget }
    : workspaceQuery.isError
      ? {
          state: 'workspace-error',
          error: workspaceQuery.error,
          homeTarget,
          onRetry: () => workspaceQuery.refetch(),
        }
      : {
          state: 'loaded',
          content: <DashboardSections />,
          homeTarget,
          onCreate: openCreateDialog,
        }

  const page = isDesktop ? (
    <DashboardPageDesktop {...viewProps} />
  ) : (
    <DashboardPageMobile {...viewProps} />
  )

  return <>{page}</>
}
```

Use semantic state names instead of loose boolean pairs. A loading state may carry `showSkeleton` when delayed skeleton behavior is needed. Keep surface-specific loading, such as async search result loading, inside the relevant ready-to-render node instead of promoting it to page-level state.

When loaded desktop and mobile layouts differ, loading and blocking error branches should follow the same view split. Desktop loading skeletons should mirror the loaded desktop shell: sidebar/header slots, action/search placement, content lanes, grids, and aside panels. Mobile loading skeletons should mirror the loaded mobile shell and navigation structure instead of reusing desktop-only wrappers or lanes. Shared skeleton components may accept a viewport or layout variant, but the route-facing page/view should own viewport branching.

Make local view components dumb and route-specific. They may switch on the page view state to choose layout-specific loading/error/loaded shells, but they should not call data hooks, mutation hooks, or navigation hooks.

Name view components after the route-facing page, for example `DashboardPageDesktop`, `DashboardPageMobile`, `DeckDetailPageDesktop`, and `DeckDetailPageMobile`. Keep them local unless another file genuinely needs to import them.

Use desktop-only layout wrappers, content lanes, sidebars, and action bars inside the desktop view. Use the project's mobile shell, constrained lanes, navigation, sticky search, or fixed action areas inside the mobile view when those exist.

Pass ready-to-render `ReactNode` values for shared sections when that avoids duplicating query/error/search rendering. Pass callbacks such as `onCreateDeck`, `onDeleteNote`, or `onQueryChange`; do not re-run hooks or duplicate mutations inside the view components.

Avoid a single generic responsive wrapper with many conditional props such as `desktopChildren`, `mobileChildren`, `fab`, `bottomNav`, `contentClassName`, and route-specific modes. Prefer page-level branching when routes need easy desktop or mobile opt-out behavior.

## Naming Rules

Inside a feature, avoid repeating the feature domain in page filenames:

- Use `ListPage.tsx`, not `ProjectsListPage.tsx`, inside `features/projects/`.
- Use `CreatePage.tsx`, not `ProjectCreatePage.tsx`, inside `features/projects/`.
- Use `DetailPage.tsx`, not `ProjectDetailPage.tsx`, inside `features/projects/`.
- Use `EditPage.tsx`, not `ProjectEditPage.tsx`, inside `features/projects/`.
- Use `DetailLayout.tsx`, `OverviewPage.tsx`, `SettingsPage.tsx`, and similar contextual names inside `pages/project-detail/`.
- Add domain prefixes only when exporting across feature boundaries, resolving name collisions, or creating shared components outside the feature.

Choose page filenames by route role:

- Use resource action names for CRUD-like feature routes: `ListPage.tsx`, `CreatePage.tsx`, `DetailPage.tsx`, and `EditPage.tsx`.
- Use singleton feature names for app-level or one-off routes: `DashboardPage.tsx`, `SettingsPage.tsx`, `TrashPage.tsx`, `MenuPage.tsx`, `ConflictsPage.tsx`, and `BootPage.tsx`.
- Use workflow step names for multi-step flows: `SessionPage.tsx`, `SummaryPage.tsx`, `CheckoutPage.tsx`, or `ConfirmPage.tsx`.
- Use contextual child names inside nested page groups: `OverviewPage.tsx`, `MembersPage.tsx`, `SettingsPage.tsx`, and `DetailLayout.tsx`.
- Keep tests and stories colocated with the same basename: `EditPage.tsx`, `EditPage.test.tsx`, and `EditPage.stories.tsx`.

For routes that share create/edit implementation, keep the route-facing filename aligned with the route action, such as `CreatePage.tsx` or `EditPage.tsx`. Put shared editor/form/controller code in `components/` or a local helper instead of naming the route-facing file `EditorPage.tsx`.

For public exports, prefer aliases when clarity is needed:

```ts
export { default as ProjectsListPage } from './pages/ListPage';
export { default as ProjectCreatePage } from './pages/CreatePage';
export { default as ProjectEditPage } from './pages/EditPage';
export { default as ProjectDetailLayout } from './pages/project-detail/DetailLayout';
export { default as ProjectOverviewPage } from './pages/project-detail/OverviewPage';
```

## Route Group Decisions

Create a nested page group when screens share a route context or object identity:

- `project-detail/` for `/projects/$projectId/*`.
- `billing/` for `/settings/billing/*`.
- `permissions/` for `/admin/permissions/*`.
- `members/` for `/teams/$teamId/members/*`.

Avoid vague folder names such as `nested/`, `children/`, `screens/`, or `detail/` when a domain-specific route group name is clearer.

Do not create a nested directory for a single one-off leaf page unless it is expected to grow or needs its own route boundary. Prefer mixed flat filenames for short terminal routes such as `create.$entityKind.tsx`, `new.$kind.tsx`, or `$itemId.edit.tsx`.
