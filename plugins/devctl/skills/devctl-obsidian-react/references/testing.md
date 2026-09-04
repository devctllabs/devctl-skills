# Testing

## Test Layers

Use the lowest layer that exercises the real contract:

1. Unit-test pure parsing, migrations, reducers, path decisions, and domain behavior without Obsidian.
2. Component-test React behavior with Vitest, jsdom, Testing Library, and `user-event` through visible roles and outcomes.
3. Integration-test feature services and thin Obsidian adapters with narrow fakes for only the API members they consume.
4. Run lifecycle and host contracts in a sandboxed Obsidian instance through `wdio-obsidian-service`.

Co-locate `*.test.ts[x]` with its source. Put shared render functions, builders, fake services, and environment setup under `src/test/`. Put cross-owner user flows under `test/integration/` only when no single source file naturally owns the scenario.

Model `obsidian` test doubles as the smallest used interface. Keep broad host behavior out of the mock; move logic behind a narrow service or verify it in E2E when the double starts recreating vault, workspace, or lifecycle semantics.

## Required Behavior Coverage

- Test every changed settings migration and data mutation, including malformed input and failure outcomes.
- Test subscriptions for initial snapshot, event update, rerender, and unsubscribe.
- Test React roots for loading, loaded, empty, error, pending, and disabled states that the feature can produce.
- Test cleanup helpers by mounting, unmounting, and verifying that subscriptions and roots are disposed once.
- Use contract-focused adapter tests for method selection and arguments; use real Obsidian for event order, registration, persistence, filesystem reflection, and reload behavior.

## Storybook Boundary

Read `storybook.md` for story placement, state coverage, host fixtures, interaction tests, and the boundary between isolated React surfaces and real Obsidian.

## Real-Obsidian E2E

Use `wdio-obsidian-service` with a disposable vault and isolated application state. Build production artifacts before installation.

Every plugin gets one smoke flow:

1. install `main.js`, `manifest.json`, and optional `styles.css` into the sandbox vault;
2. enable the plugin and assert that the plugin instance loads;
3. exercise one registered command or primary surface;
4. disable and re-enable the plugin;
5. assert one active registration, no stale surface, and no uncaught plugin error.

Add E2E scenarios for command availability, view restoration, settings persistence, vault mutation, editor behavior, network boundaries, pop-out windows, and mobile behavior according to risk. Test supported Obsidian versions when `minAppVersion` or compatibility logic changes.

## CI Gate

Run lint, typecheck, unit/component tests, the production plugin build, and desktop E2E smoke on pull requests. When the plugin has Storybook, also run its browser tests, accessibility checks, and static build. Run broader Obsidian-version and mobile matrices on release or a scheduled workflow according to feature risk.

References:

- [WDIO Obsidian Service](https://github.com/jesse-r-s-hines/wdio-obsidian-service)
