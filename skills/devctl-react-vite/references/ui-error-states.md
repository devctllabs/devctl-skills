# UI Error States

Defines how React screens choose user-facing surfaces for loading failures, partial data errors, empty states, retry actions, and mutation failures.

Use this with `references/error-handling.md`: domain error shape and transport mapping live there; user-facing placement and interaction policy live here.

## Contents

- Ownership
- Default Policy
- Surface Selection
- Query States
- Mutation States
- Retry Actions
- Accessibility
- Testing

## Ownership

Keep UI error handling split by responsibility:

- Reusable feedback primitives may live in `shared/components/feedback` when the shape is genuinely reusable across features.
- Feature-specific copy, recovery actions, layout placement, and visibility tradeoffs stay near the feature page/component that owns the user flow.
- Preserve coherent local naming and design-system patterns. Do not introduce a new feedback component taxonomy when equivalent project conventions already exist.
- Domain modeling, `DomainResult`, API/Tauri mapping, and React Query unwrapping belong in `references/error-handling.md`.

Use these neutral categories when discussing placement:

- **Blocking error surface**: replaces the page, section, list, results area, or dialog content that cannot render without missing data.
- **Contextual warning**: appears near stale, partial, secondary, or background-refresh data while keeping usable content visible.
- **Mutation/action error**: appears near the form, dialog, control group, or action area that initiated a failed user action.
- **Field validation error**: appears with the field or field group the user must correct.

## Default Policy

Render the error inside the UI surface affected by it. A failed screen or blocked action should not be communicated only through a toast, browser alert, or transient notification.

Use these defaults:

- Keep the app shell, route frame, and navigation visible when possible.
- Replace only the affected surface: whole page for route-critical data, one section for independent secondary data, result list for failed search data, and the relevant form/action area for mutation failures.
- Give every possible user-visible async failure a visible UI surface. If a query can fail with no data, stale data, or failed search/results, render the matching blocking or contextual surface. If a mutation can fail, render an action, form, dialog, or floating status near the initiating action.
- Preserve the user's context: selected workspace, route params, search query, filters, draft form values, open dialog, active tab, scroll context, and surrounding successful data.
- Keep loading, empty, and error states visually distinct. Empty data from a successful request is not an error.
- Use toasts only as secondary feedback for background or non-blocking failures, never as the sole explanation for a blocked screen or failed user action.
- Let the product's design system decide the visual form: banner, local status, locally placed message, compact callout, dialog content, or full-surface replacement are all acceptable when they satisfy the placement and accessibility rules.

## Surface Selection

Use a page-blocking error when the route cannot be meaningfully rendered without the missing data, such as a detail resource, review session, editor bootstrap, or required workspace context.

Use a section error when only one independent area failed, such as dashboard widgets, recent items, related records, or a secondary panel. Other loaded sections should remain usable.

Use a results-surface error for search/filter/list requests. Keep the search input, active filters, sort controls, and navigation visible so the user can adjust or retry without losing context.

Use a minimal route error for redirect-only routes when the redirect target cannot be resolved. Do not return `null` for a failed route decision; render a small error state with a stable fallback link or retry when available.

Use a fullscreen/bootstrap error only when the app cannot render its shell safely, such as failed auth/session/workspace bootstrap. Bootstrap can expose a manual retry even when the domain error is not normally retryable, because the user has no narrower surface to recover from.

## Query States

At the React Query boundary, queries should reject with `DomainError` after unwrapping `DomainResult<T>`. UI components then choose the visual state from query status, data presence, and surface ownership:

```tsx
if (query.isPending && query.data === undefined) {
  return <LoadingState />
}

if (query.isError && query.data === undefined) {
  return renderBlockingError({
    error: query.error,
    title: 'Could not load data',
    onRetry: query.refetch,
  })
}

return (
  <>
    {query.isError
      ? renderContextualWarning({
          error: query.error,
          title: 'Could not refresh data',
        })
      : null}
    <LoadedContent data={query.data} />
  </>
)
```

Rules:

- `query.isError && data === undefined`: render a page, section, or results replacement for the affected surface.
- `query.isError && data !== undefined`: keep stale data visible and render a contextual warning near the affected content.
- For secondary query failures such as path labels, breadcrumbs, or background refreshes, prefer a non-blocking warning over action/error styling.
- For multiple queries, make only route-critical missing data page-blocking. Render independent failures in their own surfaces.
- Use a skeleton/loading state only while no usable data exists. Avoid hiding stale data behind a spinner during background refetches.

## Mutation States

Mutation pending and failure states should appear near the surface that initiated the action. Choose placement by what the user is currently looking at and what they must do next.

Rules:

- Show pending feedback locally on the initiating action surface: submit button, confirm action, row action, selected card, selected grade button, autosave header/status area, or equivalent feature-owned control.
- Prefer delayed pending indicators for fast mutations to avoid flicker. Keep the existing visible action label stable when possible; use an icon/spinner or compact status rather than replacing labels with `Saving...`, `Deleting...`, or similar copy unless the product already uses that pattern.
- Use skeletons or full-surface loading for mutation pending only when the mutation genuinely replaces the primary content being viewed, such as loading the next review card. Otherwise keep the user's current content, draft, selection, dialog, and scroll context visible.
- Disable duplicate unsafe actions while pending, but keep safe escape actions such as cancel, close, back, or navigation available unless leaving would corrupt state.
- Do not leave `mutation.isError` without a visible, accessible error surface on the owning page, form, dialog, or action area.
- Do not navigate away, close a dialog, clear a draft, or remove the target item on mutation failure.
- Keep form values, selection, active tab, scroll context, and dialog state intact.
- Use field-level errors for validation only when the owning form can map `ValidationIssue.path` to a concrete input the user can correct.
- Use a form-level or action-level error for non-field failures such as conflict, permission, offline, timeout, or unavailable service.
- Make failed user actions visibly distinct from non-blocking background warnings, using the app's existing severity/tone system.
- On success, invalidate or update relevant React Query cache, then close/navigate only after the mutation has actually succeeded.

## Retry Actions

Use `DomainError.retryable` to decide whether automatic retry and visible retry actions should be offered by default.

Rules:

- Retryable errors normally include offline, timeout, unavailable service, or rate limiting.
- Non-retryable errors normally include validation, unauthorized, forbidden, not found, conflict, and unexpected failures.
- A feedback surface may expose a retry override for app bootstrap, route bootstrap, or explicit manual refresh flows.
- A visible retry action should call the owning query's `refetch`, a loader revalidation hook, repeat the failed mutation, or use an equivalent feature-local recovery function.
- Do not offer retry when the user must first change input, authenticate, request access, or resolve a conflict through a different flow.

## Accessibility

Error states must be perceivable without relying on icon-only presentation.

Use:

- visible text that names the problem and, when useful, the recovery action;
- `role="alert"` or an `aria-live` region for newly rendered blocking, contextual, or mutation errors;
- button labels that describe the recovery action, such as `Retry`, `Refresh`, `Back`, or `Sign in`;
- focus movement only when it matches the existing app pattern, when a dialog/form requires it, or when focusing the first invalid field improves correction.

## Testing

For visual Storybook coverage of these states, read `references/storybook.md`.

Keep unit/integration tests focused on branching behavior that can regress: no-data query errors replace the owning surface, stale-data query errors keep content visible, mutation errors preserve drafts, validation issues attach to the correct inputs, and retry callbacks are wired only when expected.
