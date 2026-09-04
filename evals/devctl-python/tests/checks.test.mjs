import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const EVAL_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CHECKER = path.join(EVAL_ROOT, "harness", "checks.py");


async function fixtureRepository(name) {
  const root = await mkdtemp(path.join(os.tmpdir(), "devctl-python-checker-"));
  const workspace = path.join(root, "workspace");
  await cp(path.join(EVAL_ROOT, "fixtures", name), workspace, { recursive: true });
  execFileSync("git", ["init", "--quiet"], { cwd: workspace });
  execFileSync("git", ["config", "user.name", "Skill Creator Evals"], { cwd: workspace });
  execFileSync("git", ["config", "user.email", "skill-creator-evals@example.invalid"], {
    cwd: workspace,
  });
  execFileSync("git", ["add", "--all"], { cwd: workspace });
  execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: workspace });
  return workspace;
}


for (const [name, fixture = name] of [
  ["preserve-existing-tooling"],
  ["library-kiss-tdd"],
  ["io-boundaries-refactor"],
  ["typed-layer-contracts"],
  ["catalog-remove-tdd"],
]) {
  test(`${name} checker reports contract failures without crashing`, async () => {
    const workspace = await fixtureRepository(fixture);
    const child = spawnSync("python3", [CHECKER, name, workspace], {
      encoding: "utf8",
      timeout: 60_000,
    });

    assert.equal(child.status, 0, child.stderr);
    const payload = JSON.parse(child.stdout);
    assert.equal(Array.isArray(payload.results), true);
    assert.equal(payload.results.some((item) => item.pass === false), true);
    assert.equal(
      payload.results.some((item) => item.reason.startsWith("Checker crashed:")),
      false,
    );
  });
}


test("preserve tooling checker accepts the surgical behavior fix", async () => {
  const workspace = await fixtureRepository("preserve-existing-tooling");
  await writeFile(
    path.join(workspace, "src/orders/service.py"),
    `from dataclasses import dataclass, replace


class OrderNotFoundError(Exception):
    """Raised when an order does not exist."""


@dataclass(frozen=True, slots=True)
class Order:
    id: str
    archived: bool = False


class OrderService:
    """Own order operations."""

    def archive(self, orders: tuple[Order, ...], order_id: str) -> tuple[Order, ...]:
        """Archive one order while preserving the remaining order sequence."""
        if not any(order.id == order_id for order in orders):
            raise OrderNotFoundError(order_id)
        return tuple(
            replace(order, archived=True) if order.id == order_id else order
            for order in orders
        )
`,
    "utf8",
  );

  const child = spawnSync("python3", [CHECKER, "preserve-existing-tooling", workspace], {
    encoding: "utf8",
    timeout: 60_000,
  });
  const payload = JSON.parse(child.stdout);

  assert.equal(child.status, 0, child.stderr);
  assert.equal(
    payload.results.every((item) => item.pass),
    true,
    JSON.stringify(payload.results.filter((item) => !item.pass), null, 2),
  );
});


test("library KISS checker accepts the minimal stateless API", async () => {
  const workspace = await fixtureRepository("library-kiss-tdd");
  await writeFile(
    path.join(workspace, "src/acme_names/__init__.py"),
    `"""Public API for name normalization."""


def normalize_name(value: str) -> str:
    normalized = " ".join(value.split()).casefold()
    if not normalized:
        raise ValueError("name must not be empty")
    return normalized
`,
    "utf8",
  );

  const child = spawnSync("python3", [CHECKER, "library-kiss-tdd", workspace], {
    encoding: "utf8",
    timeout: 60_000,
  });
  const payload = JSON.parse(child.stdout);

  assert.equal(child.status, 0, child.stderr);
  assert.equal(
    payload.results.every((item) => item.pass),
    true,
    JSON.stringify(payload.results.filter((item) => !item.pass), null, 2),
  );
});


const VALID_IO_SERVICE = `from typing import Protocol

from package_discovery.model import Plugin


class PluginSource(Protocol):
    def list_plugins(self) -> tuple[Plugin, ...]: ...


class PackageCatalog(Protocol):
    def package_names(self) -> tuple[str, ...]: ...


class PackageService:
    def __init__(self, plugin_source: PluginSource, package_catalog: PackageCatalog) -> None:
        self._plugin_source = plugin_source
        self._package_catalog = package_catalog

    def discover(self) -> tuple[str, ...]:
        enabled = {
            plugin.name for plugin in self._plugin_source.list_plugins() if plugin.enabled
        }
        available = set(self._package_catalog.package_names())
        return tuple(sorted(enabled & available))
`;

