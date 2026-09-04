import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { workspaceHook as pragmaticWorkspaceHook } from "../harness/workspace.mjs";
import { workspaceHook as pythonWorkspaceHook } from "../../devctl-python/harness/workspace.mjs";

for (const [label, workspaceHook] of [
  ["shared", pragmaticWorkspaceHook],
  ["devctl-python", pythonWorkspaceHook],
]) {
  test(`${label} workspace hook injects dependency skills`, async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "skill-dependencies-"));
    const fixture = path.join(root, "fixture");
    const target = path.join(root, "target-skill");
    const dependency = path.join(root, "dependency-skill");
    await Promise.all([mkdir(fixture), mkdir(target), mkdir(dependency)]);
    await writeFile(path.join(fixture, "source.txt"), "fixture\n");
    await writeFile(
      path.join(target, "SKILL.md"),
      "---\nname: target-skill\ndescription: target\n---\n",
    );
    await writeFile(
      path.join(dependency, "SKILL.md"),
      "---\nname: dependency-skill\ndescription: dependency\n---\n",
    );

    let prepared;
    try {
      prepared = await workspaceHook("beforeEach", {
        test: {
          vars: {
            fixtureDir: fixture,
            targetSkillDir: target,
            targetSkillName: "target-skill",
            dependencySkillDirs: dependency,
          },
        },
      });
      const workspace = prepared.test.vars.workspaceDir;
      await Promise.all([
        access(path.join(workspace, ".agents", "skills", "target-skill", "SKILL.md")),
        access(path.join(workspace, ".agents", "skills", "dependency-skill", "SKILL.md")),
      ]);
      const context = { test: prepared.test, result: { metadata: {} } };
      await workspaceHook("afterEach", context);
      prepared = undefined;
    } finally {
      if (prepared) {
        await workspaceHook("afterEach", { test: prepared.test, result: { metadata: {} } });
      }
      await rm(root, { recursive: true, force: true });
    }
  });
}
