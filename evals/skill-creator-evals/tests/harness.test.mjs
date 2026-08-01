import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import assertCommand from "../harness/assert-command.mjs";
import assertPostChangeFailureGate from "../harness/assert-post-change-failure-gate.mjs";
import assertOptimizationContract from "../harness/assert-optimization-contract.mjs";
import assertSelfSmoke from "../harness/assert-self-smoke.mjs";
import assertTrajectory from "../harness/assert-trajectory.mjs";
import assertWorkspace from "../harness/assert-workspace.mjs";
import * as runner from "../harness/run.mjs";
import { workspaceHook } from "../harness/workspace.mjs";
import { initializeEval } from "../../../skills/skill-creator-evals/scripts/init-eval.mjs";

const { failureReasons, settingsForCommand, summarizeResults } = runner;

async function temporaryDirectory(prefix) {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

test("initializer renders a standalone suite and refuses overwrite", async () => {
  const root = await temporaryDirectory("skill-creator-evals-init-test-");
  try {
    const output = await initializeEval(
      { name: "sample-skill", target: "skills/sample-skill", output: "evals/sample-skill" },
      root,
    );
    const config = await readFile(path.join(output, "promptfooconfig.yaml"), "utf8");
    const caseFile = await readFile(path.join(output, "cases", "example.yaml"), "utf8");
    assert.match(config, /Evaluate sample-skill/);
    assert.match(config, /maxConcurrency: 3/);
    assert.match(caseFile, /targetSkillName: sample-skill/);
    assert.doesNotMatch(caseFile, /__SKILL_NAME__/);
    await assert.rejects(
      initializeEval(
        { name: "sample-skill", target: "skills/sample-skill", output: "evals/sample-skill" },
        root,
      ),
      /Refusing to overwrite/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("result summary requires every row in one runner pass", () => {
  const row = (success, failureReason = success ? 0 : 1, testIdx = 0) => ({
    success,
    failureReason,
    error: success ? undefined : "assertion failure",
    testIdx,
    promptIdx: 0,
    provider: { id: "candidate" },
    testCase: { description: "case" },
  });
  assert.equal(summarizeResults({ version: 3, results: [row(true)] }).pass, true);
  assert.equal(
    summarizeResults({ version: 3, results: [row(true, 0, 0)] }).pass,
    true,
  );
  assert.equal(
    summarizeResults({ version: 3, results: [row(false, 1, 0)] }).pass,
    false,
  );
  assert.equal(
    summarizeResults({ version: 3, results: [row(false, 2, 0)] }).pass,
    false,
  );
  assert.equal(
    summarizeResults({ results: { version: 3, results: [row(true)] } }).pass,
    true,
  );
  assert.equal(summarizeResults([row(true)]).pass, true);
  assert.equal(summarizeResults([row(false)]).cases[0].errors, 0);
  assert.equal(summarizeResults([row(true), row(true)]).pass, false);
  assert.throws(() => summarizeResults([]), /Unsupported Promptfoo JSON result format/);
});

test("all defaults to three concurrent cases, accepts an override, and rejects legacy modes", () => {
  assert.deepEqual(settingsForCommand("all"), { maxConcurrency: 3 });
  assert.throws(() => settingsForCommand("dev"), /Usage: run\.mjs all/);
  assert.throws(() => settingsForCommand("final"), /Usage: run\.mjs all/);
  assert.deepEqual(runner.parseRunArgs(["all"]), { command: "all", maxConcurrency: 3 });
  assert.deepEqual(runner.parseRunArgs(["all", "--max-concurrency", "5"]), {
    command: "all",
    maxConcurrency: 5,
  });
  assert.throws(
    () => runner.parseRunArgs(["all", "--max-concurrency", "0"]),
    /positive integer/,
  );
});

test("all invokes Promptfoo once with repeat one and all-named evidence", async () => {
  const root = await temporaryDirectory("skill-creator-evals-runner-all-test-");
  const binDirectory = path.join(root, "bin");
  const logPath = path.join(root, "promptfoo.log");
  const fakePromptfoo = path.join(binDirectory, "promptfoo");
  const originalPath = process.env.PATH;
  const originalLog = process.env.SKILL_CREATOR_EVALS_FAKE_LOG;
  const originalResult = process.env.SKILL_CREATOR_EVALS_FAKE_RESULT;
  try {
    await mkdir(binDirectory, { recursive: true });
    await writeFile(
      fakePromptfoo,
      [
        "#!/usr/bin/env node",
        'const fs = require("node:fs");',
        "const args = process.argv.slice(2);",
        'const outputIndex = args.indexOf("--output");',
        "const resultPath = args[outputIndex + 1];",
        "const reportPath = args[outputIndex + 2];",
        'const pass = process.env.SKILL_CREATOR_EVALS_FAKE_RESULT === "pass";',
        "const row = {",
        "  success: pass,",
        "  failureReason: pass ? 0 : 1,",
        '  error: pass ? undefined : "assertion failure",',
        "  testIdx: 0,",
        "  promptIdx: 0,",
        '  provider: { id: "candidate" },',
        '  testCase: { description: "fake case" },',
        "  gradingResult: { pass, reason: pass ? \"passed\" : \"failed\" },",
        "};",
        'fs.writeFileSync(resultPath, `${JSON.stringify(row)}\\n`);',
        'fs.writeFileSync(reportPath, "{}\\n");',
        'fs.appendFileSync(process.env.SKILL_CREATOR_EVALS_FAKE_LOG, `${JSON.stringify(args)}\\n`);',
        "process.exit(pass ? 0 : 100);",
      ].join("\n"),
    );
    await chmod(fakePromptfoo, 0o755);
    process.env.PATH = `${binDirectory}${path.delimiter}${originalPath}`;
    process.env.SKILL_CREATOR_EVALS_FAKE_LOG = logPath;

    process.env.SKILL_CREATOR_EVALS_FAKE_RESULT = "pass";
    assert.equal(await runner.run("all"), 0);
    const [args] = (await readFile(logPath, "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    assert.equal(args.filter((item) => item === "--repeat").length, 1);
    assert.equal(args[args.indexOf("--repeat") + 1], "1");
    const outputIndex = args.indexOf("--output");
    assert.equal(path.basename(args[outputIndex + 1]), "results-all.jsonl");
    assert.equal(path.basename(args[outputIndex + 2]), "report-all.json");

    await writeFile(logPath, "");
    process.env.SKILL_CREATOR_EVALS_FAKE_RESULT = "fail";
    assert.equal(await runner.run("all"), 100);
    assert.equal((await readFile(logPath, "utf8")).trim().split(/\r?\n/).length, 1);
  } finally {
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }
    if (originalLog === undefined) {
      delete process.env.SKILL_CREATOR_EVALS_FAKE_LOG;
    } else {
      process.env.SKILL_CREATOR_EVALS_FAKE_LOG = originalLog;
    }
    if (originalResult === undefined) {
      delete process.env.SKILL_CREATOR_EVALS_FAKE_RESULT;
    } else {
      process.env.SKILL_CREATOR_EVALS_FAKE_RESULT = originalResult;
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("failure diagnostics report failed leaf assertions", () => {
  const result = {
    failureReason: 1,
    error: "generic failure",
    gradingResult: {
      pass: false,
      reason: "generic failure",
      componentResults: [
        { pass: true, reason: "passed" },
        {
          pass: false,
          reason: "group failed",
          componentResults: [
            { pass: false, reason: "missing read-only judge" },
            { pass: true, reason: "passed" },
          ],
        },
      ],
    },
  };
  assert.deepEqual(failureReasons(result), ["missing read-only judge"]);
});

test("self-smoke reuses the target case and protects the skill before approval", async () => {
  const root = await temporaryDirectory("skill-creator-evals-self-smoke-test-");
  try {
    await mkdir(path.join(root, "skills", "sample-review"), { recursive: true });
    await writeFile(
      path.join(root, "skills", "sample-review", "SKILL.md"),
      "---\nname: sample-review\ndescription: sample\n---\n",
    );
    await mkdir(path.join(root, "evals", "sample-review", "cases"), { recursive: true });
    const casePath = path.join(
      root,
      "evals",
      "sample-review",
      "cases",
      "review-result.yaml",
    );
    await writeFile(casePath, "description: existing target\n");

    execFileSync("git", ["init", "--quiet"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Skill Creator Evals"], { cwd: root });
    execFileSync("git", ["config", "user.email", "skill-creator-evals@example.invalid"], { cwd: root });
    execFileSync("git", ["add", "--all"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "fixture baseline"], { cwd: root });

    await writeFile(casePath, "description: updated contract\n");
    const result = await assertSelfSmoke("", {
      vars: { workspaceDir: root, requestedConcurrency: 2 },
    });
    assert.equal(result.pass, true);

    await writeFile(path.join(root, "evals", "sample-review", "cases", "duplicate.yaml"), "x\n");
    const failing = await assertSelfSmoke(
      "Contract, approval, skill-creator, all once",
      { vars: { workspaceDir: root, requestedConcurrency: 2 } },
    );
    assert.equal(failing.pass, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("semantic post-change failure gate protects the skill and eval contract", async () => {
  const root = await temporaryDirectory("skill-creator-evals-post-change-failure-test-");
  try {
    await mkdir(path.join(root, "skills", "sample-review"), { recursive: true });
    await mkdir(path.join(root, "evals", "sample-review"), { recursive: true });
    await writeFile(path.join(root, "skills", "sample-review", "SKILL.md"), "unchanged\n");
    await writeFile(path.join(root, "evals", "sample-review", "case.yaml"), "unchanged\n");

    execFileSync("git", ["init", "--quiet"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Skill Creator Evals"], { cwd: root });
    execFileSync("git", ["config", "user.email", "skill-creator-evals@example.invalid"], { cwd: root });
    execFileSync("git", ["add", "--all"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "fixture baseline"], { cwd: root });

    const result = assertPostChangeFailureGate("", { vars: { workspaceDir: root } });
    assert.equal(result.pass, true);

    await writeFile(path.join(root, "skills", "sample-review", "SKILL.md"), "changed\n");
    const failing = assertPostChangeFailureGate(
      "Semantic conflict: repair skill, revise contract, or remove guarantee; approval required.",
      { vars: { workspaceDir: root } },
    );
    assert.equal(failing.pass, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("optimization contract preserves behavior gates and records a deterministic target", async () => {
  const root = await temporaryDirectory("skill-creator-evals-optimization-test-");
  const suite = path.join(root, "evals", "sample-summary");
  const skill = path.join(root, ".agents", "skills", "sample-summary");
  try {
    await mkdir(path.join(suite, "cases"), { recursive: true });
    await mkdir(path.join(suite, "harness"), { recursive: true });
    await mkdir(skill, { recursive: true });
    await writeFile(
      path.join(skill, "SKILL.md"),
      "---\nname: sample-summary\ndescription: sample\n---\n",
    );
    await writeFile(
      path.join(suite, "cases", "behavior.yaml"),
      "description: protected behavior\n",
    );
    await writeFile(path.join(suite, "harness", "run.mjs"), "export const command = 'all';\n");
    await writeFile(path.join(suite, "promptfooconfig.yaml"), "description: existing suite\n");

    execFileSync("git", ["init", "--quiet"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Skill Creator Evals"], { cwd: root });
    execFileSync("git", ["config", "user.email", "skill-creator-evals@example.invalid"], { cwd: root });
    execFileSync("git", ["add", "--all"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "fixture baseline"], { cwd: root });

    await writeFile(
      path.join(suite, "harness", "assert-optimization.mjs"),
      [
        "const baseline_words = 'SKILL.md loaded word count';",
        "const minimumReduction = '25%';",
        "const measurement = 'deterministic single measurement';",
      ].join("\n"),
    );

    const passing = await assertOptimizationContract("", {
      vars: { workspaceDir: root, minimumReductionPercent: 25 },
    });
    assert.equal(passing.pass, true);

    await writeFile(path.join(skill, "SKILL.md"), "changed\n");
    const failing = await assertOptimizationContract("", {
      vars: { workspaceDir: root, minimumReductionPercent: 25 },
    });
    assert.equal(failing.pass, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("command assertion reports passing and failing commands", async () => {
  const root = await temporaryDirectory("skill-creator-evals-command-test-");
  const context = {
    vars: { workspaceDir: process.cwd(), skillCreatorEvalsTempRoot: root },
    config: {
      commands: [
        { argv: [process.execPath, "-e", "process.exit(0)"] },
        { argv: [process.execPath, "-e", "process.exit(7)"] },
      ],
    },
  };
  try {
    const result = assertCommand("", context);
    assert.equal(result.pass, false);
    assert.deepEqual(
      result.componentResults.map((component) => component.pass),
      [true, false],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("workspace assertion rejects paths outside the fixture", async () => {
  await assert.rejects(
    assertWorkspace("", {
      vars: { workspaceDir: process.cwd() },
      config: { requiredPaths: ["../outside"] },
    }),
    /Path escapes workspace/,
  );
  const empty = await assertWorkspace("", {
    vars: { workspaceDir: process.cwd() },
    config: { requiredPaths: [] },
  });
  assert.equal(empty.pass, false);
});

test("trajectory assertion checks ordered spans", () => {
  const result = assertTrajectory("", {
    config: {
      orderedPatterns: [
        { label: "read", regex: "read skill", flags: "gi" },
        { label: "write", regex: "write eval", flags: "gi" },
      ],
    },
    trace: {
      spans: [
        { name: "read skill", startTime: 1 },
        { name: "write eval", startTime: 2 },
      ],
    },
  });
  assert.equal(result.pass, true);
});

test("self eval keeps shared harness files identical to the generated template", async () => {
  const names = [
    "assert-command.mjs",
    "assert-trajectory.mjs",
    "assert-workspace.mjs",
    "run.mjs",
    "workspace.mjs",
  ];
  for (const name of names) {
    const actual = await readFile(path.join(process.cwd(), "evals", "skill-creator-evals", "harness", name));
    const template = await readFile(
      path.join(
        process.cwd(),
        "skills",
        "skill-creator-evals",
        "assets",
        "eval-template",
        "harness",
        name,
      ),
    );
    assert.deepEqual(actual, template, `${name} drifted from the template`);
  }
});

test("workspace hook isolates and cleans three concurrent rows", async () => {
  const root = await temporaryDirectory("skill-creator-evals-hook-test-");
  const fixture = path.join(root, "fixture");
  const target = path.join(root, "target");
  await mkdir(fixture, { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(path.join(fixture, "source.txt"), "fixture\n");
  await writeFile(
    path.join(target, "SKILL.md"),
    "---\nname: sample-skill\ndescription: sample\n---\n",
  );

  try {
    const preparedRows = await Promise.all(
      Array.from({ length: 3 }, () =>
        workspaceHook("beforeEach", {
          test: {
            vars: {
              fixtureDir: fixture,
              targetSkillDir: target,
              targetSkillName: "sample-skill",
              toolExecutables: "node",
            },
          },
        }),
      ),
    );
    const workspaces = preparedRows.map((prepared) => prepared.test.vars.workspaceDir);
    const tempRoots = preparedRows.map((prepared) => prepared.test.vars.skillCreatorEvalsTempRoot);
    assert.equal(new Set(workspaces).size, 3);
    assert.equal(new Set(tempRoots).size, 3);

    await Promise.all(
      workspaces.flatMap((workspace) => [
        access(path.join(workspace, ".agents", "skills", "sample-skill", "SKILL.md")),
        access(path.join(workspace, ".skill-creator-evals-bin", "node")),
      ]),
    );

    const finishedContexts = preparedRows.map((prepared) => ({
      test: prepared.test,
      result: { metadata: {} },
    }));
    await Promise.all(
      finishedContexts.map((context) => workspaceHook("afterEach", context)),
    );
    for (const context of finishedContexts) {
      assert.equal(context.result.metadata.skillCreatorEvals.gitStatus, "");
    }
    await Promise.all(
      tempRoots.map(async (tempRoot) => {
        await assert.rejects(access(tempRoot));
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