const VALID_IO_TEST = `import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[3] / "src"))

from package_discovery.model import Plugin
from package_discovery.service import PackageService


class PluginStub:
    def list_plugins(self) -> tuple[Plugin, ...]:
        return (Plugin("alpha", True), Plugin("beta", False))


class CatalogStub:
    def package_names(self) -> tuple[str, ...]:
        return ("alpha", "gamma")


class PackageServiceTests(unittest.TestCase):
    def test_discovers_enabled_local_packages(self) -> None:
        self.assertEqual(
            PackageService(PluginStub(), CatalogStub()).discover(),
            ("alpha",),
        )
`;

async function validIoWorkspace() {
  const workspace = await fixtureRepository("io-boundaries-refactor");
  await writeFile(
    path.join(workspace, "src/package_discovery/service.py"),
    VALID_IO_SERVICE,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "tests/unit/service/test_package_service.py"),
    VALID_IO_TEST,
    "utf8",
  );
  return workspace;
}

function runIoChecker(workspace) {
  const child = spawnSync("python3", [CHECKER, "io-boundaries-refactor", workspace], {
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}

function failedReasons(payload) {
  return payload.results.filter((item) => !item.pass).map((item) => item.reason).join("\n");
}

test("io checker accepts a focused consumer-owned capability refactor", async () => {
  const payload = runIoChecker(await validIoWorkspace());

  assert.equal(
    payload.results.every((item) => item.pass),
    true,
    JSON.stringify(payload.results.filter((item) => !item.pass), null, 2),
  );
});

test("io checker rejects direct external I/O imports in the service", async () => {
  const workspace = await validIoWorkspace();
  await writeFile(
    path.join(workspace, "src/package_discovery/service.py"),
    `${VALID_IO_SERVICE}\nimport subprocess\n`,
    "utf8",
  );

  assert.match(failedReasons(runIoChecker(workspace)), /imports no I\/O or concrete adapter/);
});

test("io checker rejects concrete adapter imports in the service", async () => {
  const workspace = await validIoWorkspace();
  await writeFile(
    path.join(workspace, "src/package_discovery/service.py"),
    `${VALID_IO_SERVICE}\nfrom package_discovery.client import CodexPluginClient\n`,
    "utf8",
  );

  assert.match(failedReasons(runIoChecker(workspace)), /imports no I\/O or concrete adapter/);
});

test("io checker rejects raw-I/O capability methods", async () => {
  const workspace = await validIoWorkspace();
  await writeFile(
    path.join(workspace, "src/package_discovery/service.py"),
    VALID_IO_SERVICE.replaceAll("package_names", "glob"),
    "utf8",
  );
  await writeFile(
    path.join(workspace, "tests/unit/service/test_package_service.py"),
    VALID_IO_TEST.replaceAll("package_names", "glob"),
    "utf8",
  );

  assert.match(failedReasons(runIoChecker(workspace)), /not raw I\/O/);
});

test("io checker rejects selection policy moved out of the service", async () => {
  const workspace = await validIoWorkspace();
  await writeFile(
    path.join(workspace, "src/package_discovery/service.py"),
    VALID_IO_SERVICE.replace(
      /    def discover[\s\S]*$/,
      `    def discover(self) -> tuple[str, ...]:
        return tuple(
            sorted(plugin.name for plugin in self._plugin_source.list_plugins() if plugin.enabled)
        )
`,
    ),
    "utf8",
  );

  assert.match(failedReasons(runIoChecker(workspace)), /keeps sorted enabled\/local policy/);
});

test("io checker rejects changes to existing integrations", async () => {
  const workspace = await validIoWorkspace();
  const clientPath = path.join(workspace, "src/package_discovery/client.py");
  await writeFile(clientPath, `${await readFile(clientPath, "utf8")}\n# changed\n`, "utf8");

  assert.match(failedReasons(runIoChecker(workspace)), /must remain unchanged/);
});


test("typed layer checker accepts structured contracts and a capability adapter", async () => {
  const workspace = await fixtureRepository("typed-layer-contracts");
  await mkdir(path.join(workspace, "src/runtracker/repository/filesystem"), { recursive: true });
  await mkdir(path.join(workspace, "tests/integration/repository"), { recursive: true });
  await writeFile(
    path.join(workspace, "src/runtracker/domain.py"),
    `from collections.abc import Mapping
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class DispatchOperation:
    node: str
    agent: str
    labels: Mapping[str, str]

@dataclass(frozen=True, slots=True)
class DispatchResult:
    operations: tuple[DispatchOperation, ...]
    status: str
`,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "src/runtracker/service.py"),
    `from typing import Protocol
from runtracker.domain import DispatchResult

class RunRepository(Protocol):
    def dispatch(self, run_id: str, limit: int) -> DispatchResult: ...

class RunService:
    def __init__(self, repository: RunRepository) -> None:
        self._repository = repository

    def dispatch(self, run_id: str, limit: int) -> DispatchResult:
        if limit < 1:
            raise ValueError("limit must be positive")
        return self._repository.dispatch(run_id, limit)
`,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "src/runtracker/repository/codec.py"),
    '"""Private codec implementation moved behind the adapter."""\n',
    "utf8",
  );
  await writeFile(
    path.join(workspace, "src/runtracker/repository/filesystem/__init__.py"),
    "from runtracker.repository.filesystem._repository import FilesystemRunRepository\n",
    "utf8",
  );
  await writeFile(
    path.join(workspace, "src/runtracker/repository/filesystem/_repository.py"),
    `import json
from pathlib import Path
from runtracker.domain import DispatchOperation, DispatchResult

class FilesystemRunRepository:
    def __init__(self, root: Path) -> None:
        self._root = root

    def dispatch(self, run_id: str, limit: int) -> DispatchResult:
        path = self._root / "runs" / run_id / "state.json"
        raw: object = json.loads(path.read_text())
        if not isinstance(raw, dict):
            raise ValueError("state must be an object")
        raw_operations = raw.get("operations")
        if not isinstance(raw_operations, list):
            raise ValueError("operations must be a list")
        operations: list[DispatchOperation] = []
        for raw_operation in raw_operations[:limit]:
            if not isinstance(raw_operation, dict):
                raise ValueError("operation must be an object")
            node = raw_operation.get("node")
            agent = raw_operation.get("agent")
            labels = raw_operation.get("labels")
            if (
                not isinstance(node, str)
                or not isinstance(agent, str)
                or not isinstance(labels, dict)
                or not all(isinstance(key, str) and isinstance(value, str)
                           for key, value in labels.items())
            ):
                raise ValueError("operation is invalid")
            operations.append(DispatchOperation(node=node, agent=agent, labels=dict(labels)))
        raw["status"] = "dispatched"
        path.write_text(json.dumps(raw, sort_keys=True))
        return DispatchResult(operations=tuple(operations), status="dispatched")
`,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "src/runtracker/deps.py"),
    `from pathlib import Path
from runtracker.repository.filesystem import FilesystemRunRepository
from runtracker.service import RunService

def build_service(root: Path) -> RunService:
    return RunService(FilesystemRunRepository(root))
`,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "tests/unit/service/test_dispatch.py"),
    `import unittest
from runtracker.domain import DispatchResult
from runtracker.service import RunService

class RepositoryFake:
    def dispatch(self, run_id: str, limit: int) -> DispatchResult:
        return DispatchResult(operations=(), status="dispatched")

class RunServiceTests(unittest.TestCase):
    def test_dispatch_uses_repository_fake(self) -> None:
        self.assertEqual(RunService(RepositoryFake()).dispatch("run-1", 1).status, "dispatched")

    def test_dispatch_rejects_limit(self) -> None:
        with self.assertRaises(ValueError):
            RunService(RepositoryFake()).dispatch("run-1", 0)
`,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "tests/integration/repository/test_dispatch.py"),
    `import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from runtracker.repository.filesystem import FilesystemRunRepository

class FilesystemRunRepositoryTests(unittest.TestCase):
    def test_dispatch_uses_real_temporary_filesystem(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            run = root / "runs" / "run-1"
            run.mkdir(parents=True)
            (run / "state.json").write_text(json.dumps({
                "status": "active",
                "operations": [
                    {"node": "build", "agent": "worker", "labels": {"attempt": "1"}},
                    {"node": "verify", "agent": "reviewer", "labels": {}},
                ],
            }))
            result = FilesystemRunRepository(root).dispatch("run-1", 1)
            self.assertEqual(result.operations[0].node, "build")
            self.assertEqual(json.loads((run / "state.json").read_text())["status"], "dispatched")
`,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "pyproject.toml"),
    `[project]
name = "runtracker"
version = "0.1.0"
requires-python = ">=3.12"

[build-system]
requires = ["setuptools"]
build-backend = "setuptools.build_meta"

[tool.mypy]
strict = true
disallow_any_explicit = true

[tool.importlinter]
root_packages = ["runtracker"]

[[tool.importlinter.contracts]]
name = "service depends on ports"
type = "forbidden"
source_modules = ["runtracker.service"]
forbidden_modules = ["runtracker.repository"]
`,
    "utf8",
  );

  const child = spawnSync("python3", [CHECKER, "typed-layer-contracts", workspace], {
    encoding: "utf8",
    timeout: 60_000,
  });

  assert.equal(child.status, 0, child.stderr);
  const payload = JSON.parse(child.stdout);
  assert.equal(
    payload.results.every((item) => item.pass),
    true,
    JSON.stringify(payload.results.filter((item) => !item.pass), null, 2),
  );

  const pyprojectPath = path.join(workspace, "pyproject.toml");
  await writeFile(
    pyprojectPath,
    `${await readFile(pyprojectPath, "utf8")}
[tool.ruff.lint.per-file-ignores]
"src/runtracker/service.py" = ["D101", "D102"]
`,
    "utf8",
  );
  const serviceTestPath = path.join(workspace, "tests/unit/service/test_dispatch.py");
  await writeFile(
    serviceTestPath,
    `${await readFile(serviceTestPath, "utf8")}
from runtracker.repository.filesystem import FilesystemRunRepository
`,
    "utf8",
  );

  const rejected = spawnSync("python3", [CHECKER, "typed-layer-contracts", workspace], {
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(rejected.status, 0, rejected.stderr);
  const rejectedPayload = JSON.parse(rejected.stdout);
  assert.equal(
    rejectedPayload.results.some(
      (item) =>
        item.pass === false &&
        item.reason.startsWith("Handwritten production has no broad quality-rule ignores"),
    ),
    true,
  );
  assert.equal(
    rejectedPayload.results.some(
      (item) =>
        item.pass === false &&
        item.reason.startsWith("Service tests do not use the concrete repository"),
    ),
    true,
  );
});


