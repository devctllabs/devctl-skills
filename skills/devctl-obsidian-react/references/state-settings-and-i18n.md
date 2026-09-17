# State, Settings, and Localization

## State Selection

Choose the narrowest state mechanism that matches ownership:

| State | Default |
| --- | --- |
| One component or surface | `useState`/`useReducer` |
| Obsidian event-backed external state | typed service plus `useSyncExternalStore` or a cleanup-safe hook |
| Shared plugin capability | feature service owned by the plugin composition root |
| Remote or cache-shaped asynchronous data | TanStack Query when caching, invalidation, retry, or deduplication is required |
| Cross-surface client UI state | Zustand when a service or lifted state is no longer coherent |

Keep the Obsidian API as the source of truth for vault, workspace, and metadata state. When mirroring host state for rendering, define the event that refreshes it and the owner that unsubscribes.

Expose host behavior through narrow services and one provider at the connected React root. Split providers by lifecycle or change frequency only when consumers demonstrably need different owners.

## Settings Persistence

Treat `loadData()` as untrusted input. Define:

- the current persisted shape and runtime defaults for every known field;
- normalization from `unknown` input;
- an explicit schema version and migrations when compatibility with a prior shape is required;
- a save path that persists validated, durable settings;
- tests for empty data, invalid known values, supported migrations, and migration idempotence.

Use a small handwritten normalizer for a few primitive fields. Add Zod when settings are nested, imported/exported, externally edited, or complex enough that handwritten validation repeats schema knowledge.

Serialize settings writes when rapid controls can overlap. Update UI state only after defining whether a failed save rolls back, retries, or reports an inline error. Keep transient UI state out of persisted settings.

## Settings UI

Use native `PluginSettingTab` and `Setting` for simple fields. Rebuild the container from current settings in `display()` and keep event handlers bound to the current plugin instance.

Mount React for settings with conditional sections, repeated structured items, complex validation, or shared components. Own the root in the settings tab, unmount it before redisplay and hide, and pass a typed settings service rather than the plugin instance through the tree.

Use React Hook Form with Zod for multi-field React forms whose validation, touched state, submission, or field arrays justify it. Keep one-field toggles and text inputs on native state.

## Localization

Keep English resources as the canonical key tree and fallback. An English-only plugin uses plain strings and no localization runtime.

When a second locale is introduced, use `i18next` and `react-i18next` for every localized surface, including native settings, notices, commands, menus, and React UI. Centralize locale resolution and fallback, expose a typed translation boundary to native adapters, and use the React provider for component trees.

Test fallback behavior, interpolation, pluralization, missing keys, long translations, and locale-sensitive formatting. Let layout adapt to longer text and right-to-left direction when a supported locale requires it. Keep manifest identifiers, command IDs, paths, persisted keys, logs, and internal test selectors language-neutral.
