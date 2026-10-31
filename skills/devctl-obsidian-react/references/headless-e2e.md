# Headless Real-Obsidian E2E

Complete a new project's headless setup with all three deliverables: a cold-start runner, the [lifecycle smoke](#smoke-and-risk-based-coverage) asserting cleanup of an active resource, and a [PR workflow](#ci-and-compatibility) invoking that runner. Verify each deliverable before reporting completion; name any remaining gap separately from passing assertions.

## Choose and wire the runner

For new projects, use WebdriverIO with Mocha and `wdio-obsidian-service`. Headless means a real desktop Obsidian/Electron process under Linux Xvfb; WDIO drives the application. A Playwright Docker image can supply system dependencies without making Playwright the test runner.

Preserve a working E2E stack, package manager, script names, and CI conventions in existing projects. Repair missing coverage or headless execution within that stack; migrate runners only when requested. Keep pure logic and isolated React behavior at the layers described in [testing.md](testing.md).

Inspect installed service documentation and its sample configuration before selecting APIs. Configure the plugin artifact directory, synthetic fixture vault, download cache, test output directory, explicit host versions, and initially one worker. Resolve paths from the project or workspace location rather than the caller's working directory. In a monorepo, distinguish the dependency-install root from the plugin directory.

For new projects, expose these command responsibilities:

- `test:e2e:run`: the same native WDIO suite as `test:e2e`, without rebuilding the plugin; uses an already-built production bundle for debugging.
- `test:e2e`: production build followed by `test:e2e:run`.
- `test:e2e:headless`: build the current Docker image using layer cache, then run `test:e2e` inside it under Xvfb.

Support `test:e2e:headless --prebuilt-image <tag>` to run an image already loaded into local Docker, skipping image construction. Fail if that image is missing. This is a parameter of the project's runner, not a Docker or package-manager option. Both modes use the source snapshot in the selected image and still build the production plugin before testing; the parameter skips only the Docker image build.

Verify the runner from a clean checkout with empty dependency and Obsidian caches. Keep the generated runner in the target project; this reference defines its contract rather than a copyable implementation.

## Container and artifacts

- Pin a Linux image with a compatible Node/package-manager runtime, Electron libraries, and Xvfb. Verify its CPU architecture supports the chosen Obsidian installer; select Docker platform explicitly when emulation is needed. Choose current compatible versions during project setup and record them in project configuration.
- For new projects, use a single-stage Dockerfile. Copy dependency manifests, lockfile, and project-specific install inputs (configuration, workspace manifests, patches) first, install with frozen mode in a `RUN` layer, then copy plugin/test sources. Keep install inputs complete so Docker invalidates that layer when dependencies or their configuration change. Exclude host `node_modules`, generated bundles, caches, logs, and Git metadata through `.dockerignore`.
- The default headless invocation builds an image from current inputs on every call; Docker reuses unchanged layers. Source-only changes retain the dependency layer. Run with dependencies baked into the image, without runtime installation or dependency volumes. Keep the image's source and dependencies together rather than overlaying host source or `node_modules`.
- Build production `main.js`, `manifest.json`, and optional `styles.css` in the disposable container before service installation. A stale host bundle must not supply the code under test. Run `test:e2e` under `xvfb-run -a`.
- Treat image-layer and Obsidian-download caches as accelerators: a cold run must prepare itself. Reusable Obsidian download volumes are separate from disposable vault/application state; namespace them by project and separate concurrent runs' writable outputs.
- Bind-mount a dedicated output directory to retain WDIO reports, Obsidian logs, and useful failure screenshots after container removal. Capture entrypoint install/build/test output as well, so failures before WDIO starts remain diagnosable. Exclude outputs from source copies and source control.
- Propagate install, build, launch, assertion, and process-spawn failures as nonzero exit codes. Release container and child processes on completion or interruption. A successful wrapper exit is meaningful only when the expected smoke actually ran and passed.

## Vault and scenario isolation

Use a synthetic fixture vault copied into a disposable sandbox and isolated application state. Keep personal vaults and installed user profiles outside test inputs. Confirm the installed service's sandbox behavior before relying on it.

Give independent scenarios fresh vault and application state. A service vault reset may reset files without resetting settings, loaded views, or plugin memory; use a full host reload or a fresh session when those also need resetting. A deliberately stateful journey can share state within one named scenario; independent tests must pass when selected alone.

