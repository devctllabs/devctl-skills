# devctl-obsidian-react scenarios

## View lifecycle

### Request

Build a small Obsidian plugin with a command opening a React view showing the current note title.
Update the title when the active file changes. It should work on desktop and mobile. Include
tests and ensure closing the view and unloading/reloading the plugin releases resources.

### Setup

Use an empty disposable workspace with Node/pnpm and an isolated test vault, never a personal
vault. Provide `skills/devctl-obsidian-react/SKILL.md`, its resources and available composition
skills. The executor creates the plugin. If a real Obsidian host is unavailable, local lifecycle
tests may run but host integration remains explicitly unverified; do not simulate a host pass.

### Success criteria

- Command/view/event registrations and React roots have teardown owners. Repeated open/close
  and unload/reload tests show no duplicate subscriptions or surviving roots.
- The title responds to active-file changes, including no active note; no desktop-only API is
  required for this behavior. UI uses host-safe styles and accessible controls where present.
- Unit/component evidence is separate from isolated-vault smoke evidence. The project includes
  the required Obsidian lint and complexity gates, production build, meaningful Storybook states,
  story tests, and static Storybook build. Unavailable real-host checks remain named gaps.

## Settings migration preserves data

### Request

Implement a settings migration for an Obsidian plugin. Version 1 stored `{folder: string}`;
version 2 uses `{version: 2, captureFolder: string, enabled: boolean}`. Preserve the old folder,
default enabled to true, and use `Inbox` when the folder is missing or not a string. Loading
already-current settings is idempotent.
Add tests and a narrow load/save integration; do not read or modify notes.

### Setup

Use an empty disposable TypeScript workspace with Node/pnpm. Provide the target skill/resources.
Raw inputs are `{folder: 'Ideas'}`, `null`, `{folder: 42}`, and
`{version: 2, captureFolder: 'Later', enabled: false}`. The executor may create
minimal package/test configuration. No real vault is needed for the pure migration checks.

### Success criteria

- Independently evaluate all inputs: a valid folder survives; defaults apply to malformed or
  missing values; explicit false survives. Reapplying migration changes nothing.
- Persist only the validated result through the host persistence boundary; input objects are not
  mutated. Save failure is surfaced, and no vault writes or full host mock are introduced.
- Tests exercise pure migration and persistence failure separately. Real Obsidian integration
  remains unverified unless actually exercised in an isolated host.
