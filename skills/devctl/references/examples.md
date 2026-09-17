# Minimal Workflows

Use these examples only when the repository and CLI help do not already make the shape clear.

## New Go HTTP project

```bash
devctl init manifest --lang go --preset http-service --name orders-api --module example.com/orders-api
devctl init scaffold
devctl validate
devctl inspect
```

The manifest mutation and scaffold are separate. Install project tools and run generation only when
the requested work requires them.

Equivalent minimal manifest shape:

```yaml
version: 1
project:
  name: orders-api
  language: go
env: {}
paths: {}
sources: {}
exports: {}
components:
  http:
    server: {}
languages:
  go:
    module: example.com/orders-api
```

## External HTTP client

Discover exact source and client flags from local help, then keep acquisition and generation
explicit:

```bash
devctl add source contracts --type local --path api/contracts
devctl add http-client billing --source contracts --path billing/openapi.yaml
devctl validate
devctl inspect
devctl sync http --target http-client:billing
devctl lint http
devctl gen http --target http-client:billing
```

A local source may make synchronization a supported no-op. Preserve handwritten files outside the
reported managed target paths.