Use semantic selectors and observable waits for mount, events, persisted files, and cleanup. Use real Obsidian APIs through service helpers to inspect host state and actual Markdown where DOM alone cannot establish correctness. Browser-executed callbacks are serialized into another realm: pass runtime values as explicit arguments rather than capturing test-module variables. Keep private API access narrow and version-sensitive. Restore clock patches and other instrumentation in teardown.

For network behavior, use local deterministic fixtures with dynamic ports and explicit server/connection teardown. Keep production-network probes separately opt-in.

## Smoke and risk-based coverage

Every new plugin gets one lifecycle smoke against its production bundle:

1. Install artifacts into the sandbox through the service, enable the plugin, and assert its instance loads.
2. Exercise a registered command or primary surface and assert its visible outcome.
3. Disable the plugin while its owned surface or resource is still active, and verify that unload releases it. Let plugin teardown perform cleanup before test teardown closes surfaces or disposes probes.
4. Re-enable it and exercise the same behavior again. Verify one effective registration, no stale UI, and no duplicate effects.
5. Fail on uncaught plugin errors or unhandled rejections collected throughout the flow, including unload/reload.

Match cleanup evidence to resources actually owned: connected React roots, leaves, subscriptions, timers, listeners, or network connections. Verify observable effects where possible; retain test-side error collection across plugin unload. Narrowly justify any known host-noise filtering rather than suppressing errors globally.

Extend E2E according to changed host risk: command availability, view restoration, settings persistence, vault mutations and external file events, editor behavior, network boundaries, and pop-out lifecycle. Assert persisted data and preservation of unrelated content when mutations are involved. Keep domain permutations in lower test layers.

When introducing or changing the harness, run the smoke with cold caches, then verify that a warm build reuses the dependency-install layer. Change an install input and confirm that layer is invalidated. Deliberately break the exercised behavior in a disposable copy: a source-only change must reuse dependencies, build the changed plugin, and produce a nonzero assertion result with retained diagnostics. Restore the healthy source. Exercise `--prebuilt-image` separately to verify it skips image construction while still building and testing the plugin.

## CI and compatibility

For a new project, add a pull-request CI workflow that invokes the same headless entrypoint as local execution and uploads retained diagnostics on failure, including failures during setup or build. It can be a separate required job from fast checks. Finish CI wiring when that job exists and invokes the command; repository branch-protection settings remain a separate hosting concern. Preserve the existing CI mechanism in established projects.

In GitHub Actions, use the official `docker/setup-buildx-action` and `docker/build-push-action` with current supported releases. Build from the checked-out source with `context`, `load: true`, and `push: false`; tag the image for the current commit. Set `cache-from: type=gha,scope=<e2e-image>` and `cache-to: type=gha,scope=<e2e-image>` to reuse layers between jobs. Default `mode=min` includes the dependency layer of this single-stage image. Give distinct E2E images separate scopes; Docker handles invalidation from build inputs.

Run the headless entrypoint with `--prebuilt-image <current-commit-tag>` after the action loads the image. The action manages GitHub cache authentication; the runner handles shared container arguments and tests. Keep dependency installation in the image build and use the same container execution path locally and in CI. A cache miss rebuilds the needed layers normally.

Pin the PR Obsidian app and installer selection in project configuration for reproducibility. Expose `OBSIDIAN_APP_VERSION` and `OBSIDIAN_INSTALLER_VERSION` overrides and forward them into Docker; preserve equivalent existing controls. Use the installed service's supported version selectors, resolving ambiguous installer choices explicitly when reproducibility requires it.

On release or a scheduled workflow, test minimum-supported and latest Obsidian, plus mobile emulation when the plugin targets mobile. Revisit coverage when `minAppVersion` or compatibility logic changes. Desktop Electron mobile emulation is evidence for that profile; describe actual Android/iOS verification separately.

Report unavailable Docker, downloads, or a real host as unverified with the failed prerequisite and rerun command. Unit/component passes and an unexecuted scaffold do not establish a host pass.

References:

- [WDIO Obsidian Service and sample](https://github.com/jesse-r-s-hines/wdio-obsidian-service)
- [Service API documentation](https://jesse-r-s-hines.github.io/wdio-obsidian-service/)
- [Docker layer-cache ordering](https://docs.docker.com/build/cache/optimize/#order-your-layers)
- [GitHub Actions build cache](https://docs.docker.com/build/cache/backends/gha/#using-dockerbuild-push-action)
