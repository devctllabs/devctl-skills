# Runtime and Wiring

## Contents

- Entry Point Boundaries
- CLI Model
- `[project.scripts]`
- `__main__.py`
- Dependency Wiring
- Configuration and Secrets
- Shutdown and Concurrency
- Multi-Command Wiring
- Error Presentation
- Related References

## Entry Point Boundaries

Entrypoints adapt process inputs and outputs to application services/usecases:

```text
process input -> command parser/deps -> service/usecase -> process output
```

They own command parsing, dependency construction, process lifecycle, output formatting, and exit codes. They should be thin wrappers around services/usecases and transports.

Entrypoints should not implement business logic. They parse args, load config, build dependencies, call the selected scenario, format output, and return an exit code.

## CLI Model

Default structure:

```text
src/<package_name>/
  cli/
    __init__.py
    main.py
    commands/
      __init__.py
      serve.py
      worker.py
      cronjob.py
  deps/
    config.py
    wiring.py
    logging.py
    lifecycle.py
```

File roles:

- `cli/main.py`: root command parser and command dispatch.
- `cli/commands/serve.py`: start HTTP/gRPC servers and coordinate graceful shutdown.
- `cli/commands/worker.py`: run one named logical worker/consumer.
- `cli/commands/cronjob.py`: run one named one-shot job.
- `deps/config.py`: load and validate typed runtime config.
- `deps/wiring.py`: construct concrete repositories, clients, services, transports, and app dependencies.
- `deps/lifecycle.py`: close resources in a predictable order when the project needs shared lifecycle helpers.

Use the project's existing CLI parser. If no convention exists, choose the smallest parser that fits the command surface: `argparse` for simple commands; Click or Typer only when the project already uses them or command UX justifies the dependency.

## `[project.scripts]`

Use `pyproject.toml` entrypoints for installed commands:

```toml
[project.scripts]
myapp = "myapp.cli.main:main"
```

Rules:

- exported script functions should return an exit code or raise a handled application/bootstrap error;
- keep console script names user-facing and stable;
- do not rely on running source files by path as the primary production entrypoint;
- keep CLI parser setup importable without creating database clients, network clients, loggers, or background tasks.

## `__main__.py`

Add `__main__.py` only when `python -m <package_name>` is a supported useful entrypoint:

```python
from .cli.main import main

raise SystemExit(main())
```

Do not put command parsing and dependency construction in both `__main__.py` and `cli/main.py`. Keep one owner and delegate.

## Dependency Wiring

Use explicit construction before introducing a DI framework:

```python
from dataclasses import dataclass


@dataclass(slots=True)
class AppDeps:
    orders: OrderService
    http_app: object


async def build_deps(config: AppConfig) -> AppDeps:
    repository = PostgresOrderRepository(config.database)
    orders = OrderService(repository)
    http_app = build_http_app(orders=orders)
    return AppDeps(orders=orders, http_app=http_app)
```

Rules:

- concrete adapter selection belongs in `deps`;
- handlers receive explicit services/usecases or narrow Protocols;
- do not make transport modules read environment variables or construct repositories;
- keep dependency construction deterministic and testable;
- split providers by area only when construction gets large.

## Configuration and Secrets

Config loading belongs in entrypoint/deps code:

- environment variables;
- CLI flags;
- config files;
- secret paths;
- generated config modules.

Service constructors receive typed values that are already explicit. Domain modules should not read environment variables.

Rules:

- preserve the repo's existing config library;
- if using Pydantic Settings, keep settings models in `deps/config.py` or framework-specific config modules, not domain;
- redact secrets in logs and error messages;
- keep runtime activation toggles in entrypoint/deps code;
- avoid global config singletons.

## Shutdown and Concurrency

Every long-running task should have an owner responsible for cancellation, error handling, and cleanup.

Rules:

- create the root signal/cancellation handling in the selected command;
- pass cancellation through async call chains where possible;
- close database pools, clients, producers, and servers in a predictable order;
- avoid fire-and-forget tasks unless they are explicitly best-effort and bounded;
- one-shot cronjob commands should usually run sequentially and return the operation result;
- use task groups or framework-native lifecycle only when concurrent work needs shared cancellation.

Do not start background tasks at import time.

## Multi-Command Wiring

Prefer one installed command with subcommands when it is the intended product/runtime wrapper:

```text
myapp serve
myapp worker <name>
myapp cronjob <job>
myapp migrate
```

Use multiple installed commands only when lifecycle, dependencies, deploy units, release artifacts, or operator UX materially differ.

Keep physical topic names, queue names, and storage identifiers in config/deps. Command names should usually be logical scenario names.

## Error Presentation

Map errors at the boundary:

- CLI maps application errors to human-readable stderr/stdout and exit codes.
- HTTP maps application errors to status codes and response bodies.
- gRPC maps application errors to status codes/details.
- Workers map application errors to ack/retry/drop/DLQ policy.

Do not parse error strings for branching. Match stable categories or typed error details.

Bootstrap errors before application logging exists may use simple stderr output. After logging is configured, runtime errors should be logged through the application logger with redacted context.

## Related References

- Read `adapters-and-transport.md` for HTTP/gRPC/message handler boundaries.
- Read `observability-and-health.md` for logging, metrics, tracing, and health startup.
- Read `deployment-and-packaging.md` for process shape in containers and Kubernetes.
