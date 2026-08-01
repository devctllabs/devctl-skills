# Storybook

Use Storybook for UI state coverage, visual review, browser-based component tests, accessibility checks, and interaction tests. It complements colocated unit/integration tests; it does not replace them.

## Contents

- Story Placement
- Shared Storybook Harnesses
- Runtime and Form Factor Harnesses
- Story Shape and Layout
- Story Naming Conventions
- Component Stories
- Page Stories
- UI Async State Coverage
- Testing Boundaries
- Setup Defaults

## Story Placement

For every user-facing route-facing page under `features/*/pages`, create or update a colocated story file with the same basename. Page stories are the visual inventory of the application screens, so add them even when the page is a thin connected wrapper.

For each new or materially changed public, reusable, or visually risky UI component, create or update a colocated story file with the same basename:

```text
src/shared/components/feedback/EmptyState.tsx
src/shared/components/feedback/EmptyState.test.tsx
src/shared/components/feedback/EmptyState.stories.tsx

src/features/products/components/ProductCard.tsx
src/features/products/components/ProductCard.test.tsx
src/features/products/components/ProductCard.stories.tsx

src/features/products/pages/ListPage.tsx
src/features/products/pages/ListPage.test.tsx
src/features/products/pages/ListPage.stories.tsx
```

## Coverage Policy

Create stories for meaningful UI surfaces, not every JSX component. Expected targets are all user-facing route pages, shared/reusable app components, feature-visible components, and components with visual branches, user-visible data, layout risk, or interaction states.

For route-facing pages, coverage completeness takes precedence over component minimalism: every user-facing screen should be visible in Storybook, and page stories should expose the screen states users can actually hit.

Skip private helper subcomponents and thin connected wrappers that only pass data, providers, or callbacks and have no independent visual behavior. Cover their visible output through the owning component or page story instead.

Use CSF 3 with typed `Meta` and `StoryObj`. Prefer `args` for story data. Use `render` only when the story needs a wrapper, composed children, or controlled state.

Do not create stories for hooks, services, generated code, route modules, utility files, private helper subcomponents, or thin connected component wrappers without independent visual states. This exclusion does not apply to user-facing route pages. For shadcn/ui primitives, add stories only when the primitive is customized, exposed as part of the design-system API, or commonly consumed directly.

## Shared Storybook Harnesses

Keep reusable Storybook harness code in `src/test/storybook/`:

```text
src/test/storybook/decorators.tsx
src/test/storybook/providers.tsx
src/test/storybook/fake-services.ts
src/test/storybook/router.tsx
src/test/storybook/fixtures.ts
src/test/storybook/viewports.ts
```

Keep `.storybook/preview.ts` thin: import global CSS, register Storybook parameters/loaders, and use decorators/helpers from `src/test/storybook/`. Do not duplicate provider setup in each story file.

Use shared harnesses for `ThemeProvider`, `QueryClientProvider`, `ServicesProvider`, router/memory-router wrappers, stable fake services, viewport helpers, and reusable edge-case fixture builders.

## Runtime and Form Factor Harnesses

When an app chooses mobile/app versus desktop layout through a runtime profile, environment provider, or app shell state, expose that switch through a shared Storybook harness instead of duplicating page stories. Keep the provider/decorator in `src/test/storybook/`, register the toolbar through Storybook `globalTypes`, and import only the shared decorator/globalTypes from `.storybook/preview.ts`.

For apps with a provider like `AppRuntimeProfileProvider`, use a global toolbar value such as `Desktop` and `App` to feed the provider:

```tsx
export const storybookRuntimeGlobalTypes = {
  appFormFactor: {
    defaultValue: 'desktop',
    name: 'Form Factor',
    toolbar: {
      dynamicTitle: true,
      icon: 'mobile',
      items: [
        { title: 'Desktop', value: 'desktop' },
        { title: 'App', value: 'mobile' },
      ],
    },
  },
} satisfies NonNullable<Preview['globalTypes']>

export const withStorybookRuntimeProfile: Decorator = (Story, context) => (
  <AppRuntimeProfileProvider
    key={String(context.globals.appFormFactor ?? 'desktop')}
    initialProfile={{
      formFactor: context.globals.appFormFactor === 'mobile' ? 'mobile' : 'desktop',
      runtime: 'web',
    }}
  >
    <Story />
  </AppRuntimeProfileProvider>
)
```

