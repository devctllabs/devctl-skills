# Error Contracts

Use this reference when defining shared API error responses.

## Problem Details

Prefer `application/problem+json` for structured errors. Shared responses should point at the public `ProblemDetails` schema:

```yaml
responses:
  BadRequest:
    description: The request was malformed.
    content:
      application/problem+json:
        schema:
          $ref: '#/components/schemas/ProblemDetails'
        examples:
          badRequest:
            value:
              type: /problems/bad-request
              title: Bad Request
              status: 400
              detail: Request body is malformed.
              retryable: false
  Validation:
    description: The request failed domain validation.
    content:
      application/problem+json:
        schema:
          $ref: '#/components/schemas/ProblemDetails'
        examples:
          validation:
            value:
              type: /problems/validation
              title: Validation Failed
              status: 422
              retryable: false
              issues:
                - path:
                    - title
                  code: required
  NotFound:
    description: The requested resource was not found.
    content:
      application/problem+json:
        schema:
          $ref: '#/components/schemas/ProblemDetails'
        examples:
          notFound:
            value:
              type: /problems/not-found
              title: Not Found
              status: 404
              detail: Workspace not found.
              retryable: false
              entity: workspace
              entityId: editorial-production
```

Use one reusable response per common status where possible: `BadRequest`, `Validation`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `Timeout`, `Unavailable`, and `Unexpected`.

Use a shared `ProblemType` enum to keep response examples, concrete problem schemas, and discriminator mappings aligned:

```yaml
ProblemType:
  type: string
  format: uri-reference
  enum:
    - /problems/bad-request
    - /problems/conflict
    - /problems/forbidden
    - /problems/not-found
    - /problems/timeout
    - /problems/unauthorized
    - /problems/unexpected
    - /problems/unavailable
    - /problems/validation
  example: /problems/validation
```

`ProblemDetails` should be the public reusable response schema. Define it as a union over concrete error shapes when the API has more than one error family:

```yaml
ProblemDetails:
  oneOf:
    - $ref: '#/components/schemas/ValidationProblemDetails'
    - $ref: '#/components/schemas/MessageProblemDetails'
  discriminator:
    propertyName: type
    mapping:
      /problems/bad-request: '#/components/schemas/MessageProblemDetails'
      /problems/conflict: '#/components/schemas/MessageProblemDetails'
      /problems/forbidden: '#/components/schemas/MessageProblemDetails'
      /problems/not-found: '#/components/schemas/MessageProblemDetails'
      /problems/timeout: '#/components/schemas/MessageProblemDetails'
      /problems/unauthorized: '#/components/schemas/MessageProblemDetails'
      /problems/unexpected: '#/components/schemas/MessageProblemDetails'
      /problems/unavailable: '#/components/schemas/MessageProblemDetails'
      /problems/validation: '#/components/schemas/ValidationProblemDetails'
```

Include every stable problem `type` value in the discriminator mapping. If the API only has one error shape, the reusable response can point directly at that concrete schema instead.

## Message Problem Details

For non-validation errors, use facts the client can map:

```yaml
MessageProblemDetails:
  type: object
  additionalProperties: false
  required:
    - retryable
    - status
    - title
    - type
  properties:
    type:
      type: string
      format: uri-reference
      enum:
        - /problems/bad-request
        - /problems/conflict
        - /problems/forbidden
        - /problems/not-found
        - /problems/timeout
        - /problems/unauthorized
        - /problems/unexpected
        - /problems/unavailable
    title:
      type: string
      minLength: 1
    status:
      type: integer
      minimum: 400
      maximum: 599
    detail:
      type: string
      minLength: 1
    retryable:
      type: boolean
    entity:
      type: string
    entityId:
      type: string
```

Keep `title` and `detail` generic backend text. User-facing localization should usually happen in clients.

## Validation Issues

Prefer fact-based validation issues:

```yaml
ValidationIssue:
  type: object
  additionalProperties: false
  required:
    - code
  properties:
    path:
      type: array
      items:
        type: string
    code:
      type: string
      minLength: 1
    params:
      type: object
      additionalProperties: true
```

Rules:

- `path` is a data/schema path, not a localized field label;
- `code` is a stable validation rule such as `required`, `minLength`, or `invalidChoice`;
- `params` holds dynamic facts such as limits or expected values;
- avoid `fieldErrors` maps with localized messages in backend contracts.

## Validation Problem Details

Validation problem details should require `issues`, `status`, `title`, `type`, and `retryable`. Use status `422` unless the project has a different established convention.

```yaml
ValidationProblemDetails:
  type: object
  additionalProperties: false
  required:
    - issues
    - retryable
    - status
    - title
    - type
  properties:
    type:
      type: string
      enum:
        - /problems/validation
      format: uri-reference
    title:
      type: string
      minLength: 1
    status:
      type: integer
      enum:
        - 422
    detail:
      type: string
      minLength: 1
    issues:
      type: array
      items:
        $ref: '#/components/schemas/ValidationIssue'
    retryable:
      type: boolean
      enum:
        - false
  example:
    type: /problems/validation
    title: Validation Failed
    status: 422
    retryable: false
    issues:
      - path:
          - title
        code: required
```
