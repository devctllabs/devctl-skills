# Runtime, Lifecycle, and Data Safety

## Lifecycle Ownership

Assign every resource to the shortest-lived Obsidian owner that fully contains it:

| Resource | Owner | Cleanup |
| --- | --- | --- |
| Plugin-wide command, ribbon item, event, interval | `Plugin` | `register*`, `addCommand`, or plugin unload |
| View-local renderer, event, subscription, React root | `ItemView` or child `Component` | `onClose`/`onunload` |
| Modal-local renderer, event, React root | `Modal` plus child `Component` | `onClose` |
| Settings React root | `PluginSettingTab` wrapper | unmount before redisplay and on hide/unload |
| Worker, socket, observer, third-party instance | creating `Component` | registered disposer or explicit `onunload` |

Use `registerEvent`, `registerDomEvent`, `registerInterval`, and `addChild` so Obsidian performs teardown. Pair resources without a registration helper with a disposer owned by the same component.

Keep constructors cheap. In `onload`, load settings and register commands, views, processors, and settings tabs. Put startup work that needs a ready workspace inside `workspace.onLayoutReady()`. Defer data reads, indexing, network work, and expensive initialization until the owning feature is used or the layout is ready.

Treat reload as a lifecycle test: enable, use, disable, and enable the plugin again. A correct reload has one copy of each registration, no detached React tree, and no callback from the previous instance.

## React Roots

Create each root after the host container exists. Store the root on the owning view/modal/tab and call `root.unmount()` before emptying or discarding the container. When several surfaces repeat this code, introduce one small `Component`-owned React mount helper that accepts the element to render and returns a disposer.

## Obsidian API Choices

- Edit the active note through `Editor` when editor semantics matter.
- Update a background file through `Vault.process` so the change is based on the latest contents.
- Change frontmatter through `FileManager.processFrontMatter`.
- Delete through `FileManager.trashFile` so user deletion preferences apply.
- Resolve user-provided vault paths with `normalizePath`.
- Prefer `Vault` and `FileManager` over direct adapter or filesystem access.
- Persist plugin-owned data with `Plugin.loadData()` and `Plugin.saveData()`.
- Look up a known path directly instead of scanning every vault file.

Serialize conflicting mutations or make them idempotent. Surface destructive scope before acting, preserve unrelated note content, and test partial failure paths around multi-file operations.

## Mobile and Platform Boundaries

Set `isDesktopOnly: false` unless a required capability fundamentally needs desktop APIs. Use `Platform` for platform detection and `requestUrl` for network requests.

Place Node.js, Electron, `FileSystemAdapter`, subprocess, and unrestricted filesystem behavior in a desktop adapter. Load desktop-only modules dynamically after a `Platform.isDesktopApp` guard. Check adapter types with `instanceof` before using platform-specific methods. Exercise the mobile path without evaluating desktop imports.

## Security and Privacy

- Keep dependencies few, locked, and reviewed for runtime behavior.
- Keep telemetry out of plugin code. Treat vault content, file names, settings, and commands as sensitive data.
- Request network or account actions only for the advertised feature and document network use, authentication, payments, external file access, closed source, and other required disclosures.
- Keep secrets out of settings defaults, logs, fixtures, Storybook stories, and release artifacts.
- Remove diagnostic logging from production paths; route actionable failures to the owning UI surface.

## Performance

Ship a minified production bundle. Keep `onload` and view constructors registration-only, subscribe to the narrowest event, debounce bursty work with an explicit cancellation owner, and cache only when invalidation is defined. Use deferred views when supporting Obsidian versions that provide them.

## Advanced Extension Points

For CodeMirror extensions, markdown post-processors, custom protocol handlers, Canvas integrations, or embeds, inspect the current Obsidian API documentation and an existing local implementation before designing the adapter. Keep each registration and cleanup in an Obsidian-owned component; keep parsing and domain behavior in host-independent modules; add real-host tests for lifecycle and compatibility behavior that mocks cannot reproduce.

Official references:

- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin%20guidelines)
- [Manage plugin lifecycle](https://docs.obsidian.md/plugins/guides/lifecycle-management)
- [Optimize plugin load time](https://docs.obsidian.md/plugins/guides/load-time)
- [Mobile development](https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development)