test("catalog remove checker accepts the minimal vertical slice", async () => {
  const workspace = await fixtureRepository("catalog-remove-tdd");
  const files = new Map([
    [
      "src/catalog/cli.py",
      `from catalog.errors import CatalogError

def main(argv, deps):
    try:
        if len(argv) != 2 or argv[0] != "remove":
            return 2
        removed = deps.catalog.remove(argv[1])
    except CatalogError as error:
        print(f"catalog: {error}", file=__import__("sys").stderr)
        return 1
    print(f"removed {removed}")
    return 0
`,
    ],
    [
      "src/catalog/service.py",
      `from pathlib import Path
from typing import Protocol
from catalog.errors import InvalidPackageNameError

class CatalogStore(Protocol):
    def remove(self, name: str) -> Path: ...

class CatalogService:
    def __init__(self, store: CatalogStore):
        self._store = store

    def remove(self, name: str) -> Path:
        if (
            not name.strip()
            or name in {".", ".."}
            or Path(name).is_absolute()
            or "/" in name
            or "\\\\" in name
        ):
            raise InvalidPackageNameError(name)
        return self._store.remove(name)
`,
    ],
    [
      "src/catalog/repository.py",
      `from pathlib import Path
from catalog.errors import CatalogNotFoundError

class FilesystemCatalog:
    def __init__(self, root):
        self._root = Path(root)

    def remove(self, name):
        target = (self._root / name).resolve()
        try:
            target.rmdir()
        except FileNotFoundError as error:
            raise CatalogNotFoundError(name) from error
        return target
`,
    ],
    [
      "tests/unit/cli/test_catalog_cli.py",
      `import io
import unittest
from contextlib import redirect_stdout
from catalog.cli import main

class Catalog:
    def remove(self, name):
        return __import__("pathlib").Path("/catalog") / name

class Deps:
    catalog = Catalog()

class CliTests(unittest.TestCase):
    def test_remove(self):
        output = io.StringIO()
        with redirect_stdout(output):
            self.assertEqual(main(["remove", "demo"], Deps()), 0)
        self.assertEqual(output.getvalue(), "removed /catalog/demo\\n")
`,
    ],
    [
      "tests/unit/service/test_catalog_service.py",
      `import unittest
from catalog.service import CatalogService

class Store:
    def remove(self, name):
        return name

class ServiceTests(unittest.TestCase):
    def test_remove(self):
        self.assertEqual(CatalogService(Store()).remove("demo"), "demo")
`,
    ],
    [
      "tests/integration/repository/test_filesystem_catalog.py",
      `import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from catalog.repository import FilesystemCatalog

class RepositoryTests(unittest.TestCase):
    def test_remove(self):
        with TemporaryDirectory() as temporary:
            target = Path(temporary) / "demo"
            target.mkdir()
            self.assertEqual(FilesystemCatalog(Path(temporary)).remove("demo"), target.resolve())
            self.assertFalse(target.exists())
`,
    ],
  ]);
  for (const [relativePath, contents] of files) {
    await writeFile(path.join(workspace, relativePath), contents, "utf8");
  }

  const child = spawnSync("python3", [CHECKER, "catalog-remove-tdd", workspace], {
    encoding: "utf8",
    timeout: 60_000,
  });

  assert.equal(child.status, 0, child.stderr);
  const payload = JSON.parse(child.stdout);
  assert.equal(
    payload.results.every((item) => item.pass),
    true,
    JSON.stringify(payload.results.filter((item) => !item.pass), null, 2),
  );
});
