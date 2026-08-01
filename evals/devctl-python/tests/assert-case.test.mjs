import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  qualityHotspots,
  outsideInPlan,
  qualityTooling,
} from "../harness/assert-case.mjs";


async function cleanRepository() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "devctl-python-assertions-"));
  execFileSync("git", ["init", "--quiet"], { cwd: workspace });
  return workspace;
}


test("quality tooling hard gate only checks that the workspace is unchanged", async () => {
  const workspace = await cleanRepository();

  assert.equal(qualityTooling("Any response content.", workspace).every((item) => item.pass), true);

  await writeFile(path.join(workspace, "unexpected.txt"), "changed\n", "utf8");
  assert.equal(qualityTooling("Any response content.", workspace).every((item) => item.pass), false);
});

test("quality hotspot review requires owner, failure, complexity, and suppression evidence", async () => {
  const workspace = await cleanRepository();
  const complete = `
    RunRepository is broad. Add tests/unit/service with a fake and
    tests/integration/repository with partial-application rollback coverage.
    Boundary and Exceptions need direct scenarios. Keep complexipy at 15 and inspect
    complexipy --top 20. Remove the production-wide D101 and D102 ignores.
  `;

  assert.equal(qualityHotspots(complete, workspace).every((item) => item.pass), true);
  assert.equal(qualityHotspots("All configured checks pass.", workspace).every((item) => item.pass), false);
});


test("outside-in plan requires ordered scenario vocabulary without an N/A ledger", async () => {
  const workspace = await cleanRepository();
  const complete = `
    Boundary errors are presented by the CLI.
    tests/unit/cli: Zero, One, Many, Boundary, Exceptions, Interfaces.
    For each applicable scenario: expected RED, minimum GREEN, refactor.
    Then tests/unit/service uses a Protocol, followed by tests/integration/repository.
  `;

  assert.equal(outsideInPlan(complete, workspace).every((item) => item.pass), true);
  assert.equal(outsideInPlan("Write code, then add tests.", workspace).every((item) => item.pass), false);
});
