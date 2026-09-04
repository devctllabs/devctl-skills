---
name: devctl-obsidian-react
description: Architect Obsidian plugins with React. Use when creating, organizing, refactoring, reviewing, testing, or releasing TypeScript Obsidian plugins that use React views or settings, including plugin lifecycle, commands, vault and file access, mobile compatibility, esbuild, Vitest, Storybook, or real-Obsidian E2E.
---

# Devctl Obsidian React

Build Obsidian plugins as small host integrations with explicit lifecycle ownership and independently testable React surfaces.

## Workflow

1. Inspect the repository before choosing a structure: package manager, `manifest.json`, `versions.json`, build entry/output, TypeScript and lint configuration, React roots, Obsidian API imports, tests, Storybook, release automation, and existing folder conventions. Finish when every existing convention that the change may preserve or replace is identified.
2. Map each requested behavior to its owner: plugin, command, view, modal, settings tab, editor extension, vault service, or React surface. Record its lifecycle, platform support, persistence, user-data risk, and visible states. Finish when every behavior has one owner and every created resource has a teardown owner.
3. Select the smallest fitting structure from `references/project-structure.md`. Preserve coherent local conventions and migrate incrementally. Finish when dependency direction is explicit and no proposed layer lacks a current responsibility.
4. Load only the references whose conditions match the task. Apply every applicable rule from each loaded reference:
   - Read `references/runtime-and-data-safety.md` for Obsidian lifecycle, registrations, commands, views, events, vault or file operations, network access, performance, security, mobile support, or advanced extension points.
   - Read `references/react-ui-and-styling.md` for React mounting, component boundaries, host-native UI, accessibility, CSS, Tailwind, shadcn/ui, portals, or theming.
   - Read `references/state-settings-and-i18n.md` for subscriptions, shared state, settings persistence or migration, forms, validation, or localization.
   - Read `references/testing.md` when adding or changing behavior, tests, test doubles, real-Obsidian E2E, or CI test coverage.
   - Read `references/storybook.md` when adding or changing React UI, stories, Storybook setup, visual states, interaction coverage, or shared Storybook harnesses.
   - Read `references/tooling-development-and-release.md` for new projects, build configuration, local vault workflows, manifests, versioning, CI, packaging, or releases.
5. For a feature, bug fix, public-contract change, or behavior-preserving refactor, compose with `$outside-in-tdd` when it is available; otherwise preserve the repository's established test-first loop. Keep Obsidian adapters thin enough that most behavior reaches green without a full host mock. Finish when the changed behavior has evidence at the lowest trustworthy layer and host integration risk is covered in real Obsidian.
6. Run the repository's complete relevant checks. For a new project, require lint, typecheck, unit/component tests, a production plugin build, and an isolated-vault Obsidian smoke test; when the plugin has React UI, also require Storybook tests and build. Finish only when the release bundle contains the intended `main.js`, `manifest.json`, and optional `styles.css`, and unload/reload leaves no duplicate registrations or live resources.

## Default Decisions

- Use `pnpm` for new projects; preserve the detected lockfile and package manager in existing projects.
- Build the plugin with the official esbuild shape. Use Vite for Vitest and Storybook, not as the Obsidian runtime.
- Target desktop and mobile by default. Isolate a required desktop capability behind an explicit platform adapter and set `isDesktopOnly` truthfully.
- Use React for stateful or composed surfaces. Use native Obsidian APIs for simple settings, menus, notices, and modals.
- Prefer local React state and narrow subscriptions. Add TanStack Query for remote or cache-shaped data and Zustand for genuinely shared client state.
- Style under a plugin-owned root with Obsidian CSS variables. Add Tailwind or shadcn/ui only with host-safe isolation.
- Keep English as the source locale. Add `i18next` and `react-i18next` whenever the plugin supports more than one locale; omit an i18n runtime for English-only UI.
- Apply the same lifecycle, data-safety, mobile, security, and performance standard to private and community plugins. Add publication artifacts only when distribution requires them.
