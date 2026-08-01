#!/usr/bin/env python3
"""Trusted host-side deterministic checks for devctl-python eval fixtures."""

from __future__ import annotations

import ast
import contextlib
import importlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import tomllib
from typing import Any


RESULTS: list[dict[str, object]] = []


def record(pass_: bool, reason: str) -> None:
    RESULTS.append({"pass": bool(pass_), "reason": reason})


def command(workspace: Path, argv: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        argv,
        cwd=workspace,
        check=False,
        capture_output=True,
        text=True,
        timeout=60,
        env={
            "HOME": str(workspace / ".checker-home"),
            "PATH": os.environ.get("PATH", ""),
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONPATH": str(workspace / "src"),
        },
    )


def git(workspace: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return command(workspace, ["git", *args])


def unittest_gate(workspace: Path) -> None:
    result = command(
        workspace,
        [sys.executable, "-m", "unittest", "discover", "-s", "tests"],
    )
    record(
        result.returncode == 0,
        "Repository unittest suite passed"
        if result.returncode == 0
        else f"Repository unittest suite failed:\n{result.stdout}\n{result.stderr}",
    )


def protected_skill_gate(workspace: Path) -> None:
    result = git(
        workspace,
        "status",
        "--porcelain",
        "--",
        ".agents/skills/devctl-python",
    )
    record(
        result.stdout.strip() == "",
        "Injected candidate skill is unchanged"
        if result.stdout.strip() == ""
        else f"Candidate edited its injected skill:\n{result.stdout}",
    )


def unchanged(workspace: Path, *paths: str) -> None:
    result = git(workspace, "diff", "--quiet", "HEAD", "--", *paths)
    record(
        result.returncode == 0,
        f"{', '.join(paths)} unchanged"
        if result.returncode == 0
        else f"{', '.join(paths)} must remain unchanged",
    )


def add_src(workspace: Path) -> None:
    sys.path.insert(0, str(workspace / "src"))


def parse(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def status_paths(workspace: Path) -> list[str]:
    result = git(workspace, "status", "--porcelain")
    return [line[3:] for line in result.stdout.splitlines() if len(line) >= 4]


def preserve_existing_tooling(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unchanged(workspace, "pyproject.toml", "poetry.lock", "README.md")
    record(not (workspace / "uv.lock").exists(), "No uv.lock was introduced")
    changed = [
        path
        for path in status_paths(workspace)
        if not path.startswith(".agents/skills/devctl-python/")
    ]
    allowed = all(
        path == "src/orders/service.py" or path.startswith("tests/unit/service/")
        for path in changed
    )
    record(allowed, f"Changes stay in the order capability: {changed}")
    unittest_gate(workspace)

    add_src(workspace)
    module = importlib.import_module("orders.service")
    service = module.OrderService()
    orders = (
        module.Order(id="one"),
        module.Order(id="two"),
        module.Order(id="three", archived=True),
    )
    archived = service.archive(orders, "two")
    record(
        archived
        == (
            module.Order(id="one"),
            module.Order(id="two", archived=True),
            module.Order(id="three", archived=True),
        ),
        "Only the selected order is archived and sequence is preserved",
    )
    record(
        service.archive((module.Order(id="one", archived=True),), "one")
        == (module.Order(id="one", archived=True),),
        "Archiving is idempotent",
    )
    try:
        service.archive(orders, "missing")
    except module.OrderNotFoundError:
        record(True, "Missing orders raise OrderNotFoundError")
    except Exception as error:  # noqa: BLE001
        record(False, f"Missing order raised {type(error).__name__}")
    else:
        record(False, "Missing order did not raise OrderNotFoundError")


class _Operations:
    def __init__(self, prefix: str, listed: tuple[str, ...]) -> None:
        self.prefix = prefix
        self.listed = listed
        self.calls: list[tuple[str, str | None]] = []
        self.failure: ValueError | None = None

    def install(self, name: str) -> str:
        self.calls.append(("install", name))
        if self.failure is not None:
            raise self.failure
        return f"{self.prefix}:{name}"

    def list(self) -> tuple[str, ...]:
        self.calls.append(("list", None))
        return self.listed


class _Deps:
    def __init__(self) -> None:
        self.packages = _Operations("package", ("pkg-a", "pkg-b"))
        self.agents = _Operations("agent", ("agent-a", "agent-b"))


def invoke_cli(main: Any, argv: list[str], deps: _Deps) -> tuple[int, str, str]:
    stdout = io.StringIO()
    stderr = io.StringIO()
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        exit_code = main(argv, deps)
    return exit_code, stdout.getvalue(), stderr.getvalue()


def invoke_help(main: Any, argv: list[str]) -> tuple[int, str, str]:
    class _UnavailableDeps:
        def __getattribute__(self, name: str) -> Any:
            raise AssertionError(f"help accessed dependency {name}")

    stdout = io.StringIO()
    stderr = io.StringIO()
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        try:
            main(argv, _UnavailableDeps())
        except SystemExit as error:
            code = error.code if isinstance(error.code, int) else 1
        except Exception as error:
            code = 1
            print(f"{type(error).__name__}: {error}", file=sys.stderr)
        else:
            code = 0
    return code, stdout.getvalue(), stderr.getvalue()


def set_default_handler_count(tree: ast.AST) -> int:
    count = 0
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "set_defaults"
            and any(keyword.arg == "handler" for keyword in node.keywords)
        ):
            count += 1
    return count


def nested_argparse_refactor(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unittest_gate(workspace)
    root = workspace / "src/admin_cli/cli"
    main_path = root / "main.py"
    command_root = root / "commands"
    expected = [command_root / "__init__.py", command_root / "package.py", command_root / "agent.py"]
    for path in expected:
        record(path.exists(), f"{path.relative_to(workspace)} exists")
    forbidden = [
        root / "contracts.py",
        root / "types.py",
        command_root / "install.py",
        command_root / "list.py",
    ]
    for path in forbidden:
        record(not path.exists(), f"{path.relative_to(workspace)} is absent")

    if main_path.exists():
        main_tree = parse(main_path)
        attrs = {
            node.attr
            for node in ast.walk(main_tree)
            if isinstance(node, ast.Attribute)
            and isinstance(node.value, ast.Name)
            and node.value.id == "args"
        }
        record(
            "group" not in attrs and "command" not in attrs,
            "main does not redispatch on args.group or args.command",
        )
        handler_calls = [
            node
            for node in ast.walk(main_tree)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "handler"
        ]
        record(len(handler_calls) == 1, "main invokes exactly one selected args.handler")

    for group in ("package", "agent"):
        path = command_root / f"{group}.py"
        if path.exists():
            record(
                set_default_handler_count(parse(path)) == 2,
                f"{group} binds a handler to both executable leaves",
            )

    test_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (workspace / "tests").rglob("*.py")
    )
    record("main(" in test_text, "CLI tests invoke the public main boundary")
    for words in (
        ("package", "install"),
        ("package", "list"),
        ("agent", "install"),
        ("agent", "list"),
    ):
        record(
            all(f'"{word}"' in test_text or f"'{word}'" in test_text for word in words),
            f"Tests cover {' '.join(words)}",
        )

    add_src(workspace)
    module = importlib.import_module("admin_cli.cli.main")
    checks = [
        (["package", "install", "demo"], "package:demo\n", "packages", ("install", "demo")),
        (["package", "list"], "pkg-a\npkg-b\n", "packages", ("list", None)),
        (["agent", "install", "demo"], "agent:demo\n", "agents", ("install", "demo")),
        (["agent", "list"], "agent-a\nagent-b\n", "agents", ("list", None)),
    ]
    for argv, expected_output, owner, call in checks:
        deps = _Deps()
        code, stdout, stderr = invoke_cli(module.main, argv, deps)
        record(
            (code, stdout, stderr) == (0, expected_output, ""),
            f"{' '.join(argv)} preserves output and exit status",
        )
        record(getattr(deps, owner).calls == [call], f"{' '.join(argv)} delegates once")

    deps = _Deps()
    deps.packages.failure = ValueError("boom")
    code, stdout, stderr = invoke_cli(module.main, ["package", "install", "demo"], deps)
    record(
        code == 1 and stdout == "" and "admin: boom" in stderr,
        "Shared ValueError mapping preserves stderr and exit code",
    )


def argparse_help(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unchanged(workspace, "pyproject.toml", "README.md")
    unittest_gate(workspace)
    changed = [
        path
        for path in status_paths(workspace)
        if not path.startswith(".agents/skills/devctl-python/")
        and "__pycache__" not in path
        and not path.endswith(".pyc")
    ]
    allowed = all(
        path.startswith("src/admin_cli/cli/")
        or path.startswith("tests/unit/cli/")
        for path in changed
    )
    record(allowed, f"Changes stay in the CLI and its owner tests: {changed}")

    test_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (workspace / "tests/unit/cli").rglob("*.py")
    )
    record("--help" in test_text, "CLI tests exercise public --help routes")
    record(
        "SystemExit" in test_text or "assertRaises" in test_text,
        "CLI tests assert the argparse help exit",
    )

    add_src(workspace)
    module = importlib.import_module("admin_cli.cli.main")
    help_checks = (
        (
            ["--help"],
            ("package", "Manage packages.", "agent", "Manage agents."),
        ),
        (
            ["package", "--help"],
            ("install", "Install a package.", "list", "List packages."),
        ),
        (
            ["package", "install", "--help"],
            ("NAME", "Package name to install.", "example:", "admin package install demo"),
        ),
    )
    for argv, expected in help_checks:
        code, stdout, stderr = invoke_help(module.main, argv)
        label = " ".join(("admin", *argv))
        record(
            code == 0 and stderr == "",
            f"{label} exits successfully without stderr",
        )
        for text in expected:
            record(text in stdout, f"{label} contains {text}")
    root_output = invoke_help(module.main, ["--help"])[1]
    record("\n    help " not in root_output, "No separate help command was introduced")

    checks = (
        (["package", "install", "demo"], "package:demo\n"),
        (["package", "list"], "pkg-a\npkg-b\n"),
        (["agent", "install", "demo"], "agent:demo\n"),
        (["agent", "list"], "agent-a\nagent-b\n"),
    )
    for argv, expected_output in checks:
        code, stdout, stderr = invoke_cli(module.main, argv, _Deps())
        record(
            (code, stdout, stderr) == (0, expected_output, ""),
            f"{' '.join(argv)} preserves executable behavior",
        )


def library_kiss_tdd(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unchanged(workspace, "pyproject.toml", "README.md")
    unittest_gate(workspace)
    package = workspace / "src/acme_names"
    forbidden_names = {
        "domain",
        "service",
        "usecase",
        "repository",
        "client",
        "deps",
        "platform",
    }
    present = {path.name for path in package.iterdir()} if package.exists() else set()
    record(not (present & forbidden_names), "No application architecture layers were introduced")
    trees = [parse(path) for path in package.rglob("*.py")]
    classes = [node for tree in trees for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
    record(not classes, "The stateless API introduces no classes or Protocols")

    add_src(workspace)
    module = importlib.import_module("acme_names")
    normalize = getattr(module, "normalize_name", None)
    record(callable(normalize), "normalize_name is exported from acme_names")
    if callable(normalize):
        record(normalize("  Hello \t WORLD  ") == "hello world", "Whitespace is normalized")
        record(normalize("Straße") == "strasse", "Unicode case folding is applied")
        try:
            normalize(" \t\n ")
        except ValueError:
            record(True, "Empty normalized names raise ValueError")
        except Exception as error:  # noqa: BLE001
            record(False, f"Empty input raised {type(error).__name__}")
        else:
            record(False, "Empty normalized names did not raise ValueError")

    with tempfile.TemporaryDirectory() as temporary:
        temporary_path = Path(temporary)
        home = temporary_path / "home"
        work = temporary_path / "work"
        home.mkdir()
        work.mkdir()
        before = sorted(str(path.relative_to(temporary_path)) for path in temporary_path.rglob("*"))
        result = subprocess.run(
            [sys.executable, "-c", "import acme_names"],
            cwd=work,
            check=False,
            capture_output=True,
            text=True,
            env={
                "HOME": str(home),
                "PATH": os.environ.get("PATH", ""),
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONPATH": str(workspace / "src"),
            },
        )
        after = sorted(str(path.relative_to(temporary_path)) for path in temporary_path.rglob("*"))
        record(result.returncode == 0 and before == after, "Import has no external side effects")


def class_modules(package_root: Path) -> dict[str, tuple[Path, ast.ClassDef]]:
    found: dict[str, tuple[Path, ast.ClassDef]] = {}
    for path in package_root.rglob("*.py"):
        tree = parse(path)
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                found[node.name] = (path, node)
    return found


def module_name(workspace: Path, path: Path) -> str:
    relative = path.relative_to(workspace / "src").with_suffix("")
    return ".".join(relative.parts)


def io_boundaries_refactor(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unittest_gate(workspace)
    package_root = workspace / "src/package_discovery"
    classes = class_modules(package_root)
    for name in ("PackageService", "CodexPluginClient", "FilesystemPackageCatalog"):
        record(name in classes, f"{name} exists")
    if "PackageService" not in classes:
        return

    service_path, service_class = classes["PackageService"]
    service_tree = parse(service_path)
    imports = {
        alias.name
        for node in ast.walk(service_tree)
        if isinstance(node, ast.Import)
        for alias in node.names
    }
    imports.update(
        node.module or ""
        for node in ast.walk(service_tree)
        if isinstance(node, ast.ImportFrom)
    )
    record(
        not any(name == "subprocess" or name.startswith("os") for name in imports),
        "PackageService does not import subprocess or os",
    )
    io_methods = {
        "cwd",
        "home",
        "resolve",
        "exists",
        "stat",
        "is_file",
        "is_dir",
        "open",
        "read_text",
        "write_text",
        "mkdir",
        "unlink",
        "rename",
        "replace",
        "glob",
        "rglob",
    }
    used_io = {
        node.func.attr
        for node in ast.walk(service_tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr in io_methods
    }
    record(not used_io, f"PackageService performs no direct filesystem I/O: {sorted(used_io)}")
    protocol_classes = [
        node
        for node in service_tree.body
        if isinstance(node, ast.ClassDef)
        and any(
            isinstance(base, ast.Name) and base.id == "Protocol"
            or isinstance(base, ast.Attribute) and base.attr == "Protocol"
            for base in node.bases
        )
    ]
    record(len(protocol_classes) >= 2, "Service owns narrow Protocols for both external capabilities")
    raw_methods = {"exists", "read", "write", "copy", "glob", "open", "read_text", "write_text"}
    protocol_methods = {
        node.name
        for protocol in protocol_classes
        for node in protocol.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    record(not (protocol_methods & raw_methods), "Protocols describe capabilities, not raw I/O")
    discover = next(
        (
            node
            for node in service_class.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "discover"
        ),
        None,
    )
    record(
        discover is not None and len(discover.args.args) == 1,
        "PackageService.discover receives no runtime filesystem or executable arguments",
    )

    repository_tests = list((workspace / "tests/integration/repository").rglob("*.py"))
    client_tests = list((workspace / "tests/unit/client").rglob("*.py"))
    record(bool(repository_tests), "Filesystem repository has an integration test")
    record(bool(client_tests), "Subprocess client has an owning unit test")
    repository_text = "\n".join(path.read_text(encoding="utf-8") for path in repository_tests)
    record(
        "TemporaryDirectory" in repository_text or "tmp_path" in repository_text,
        "Filesystem repository tests use an isolated temporary filesystem",
    )

    add_src(workspace)
    service_module = importlib.import_module(module_name(workspace, service_path))
    service_type = getattr(service_module, "PackageService")

    class PluginFake:
        def list_plugins(self) -> tuple[object, ...]:
            plugin_type = getattr(service_module, "Plugin", None)
            if plugin_type is not None:
                return (
                    plugin_type(name="alpha", enabled=True),
                    plugin_type(name="gamma", enabled=True),
                    plugin_type(name="beta", enabled=False),
                )

            class Plugin:
                def __init__(self, name: str, enabled: bool) -> None:
                    self.name = name
                    self.enabled = enabled

            return (
                Plugin("alpha", True),
                Plugin("gamma", True),
                Plugin("beta", False),
            )

        def list_enabled(self) -> tuple[str, ...]:
            return ("alpha", "gamma")

        def list_enabled_packages(self) -> tuple[str, ...]:
            return self.list_enabled()

        def enabled_packages(self) -> tuple[str, ...]:
            return self.list_enabled()

    class CatalogFake:
        def list_packages(self) -> tuple[str, ...]:
            return ("beta", "alpha")

        def list_available(self) -> tuple[str, ...]:
            return ("beta", "alpha")

        def list_available_packages(self) -> tuple[str, ...]:
            return self.list_available()

        def available_packages(self) -> tuple[str, ...]:
            return self.list_available()

    try:
        result = service_type(PluginFake(), CatalogFake()).discover()
    except Exception as error:  # noqa: BLE001
        record(False, f"Public service shape failed with fakes: {type(error).__name__}: {error}")
    else:
        record(tuple(result) == ("alpha",), "Service keeps enabled/local selection policy")


def _class_methods(path: Path, class_name: str) -> set[str]:
    if not path.is_file():
        return set()
    tree = parse(path)
    target = next(
        (node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == class_name),
        None,
    )
    if target is None:
        return set()
    return {
        node.name
        for node in target.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and not node.name.startswith("_")
    }


def _consumer_protocol_names(tree: ast.Module, method_name: str) -> set[str]:
    names: set[str] = set()
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        bases = {ast.unparse(base) for base in node.bases}
        methods = {
            child.name
            for child in node.body
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        if method_name in methods and bases & {"Protocol", "typing.Protocol"}:
            names.add(node.name)
    return names


def library_dip_tdd(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unchanged(workspace, "pyproject.toml", "README.md")
    unittest_gate(workspace)

    package = workspace / "src/acme_expiry"
    forbidden_names = {
        "domain",
        "service",
        "usecase",
        "repository",
        "client",
        "transport",
        "deps",
        "platform",
    }
    present = {path.name for path in package.iterdir()} if package.exists() else set()
    record(not (present & forbidden_names), "Library introduces no application layers")
    changed = [
        path
        for path in status_paths(workspace)
        if not path.startswith(".agents/skills/devctl-python/")
    ]
    allowed_paths = {
        "src/acme_expiry/__init__.py",
        "tests/unit/test_expiry.py",
    }
    record(set(changed) <= allowed_paths, f"Changes stay in the library API: {changed}")

    public_path = package / "__init__.py"
    if not public_path.is_file():
        record(False, "src/acme_expiry/__init__.py exists")
        return
    tree = parse(public_path)
    protocol_names = _consumer_protocol_names(tree, "now")
    policy = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.ClassDef) and node.name == "ExpiryPolicy"
        ),
        None,
    )
    constructor = (
        next(
            (
                node
                for node in policy.body
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and node.name == "__init__"
            ),
            None,
        )
        if policy is not None
        else None
    )
    dependency_annotation = ""
    if constructor is not None:
        clock_arg = next(
            (argument for argument in constructor.args.args if argument.arg != "self"),
            None,
        )
        if clock_arg is not None and clock_arg.annotation is not None:
            dependency_annotation = ast.unparse(clock_arg.annotation)
    record(
        dependency_annotation in protocol_names,
        "ExpiryPolicy depends on the library-owned Clock Protocol",
    )
    public_classes = {
        node.name for node in tree.body if isinstance(node, ast.ClassDef)
    }
    record(
        public_classes == {"Clock", "ExpiryPolicy"},
        f"Library exposes only Clock and ExpiryPolicy classes: {public_classes}",
    )
    source = public_path.read_text(encoding="utf-8")
    record(
        "datetime.now(" not in source and "datetime.utcnow(" not in source,
        "Library does not construct a concrete runtime clock",
    )

    add_src(workspace)
    module = importlib.import_module("acme_expiry")
    clock_type = getattr(module, "Clock", None)
    policy_type = getattr(module, "ExpiryPolicy", None)
    record(isinstance(clock_type, type), "Clock is exported from acme_expiry")
    record(isinstance(policy_type, type), "ExpiryPolicy is exported from acme_expiry")
    if not isinstance(policy_type, type):
        return

    from datetime import datetime, timedelta, timezone

    class ClockFake:
        def __init__(self, value: datetime) -> None:
            self.value = value

        def now(self) -> datetime:
            return self.value

    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    policy_instance = policy_type(ClockFake(now))
    record(
        policy_instance.expired(now + timedelta(seconds=1)) is False
        and policy_instance.expired(now) is True
        and policy_instance.expired(now - timedelta(seconds=1)) is True,
        "ExpiryPolicy uses the injected clock at the deadline boundary",
    )
    try:
        policy_instance.expired(datetime(2026, 1, 1))
    except ValueError:
        record(True, "Naive deadlines raise ValueError")
    except Exception as error:  # noqa: BLE001
        record(False, f"Naive deadline raised {type(error).__name__}")
    else:
        record(False, "Naive deadline was accepted")


def bugfix_regression_first(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unchanged(workspace, "pyproject.toml", "README.md")
    unittest_gate(workspace)
    changed = [
        path
        for path in status_paths(workspace)
        if not path.startswith(".agents/skills/devctl-python/")
    ]
    allowed_paths = {"src/netcfg/ports.py", "tests/test_ports.py"}
    record(set(changed) <= allowed_paths, f"Bugfix preserves the flat test layout: {changed}")

    add_src(workspace)
    module = importlib.import_module("netcfg")
    parse_port = getattr(module, "parse_port", None)
    record(callable(parse_port), "parse_port remains public")
    if not callable(parse_port):
        return
    record(
        parse_port("1") == 1 and parse_port("65535") == 65_535,
        "Valid port boundaries remain unchanged",
    )
    try:
        parse_port("0")
    except ValueError:
        record(True, "Port zero raises ValueError")
    except Exception as error:  # noqa: BLE001
        record(False, f"Port zero raised {type(error).__name__}")
    else:
        record(False, "Port zero was accepted")


def catalog_remove_tdd(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unchanged(workspace, "pyproject.toml", "README.md", "src/catalog/errors.py")
    unittest_gate(workspace)

    service_path = workspace / "src/catalog/service.py"
    repository_path = workspace / "src/catalog/repository.py"
    cli_path = workspace / "src/catalog/cli.py"
    service_methods = _class_methods(service_path, "CatalogService")
    repository_methods = _class_methods(repository_path, "FilesystemCatalog")
    record(service_methods == {"remove"}, f"CatalogService public methods: {service_methods}")
    record(
        repository_methods == {"remove"},
        f"FilesystemCatalog public methods: {repository_methods}",
    )
    if service_path.is_file():
        service_tree = parse(service_path)
        protocol_names = _consumer_protocol_names(service_tree, "remove")
        service_node = next(
            (
                node
                for node in service_tree.body
                if isinstance(node, ast.ClassDef) and node.name == "CatalogService"
            ),
            None,
        )
        constructor = (
            next(
                (
                    node
                    for node in service_node.body
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and node.name == "__init__"
                ),
                None,
            )
            if service_node is not None
            else None
        )
        dependency_annotation = ""
        if constructor is not None:
            store_arg = next(
                (argument for argument in constructor.args.args if argument.arg != "self"),
                None,
            )
            if store_arg is not None and store_arg.annotation is not None:
                dependency_annotation = ast.unparse(store_arg.annotation)
        record(
            dependency_annotation in protocol_names,
            "CatalogService depends on a consumer-owned remove Protocol",
        )
    else:
        record(False, "src/catalog/service.py exists")
    if cli_path.is_file():
        cli_tree = parse(cli_path)
        main = next(
            (
                node
                for node in cli_tree.body
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "main"
            ),
            None,
        )
        record(
            main is not None
            and len(main.args.args) >= 2
            and main.args.args[1].arg == "deps",
            "CLI exposes the public main(argv, deps) boundary",
        )
    else:
        record(False, "src/catalog/cli.py exists")

    test_paths = {
        "CLI": workspace / "tests/unit/cli/test_catalog_cli.py",
        "service": workspace / "tests/unit/service/test_catalog_service.py",
        "repository": workspace / "tests/integration/repository/test_filesystem_catalog.py",
    }
    for owner, path in test_paths.items():
        text = path.read_text(encoding="utf-8") if path.is_file() else ""
        record("test_" in text and "assert" in text, f"{owner} owns direct assertions")
        if owner == "CLI":
            record("main(" in text and "remove" in text, "CLI tests exercise the remove leaf")
        elif owner == "repository":
            record(".remove(" in text, "repository tests exercise public remove")
            record(
                "TemporaryDirectory" in text,
                "repository tests use an isolated real filesystem",
            )
        else:
            record(".remove(" in text, "service tests exercise public remove")

    changed = [
        path
        for path in status_paths(workspace)
        if not path.startswith(".agents/skills/devctl-python/")
    ]
    allowed_paths = {
        "src/catalog/cli.py",
        "src/catalog/service.py",
        "src/catalog/repository.py",
        "tests/unit/cli/test_catalog_cli.py",
        "tests/unit/service/test_catalog_service.py",
        "tests/integration/repository/test_filesystem_catalog.py",
    }
    record(
        set(changed) <= allowed_paths,
        f"Changes stay in the requested vertical slice: {changed}",
    )
    if service_methods != {"remove"} or repository_methods != {"remove"}:
        return

    add_src(workspace)
    service_module = importlib.import_module("catalog.service")
    repository_module = importlib.import_module("catalog.repository")
    cli_module = importlib.import_module("catalog.cli")
    errors_module = importlib.import_module("catalog.errors")
    service_type = getattr(service_module, "CatalogService")
    repository_type = getattr(repository_module, "FilesystemCatalog")
    catalog_error = getattr(errors_module, "CatalogError")
    invalid_name = getattr(errors_module, "InvalidPackageNameError")
    not_found = getattr(errors_module, "CatalogNotFoundError")

    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary) / "packages"
        root.mkdir()
        (root / "target").mkdir()
        (root / "sibling").mkdir()
        repository = repository_type(root)
        service = service_type(repository)
        target = (root / "target").resolve()
        removed = service.remove("target")
        record(removed == target, "Remove returns the former resolved path")
        record(not target.exists() and (root / "sibling").is_dir(), "Remove preserves siblings")

        for value in ("", ".", "..", "../escape", "nested/name", str(root / "sibling")):
            try:
                service.remove(value)
            except invalid_name:
                continue
            except Exception as error:  # noqa: BLE001
                record(False, f"Invalid name {value!r} raised {type(error).__name__}")
            else:
                record(False, f"Invalid name {value!r} was accepted")
        try:
            service.remove("missing")
        except not_found:
            record(True, "Missing packages raise CatalogNotFoundError")
        except Exception as error:  # noqa: BLE001
            record(False, f"Missing package raised {type(error).__name__}")
        else:
            record(False, "Missing package did not raise CatalogNotFoundError")

        class CatalogFake:
            def __init__(self) -> None:
                self.calls: list[str] = []
                self.failure: Exception | None = None

            def remove(self, name: str) -> Path:
                self.calls.append(name)
                if self.failure is not None:
                    raise self.failure
                return Path("/catalog") / name

        class Deps:
            def __init__(self, catalog: CatalogFake) -> None:
                self.catalog = catalog

        fake = CatalogFake()
        try:
            actual = invoke_cli(cli_module.main, ["remove", "target"], Deps(fake))
        except Exception as error:  # noqa: BLE001
            record(False, f"CLI remove failed: {type(error).__name__}: {error}")
        else:
            record(
                actual == (0, "removed /catalog/target\n", "") and fake.calls == ["target"],
                "CLI delegates remove and prints the stable success result",
            )

        fake = CatalogFake()
        fake.failure = catalog_error("missing")
        try:
            code, stdout, stderr = invoke_cli(
                cli_module.main,
                ["remove", "missing"],
                Deps(fake),
            )
        except Exception as error:  # noqa: BLE001
            record(
                False,
                f"CLI maps catalog errors to stderr and exit code 1: "
                f"{type(error).__name__}: {error}",
            )
        else:
            record(
                code == 1 and stdout == "" and stderr.startswith("catalog: "),
                "CLI maps catalog errors to stderr and exit code 1",
            )


def _immutable_dataclass(node: ast.ClassDef) -> bool:
    for decorator in node.decorator_list:
        if not isinstance(decorator, ast.Call):
            continue
        name = (
            decorator.func.id
            if isinstance(decorator.func, ast.Name)
            else decorator.func.attr
            if isinstance(decorator.func, ast.Attribute)
            else ""
        )
        if name != "dataclass":
            continue
        options = {
            keyword.arg: keyword.value.value
            for keyword in decorator.keywords
            if keyword.arg is not None and isinstance(keyword.value, ast.Constant)
        }
        return options.get("frozen") is True and options.get("slots") is True
    return False


def _annotation_text(node: ast.AST | None) -> str:
    return ast.unparse(node) if node is not None else ""


def _broad_production_ignores(pyproject: dict[str, Any]) -> list[str]:
    lint = pyproject.get("tool", {}).get("ruff", {}).get("lint", {})
    per_file = lint.get("per-file-ignores", {})
    if not isinstance(per_file, dict):
        return ["tool.ruff.lint.per-file-ignores must be a table"]
    guarded = {
        "C901",
        "D101",
        "D102",
        "PLR0911",
        "PLR0912",
        "PLR0913",
        "PLR0915",
    }
    offenders: list[str] = []
    for pattern, raw_codes in per_file.items():
        if not isinstance(pattern, str) or not pattern.startswith("src/"):
            continue
        codes = raw_codes if isinstance(raw_codes, list) else []
        ignored = sorted(guarded & {code for code in codes if isinstance(code, str)})
        if ignored:
            offenders.append(f"{pattern}: {', '.join(ignored)}")
    return offenders


def typed_layer_contracts(workspace: Path) -> None:
    protected_skill_gate(workspace)
    unittest_gate(workspace)
    package_root = workspace / "src/runtracker"
    classes = class_modules(package_root)
    for name in ("DispatchOperation", "DispatchResult", "RunRepository", "RunService"):
        record(name in classes, f"{name} exists")
    record("FilesystemRunRepository" in classes, "FilesystemRunRepository exists")

    for name in ("DispatchOperation", "DispatchResult"):
        entry = classes.get(name)
        if entry is not None:
            record(_immutable_dataclass(entry[1]), f"{name} is a frozen slotted dataclass")

    operation_entry = classes.get("DispatchOperation")
    if operation_entry is not None:
        fields = {
            node.target.id: _annotation_text(node.annotation)
            for node in operation_entry[1].body
            if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
        }
        labels = fields.get("labels", "")
        record(
            "str" in labels and ("Mapping" in labels or "dict" in labels),
            f"labels is an explicitly typed semantic map: {labels}",
        )

    any_paths: list[str] = []
    for path in package_root.rglob("*.py"):
        tree = parse(path)
        if any(isinstance(node, ast.Name) and node.id == "Any" for node in ast.walk(tree)):
            any_paths.append(str(path.relative_to(workspace)))
    record(not any_paths, f"Handwritten source contains no explicit Any: {any_paths}")

    service_entry = classes.get("RunService")
    protocol_entry = classes.get("RunRepository")
    if service_entry is not None:
        service_path, service_class = service_entry
        service_tree = parse(service_path)
        imports = {
            node.module or ""
            for node in ast.walk(service_tree)
            if isinstance(node, ast.ImportFrom)
        }
        imports.update(
            alias.name
            for node in ast.walk(service_tree)
            if isinstance(node, ast.Import)
            for alias in node.names
        )
        forbidden_imports = {
            name
            for name in imports
            if name == "json"
            or name == "pathlib"
            or name.startswith("runtracker.repository")
        }
        record(not forbidden_imports, f"Service imports no concrete I/O boundary: {forbidden_imports}")
        io_methods = {
            "open",
            "read_text",
            "write_text",
            "mkdir",
            "exists",
            "is_file",
            "is_dir",
            "glob",
            "replace",
            "unlink",
        }
        used_io = {
            node.func.attr
            for node in ast.walk(service_tree)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr in io_methods
        }
        record(not used_io, f"Service performs no direct filesystem I/O: {sorted(used_io)}")
        dispatch = next(
            (
                node
                for node in service_class.body
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and node.name == "dispatch"
            ),
            None,
        )
        record(
            dispatch is not None and _annotation_text(dispatch.returns).endswith("DispatchResult"),
            "RunService.dispatch returns DispatchResult",
        )

    if protocol_entry is not None:
        protocol = protocol_entry[1]
        is_protocol = any(
            isinstance(base, ast.Name) and base.id == "Protocol"
            or isinstance(base, ast.Attribute) and base.attr == "Protocol"
            for base in protocol.bases
        )
        record(is_protocol, "RunRepository is a Protocol")
        methods = [
            node
            for node in protocol.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and not node.name.startswith("_")
        ]
        record(
            len(methods) == 1
            and _annotation_text(methods[0].returns).endswith("DispatchResult"),
            "RunRepository exposes one typed dispatch capability",
        )

    repository_entry = classes.get("FilesystemRunRepository")
    if repository_entry is not None:
        repository_path, repository_class = repository_entry
        record(
            repository_path.parent.name == "repository",
            f"Filesystem adapter lives in repository: {repository_path.relative_to(workspace)}",
        )
        methods = {
            node.name
            for node in repository_class.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and not node.name.startswith("_")
        }
        record(len(methods) == 1, f"Filesystem adapter exposes one capability: {methods}")

    deps_path = package_root / "deps.py"
    deps_text = deps_path.read_text(encoding="utf-8") if deps_path.is_file() else ""
    record(
        "FilesystemRunRepository" in deps_text and "RunService" in deps_text,
        "deps constructs the filesystem adapter and injects the service",
    )

    pyproject_path = workspace / "pyproject.toml"
    pyproject = tomllib.loads(pyproject_path.read_text(encoding="utf-8"))
    mypy = pyproject.get("tool", {}).get("mypy", {})
    record(mypy.get("disallow_any_explicit") is True, "mypy rejects explicit Any")
    broad_ignores = _broad_production_ignores(pyproject)
    record(
        not broad_ignores,
        f"Handwritten production has no broad quality-rule ignores: {broad_ignores}",
    )
    contracts = pyproject.get("tool", {}).get("importlinter", {}).get("contracts", [])
    service_contract = any(
        "runtracker.service" in contract.get("source_modules", [])
        and "runtracker.repository" in contract.get("forbidden_modules", [])
        for contract in contracts
    )
    record(service_contract, "Import Linter forbids service imports from repository")

    service_tests = list((workspace / "tests/unit/service").rglob("*.py"))
    repository_tests = list((workspace / "tests/integration/repository").rglob("*.py"))
    service_text = "\n".join(path.read_text(encoding="utf-8") for path in service_tests)
    repository_text = "\n".join(path.read_text(encoding="utf-8") for path in repository_tests)
    concrete_service_imports = [
        str(path.relative_to(workspace))
        for path in service_tests
        if "runtracker.repository" in path.read_text(encoding="utf-8")
        or "FilesystemRunRepository" in path.read_text(encoding="utf-8")
    ]
    record(bool(service_tests) and "Fake" in service_text, "Service tests use a repository fake")
    record(
        not concrete_service_imports,
        f"Service tests do not use the concrete repository: {concrete_service_imports}",
    )
    record(bool(repository_tests), "Filesystem repository has integration tests")
    record(
        "TemporaryDirectory" in repository_text,
        "Repository tests use an isolated real temporary filesystem",
    )

    if service_entry is None or repository_entry is None:
        return
    add_src(workspace)
    service_module = importlib.import_module(module_name(workspace, service_entry[0]))
    repository_module = importlib.import_module(module_name(workspace, repository_entry[0]))
    service_type = getattr(service_module, "RunService")
    repository_type = getattr(repository_module, "FilesystemRunRepository")
    sentinel = object()

    class RepositoryFake:
        def __init__(self) -> None:
            self.calls: list[tuple[str, int]] = []

        def dispatch(self, run_id: str, limit: int) -> object:
            self.calls.append((run_id, limit))
            return sentinel

        def reserve(self, run_id: str, limit: int) -> object:
            self.calls.append((run_id, limit))
            return sentinel

    fake = RepositoryFake()
    service = service_type(fake)
    record(
        service.dispatch("run-1", 1) is sentinel and fake.calls == [("run-1", 1)],
        "Service validates and delegates through one repository capability",
    )
    rejecting_fake = RepositoryFake()
    try:
        service_type(rejecting_fake).dispatch("run-1", 0)
    except ValueError:
        record(not rejecting_fake.calls, "Service rejects a non-positive limit before repository I/O")
    except Exception as error:  # noqa: BLE001
        record(False, f"Non-positive limit raised {type(error).__name__}")
    else:
        record(False, "Non-positive limit was accepted")

    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        run = root / "runs" / "run-1"
        run.mkdir(parents=True)
        state = {
            "status": "active",
            "operations": [
                {"node": "build", "agent": "worker", "labels": {"attempt": "1"}},
                {"node": "verify", "agent": "reviewer", "labels": {}},
            ],
        }
        (run / "state.json").write_text(json.dumps(state), encoding="utf-8")
        adapter = repository_type(root)
        method = getattr(adapter, "dispatch", None) or getattr(adapter, "reserve", None)
        result = method("run-1", 1)
        operations = tuple(result.operations)
        record(
            len(operations) == 1
            and operations[0].node == "build"
            and operations[0].agent == "worker"
            and dict(operations[0].labels) == {"attempt": "1"},
            "Filesystem adapter maps persisted operations into typed contracts",
        )
        persisted = json.loads((run / "state.json").read_text(encoding="utf-8"))
        record(persisted["status"] == "dispatched", "Filesystem adapter preserves state transition")
        record(
            persisted["operations"] == state["operations"],
            "Filesystem adapter preserves the persisted operation shape",
        )


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: checks.py <case-name> <workspace>")
    case_name = sys.argv[1]
    workspace = Path(sys.argv[2]).resolve()
    handlers = {
        "preserve-existing-tooling": preserve_existing_tooling,
        "nested-argparse-refactor": nested_argparse_refactor,
        "argparse-help": argparse_help,
        "library-kiss-tdd": library_kiss_tdd,
        "io-boundaries-refactor": io_boundaries_refactor,
        "typed-layer-contracts": typed_layer_contracts,
        "catalog-remove-tdd": catalog_remove_tdd,
        "library-dip-tdd": library_dip_tdd,
        "bugfix-regression-first": bugfix_regression_first,
    }
    handler = handlers.get(case_name)
    if handler is None:
        raise SystemExit(f"unknown case: {case_name}")
    try:
        handler(workspace)
    except Exception as error:  # noqa: BLE001
        record(False, f"Checker crashed: {type(error).__name__}: {error}")
    print(json.dumps({"results": RESULTS}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
