# Storybook

Use Storybook as a reproducible catalog of meaningful React UI states. It verifies the host-independent visual contract; real Obsidian remains authoritative for lifecycle, native shells, vault behavior, and final host fidelity.

For existing plugins, preserve a coherent setup and add coverage for new or materially changed UI. Do not require a repository-wide backfill unless the user asks for one.

## Placement and Harnesses

Co-locate stories with the React surface or component they describe. Keep reusable harness code separate from Storybook configuration:

```text
plugin-root/
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── obsidian-theme.css
└── src/
    ├── features/
    │   └── notes/
    │       └── components/
    │           ├── NoteList.tsx
    │           ├── NoteList.test.tsx
    │           └── NoteList.stories.tsx
    └── test/
        └── storybook/
            ├── decorators.tsx
            ├── providers.tsx
            ├── fake-services.ts
            ├── fixtures.ts
            └── host-frames.tsx
```

Create only helpers the plugin uses. Keep `.storybook/main.ts` responsible for discovery, framework, and addons. Keep `.storybook/preview.ts` thin: import the curated Obsidian theme fixture and plugin CSS, then register shared globals, parameters, and decorators from `src/test/storybook/`.

Use shared harnesses for providers, deterministic service fakes, domain fixtures, theme switching, and realistic host frames. Keep story-specific data and behavior in the colocated story.

## Coverage Policy

Create or update a colocated story for every new or materially changed user-facing React surface, including view content, React modal content, complex React settings, and inline or block UI with independent visual behavior.

Create component stories when a component is public or reusable, stateful, visually risky, or owns meaningful interaction states. Cover customized shared primitives when the customization itself is part of the plugin UI contract.

Cover native `Plugin`, `ItemView`, `Modal`, and `PluginSettingTab` shells through adapter tests and real Obsidian. Render the React content they own in Storybook. Hooks, services, commands, adapters, generated code, private helpers, and thin connected wrappers without independent visual behavior remain outside the story catalog.

Every data-bearing surface has a `Loaded` story; a generic component may use `Default`. Add every user-reachable state the owner can produce:

- `Loading`, `LoadError`, and domain-specific empty states such as `EmptyNotes`;
- `SearchLoading`, `SearchNoResults`, and `SearchError` for asynchronous result surfaces;
- `<Action>Pending` and `<Action>Error` for visible mutations;
- `<DialogName>Open` or `<Action>ConfirmOpen` for confirmations;
- `ValidationErrors`, `Disabled`, or `Submitting` for forms;
- zero, one, and many items when collection size changes the visible result;
- long, wrapped, unbroken, missing, or dense content when it can affect layout.

Prefer the smallest story set that exposes each visible branch. Do not construct states that violate the component contract or create a Cartesian product of variants.

## Titles and Names

Use PascalCase story exports named for visible state or behavior. Prefer consistent names such as `Loaded`, `Loading`, `LoadError`, `ManyItems`, `SavePending`, `SaveError`, `DeleteConfirmOpen`, `ValidationErrors`, `LongContent`, and `LongUnbrokenText`.

Organize the sidebar feature-first:

```text
Features/<Feature>/Views/<FileBasename>
Features/<Feature>/Modals/<FileBasename>
Features/<Feature>/Settings/<FileBasename>
Features/<Feature>/Components/<FileBasename>
Shared/<Category>/<FileBasename>
```

For a minimal plugin without feature modules, start with `Views/`, `Modals/`, `Settings/`, or `Components/`. Story titles classify the UI role; they do not require matching production folders.

## Story Shape

Use CSF with typed `Meta` and `StoryObj`. Put valid presentational inputs and stable callbacks in `args`. Use a decorator for Storybook chrome such as providers, host frame, plugin root, padding, or parent width. Use `render` only for controlled local state or composition that belongs to that story.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'

import { NoteList } from './NoteList'

const meta = {
  args: {
    notes: [],
    onOpenNote: () => undefined,
  },
  component: NoteList,
  parameters: {
    hostFrame: 'sidebar',
  },
  title: 'Features/Notes/Components/NoteList',
} satisfies Meta<typeof NoteList>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyNotes: Story = {}
```

Set `meta.component` to the exported React surface rather than a story-only wrapper. Enable autodocs for reusable components when they add value; disable them for connected host surfaces while retaining those stories for direct review and browser tests.

## Connected Surfaces

Keep the story-rendered component tree importable without evaluating Obsidian, Electron, Node.js, or other runtime-only modules. Put host calls in lifecycle shells or narrow adapters and inject serializable data, callbacks, or feature services into React.

Use deterministic fakes from `src/test/storybook/` when a connected surface owns loading, subscriptions, persistence, or mutations. Exercise user-reachable transitions through the real control in `play`; for example, keep loaded data visible, trigger Save, and let the fake service produce the pending or failed result. Use direct error or pending args only for presentational components that do not own orchestration.

Prefer service injection over mocking internal hooks. Never construct a real `App`, `Vault`, or `Workspace` in Storybook, and avoid a global mock that attempts to reproduce the `obsidian` module. Use MSW only when the story intentionally exercises an HTTP boundary already owned by the plugin.

## Host Frames, Themes, and Layout

Render every story beneath the plugin-owned root class used in production. Provide host-frame decorators for only the surfaces the plugin owns, such as workspace leaf, narrow sidebar, modal content, settings content, or embedded block. The frame owns realistic parent dimensions and host classes; component args own component state.

Maintain `.storybook/obsidian-theme.css` as a broad, version-controlled fixture of documented Obsidian CSS variables and the host classes consumed by those frames. Record the source documentation and inspected Obsidian version in comments. Update the fixture when the plugin consumes new variables or host classes, changes `minAppVersion`, or a real-host comparison reveals drift. Keep extracted application CSS out of the repository.

Expose light and dark themes through a global toolbar that applies `theme-light` or `theme-dark`. Use Storybook viewport controls for screen size and a host-frame parameter for container shape. Keep canonical story names state-based rather than duplicating `Mobile` and `Desktop` stories.

When a browser geometry regression needs a dedicated width, zoom-like constraint, portal assertion, overflow check, or sticky-position check, add a hidden `*Regression` story tagged out of normal navigation and autodocs but included in automated tests. Add such stories only when a browser or visual assertion owns the regression.

## Test Boundary and Setup

Use Storybook for render smoke coverage, `play` interactions, accessibility checks, visual review, and browser-geometry assertions. Keep unit and integration tests responsible for services, adapters, migrations, reducers, subscriptions, data mapping, and exact business behavior. Verify registrations, React mount/unmount, native UI, event order, vault reflection, pop-out windows, community-theme behavior, and reload in real Obsidian.

For a new plugin with React UI, use the current compatible `@storybook/react-vite` framework with docs, accessibility, and Vitest addons. Configure the browser provider required by the installed Storybook/Vitest versions and run story tests plus a static Storybook build in CI. Keep visual regression optional until the project has a baseline owner and review workflow.

Use the official Storybook CLI and current documentation for installation commands and version-specific configuration rather than copying a pinned tutorial into project documentation. Vite serves Storybook and browser tests; esbuild remains the production Obsidian plugin runtime.

References:

- [Storybook React Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite)
- [Write stories](https://storybook.js.org/docs/writing-stories)
- [Storybook interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index)
- [Obsidian React guide](https://docs.obsidian.md/Plugins/Getting%20started/Use%20React%20in%20your%20plugin)
- [Obsidian styling](https://docs.obsidian.md/Reference/CSS%20variables/About%20styling)
