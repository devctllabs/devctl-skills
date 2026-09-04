import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import assertSimplification from "../harness/assert-simplification.mjs";

async function workspace(source, tests) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "simplify-code-assert-"));
  await mkdir(path.join(directory, "tests"));
  await writeFile(path.join(directory, "shipping.py"), source);
  await writeFile(path.join(directory, "tests", "test_shipping.py"), tests);
  execFileSync("git", ["init", "--quiet"], { cwd: directory });
  return directory;
}

test("accepts the approved simplification thresholds and public tests", async () => {
  const directory = await workspace(
    "def shipping_quote(region: str, weight: float, express: bool) -> int:\n    if weight <= 0:\n        raise ValueError\n    return 3\n",
    "from shipping import shipping_quote\n",
  );
  try {
    const result = assertSimplification("", {
      vars: { workspaceDir: directory },
      config: {
        sourcePath: "shipping.py",
        testPath: "tests/test_shipping.py",
        maxDecisionNodes: 2,
        maxNesting: 1,
      },
    });
    assert.equal(result.pass, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects excessive nesting and private-helper tests", async () => {
  const directory = await workspace(
    "def shipping_quote(x):\n    if x:\n        if x > 1:\n            if x > 2:\n                return 3\n    return 0\n",
    "from shipping import _quote\n",
  );
  try {
    const result = assertSimplification("", {
      vars: { workspaceDir: directory },
      config: {
        sourcePath: "shipping.py",
        testPath: "tests/test_shipping.py",
        maxDecisionNodes: 2,
        maxNesting: 1,
      },
    });
    assert.equal(result.pass, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
