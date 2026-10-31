# Testing

## Test Layers

Use the lowest layer that exercises the real contract:

1. Unit-test pure parsing, migrations, reducers, path decisions, and domain behavior without Obsidian.
2. Component-test React behavior with Vitest, jsdom, Testing Library, and `user-event` through visible roles and outcomes.
3. Integration-test feature services and thin Obsidian adapters with narrow fakes for only the API members they consume.
4. Run lifecycle and host contracts in a sandboxed real Obsidian instance, preserving a working host runner or using the new-project baseline in `headless-e2e.md`.

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

Read [headless-e2e.md](headless-e2e.md) for the real-host smoke contract, runner, scenario isolation, risk-based coverage, diagnostics, and compatibility checks. Keep host behavior in this layer rather than expanding test doubles to reproduce Obsidian.

## CI Gate

On pull requests, run the complete gate required by `SKILL.md`, the Storybook checks defined in `storybook.md`, and the host gate and compatibility policy in [headless-e2e.md](headless-e2e.md#ci-and-compatibility).