Default the toolbar to the form factor that best preserves existing automated Storybook tests, usually `desktop` for desktop-first browser-test baselines. If an app has no runtime/form-factor provider, rely on Storybook viewport controls and realistic parent constraints instead of inventing a provider-only switch.

## Story Shape and Layout

Use typed CSF stories with `@storybook/react-vite`. Keep story data in `args`; use decorators for Storybook chrome such as realistic parent width, providers, padding, or route context. Storybook chrome belongs in decorators; component state belongs in args.

Story exports should describe UI state, data shape, or interaction state, not viewport or app form factor. Do not create duplicated `Mobile`, `Desktop`, `SmallMobile`, `Tablet`, `App`, or similar stories only to inspect responsive or app-shell behavior. Use Storybook's viewport controls for viewport-only behavior and a global form-factor toolbar for provider-driven app/mobile versus desktop layout. If responsive layout risk is real, cover it with the same universal story, realistic non-viewport-specific parent constraints, `play` assertions, or dedicated browser/visual tests. Stories are still valid for components that are themselves exported mobile-only or desktop-only layout surfaces, but keep their story names state-based, such as `HomeActive` or `MenuOpen`.

Keep canonical visible stories such as `Loaded`, `Default`, or `Basic` focused on UI state preview. When a browser-geometry regression needs viewport changes, zoom-like widths, sticky position checks, or container-query assertions and would add sidebar noise, create a separate hidden regression story instead. Name it by the behavior, such as `DesktopActionsZoomRegression` or `DesktopDetailLayoutRegression`, give it `tags: ['!dev', '!autodocs', 'layout-regression']`, and do not add `!test` so the Storybook/Vitest browser run still executes its `play`.

Set `meta.component` to the exported UI surface being documented. If a story needs local state, a composed shell, or provider wiring, keep that wrapper inside `render` or a decorator rather than making a local `*Preview` component the story component.

Prefer this shape for component stories:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from './Button'

const meta = {
  args: {
    children: 'Click me',
  },
  component: Button,
  parameters: {
    layout: 'centered',
  },
  title: 'UI/Button',
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}
```

For typed domain data, define one shared fixture and a small partial builder. Put noop callbacks in `meta.args` when the component only needs stable action props for visual states:

```tsx
const baseProduct: Product = {
  id: 'storybook-product',
  name: 'Notebook',
  status: 'active',
}

const createProduct = (product: Partial<Product>): Product => ({
  ...baseProduct,
  ...product,
})

const noop = () => undefined
```

Choose the Storybook layout based on how the component sizes in production:

- Intrinsic components such as `Button`, `Badge`, `IconButton`, and compact form controls usually use `layout: 'centered'` or `layout: 'padded'`. Do not stretch them to the full viewport unless that is a supported component state.
- Block, card, list-item, and page-section components that are `w-full` in production should render inside a realistic parent container. Put that container in a decorator instead of passing artificial width classes through `args`; for fullscreen stories, center the constrained parent vertically and horizontally on the canvas.
- Do not use `className` in `args` to force story width unless styling through `className` is the behavior being documented. If a component needs a constrained layout to reveal wrapping or overflow risks, constrain the parent.
- Use `layout: 'fullscreen'` when the decorator owns the realistic screen or parent canvas; otherwise use `centered` or `padded`.

For example, `ui/src/features/decks/components/DeckCard.stories.tsx` is the repo-local pattern for a full-width list/card component:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'

import type { Deck } from '../types/deck.types'
import { DeckCard } from './DeckCard'

const baseDeck: Deck = {
  description: '',
  dueToday: 18,
  icon: 'brain',
  id: 'storybook-deck',
  progress: 72,
  style: 'primary',
  title: 'Biology',
  totalCards: 145,
  updatedAt: '2026-04-24T12:00:00.000Z',
  workspaceId: 'editorial-production',
}

const createDeck = (deck: Partial<Deck>): Deck => ({
  ...baseDeck,
  ...deck,
})

const noop = () => undefined

const meta = {
  args: {
    deck: baseDeck,
    onDelete: noop,
    onEdit: noop,
    onOpen: noop,
    onReview: noop,
  },
  component: DeckCard,
  decorators: [
    (Story) => (
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  title: 'Features/Decks/Components/DeckCard',
} satisfies Meta<typeof DeckCard>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    deck: baseDeck,
  },
}

export const OverflowMetrics: Story = {
  args: {
    deck: createDeck({
      dueToday: 9999,
      id: 'overflow-metrics',
      progress: 148,
      title: 'Overflow Metrics',
      totalCards: 9999,
    }),
  },
}
```

