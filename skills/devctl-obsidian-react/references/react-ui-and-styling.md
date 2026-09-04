# React UI and Styling

## Choose Native UI or React

Use the simplest host surface that owns the required interaction:

- Use native `Setting`, `Menu`, `Notice`, simple `Modal`, command, ribbon, and status bar APIs for short imperative interactions that already match Obsidian behavior.
- Use React for stateful views, composed panels, reusable visual components, conditional forms, and settings or modals whose state synchronization is clearer as a component tree.
- Keep the native Obsidian class as the lifecycle shell around a React surface. Let the React tree own rendering, not host registration.

This hybrid boundary keeps host conventions where they are already complete and gives complex UI one consistent component model.

## Mounting Pattern

Let the host owner create and dispose the root:

```tsx
class ExampleView extends ItemView {
  private root: Root | null = null

  async onOpen(): Promise<void> {
    this.root = createRoot(this.contentEl)
    this.root.render(<ExampleSurface services={this.services} />)
  }

  async onClose(): Promise<void> {
    this.root?.unmount()
    this.root = null
  }
}
```

Use `StrictMode` when the project verifies that host adapters and third-party components tolerate development double-invocation. Keep a single root per host container and make repeated open/close safe.

Pass serializable data, callbacks, or narrow services into the surface. Put provider composition in one connected root. Presentational children should render in Storybook without constructing `App`, `Vault`, or `Workspace`.

## Component and State Boundaries

- Keep host subscriptions in a hook or service that exposes an unsubscribe function.
- Derive render state rather than duplicating Obsidian data in multiple stores.
- Represent user-visible asynchronous states explicitly: initial/loading, loaded, empty, stale/error with retained data, mutation pending, and mutation error when they can occur.
- Place an error boundary around substantial React roots and present a recovery action appropriate to the surface.
- Keep commands and vault mutations outside render functions; invoke them through event handlers or service methods.

## Obsidian-Native Styling

Give every React root a plugin-owned class such as `.my-plugin` and scope selectors beneath it. Use `styles.css` and Obsidian CSS variables for colors, typography, borders, spacing-compatible values, interactive states, and theme support. Use semantic class names and CSS classes for dynamic states.

Preserve host styles outside the plugin root. Test light and dark themes, community-theme overrides, high zoom, narrow sidebars, pop-out windows, and mobile dimensions. Prefer semantic HTML and native controls where their behavior fits.

Official styling reference: [About styling](https://docs.obsidian.md/Reference/CSS%20variables/About%20styling).

## Tailwind and shadcn/ui Branch

Add Tailwind or shadcn/ui only when several custom surfaces benefit from their composition primitives or utility vocabulary. Configure the branch as a guest inside the Obsidian document:

- scope generated styles to the plugin root and exclude global resets/preflight from the host document;
- map design tokens to Obsidian CSS variables instead of shipping an unrelated theme;
- direct dialog, popover, tooltip, and menu portals to an owned container when possible;
- verify focus restoration, Escape handling, keyboard navigation, stacking, pop-out windows, theme changes, and mobile behavior in real Obsidian;
- keep copied shadcn primitives in one UI directory and adapt them once rather than overriding each use.

Retain native Obsidian components for host-owned interactions even when the custom React surface uses shadcn/ui.

## Accessibility and Copy

Use semantic controls, visible focus, keyboard-complete interactions, programmatic labels, announced validation and async errors, and correct disabled/pending states. Restore focus when a modal or popover closes. Use sentence case for user-visible text and keep command names free of the plugin-name prefix that Obsidian supplies.
