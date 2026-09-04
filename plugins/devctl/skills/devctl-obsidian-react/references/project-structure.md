# Project Structure and Boundaries

Choose structure by current responsibilities. Keep Obsidian SDK access at the host edge and let React surfaces consume data and callbacks through props or narrow services.

## Minimal Plugin

Use a flat structure while the plugin has one capability, at most one substantial UI surface, and no shared domain behavior:

```text
plugin-root/
├── manifest.json
├── versions.json
├── esbuild.config.mjs
├── styles.css
├── src/
│   ├── main.ts
│   ├── settings.ts
│   ├── PluginView.tsx
│   ├── PluginView.test.tsx
│   ├── PluginView.stories.tsx
│   └── test/
│       ├── setup.ts
│       └── render.tsx
├── test/
│   └── e2e/
└── .storybook/
```

Include only files the plugin uses. A command-only plugin needs no React, Storybook, or empty UI folders.

Keep `main.ts` responsible for plugin construction, settings loading, and registrations. Move behavior to a separate function or service as soon as testing it through the plugin class requires host-wide mocks.

## Growing Plugin

Move to feature-oriented boundaries when at least one condition becomes true:

- two commands or surfaces share behavior;
- `main.ts` mixes registration with domain decisions;
- React components import broad Obsidian objects to perform work;
- tests need a large global `app`, vault, or workspace mock;
- settings, events, or background work have independent lifecycles.

Use this shape as a destination, adding directories only when they gain an owner:

```text
src/
├── main.ts                         # composition and registration
├── obsidian/                       # host adapters
│   ├── commands/
│   ├── views/
│   ├── settings/
│   └── services/
├── features/
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
└── test/                           # shared harnesses only
    ├── setup.ts
    ├── render.tsx
    ├── fakes/
    └── storybook/
```

Keep colocated `*.test.ts[x]` and `*.stories.tsx` beside their owners. Use `src/test/` for shared setup, builders, fake services, and providers rather than ordinary product specs.

## Dependency Direction

- Let `main.ts` and `src/obsidian/` import the Obsidian API and concrete feature services.
- Let feature services define narrow contracts in the vocabulary of the feature: notes, tags, selections, or commands rather than `App` or `Vault` when the full host object is unnecessary.
- Let React surfaces depend on serializable view data, callbacks, and narrow service contexts. Keep direct `App` access in a connected root when a host object is genuinely the required contract.
- Let `shared/` contain code used by multiple features. Keep single-feature code with its feature.
- Expose a feature through `index.ts` once another module consumes it; keep internal modules private until then.

## Migration

Move one behavior at a time: establish a caller-visible test, extract its narrow contract, move its implementation to the owning feature or adapter, update the composition root, then run the real-Obsidian smoke test. Preserve file names and boundaries that are already coherent.
