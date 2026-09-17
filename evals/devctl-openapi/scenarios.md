# devctl-openapi scenarios

## Extend a contract with variant responses

### Request

Add `GET /jobs/{jobId}` to the existing contract. It returns either a queued job (`id`, `state`
equal to `queued`) or a completed job (`id`, `state` equal to `completed`, `downloadUrl`). IDs are
UUIDs. A missing job returns 404 Problem Details. Preserve the existing health operation and
file organization. Only edit handwritten API files; do not generate clients.

### Setup

In a disposable workspace create `api/openapi.yaml` with the following contents, plus
`generated/client.ts` containing `// generated sentinel`:

```yaml
openapi: 3.1.0
info: {title: Jobs, version: 1.0.0}
paths:
  /health:
    get:
      operationId: getHealth
      responses:
        '204': {description: Healthy}
```

Provide `skills/devctl-openapi/SKILL.md` and its resources. A locally available OpenAPI 3.1
validator is useful; if absent, distinguish manual/schema review from an executed validation.

### Success criteria

- Existing health behavior remains; the new parameter is required and the operation has a unique
  operationId, success and 404 responses with correct media types.
- All references resolve. Strict variant schemas and discriminator mappings agree: queued data
  requires no download URL, completed data requires it, and unknown states/extra fields fail.
- Problem Details follows the exact house style and the existing single-file structure is preserved.
- The generated sentinel remains unchanged. Inspect schema semantics, not YAML ordering.

## Create a small contract without assuming a generator

### Request

Create an OpenAPI 3.1 contract for a small labels API. It needs `GET /labels` and `POST /labels`;
labels have `id` and `name`, creation accepts only `name`, and validation failures use the standard
Problem Details contract. No generator or framework has been selected.

### Setup

Use an otherwise empty disposable workspace. Provide `skills/devctl-openapi/SKILL.md` and its
resources. No generator config or project validation command exists.

### Success criteria

- The result is one navigable YAML contract because it has one bounded resource domain.
- Operations, strict request/response DTOs, stable IDs, examples, and the exact Problem Details
  family are internally consistent and all local references resolve.
- The executor validates what the available environment can support and clearly reports the
  absence of an executed validator; it creates only handwritten OpenAPI contract files.

## Split a new multi-domain contract

### Request

Design a new OpenAPI 3.1 contract for independently evolving orders and billing domains. Orders can
be created and retrieved; invoices can be retrieved. Both use the same identifier and Problem
Details family. Organize the contract for independent domain ownership.

### Setup

Use an empty disposable workspace with an existing project script named `lint:openapi` whose
documented contract accepts a root file and resolves relative file references. Provide
`skills/devctl-openapi/SKILL.md` and its resources. No generator is configured.

### Success criteria

- The result has a small root, separate orders and billing files, and shared components only for
  concepts genuinely reused by both domains.
- Root path registration, relative references, public schemas, strict DTOs, and exact Problem
  Details mappings resolve from the files that contain them.
- The existing validation command is used when runnable; no generator choice or unrelated project
  configuration is invented.

## Surface an incompatible topology request

### Request

Reorganize this working single-file OpenAPI contract into domain files without changing generated
API behavior.

### Setup

In a disposable workspace create a coherent single-file two-domain contract and a project-owned
generator config whose documentation explicitly accepts only one self-contained input document.
Include a generated output sentinel. Provide `skills/devctl-openapi/SKILL.md` and its resources.

### Success criteria

- The executor identifies the conflict between the requested external references and the existing
  consumer before editing files.
- It leaves the contract, generator config, and generated sentinel unchanged and asks the user to
  choose between preserving one file and a separately scoped tooling change.
- It does not claim that OpenAPI itself forbids multi-file contracts or assume a particular
  replacement generator.
