# Polymorphism

Use this reference when a schema can have multiple protocol variants.

## Discriminated Union Pattern

Use `oneOf` with a discriminator when variants have a stable kind/type property:

```yaml
NoteDetail:
  oneOf:
    - $ref: '#/components/schemas/BasicNote'
    - $ref: '#/components/schemas/ClozeNote'
  discriminator:
    propertyName: kind
    mapping:
      basic: '#/components/schemas/BasicNote'
      cloze: '#/components/schemas/ClozeNote'
```

Each variant should require the discriminator property and constrain it to one enum value:

```yaml
BasicNote:
  type: object
  additionalProperties: false
  required:
    - id
    - kind
    - title
  properties:
    id:
      $ref: '../shared/components.yaml#/components/schemas/Id'
    kind:
      type: string
      enum:
        - basic
    title:
      type: string
      minLength: 1
```

## Variant Rules

- Use one discriminator property name across related variants, such as `kind` or `type`.
- Keep discriminator mapping keys equal to the wire values.
- Keep request unions and response unions separate when their shapes differ.
- Avoid anonymous inline variants inside `oneOf`; named schemas are easier to reference, review, and generate from.
- Add examples at the union level when they clarify the selected variant.

## When Not To Use Polymorphism

Do not use `oneOf` just to model optional fields. Use optional properties for ordinary partial shape variation. Use polymorphism when the API has distinct variants with different required fields or behavior.