## Component Stories

Cover meaningful visual branches, not every prop combination:

- `Default` or `Basic`
- `Loading`, `Disabled`, `Selected`, `Active`, `Invalid`, or `Error` when supported
- `Empty`, `SingleItem`, and `ManyItems` for lists, grids, tables, and other collection containers when zero, one, and many items are valid user-visible states
- `MissingImage`, `OddImageRatio`, `LargeNumber`, `UnknownStatus`, or `DenseData` when those inputs can break layout or readability
- Form states such as `Empty`, `Filled`, `ValidationErrors`, `Submitting`, and `ServerError`

For collection containers, treat zero, single, and many items as baseline layout-risk states, not optional edge cases. If the component intentionally renders nothing for zero items because the owning page handles the empty state, cover the zero-item state at the owning page or component surface where users actually see it.

For visible text fields in constrained layouts, include a text-length ladder when wrapping, truncation, or overflow can affect the UI:

- `ShortText`
- `WrappedText`
- `TruncatedText`
- `LongUnbrokenText`
- `EmptyText` or `MissingText` when the component supports absent text

Apply this to any user-visible text field, not only names or titles: headings, subtitles, descriptions, article previews/excerpts, table cells, badges, status labels, action/menu labels, and empty-state copy. Render these stories in the realistic container width where wrapping or truncation occurs; otherwise the story may miss the layout risk.

Prefer separate stories for edge cases that are useful to open directly or compare in visual diffs, such as `ZeroMetrics`, `NegativeMetrics`, `OverflowMetrics`, `InvalidDate`, `LongTitle`, and `LongUnbrokenTitle`. Use a composed `render` story only when seeing multiple variants side by side is the point of the story.

Avoid a cartesian product of variants. Use the smallest story set that covers user-visible states, interaction branches, and realistic layout risks. Do not add `null` or `undefined` stories for values that violate the TypeScript contract of the component. If an edge story shows that a shared component must normalize data, add a colocated unit test for that shared component rather than treating Storybook as the assertion.

## Story Naming Conventions

Use PascalCase named exports that describe the visible UI state or the regression behavior under test. Keep page story names consistent across features before inventing new names.

Prefer these page-story names:

- `Loaded` for the normal connected page state. Use `Default` only when the surface is generic or does not have a clearer loaded state.
- `Loading` for page-level or route-critical skeleton/loading UI.
- `LoadError` for page-blocking initial load/storage failures. Do not name this story `Error`; reserve generic `Error` for component-level states when no narrower surface exists.
- `Empty*` for empty product states, with a domain suffix when it improves Storybook navigation, such as `EmptyList`, `EmptyFolder`, or `EmptyNotes`.
- `ManyItems` for dense collection/page scenarios when item count creates realistic scroll, sticky, overflow, or rhythm risk. Use domain-specific names only when separate collection sections need isolated coverage.
- `SingleItem` for component collection stories, and for page stories only when a one-item layout differs materially from loaded or many-item states.
- `SearchResults`, `SearchLoading`, `SearchNoResults`, and `SearchError` for async search/result surfaces.
- `<Action>Pending` and `<Action>Error` for action and mutation states, such as `SavePending`, `DeleteDeckError`, `RestorePending`, or `ResetError`.
- `<DialogName>DialogOpen` for open dialog/menu states, such as `DeleteDialogOpen` or `EmptyTrashDialogOpen`.
- `SectionErrors`, `<Section>RefreshError`, or `<Resource>RefreshError` for stale-data or partial-load failures that do not replace the whole page.
- `LongContent`, `LongNames`, `LongTitle`, or `LongUnbrokenText` for text and content stress states.
- `<ViewportOrSurface><Behavior>Regression` for hidden browser-test stories that encode a specific responsive, sticky, zoom, overflow, or layout assertion, such as `MobileLoadErrorRegression`, `MobileManyItemsRegression`, or `DesktopActionsZoomRegression`.

Use mobile/desktop prefixes only for hidden regression stories or components that are explicitly mobile-only or desktop-only. Keep canonical user-state stories viewport-agnostic and drive app/mobile versus desktop branches through the shared Storybook harness.

## Page Stories

For every user-facing route-facing page, create a colocated page story. The minimum page story set is:

