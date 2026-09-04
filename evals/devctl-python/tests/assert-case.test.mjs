import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { qualityHotspots } from "../harness/assert-case.mjs";


async function cleanRepository() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "devctl-python-assertions-"));
  execFileSync("git", ["init", "--quiet"], { cwd: workspace });
  return workspace;
}


test("quality hotspot hard gate checks read-only behavior, not exact prose", async () => {
  const workspace = await cleanRepository();

  assert.equal(
    qualityHotspots("Semantic quality belongs to the agent judge.", workspace).every(
      (item) => item.pass,
    ),
    true,
  );

  await writeFile(path.join(workspace, "unexpected.txt"), "changed\n", "utf8");
  assert.equal(qualityHotspots("Any response.", workspace).every((item) => item.pass), false);
});
