# OpenAPI Clients

Use generated contracts behind a narrow service and the Obsidian network boundary:

```text
OpenAPI → Hey API types / SDK / Zod
        → configured Fetch client → Fetch-compatible transport → requestUrl
Feature hook → injected service → generated SDK → DomainResult → Query unwrap
```

## Generation

For a new client without an established generator, use `@hey-api/openapi-ts`, its Fetch client, named SDK functions, and Zod request/response validation. Preserve an existing generator and transport unless migration is requested. Treat the OpenAPI document as input; authoring the contract is a separate task.

Install the generator as an exact-version dev dependency with the detected package manager, and `zod` as a runtime dependency. Inspect installed generator configuration types, Node requirements, and migration notes. Prefer Zod 4 for a new project; preserve a compatible installed version. Add a package script such as `codegen:api` running `openapi-ts`.

Example `openapi-ts.config.ts`, adapting paths to the package root:

```ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './api/openapi.yaml',
  output: 'src/shared/services/api/generated/catalog-api',
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: './src/obsidian/services/api/runtime-config',
      throwOnError: false,
    },
    '@hey-api/typescript',
    { name: 'zod', definitions: true, requests: true, responses: true },
    {
      name: '@hey-api/sdk',
      operations: { strategy: 'flat' },
      paramsStructure: 'grouped',
      validator: { request: 'zod', response: 'zod' },
    },
  ],
});
```

Both SDK validators must be enabled; schema generation alone does not validate calls. The extensionless runtime path keeps generated imports compatible with projects that do not enable TypeScript extension imports. Generated definitions are the source for wire DTO schemas; settings and form schemas may own different shapes.

## Ownership

For a growing plugin, keep contracts under `src/shared/services/api/generated/<source-name>/`, handwritten transport/configuration under `src/obsidian/services/api/`, and feature behavior behind narrow service interfaces. Preserve a smaller plugin's coherent flat layout: introduce a dedicated generated directory beside its API boundary rather than scaffolding unused layers. Follow [project-structure.md](project-structure.md).

Keep generated files generator-owned. Configure base URL, current authentication, `responseStyle: 'fields'`, and the host transport in handwritten runtime configuration or an explicitly injected client. Construct configured instances during plugin composition before first use. Use separate instances for independent accounts/endpoints. Keep Obsidian imports at the host edge and let services consume generated types without duplicating DTOs.

Commit generated output by default, preserving a coherent existing build-only policy. Generate from the repository's contract source or a reproducible pinned snapshot. CI should regenerate and detect changed, deleted, and newly created untracked output. Respect the project's task conventions and keep generated output out of handwritten lint/format rules when the generator owns formatting.

## Fetch → requestUrl Transport

The supported default is buffered REST/JSON on desktop and mobile. Use the Fetch client's custom `fetch` option to delegate to Obsidian `requestUrl`. Keep this transport handwritten and local to the host boundary; implement against installed `obsidian` types and the Fetch client version. This reference specifies behavior rather than supplying wrapper source code.

The transport must:

- Accept Fetch inputs, including a `Request` supplied by Hey API and optional `RequestInit` overrides; preserve the effective URL, method, headers, and serialized body.
- Call `requestUrl` with `throw: false` so HTTP errors reach the SDK with their original status and payload. Pass already serialized data without JSON-encoding it twice.
- Return a standard `Response` preserving status, headers, and response bytes. Supply a null body for HEAD and bodyless statuses such as `204`, `205`, and `304`.
- Propagate network failures as rejected calls. Reject pre-aborted calls without dispatch; support abandoning an in-flight wait and release abort listeners on completion, cancellation, or failure. A settled/cancelled consumer must not receive a late result.
- Describe actual support for timeout and Fetch options. `requestUrl` has no `AbortSignal` parameter: cancelling a wait cannot promise termination of the underlying network operation. Buffering a completed response does not provide live streaming or progress.

Add streaming, multipart uploads, cookie behavior, or other Fetch semantics only for an explicit requirement and verify them on target platforms. Keep Node/Electron network APIs out of the mobile path. Read [runtime-and-data-safety.md](runtime-and-data-safety.md) for platform and lifecycle rules.

## Service and Query Boundary

Use the application's existing result/error contract. For a new API-backed service, use a plain discriminated `Result<T, E>` (`{ ok: true, value }` or `{ ok: false, error }`) with a narrow `DomainError` contract and a `DomainResult<T>` alias. Keep expected failures as data and abort/cancel errors as control flow. Implement only error variants needed by the API, with stable validation facts and a `retryable` flag; avoid importing an unrelated app's whole error framework.

A handwritten service or SDK-result helper converts the generated result into `DomainResult`. Preserve `error` and optional `response`/`request`; with `throwOnError: false`, HTTP failures and some validation/transport failures are returned as structured results. Also handle thrown failures from the installed SDK. Check the error branch even for a 2xx response, and handle void/`204` success independently of data presence.

Normalize errors at this boundary:

- Map HTTP error payloads together with status/headers, using the API's Problem Details contract when present and status fallbacks otherwise. Keep generated DTOs and transport metadata inside the adapter.
- Request schema failures prevent dispatch and become non-retryable validation facts, even when no request/response was created.
- Response schema failures mean upstream contract mismatch, not invalid user input. Represent them as network `unavailable`; keep network/timeout/temporary upstream failures retryable according to the service contract.
- Apply the same cancellation detection to structured SDK errors and caught exceptions before domain mapping. Recognize the `AbortError` name on DOMException, ordinary Error, and cross-realm errors rather than relying only on `instanceof DOMException`; rethrow cancellation so it cannot become a retryable domain failure.

Feature-owned TanStack Query hooks call injected services and unwrap `DomainResult`: return the success value or reject with the domain error. Keep query keys, invalidation, and retries in those hooks or their QueryClient policy. Generate SDK and Zod only; keep Query hooks handwritten. Preserve existing generated Query integrations when migration is outside scope. Use a single retry owner, TanStack Query, and enable mutation retries only when replay is explicitly safe.

Own shared services and QueryClient at plugin scope; expose them through narrow props or contexts. On unload, cancel pending waits/queries, dispose subscriptions/interceptors, and clear plugin-owned cache; view-local resources use the shorter view lifecycle. Read [state-settings-and-i18n.md](state-settings-and-i18n.md) for state/provider ownership.

## Verification

Generate from a small contract and typecheck the config, runtime configuration, generated calls, and service adapter. Test against injected `requestUrl` responses rather than requiring a full Obsidian mock:

- Effective URL, encoded path/query, method, auth headers, and exactly-once JSON serialization.
- Valid JSON, `204`/HEAD without a response body, and non-2xx status/headers/body preserved through the SDK and error mapping.
- Network failure; invalid outgoing data without dispatch; malformed successful data reported as an upstream failure.
- Pre-abort without dispatch, cancellation while pending, listener cleanup on success/failure, and suppression of late delivery after cancellation/unload. Do not claim the underlying request was stopped.
- A substituted feature service and Query success/error behavior, with no generated runtime imports in UI features.

Finish when generation, generated-output drift, typecheck, and focused boundary checks have run, or name the missing evidence. Include both DOMException and Error-shaped cancellation. Run applicable checks from [testing.md](testing.md). Distinguish local transport tests from real desktop/mobile and unload/reload evidence; report missing host checks explicitly.