- `Default` or `Loaded` for the normal screen.
- `Loading` when the page reads async data, waits on route-critical data, or can show a skeleton.
- `Empty` when an empty collection or absent resource is a valid user-visible state.
- Zero, single, and many item states for every meaningful collection section on the page. Use names such as `EmptyList`, `SingleDeck`, `ManyItems`, or a compact combined story when that better matches the product surface.
- `LoadError` for page-blocking initial load failures; use narrower names such as `SectionErrors`, `SearchError`, `SaveError`, or `PermissionDenied` for non-blocking or surface-specific failures.
- A named mutation/action pending story for every distinct user-visible pending surface, such as pending submit, confirm, autosave, restore, selected-card open, selected-row action, or selected button action.
- A named mutation/action error story for every user-visible failed action the page can show, such as failed autosave, failed submit, failed delete confirmation, failed restore, failed reset, or failed background action.
- `SearchLoading`, `SearchNoResults`, `FilteredNoResults`, `Pagination`, `PartialData`, `DenseData`, dialog/open, or `LongContent` when supported.

For pages with multiple independent collections, cover each collection's zero/single/many behavior without creating a cartesian product of every combination. Prefer the smallest set of page stories that exposes each affected section in all three item-count states.

Read `ui-error-states.md` when deciding whether an error story should replace the whole page, only a section, the search results surface, or a mutation/form/action surface. Error stories should match the surfaces users actually see rather than only proving that a thrown error can be displayed.

Use the title hierarchy `Features/<Feature>/Pages/<FileBasename>` for feature page stories. The final title segment should match the colocated page source/story file basename, not necessarily the exported component name. For example, `features/folders/pages/EditPage.stories.tsx` should use `Features/Folders/Pages/EditPage` even if the React component export is `FolderEditPage`. If a route module contains meaningful UI, move that UI into a feature page/component and write the story there; TanStack route modules themselves usually stay thin and do not need stories.

Prefer presentational page props and args when the page can be structured that way. For connected pages, prefer injected fake services through `ServicesProvider`. Use MSW when the story intentionally exercises the HTTP boundary or when the page is already built around network handlers.

For connected page error stories, reproduce the user-reachable async sequence through injected fake services instead of constructing impossible internal state. Keep the page on the same providers, router, QueryClient, and service DI path used by the app; make fake service methods return `ok`, `err`, or pending results in the order that production code would observe them. If the error happens after an action, trigger the real action in `play` and wait for the owning error surface. For example, model a stale refresh failure as loaded `list()` data, a successful `delete`/`restore`/`save` mutation, and then a failed follow-up `list()` or refetch.

Do not mock route-facing page hooks directly, preload impossible React Query cache states as the primary story behavior, or pass internal state props that a user cannot produce. Story helpers may expose intent-level options such as `loading`, `mutationError`, `mutationLoading`, or `postMutationRefreshError`, but those helpers should implement realistic service behavior internally. Presentational component stories may still pass `error`, `invalid`, `actionError`, and similar props through args because those components do not own service orchestration.

For loading/skeleton page stories, exercise the real connected page with the same providers and service DI used by the app. Prefer a fake service method that returns a never-resolving promise, such as `pendingDomainResult<T>()`, instead of mocking hooks. If the page delays skeleton display with `useDelayedBoolean`, add a `play` function that waits for the loading status element before running layout assertions:

```tsx
export const Loading: Story = {
  decorators: [withProductPage({ loading: true })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByRole('status', { name: 'Loading products' })
    await expectNoHorizontalOverflow(canvasElement)
  },
}
```

Isolated skeleton component stories are still useful, but they do not replace the page-level `Loading` story because they cannot verify route shell, providers, navigation targets, responsive shell structure, and connected-page wiring.

For async search or filter results on route-facing pages, add a page-level `SearchLoading` story in addition to component-level loading coverage. Keep the page's route-critical data loaded, trigger the search through the real input in `play`, and make only the search/results surface pending through fake service DI. If the search surface delays skeleton display, wait for its loading status element, such as `findByRole('status', { name: /search/i })`, before layout assertions.

For mutation pending stories, keep the surrounding page data loaded and make only the targeted mutation pending through fake service DI, such as a never-resolving `pendingDomainResult<T>()` exposed by a story helper like `mutationLoading`. Trigger the real user action in `play` and wait for the visible pending surface at the owning control, dialog, row, card, header, or button. Do not replace this with a generic page-level loading story unless the mutation actually replaces the primary content.

