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

## Generated API client on desktop and mobile

### Request

Implement the catalog API boundary for an Obsidian React plugin that targets desktop and mobile.
Use the supplied OpenAPI document for product lookup, creation, and deletion. Make the service
injectable, validate outgoing and incoming data, and support cancelling a pending lookup. Include
local tests and explain how the plugin will own and release API resources. No UI or vault access
is needed for this change.

### Setup

Use a fresh disposable TypeScript package with Node/pnpm. Copy
[catalog.yaml](../fixtures/openapi-client/catalog.yaml) to `api/openapi.yaml`. Supply the target
skill/resources and allow minimal dependency/test setup. Provide no live Obsidian host: use the
installed host types and a test double for its network boundary. Personal vaults are outside scope.

### Success criteria

- Named SDK/types/Zod are generated with both validators and reproducible, pinned tooling. Keep
  runtime config and network transport handwritten; a small project gains only needed layers.
- SDK calls reach requestUrl through a custom Fetch transport. HTTP status, headers and body survive
  errors; JSON is serialized once; HEAD/204 conversion produces a bodyless Response.
- Independently exercise success, encoded path/query/body, HTTP error, network failure, invalid
  outgoing data without dispatch, and malformed successful data through the SDK/service boundary.
- Pre-aborted calls do not dispatch; in-flight cancellation stops consumer delivery, releases its
  listener, and ignores late completion. Completion and failure also release listeners. Evidence
  distinguishes cancellation of a wait from stopping the underlying HTTP operation.
- Services normalize errors and preserve cancellation. Feature Query consumption uses injected
  services rather than generated runtime; retry and teardown owners are explicit.
- No Node/Electron dependency is needed in the mobile transport. Local tests do not claim real
  desktop/mobile or unload/reload verification. No unnecessary UI, Storybook, or vault work appears.

## Cached headless lifecycle gate

### Request

Create a minimal new Obsidian plugin with a command opening a native modal containing
`Headless smoke ready`. Add its headless real-Obsidian E2E setup and PR gate. Keep this task
focused on the plugin and its host-test tooling; React and Storybook are unnecessary for this
native surface. Make repeated local and CI runs reuse unchanged dependencies. Prove that the
gate passes for healthy behavior and detects a deliberate regression in the command's visible
result. Keep the healthy source as the final state.

### Setup

Use an empty disposable workspace with Docker and Node/pnpm. Supply the current target
SKILL.md and its resources. Permit dependency/image/Obsidian downloads. Start with new,
empty dependency-image and host-download caches; existing base images may be reused. A
caching-focused run may start from a minimal native plugin with working build and lifecycle
spec/config, without Docker tooling, so application scaffolding does not obscure runner behavior. Keep raw
process output and generated artifacts outside production skill files. If infrastructure is
unavailable, retain the harness and report the failed prerequisite without claiming a host pass.

### Success criteria

- The three scripts distinguish native WDIO without rebuilding, production build plus the
  same native suite, and headless execution. Cold image construction installs from the frozen
  lockfile; runtime builds the plugin and runs real Obsidian under Xvfb without installing
  dependencies. Host dependencies and stale bundles cannot supply the tested plugin.
- Actual warm-build output shows the dependency-install layer reused; a source-only regression
  also reuses it, while changing an install input invalidates it. Relevant manifests/configuration
  precede source copies. Runtime mounts preserve the image's source and dependencies.
- Disposable vault/application state, pinned image and PR host versions, project-scoped
  caches, and retained failure diagnostics are wired coherently. The PR job uses official
  Docker actions with GHA layer cache, loads a current-commit image without pushing it, invokes
  the same headless entrypoint with `--prebuilt-image`, and uploads diagnostics on failure.
- A real `--prebuilt-image` run skips image construction yet builds and tests the plugin.
  A missing image fails. Normal local execution builds current inputs automatically.
- Smoke asserts the visible command result before and after disable/enable, cleanup and
  registration ownership, and uncaught plugin errors. Disable occurs with the modal still
  open, so plugin teardown must close it before test teardown runs. Waits observe state
  rather than sleeps.
- Inspect actual healthy run output and a deliberately broken behavior run: healthy passes,
  broken exits nonzero with an assertion about the behavior and diagnostics surviving container
  removal. Check that the source ends healthy. Infrastructure failures are distinct from an
  assertion failure and cannot satisfy either real-host result.

## Preserve an existing host-test stack

### Request

Our plugin already has working native WDIO E2E. Improve its test documentation so new
contributors can choose the right command and understand the boundary between browser tests
and real Obsidian. Preserve existing runner, script names, package manager, and CI conventions;
we are not asking for a tooling migration or a new container runner.

### Setup

Materialize a disposable existing-project fixture with `package.json` declaring npm and scripts
`build:plugin: esbuild src/main.ts --bundle --platform=node --external:obsidian --outfile=main.js`,
`spec:host: npm run build:plugin && wdio run wdio.conf.mjs`, and
`spec:ui: vitest run --environment jsdom`. Include a minimal Obsidian plugin, synthetic
`test/vault/Welcome.md`, a WDIO config using Mocha, one worker, `wdio-obsidian-service`,
`plugins: ['.']`, and that vault, plus a command-result host spec. Add an existing CI job
running `xvfb-run -a npm run spec:host` on Ubuntu. Provide the current target skill and
resources. This is a documentation-only task; no installed toolchain is necessary.

### Success criteria

- Documentation names the existing commands accurately and distinguishes isolated UI tests
  from host lifecycle evidence. It explains that the host command builds the plugin first.
- Package manager, scripts, runner configuration, source, and CI stay unchanged; no Docker
  harness or replacement commands are introduced merely to conform to new-project defaults.
- The response distinguishes inspected configuration from actually executed checks and makes
  no unsupported host-pass claim.
