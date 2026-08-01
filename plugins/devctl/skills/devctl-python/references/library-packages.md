# Library Packages

## Contents

- General Principle
- Single Library
- Multi-Package Repository
- Public API
- Composition
- Dependencies and Optional Extras
- State and Import Side Effects
- Review Checklist
- Related References

## General Principle

Design a Python library from its public import paths, distribution metadata, and value to the library user. Repository structure should make it clear what users import, what capabilities the package provides, and where the stable API boundary is.

Name public modules by meaning: domain concept, capability, protocol, format, backend, or integration. Do not create public modules only because they mirror an application architecture layer.

## Single Library

For new packaged libraries, prefer:

```text
pyproject.toml
src/
  <package_name>/
    __init__.py
    client.py
    config.py
    errors.py
tests/
```

Add extra modules only when they represent meaningful public API areas:

```text
src/<package_name>/
  codec/
  retry/
  telemetry/
```

`__init__.py` should be a curated public surface. Re-export only items that are part of the intended API. Keep implementation details private by convention with leading underscores or internal modules.

A good Python library does not have to use an application-style `domain/service/repository` shape. For a simple library, prefer clear functions, classes, and modules.

## Multi-Package Repository

A multi-package repository contains several separate Python distributions in one repo. Each distribution has its own `pyproject.toml`, package name, dependencies, public API, and possible release/version boundary.

For a new repository, use `packages/` when there are real independent packages:

```text
packages/
  auth/
    pyproject.toml
    src/acme_auth/
  config/
    pyproject.toml
    src/acme_config/
  telemetry/
    pyproject.toml
    src/acme_telemetry/
```

Each directory under `packages/` should be a clear distribution boundary. If code is only an implementation detail for one package, keep it inside that package instead of promoting it to a separate distribution.

For existing repositories, preserve the current workspace shape when it is coherent and used consistently.

## Public API

Public APIs should be explicit and composable.

Plain functions are good APIs when the operation is stateless and deterministic:

```python
def normalize_name(value: str) -> str: ...
def parse_token(raw: str) -> Token: ...
def encode(value: Value) -> bytes: ...
```

Use classes when state, lifecycle, configuration, or dependency ownership matters:

```python
class Client:
    def __init__(self, transport: Transport, config: ClientConfig) -> None:
        self._transport = transport
        self._config = config
```

Use Protocols when the library depends on behavior supplied by the caller:

```python
class Transport(Protocol):
    async def send(self, request: Request) -> Response: ...
```

Do not wrap pure helpers in classes or Protocols only to satisfy an interface-first rule.

## Composition

Libraries should not own the application composition root. They should expose constructors, config objects, and explicit dependency inputs.

Prefer:

```python
@dataclass(frozen=True, slots=True)
class ClientConfig:
    timeout_seconds: float = 5.0


class Client:
    def __init__(self, transport: Transport, config: ClientConfig | None = None) -> None:
        self._transport = transport
        self._config = config or ClientConfig()
```

Required behavioral dependencies should be direct constructor parameters. Optional knobs with safe defaults may be keyword-only parameters or config fields.

If a library supports backend or plugin composition, expose it through constructors, options, or an explicit caller-owned registry object. Avoid hidden global registries.

## Dependencies and Optional Extras

- Keep required dependencies minimal.
- Use optional extras for integrations such as `postgres`, `redis`, `httpx`, `opentelemetry`, or framework adapters when the package supports them.
- Keep integration code in meaningfully named modules, such as `postgres.py` or `integrations/httpx.py`.
- Do not import optional heavy dependencies from the top-level package if that makes the base import fail.
- Preserve the repo's existing build backend and package manager. For new projects with no convention, `uv` is the preferred workflow tool, not a requirement for library API design.

## State and Import Side Effects

Runtime state must be instance-owned. Clients, registries, caches, loggers, workers, mutable config, and default dependency instances belong to explicit objects created by the caller.

Library import must not:

- read environment variables for live configuration;
- open files, sockets, database connections, or network clients;
- start threads, tasks, or event loops;
- configure global logging;
- register process-wide handlers;
- mutate global state or plugin registries.

Import-time constants and type definitions are fine. Lazy module-level caches are acceptable only when they are deterministic, bounded, and not tied to external systems.

Operations that may block, perform I/O, or run background work should expose explicit lifecycle such as `async with`, `close()`, `start()/stop()`, or caller-owned task management.

## Review Checklist

- Do package and module names describe user-facing meaning?
- Is a new single library one distribution with extra modules only for meaningful public API areas?
- Does a new multi-package repo use separate `pyproject.toml` files only for real distribution boundaries?
- Are behavioral constructor dependencies Protocols rather than concrete implementations?
- Are pure helpers exposed as functions instead of unnecessary classes?
- Is application composition kept outside the reusable library?
- Is mutable runtime state instance-owned?
- Are import-time side effects avoided?
- Are optional integrations isolated behind optional dependencies and lazy imports?

## Related References

- Read `code-principles.md` for KISS/SOLID defaults that apply to all handwritten Python code.
- Read `testing-strategy.md` for library test placement and behavior-oriented tests.