If autodocs are enabled globally, disable generated Docs for route-facing page stories with `tags: ['!autodocs']` in the story meta. Keep page stories available as direct stories and interaction-test targets; do not rely on Docs autoplay for page interaction states. Keep autodocs for reusable component stories, including shared layout components such as page headers or screen shells that are not route-facing pages.

## UI Async State Coverage

Every user-visible loading, query error, stale-data warning, mutation/action pending branch, and mutation/action error branch should have Storybook coverage at the owning page or component surface. For pages and reusable feedback components that render load, mutation pending, or mutation failures, cover:

- page-blocking, section-level, search/results, stale-data, and form/dialog mutation error surfaces;
- local mutation pending surfaces such as submit buttons, confirm buttons, row actions, selected cards, selected controls, autosave indicators, and background-action statuses;
- retryable and non-retryable errors;
- no-data blocking errors and stale-data contextual warnings when both states are possible;
- severity/tone variants for action errors and background warnings when the project supports them;
- visible mutation/server errors that preserve form values or dialog state;
- floating or action-level statuses for non-blocking failed actions such as autosave, restore, reset, refresh, sync, or background mutations;
- long error messages and constrained widths for shared feedback components;
- retry/back action combinations when the component supports them.

Do not rely on a toast-only story for a failed screen or action. Storybook should show the affected page, section, results, form, dialog, or action surface in its failed state.

## Testing Boundaries

Use Storybook for:

- render smoke checks for stories
- browser-based interaction tests with `play`
- accessibility checks with Storybook a11y tooling
- visual review/regression for layout-sensitive states
- documentation of supported UI states

Keep colocated unit/integration tests for:

- hooks, services, adapters, data mapping, reducers, stores, and DI wiring
- React Query query keys, cache behavior, retry/error mapping, and `DomainResult` unwrapping
- business assertions where visual rendering is incidental
- precise async behavior that is easier to assert outside a story

Use browser E2E tests for cross-page navigation, auth redirects, app-shell behavior, and full user workflows.

Treat app form factor, viewport width, and browser zoom/container-query behavior as separate test surfaces. A Storybook toolbar can verify provider-driven app/mobile versus desktop branch selection for manual review, but it does not replace browser `play` assertions or visual tests for viewport breakpoints, container queries, horizontal overflow, sticky positioning, or 125%/150% zoom regressions.

Unit or jsdom tests may assert the structural contract behind layout behavior, such as DOM order, roles, wrapper classes, and class names that opt into container queries. They cannot prove real browser geometry, so keep geometry-sensitive checks in hidden Storybook regression stories or visual/browser tests.

When adding shared layout or overflow assertions for stories, ignore visually hidden `.sr-only` content and intentional horizontal-scroll containers such as `overflow-x-auto` or `overflow-x-scroll`; these checks should catch accidental visible overflow, not accessibility text or deliberate scrolling controls.

## Setup Defaults

For new React + Vite UI projects, prefer Storybook with the React Vite framework and CSF 3 stories. Install and configure Storybook from the Vite app root with the project's package manager; for new projects this usually means the pnpm equivalent of the official Storybook CLI. Keep Storybook config minimal: colocated `src/**/*.stories.tsx`, thin `.storybook/preview.ts`, shared harnesses in `src/test/storybook/`, and global CSS imported once.

For new UI projects, recommend this Storybook addon baseline:

- `@storybook/addon-docs` by default, so component args, controls, and generated docs are available without custom documentation plumbing.
- `@storybook/addon-a11y` by default for accessibility checks directly in stories.
- `@storybook/addon-vitest` for production-like UI projects where stories should run in automated checks.

Prefer installing addons through `storybook add <addon>` from the Vite app/package root with the detected package manager instead of hand-building Storybook config from scratch. When adding the Vitest addon, expect browser-test setup as part of the implementation: `@vitest/browser`, a Playwright browser provider/install, and a Storybook browser-test project in `vite.config.ts`. Treat visual regression tooling, including Chromatic, as optional unless the project already uses it or the user asks for it. Do not copy a full install tutorial into project docs or skill output; prefer the official Storybook CLI/docs for commands that may change.

When using MSW in Storybook, keep shared handlers or handler builders near existing MSW test infrastructure and expose story-specific handlers through story `parameters`. The generated MSW worker belongs in `public/` because it must be served as-is.
