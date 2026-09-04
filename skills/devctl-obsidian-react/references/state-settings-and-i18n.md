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

Treat `loadData()` as untrusted, versioned input. Define:

- a persisted shape with a schema version;
- runtime defaults for every supported field;
- a normalization/migration function from `unknown` to current settings;
- serialization that writes only current, durable fields;
- tests for empty data, the previous supported versions, invalid values, removed fields, and migration idempotence.

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
