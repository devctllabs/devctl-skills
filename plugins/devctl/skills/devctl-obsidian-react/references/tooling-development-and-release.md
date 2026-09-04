# Tooling, Development, and Release

## Existing Projects

Inspect the lockfile, scripts, build output, `manifest.json`, minimum app version, TypeScript target, lint rules, test runner, local-vault workflow, and release action. Preserve a coherent setup. Compare obsolete or unclear choices against the current official sample plugin rather than against pinned versions in this reference.

## New Project Baseline

Start from the current official `obsidianmd/obsidian-sample-plugin` contract, then add React and the selected test layers when the requested behavior needs them. Use `pnpm` and commit `pnpm-lock.yaml`.

Keep these repository-root artifacts:

```text
manifest.json
versions.json
esbuild.config.mjs
styles.css                 # when custom styles exist
package.json
pnpm-lock.yaml
tsconfig.json
eslint.config.mts
.storybook/               # when the plugin has Storybook
src/
test/
```

Use strict TypeScript with DOM and the current target supported by the official template, `jsx: react-jsx`, `isolatedModules`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, and casing checks. Include both `*.ts` and `*.tsx` source files.

Use the official `eslint-plugin-obsidianmd` recommended configuration plus TypeScript rules. Add React Hooks and Storybook rules when those tools are present, matching the installed versions. Add formatting and pre-commit tooling only when the repository uses it or the team requests it; keep CI authoritative.

## Build Contract

Compile `src/main.ts` to root `main.js` with esbuild:

- bundle runtime dependencies, including React and React DOM;
- keep `obsidian`, Electron, CodeMirror, Lezer, and Node built-ins external;
- emit CommonJS for the current official ECMAScript target;
- enable tree shaking;
- use inline source maps for development;
- minify production and omit production source maps unless release debugging policy requires them.

Keep Vite configuration scoped to Vitest and Storybook. The plugin loads a file from its vault directory; it does not consume a Vite dev server or SPA HTML entry.

Provide repository-consistent scripts for development watch, production build, typecheck, lint, unit tests, E2E, and an aggregate check. When the plugin has React UI, also provide Storybook development/build/test scripts. Make the production build run typecheck before packaging.

Official baseline: [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

## Local Development

Use a dedicated development vault. Keep source control outside a real user vault or place the repository only in the dedicated vault's plugin directory. Build or copy artifacts to `.obsidian/plugins/<plugin-id>/`, where the directory name matches `manifest.json.id`.

Use the Hot Reload community plugin or `obsidian-launcher watch --copy` when it improves the local loop. Treat reload as part of development: changes to `manifest.json` require an app restart; code changes require plugin reload or disable/enable.

Keep vault paths configurable and outside committed user-specific configuration. Provide a small fixture vault for E2E rather than checking in personal notes or settings.

## Manifest and Compatibility

Keep `manifest.json` at the repository root with a permanent, unique ID, SemVer `version`, honest `minAppVersion`, and truthful `isDesktopOnly`. Keep plugin and package versions synchronized. Add each release version and its minimum Obsidian version to `versions.json`.

Use IDs and command IDs as stable public contracts. Avoid default hotkeys. Keep user-visible names in sentence case and let Obsidian add the plugin-name prefix where the host already does so.

## CI and Releases

On pull requests, install from the lockfile and run the full gate defined in `testing.md`. Build from a clean checkout so generated artifacts are reproducible.

Tag releases with the exact manifest version without a `v` prefix. Produce a minified production `main.js` and attach:

- `main.js`;
- `manifest.json`;
- `styles.css` when present.

Keep `main.js` out of normal source commits and include it in GitHub release attachments. Ensure the release tag, package version, manifest version, `versions.json`, and attached manifest agree. Preserve the official release workflow's build provenance or artifact attestation when the repository supports it.

For community distribution, include repository README, license, required disclosures, and pass the current automated community-directory review. Private plugins retain the same runtime quality gate while omitting community submission steps.

References:

- [Build a plugin](https://docs.obsidian.md/Plugins/Getting%20started/Build%20a%20plugin)
- [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin)
- [Plugin self-critique checklist](https://docs.obsidian.md/oo/plugin)
