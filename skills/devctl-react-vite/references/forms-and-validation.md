# Forms and Validation

Use this reference when adding or changing typed forms, client validation, server validation mapping, or form accessibility.

## Default Stack

Preserve a coherent existing form stack. When the project has no established stack and the form is more than a simple search/filter control, prefer:

- `react-hook-form` for form state, submit handling, and field controllers;
- `zod` for runtime schemas and inferred form types;
- `@hookform/resolvers/zod` for resolver integration.

Simple one-field filters, search boxes, and UI-only toggles can stay in local controlled state when schema validation would add noise.

## Ownership Boundaries

Keep the route-facing page, dialog container, or feature controller responsible for form behavior:

- create the Zod schema and infer `FormValues` with `z.infer`;
- call `useForm<FormValues>()`, `useController`, `useWatch`, `reset`, and `handleSubmit`;
- own default values, edit-mode hydration, submit DTO mapping, mutation state,
  navigation, and query invalidation;
- map backend `ValidationIssue.path` values to concrete form fields;
- merge client and service validation messages before rendering.

Keep reusable feature form components mostly presentational. Pass field values,
change handlers, pending/disabled state, and already translated validation
messages as props. Do not make presentational form components import platform
services, React Query mutations, route navigation, or backend validation types.

## Schema And Message Pattern

Use schema factories when validation messages need localization:

```ts
const createProductFormSchema = (t: TFunction) =>
  z.object({
    description: z.string(),
    name: z.string().trim().min(1, t(($) => $.forms.validation.required, {
      field: t(($) => $.products.fields.name),
    })),
  })

type ProductFormValues = z.infer<ReturnType<typeof createProductFormSchema>>

const form = useForm<ProductFormValues>({
  defaultValues: { description: '', name: '' },
  resolver: zodResolver(createProductFormSchema(t), undefined, { mode: 'sync' }),
})
```

Prefer shared helpers for common validation rules and message conversion only
when multiple forms already repeat the same behavior. Keep field-specific label
mapping local to the owning form/page unless the same form module owns every
caller.

Trim and normalize values at clear boundaries. Schema rules may trim to validate
user intent, but submit handlers should still send explicit DTO values, such as
`values.name.trim()`. Avoid mutating visible input text on every keystroke unless
the product intentionally formats that field while editing.

## Client And Server Validation

Show field-level errors only when the owning form can map the validation path to
a concrete input or field group the user can correct. Unknown paths, missing
paths, conflicts, permission errors, offline failures, timeouts, and unavailable
services should render as form-level or action-level errors near the submitting
surface.

Client-side Zod errors and backend validation issues should feed the same
presentational validation-message props. Merge them in the page/container so the
form component does not need to know where a message came from.

Clear stale mutation errors when the user edits a field that can fix the
failure. Clear client field errors when the new value obviously satisfies the
rule, or let React Hook Form validation update them during submit/change
according to the project's existing validation mode.

## Accessibility And Rendering

Each invalid input or field group should expose the error accessibly:

- set `aria-invalid` when messages exist for that field;
- connect messages with `aria-describedby`;
- render visible message text near the owned field or field group;
- use a form/action error surface for failures that do not belong to one field.

## Testing

Add colocated tests for required and conditional validation rules, edit-mode
hydration and reset behavior, submit DTO trimming/mapping, mutation failures
preserving draft values, backend validation paths attaching to the expected
fields, and accessible invalid states/descriptions. Add Storybook states for
visually meaningful form conditions such as default, filled/editing, validation
errors, mutation error, dense/long content, and disabled or pending submit.
